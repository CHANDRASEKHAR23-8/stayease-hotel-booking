import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/review.dart';
import 'auth_provider.dart';

final hotelReviewsProvider = FutureProvider.autoDispose.family<List<Review>, int>((ref, hotelId) async {
  final api = ref.watch(apiServiceProvider);
  final res = await api.get('/hotels/$hotelId/reviews');
  final list = res.data['data'] as List<dynamic>;
  return list.map((item) => Review.fromJson(item as Map<String, dynamic>)).toList();
});

class ReviewNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  ReviewNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<Review> submitReview({
    required int hotelId,
    required int rating,
    required String comment,
    int? bookingId,
  }) async {
    final api = _ref.read(apiServiceProvider);
    state = const AsyncValue.loading();
    try {
      final res = await api.post(
        '/hotels/$hotelId/reviews',
        data: {
          'rating': rating,
          'comment': comment,
          if (bookingId != null) 'bookingId': bookingId,
        },
      );
      final review = Review.fromJson(res.data['data']['review'] as Map<String, dynamic>);
      state = const AsyncValue.data(null);
      _ref.invalidate(hotelReviewsProvider(hotelId));
      return review;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final reviewOperationsProvider = StateNotifierProvider<ReviewNotifier, AsyncValue<void>>((ref) {
  return ReviewNotifier(ref);
});
