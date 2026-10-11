import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_user.dart';

class StorageService {
  static const String _keyAccessToken = 'stayease_access_token';
  static const String _keyRefreshToken = 'stayease_refresh_token';
  static const String _keyUser = 'stayease_user';

  final SharedPreferences _prefs;

  StorageService(this._prefs);

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _prefs.setString(_keyAccessToken, accessToken);
    await _prefs.setString(_keyRefreshToken, refreshToken);
  }

  String? getAccessToken() {
    return _prefs.getString(_keyAccessToken);
  }

  String? getRefreshToken() {
    return _prefs.getString(_keyRefreshToken);
  }

  Future<void> saveUser(AppUser user) async {
    await _prefs.setString(_keyUser, jsonEncode(user.toJson()));
  }

  AppUser? getUser() {
    final jsonStr = _prefs.getString(_keyUser);
    if (jsonStr == null) return null;
    try {
      final map = jsonDecode(jsonStr) as Map<String, dynamic>;
      return AppUser.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  Future<void> clearAll() async {
    await _prefs.remove(_keyAccessToken);
    await _prefs.remove(_keyRefreshToken);
    await _prefs.remove(_keyUser);
  }
}
