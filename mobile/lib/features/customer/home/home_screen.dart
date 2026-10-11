import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../core/widgets/rating_badge.dart';
import '../../../core/widgets/state_views.dart';
import '../../../models/hotel.dart';
import '../../../providers/hotel_provider.dart';
import '../../../providers/notification_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hotelsAsync = ref.watch(hotelsListProvider);

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(hotelsListProvider);
          },
          child: CustomScrollView(
            slivers: [
              // Header Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Find Your Next Stay',
                                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.5,
                                    ),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                'Handpicked luxury hotels & private retreats',
                                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              Container(
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceVariant,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: IconButton(
                                  icon: const Icon(Icons.favorite_border_rounded, color: AppColors.textPrimary),
                                  tooltip: 'Saved Stays',
                                  onPressed: () => context.push('/wishlist'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Consumer(
                                builder: (context, ref, _) {
                                  final notificationsAsync = ref.watch(notificationsProvider);
                                  final unreadCount = notificationsAsync.maybeWhen(
                                    data: (list) => list.where((n) => !n.isRead).length,
                                    orElse: () => 0,
                                  );

                                  return Container(
                                    decoration: BoxDecoration(
                                      color: AppColors.surfaceVariant,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Stack(
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.notifications_none_rounded, color: AppColors.textPrimary),
                                          tooltip: 'Notifications',
                                          onPressed: () => context.push('/notifications'),
                                        ),
                                        if (unreadCount > 0)
                                          Positioned(
                                            top: 8,
                                            right: 8,
                                            child: Container(
                                              padding: const EdgeInsets.all(4),
                                              decoration: const BoxDecoration(
                                                color: AppColors.error,
                                                shape: BoxShape.circle,
                                              ),
                                              constraints: const BoxConstraints(minWidth: 8, minHeight: 8),
                                            ),
                                          ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      // Search Bar Button leading to Search tab
                      GestureDetector(
                        onTap: () {
                          context.push('/search');
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.border),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.03),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.search_rounded, color: AppColors.secondary, size: 22),
                              SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Where are you traveling?',
                                  style: TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                              Icon(Icons.tune_rounded, color: AppColors.textSecondary, size: 20),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      // Destination Chips
                      const Text(
                        'Popular Destinations',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _DestinationChip(label: 'All Destinations', isSelected: true, onTap: () {}),
                            _DestinationChip(
                              label: 'Miami Beach',
                              onTap: () {
                                ref.read(hotelFilterProvider.notifier).state =
                                    ref.read(hotelFilterProvider).copyWith(city: 'Miami Beach');
                                context.push('/search');
                              },
                            ),
                            _DestinationChip(
                              label: 'Aspen',
                              onTap: () {
                                ref.read(hotelFilterProvider.notifier).state =
                                    ref.read(hotelFilterProvider).copyWith(city: 'Aspen');
                                context.push('/search');
                              },
                            ),
                            _DestinationChip(
                              label: 'New York',
                              onTap: () {
                                ref.read(hotelFilterProvider.notifier).state =
                                    ref.read(hotelFilterProvider).copyWith(city: 'New York');
                                context.push('/search');
                              },
                            ),
                            _DestinationChip(
                              label: 'San Diego',
                              onTap: () {
                                ref.read(hotelFilterProvider.notifier).state =
                                    ref.read(hotelFilterProvider).copyWith(city: 'San Diego');
                                context.push('/search');
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Featured Resorts & Hotels',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => context.push('/search'),
                            child: const Text(
                              'See All',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.secondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Hotel Cards List
              hotelsAsync.when(
                data: (hotels) {
                  if (hotels.isEmpty) {
                    return const SliverFillRemaining(
                      hasScrollBody: false,
                      child: EmptyStateView(
                        title: 'No hotels found',
                        description: 'Check back soon as new properties are approved.',
                      ),
                    );
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final hotel = hotels[index];
                          return _HotelCard(
                            hotel: hotel,
                            onTap: () => context.push('/hotel/${hotel.id}'),
                          );
                        },
                        childCount: hotels.length,
                      ),
                    ),
                  );
                },
                loading: () => const SliverFillRemaining(
                  hasScrollBody: false,
                  child: LoadingView(message: 'Discovering premier hotels...'),
                ),
                error: (error, _) => SliverFillRemaining(
                  hasScrollBody: false,
                  child: ErrorStateView(
                    message: error.toString(),
                    onRetry: () => ref.invalidate(hotelsListProvider),
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
            ],
          ),
        ),
      ),
    );
  }
}

class _DestinationChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _DestinationChip({
    required this.label,
    this.isSelected = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.border,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: isSelected ? Colors.white : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}

class _HotelCard extends StatelessWidget {
  final Hotel hotel;
  final VoidCallback onTap;

  const _HotelCard({
    required this.hotel,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hotel Image
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: hotel.primaryImage != null
                      ? Image.network(
                          hotel.primaryImage!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _buildFallbackImage(),
                        )
                      : _buildFallbackImage(),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            hotel.name,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        RatingBadge(rating: hotel.averageRating > 0 ? hotel.averageRating : hotel.starRating),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 15, color: AppColors.textSecondary),
                        const SizedBox(width: 4),
                        Text(
                          hotel.locationString,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Divider(height: 1, color: AppColors.border),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Starting from',
                              style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                            ),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.baseline,
                              textBaseline: TextBaseline.alphabetic,
                              children: [
                                Text(
                                  DateFormatters.formatCurrency(hotel.startingPrice > 0 ? hotel.startingPrice : 199.0),
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.secondary,
                                  ),
                                ),
                                const Text(
                                  ' / night',
                                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Text(
                            'View Details',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
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

  Widget _buildFallbackImage() {
    return Container(
      color: AppColors.surfaceVariant,
      child: const Center(
        child: Icon(Icons.hotel_rounded, size: 48, color: AppColors.textSecondary),
      ),
    );
  }
}
