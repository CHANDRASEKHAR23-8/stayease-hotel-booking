import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../core/widgets/state_views.dart';
import '../../../models/hotel.dart';
import '../../../providers/wishlist_provider.dart';

class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wishlistAsync = ref.watch(wishlistProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Saved Stays',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
      ),
      body: wishlistAsync.when(
        loading: () => const LoadingView(message: 'Loading saved hotels...'),
        error: (err, _) => ErrorStateView(
          message: err.toString(),
          onRetry: () => ref.refresh(wishlistProvider),
        ),
        data: (hotels) {
          if (hotels.isEmpty) {
            return const EmptyStateView(
              icon: Icons.favorite_border_rounded,
              title: 'No saved hotels yet',
              description: 'Tap the heart icon on any hotel property to save it to your personal wishlist for your upcoming travels.',
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(wishlistProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: hotels.length,
              itemBuilder: (context, index) {
                final hotel = hotels[index];
                return _buildWishlistCard(context, ref, hotel);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildWishlistCard(BuildContext context, WidgetRef ref, Hotel hotel) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => context.push('/hotel/${hotel.id}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                    child: AspectRatio(
                      aspectRatio: 2.1,
                      child: Image.network(
                        hotel.primaryImage ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(color: AppColors.surfaceVariant),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.9),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.favorite_rounded, color: AppColors.error, size: 20),
                        tooltip: 'Remove from saved',
                        onPressed: () async {
                          await ref.read(wishlistOperationsProvider.notifier).toggleWishlist(hotel.id, true);
                        },
                      ),
                    ),
                  ),
                ],
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
                            hotel.name,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textPrimary),
                          ),
                        ),
                        Row(
                          children: [
                            const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                            const SizedBox(width: 4),
                            Text(
                              hotel.averageRating > 0
                                  ? hotel.averageRating.toStringAsFixed(1)
                                  : hotel.starRating.toStringAsFixed(1),
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      hotel.locationString,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text.rich(
                          TextSpan(
                            text: 'From ',
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            children: [
                              TextSpan(
                                text: DateFormatters.formatCurrency(hotel.startingPrice),
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.primary),
                              ),
                              const TextSpan(text: ' / night'),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          onPressed: () => context.push('/hotel/${hotel.id}'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.secondary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('View & Book', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
