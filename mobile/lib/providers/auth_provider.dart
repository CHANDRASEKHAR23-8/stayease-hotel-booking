import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/app_user.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';

// Storage Provider
final storageServiceProvider = Provider<StorageService>((ref) {
  throw UnimplementedError('StorageService must be overridden in ProviderScope');
});

// ApiService Provider
final apiServiceProvider = Provider<ApiService>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return ApiService(storage);
});

// AuthService Provider
final authServiceProvider = Provider<AuthService>((ref) {
  final api = ref.watch(apiServiceProvider);
  final storage = ref.watch(storageServiceProvider);
  return AuthService(api, storage);
});

// AuthState Notifier
class AuthStateNotifier extends StateNotifier<AsyncValue<AppUser?>> {
  final AuthService _authService;
  final StorageService _storageService;

  AuthStateNotifier(this._authService, this._storageService)
      : super(const AsyncValue.loading()) {
    initSession();
  }

  Future<void> initSession() async {
    final token = _storageService.getAccessToken();
    if (token == null) {
      state = const AsyncValue.data(null);
      return;
    }

    // Try restoring cached user first
    final cachedUser = _storageService.getUser();
    if (cachedUser != null) {
      state = AsyncValue.data(cachedUser);
    }

    // Verify / refresh with server
    try {
      final user = await _authService.getProfile();
      state = AsyncValue.data(user);
    } catch (_) {
      // If token expired and couldn't be refreshed, clear
      if (_storageService.getAccessToken() == null) {
        state = const AsyncValue.data(null);
      }
    }
  }

  Future<AppUser> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final user = await _authService.login(email, password);
      state = AsyncValue.data(user);
      return user;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String role = 'customer',
  }) async {
    state = const AsyncValue.loading();
    try {
      final user = await _authService.register(
        name: name,
        email: email,
        password: password,
        phone: phone,
        role: role,
      );
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    state = const AsyncValue.data(null);
  }

  Future<void> updateProfile({String? name, String? phone, String? avatarUrl}) async {
    try {
      final updated = await _authService.updateProfile(
        name: name,
        phone: phone,
        avatarUrl: avatarUrl,
      );
      state = AsyncValue.data(updated);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final authStateProvider = StateNotifierProvider<AuthStateNotifier, AsyncValue<AppUser?>>((ref) {
  final authService = ref.watch(authServiceProvider);
  final storageService = ref.watch(storageServiceProvider);
  return AuthStateNotifier(authService, storageService);
});

final currentUserProvider = Provider<AppUser?>((ref) {
  return ref.watch(authStateProvider).valueOrNull;
});
