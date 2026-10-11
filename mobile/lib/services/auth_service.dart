import '../core/config/api_config.dart';
import '../models/app_user.dart';
import 'api_service.dart';
import 'storage_service.dart';

class AuthService {
  final ApiService _api;
  final StorageService _storage;

  AuthService(this._api, this._storage);

  Future<AppUser> login(String email, String password) async {
    final res = await _api.post(ApiConfig.authLogin, data: {
      'email': email.trim(),
      'password': password,
    });

    final data = res['data'];
    final user = AppUser.fromJson(data['user']);
    final tokens = data['tokens'];

    await _storage.saveTokens(
      accessToken: tokens['accessToken'],
      refreshToken: tokens['refreshToken'],
    );
    await _storage.saveUser(user);

    return user;
  }

  Future<AppUser> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String role = 'customer',
  }) async {
    final res = await _api.post(ApiConfig.authRegister, data: {
      'name': name.trim(),
      'email': email.trim(),
      'password': password,
      if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
      'role': role,
    });

    final data = res['data'];
    final user = AppUser.fromJson(data['user']);
    final tokens = data['tokens'];

    await _storage.saveTokens(
      accessToken: tokens['accessToken'],
      refreshToken: tokens['refreshToken'],
    );
    await _storage.saveUser(user);

    return user;
  }

  Future<AppUser?> getProfile() async {
    try {
      final res = await _api.get(ApiConfig.authMe);
      final user = AppUser.fromJson(res['data']['user']);
      await _storage.saveUser(user);
      return user;
    } catch (_) {
      return null;
    }
  }

  Future<AppUser> updateProfile({String? name, String? phone, String? avatarUrl}) async {
    final res = await _api.patch(ApiConfig.authProfile, data: {
      if (name != null) 'name': name,
      if (phone != null) 'phone': phone,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
    });

    final user = AppUser.fromJson(res['data']['user']);
    await _storage.saveUser(user);
    return user;
  }

  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } catch (_) {}
    await _storage.clearAll();
  }
}
