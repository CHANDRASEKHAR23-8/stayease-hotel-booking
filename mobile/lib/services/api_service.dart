import 'dart:async';
import 'package:dio/dio.dart';
import '../core/config/api_config.dart';
import 'storage_service.dart';

class ApiException implements Exception {
  final String message;
  final String? code;
  final int? statusCode;
  final dynamic details;

  ApiException(this.message, {this.code, this.statusCode, this.details});

  @override
  String toString() => message;
}

class ApiService {
  late final Dio _dio;
  final StorageService _storage;
  bool _isRefreshing = false;

  ApiService(this._storage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = _storage.getAccessToken();
          if (token != null && !options.headers.containsKey('Authorization')) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Automatic Token Refresh Interceptor for 401 Unauthorized
          if (error.response?.statusCode == 401 && !_isRefreshing) {
            final refreshToken = _storage.getRefreshToken();
            if (refreshToken != null) {
              _isRefreshing = true;
              try {
                final refreshResponse = await _dio.post(
                  ApiConfig.authRefresh,
                  data: {'refreshToken': refreshToken},
                  options: Options(headers: {'Authorization': null}),
                );

                if (refreshResponse.statusCode == 200) {
                  final newTokens = refreshResponse.data['data']['tokens'];
                  final newAccessToken = newTokens['accessToken'] as String;
                  final newRefreshToken = newTokens['refreshToken'] as String;

                  await _storage.saveTokens(
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                  );

                  // Retry original request with new access token
                  final originalRequest = error.requestOptions;
                  originalRequest.headers['Authorization'] = 'Bearer $newAccessToken';

                  final response = await _dio.fetch(originalRequest);
                  _isRefreshing = false;
                  return handler.resolve(response);
                }
              } catch (_) {
                // If refresh failed, session is completely expired; clear tokens
                await _storage.clearAll();
              } finally {
                _isRefreshing = false;
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  ApiException _handleError(dynamic error) {
    if (error is DioException) {
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.sendTimeout ||
          error.type == DioExceptionType.connectionError) {
        return ApiException(
          'Unable to reach server. Please check your internet connection or server status.',
          code: 'NETWORK_ERROR',
        );
      }

      if (error.response != null) {
        final data = error.response?.data;
        if (data is Map<String, dynamic> && data['error'] != null) {
          final errObj = data['error'];
          return ApiException(
            errObj['message'] ?? 'An error occurred',
            code: errObj['code'],
            statusCode: error.response?.statusCode,
            details: errObj['details'],
          );
        }
        return ApiException(
          'Server returned error: ${error.response?.statusCode}',
          statusCode: error.response?.statusCode,
        );
      }
    }

    if (error is ApiException) return error;
    return ApiException(error.toString());
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<dynamic> post(String path, {dynamic data, Map<String, dynamic>? headers}) async {
    try {
      final response = await _dio.post(path, data: data, options: Options(headers: headers));
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<dynamic> patch(String path, {dynamic data}) async {
    try {
      final response = await _dio.patch(path, data: data);
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<dynamic> delete(String path) async {
    try {
      final response = await _dio.delete(path);
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }
}
