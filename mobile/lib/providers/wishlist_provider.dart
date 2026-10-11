import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/hotel.dart';
import 'auth_provider.dart';

final wishlistProvider = FutureProvider.autoDispose<List<Hotel>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final res = await api.get('/wishlist');
  final list = res.data['data'] as List<dynamic>;
  return list.map((item) => Hotel.fromJson(item as Map<String, dynamic>)).toList();
});

final isWishlistedProvider = FutureProvider.autoDispose.family<bool, int>((ref, hotelId) async {
  final api = ref.watch(apiServiceProvider);
  try {
    final res = await api.get('/wishlist/$hotelId/status');
    return res.data['data']['isWishlisted'] == true;
  } catch (_) {
    return false;
  }
});

class WishlistNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  WishlistNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<bool> toggleWishlist(int hotelId, bool currentStatus) async {
    final api = _ref.read(apiServiceProvider);
    state = const AsyncValue.loading();
    try {
      if (currentStatus) {
        await api.delete('/wishlist/$hotelId');
      } else {
        await api.post('/wishlist/$hotelId');
      }
      state = const AsyncValue.data(null);
      _ref.invalidate(wishlistProvider);
      _ref.invalidate(isWishlistedProvider(hotelId));
      return !currentStatus;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final wishlistOperationsProvider = StateNotifierProvider<WishlistNotifier, AsyncValue<void>>((ref) {
  return WishlistNotifier(ref);
});
