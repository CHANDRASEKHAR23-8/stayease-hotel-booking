import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  static String? _customBaseUrl;

  static void setCustomBaseUrl(String? url) {
    if (url != null && url.trim().isNotEmpty) {
      _customBaseUrl = url.trim();
    } else {
      _customBaseUrl = null;
    }
  }

  /// Authoritative API Base URL based on active runtime environment
  static String get baseUrl {
    if (_customBaseUrl != null) {
      return _customBaseUrl!;
    }

    if (kIsWeb) {
      return 'http://localhost:5000/api/v1';
    }

    try {
      if (Platform.isAndroid) {
        // Android Emulator loops back to host localhost via 10.0.2.2
        return 'http://10.0.2.2:5000/api/v1';
      } else if (Platform.isIOS) {
        return 'http://localhost:5000/api/v1';
      } else if (Platform.isWindows || Platform.isMacOS || Platform.isLinux) {
        return 'http://localhost:5000/api/v1';
      }
    } catch (_) {
      // Fallback
    }

    return 'http://localhost:5000/api/v1';
  }

  // Common Endpoints
  static const String authLogin = '/auth/login';
  static const String authRegister = '/auth/register';
  static const String authMe = '/auth/me';
  static const String authRefresh = '/auth/refresh';
  static const String authProfile = '/auth/profile';

  static const String hotels = '/hotels';
  static const String bookings = '/bookings';
  static const String myBookings = '/bookings/my';
}
