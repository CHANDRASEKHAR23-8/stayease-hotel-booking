import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../core/widgets/rating_badge.dart';
import '../../../core/widgets/state_views.dart';
import '../../../models/hotel.dart';
import '../../../models/review.dart';
import '../../../models/room.dart';
import '../../../providers/booking_provider.dart';
import '../../../providers/hotel_provider.dart';
import '../../../providers/review_provider.dart';
import '../../../providers/wishlist_provider.dart';

class HotelDetailsScreen extends ConsumerWidget {
  final int hotelId;
  const HotelDetailsScreen({super.key, required this.hotelId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hotelAsync = ref.watch(hotelDetailsProvider(hotelId));

    return Scaffold(
      body: hotelAsync.when(
        data: (hotel) => _HotelDetailsContent(hotel: hotel),
        loading: () => const Scaffold(body: LoadingView(message: 'Loading hotel details...')),
        error: (err, _) => Scaffold(
          appBar: AppBar(),
          body: ErrorStateView(
            message: err.toString(),
            onRetry: () => ref.invalidate(hotelDetailsProvider(hotelId)),
          ),
        ),
      ),
    );
  }
}

class _HotelDetailsContent extends ConsumerWidget {
  final Hotel hotel;
  const _HotelDetailsContent({required this.hotel});

  void _showWriteReviewDialog(BuildContext context, WidgetRef ref) {
    int selectedRating = 5;
    final commentController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Text(
                'Write a Review',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Rate your verified stay experience:',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        final starIndex = index + 1;
                        return IconButton(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          constraints: const BoxConstraints(),
                          icon: Icon(
                            starIndex <= selectedRating ? Icons.star_rounded : Icons.star_outline_rounded,
                            color: Colors.amber,
                            size: 32,
                          ),
                          onPressed: () {
                            setDialogState(() {
                              selectedRating = starIndex;
                            });
                          },
                        );
                      }),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: commentController,
                      maxLines: 4,
                      maxLength: 500,
                      decoration: InputDecoration(
                        hintText: 'Share details of your room, amenities, and service...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.pop(dialogCtx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final comment = commentController.text.trim();
                          if (comment.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Please enter a review comment')),
                            );
                            return;
                          }

                          setDialogState(() => isSubmitting = true);

                          try {
                            await ref.read(reviewOperationsProvider.notifier).submitReview(
                                  hotelId: hotel.id,
                                  rating: selectedRating,
                                  comment: comment,
                                );
                            if (dialogCtx.mounted) {
                              Navigator.pop(dialogCtx);
                            }
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Thank you! Your review has been submitted.'),
                                  backgroundColor: AppColors.success,
                                ),
                              );
                              ref.invalidate(hotelReviewsProvider(hotel.id));
                              ref.invalidate(hotelDetailsProvider(hotel.id));
                            }
                          } catch (e) {
                            setDialogState(() => isSubmitting = false);
                            String message = 'Failed to submit review';
                            if (e is DioException && e.response?.data is Map) {
                              final data = e.response!.data as Map;
                              message = data['error']?['message'] ?? data['message'] ?? message;
                            } else {
                              message = e.toString();
                            }
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(message), backgroundColor: AppColors.error),
                              );
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: isSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Submit Review'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviewsAsync = ref.watch(hotelReviewsProvider(hotel.id));

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // App Bar with Image and Wishlist Toggle
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            actions: [
              Consumer(
                builder: (context, ref, _) {
                  final isWishlistedAsync = ref.watch(isWishlistedProvider(hotel.id));
                  final isWishlisted = isWishlistedAsync.value ?? false;

                  return Container(
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: Icon(
                        isWishlisted ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                        color: isWishlisted ? AppColors.error : AppColors.textPrimary,
                        size: 22,
                      ),
                      tooltip: isWishlisted ? 'Remove from Saved' : 'Save to Wishlist',
                      onPressed: () async {
                        try {
                          final newStatus = await ref
                              .read(wishlistOperationsProvider.notifier)
                              .toggleWishlist(hotel.id, isWishlisted);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  newStatus ? 'Added to Saved Stays' : 'Removed from Saved Stays',
                                ),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Could not update saved stays: $e'),
                                backgroundColor: AppColors.error,
                              ),
                            );
                          }
                        }
                      },
                    ),
                  );
                },
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: hotel.primaryImage != null
                  ? Image.network(
                      hotel.primaryImage!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(color: AppColors.primary),
                    )
                  : Container(color: AppColors.primary),
            ),
          ),

          // Hotel Details Body
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          hotel.name,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      RatingBadge(
                        rating: hotel.averageRating > 0 ? hotel.averageRating : hotel.starRating,
                        reviewCount: hotel.reviewCount,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 16, color: AppColors.secondary),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${hotel.address}, ${hotel.locationString}',
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Divider(color: AppColors.border),
                  const SizedBox(height: 16),
                  const Text('About this property', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(
                    hotel.description,
                    style: const TextStyle(color: AppColors.textSecondary, height: 1.5, fontSize: 14),
                  ),
                  const SizedBox(height: 24),

                  // Amenities
                  if (hotel.amenities.isNotEmpty) ...[
                    const Text('Top Amenities', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: hotel.amenities.map((a) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.check_circle_outline_rounded, size: 16, color: AppColors.secondary),
                              const SizedBox(width: 6),
                              Text(a.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 28),
                  ],

                  // Room selection header
                  const Text('Available Room Types', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  const Text('Choose your preferred accommodation', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                  const SizedBox(height: 16),

                  // Rooms List
                  if (hotel.rooms.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Text('No active rooms listed for this hotel at the moment.', style: TextStyle(color: AppColors.textSecondary)),
                    )
                  else
                    ...hotel.rooms.map((room) => _RoomCard(hotel: hotel, room: room)),

                  const SizedBox(height: 32),
                  const Divider(color: AppColors.border),
                  const SizedBox(height: 24),

                  // Guest Reviews Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Guest Reviews & Ratings',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            hotel.reviewCount > 0
                                ? '${hotel.reviewCount} verified guest ${hotel.reviewCount == 1 ? "review" : "reviews"}'
                                : 'No guest reviews yet',
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                      OutlinedButton.icon(
                        icon: const Icon(Icons.rate_review_outlined, size: 16, color: AppColors.primary),
                        label: const Text(
                          'Write Review',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.primary),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                        onPressed: () => _showWriteReviewDialog(context, ref),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Reviews List Section
                  reviewsAsync.when(
                    loading: () => const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(),
                      ),
                    ),
                    error: (err, _) => Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceVariant,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Unable to load reviews: $err',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                    ),
                    data: (reviews) {
                      if (reviews.isEmpty) {
                        return Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.rate_review_outlined, size: 36, color: AppColors.textSecondary),
                              SizedBox(height: 8),
                              Text(
                                'Be the first to leave a review!',
                                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Complete a stay at this property to share your verified review.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                              ),
                            ],
                          ),
                        );
                      }

                      return Column(
                        children: reviews.map((r) => _ReviewCard(review: r)).toList(),
                      );
                    },
                  ),

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  final Review review;
  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: AppColors.primary,
                    child: Text(
                      review.userName.isNotEmpty ? review.userName[0].toUpperCase() : 'G',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        review.userName,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.verified_rounded, size: 12, color: AppColors.success),
                          const SizedBox(width: 3),
                          Text(
                            'Verified Guest',
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              Row(
                children: List.generate(5, (index) {
                  return Icon(
                    index < review.rating ? Icons.star_rounded : Icons.star_outline_rounded,
                    color: Colors.amber,
                    size: 16,
                  );
                }),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            review.comment,
            style: const TextStyle(fontSize: 13, height: 1.4, color: AppColors.textPrimary),
          ),
          if (review.createdAt.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              review.createdAt.length >= 10 ? review.createdAt.substring(0, 10) : review.createdAt,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
            ),
          ],
        ],
      ),
    );
  }
}

class _RoomCard extends ConsumerWidget {
  final Hotel hotel;
  final Room room;

  const _RoomCard({required this.hotel, required this.room});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (room.primaryImageUrl != null)
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: AspectRatio(
                aspectRatio: 2.2,
                child: Image.network(
                  room.primaryImageUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(color: AppColors.surfaceVariant),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        room.roomName,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.secondary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        room.roomType.toUpperCase(),
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.secondary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.people_outline, size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text('Up to ${room.maxGuests} guests', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    const SizedBox(width: 14),
                    const Icon(Icons.bed_outlined, size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(room.bedType, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  ],
                ),
                if (room.description != null && room.description!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(room.description!, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                ],
                const SizedBox(height: 14),
                const Divider(height: 1, color: AppColors.border),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          DateFormatters.formatCurrency(room.basePrice),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.secondary),
                        ),
                        const Text('/ night', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      ],
                    ),
                    CustomButton(
                      text: 'Select Room',
                      width: 130,
                      onPressed: () {
                        // Update booking draft state
                        ref.read(bookingDraftProvider.notifier).state =
                            ref.read(bookingDraftProvider).copyWith(hotel: hotel, room: room);
                        context.push('/booking/summary');
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
