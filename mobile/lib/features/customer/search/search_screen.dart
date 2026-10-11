import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../core/widgets/rating_badge.dart';
import '../../../core/widgets/state_views.dart';
import '../../../models/hotel.dart';
import '../../../providers/hotel_provider.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    final currentSearch = ref.read(hotelFilterProvider).search ?? ref.read(hotelFilterProvider).city ?? '';
    _searchController = TextEditingController(text: currentSearch);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openFilterBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => const _FilterBottomSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hotelsAsync = ref.watch(hotelsListProvider);
    final filterState = ref.watch(hotelFilterProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Search Hotels'),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune_rounded),
            onPressed: _openFilterBottomSheet,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Input Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search city, destination, or hotel name...',
                      prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textSecondary),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                ref.read(hotelFilterProvider.notifier).state =
                                    filterState.copyWith(search: '', city: '', clearCity: true);
                              },
                            )
                          : null,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onSubmitted: (value) {
                      ref.read(hotelFilterProvider.notifier).state =
                          filterState.copyWith(search: value.trim());
                    },
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  icon: const Icon(Icons.tune_rounded, size: 20),
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _openFilterBottomSheet,
                ),
              ],
            ),
          ),

          // Active filter badges indicator
          if (filterState.city != null ||
              filterState.minRating != null ||
              filterState.maxPrice != null ||
              filterState.amenities.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  const Text('Active filters:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () {
                      _searchController.clear();
                      ref.read(hotelFilterProvider.notifier).state =
                          filterState.copyWith(clearFilters: true);
                    },
                    child: const Text(
                      'Clear all',
                      style: TextStyle(fontSize: 12, color: AppColors.secondary, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),

          // Results list
          Expanded(
            child: hotelsAsync.when(
              data: (hotels) {
                if (hotels.isEmpty) {
                  return EmptyStateView(
                    title: 'No matching hotels',
                    description: 'Try adjusting your search query, dates, or removing active filters.',
                    actionText: 'Reset Filters',
                    onAction: () {
                      _searchController.clear();
                      ref.read(hotelFilterProvider.notifier).state =
                          filterState.copyWith(clearFilters: true);
                    },
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: hotels.length,
                  itemBuilder: (context, index) {
                    final hotel = hotels[index];
                    return _SearchResultCard(
                      hotel: hotel,
                      onTap: () => context.push('/hotel/${hotel.id}'),
                    );
                  },
                );
              },
              loading: () => const LoadingView(message: 'Searching available hotels...'),
              error: (err, _) => ErrorStateView(
                message: err.toString(),
                onRetry: () => ref.invalidate(hotelsListProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchResultCard extends StatelessWidget {
  final Hotel hotel;
  final VoidCallback onTap;

  const _SearchResultCard({required this.hotel, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 100,
                  height: 100,
                  child: hotel.primaryImage != null
                      ? Image.network(
                          hotel.primaryImage!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _buildFallback(),
                        )
                      : _buildFallback(),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            hotel.name,
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        RatingBadge(rating: hotel.averageRating > 0 ? hotel.averageRating : hotel.starRating, isCompact: true),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      hotel.locationString,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          DateFormatters.formatCurrency(hotel.startingPrice > 0 ? hotel.startingPrice : 199.0),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.secondary),
                        ),
                        const Text('Details →', style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w600)),
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

  Widget _buildFallback() {
    return Container(
      color: AppColors.surfaceVariant,
      child: const Center(child: Icon(Icons.hotel, color: AppColors.textSecondary)),
    );
  }
}

class _FilterBottomSheet extends ConsumerStatefulWidget {
  const _FilterBottomSheet();

  @override
  ConsumerState<_FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends ConsumerState<_FilterBottomSheet> {
  late double _maxPrice;
  double? _minRating;
  int _guestCapacity = 1;
  final List<String> _selectedAmenities = [];

  @override
  void initState() {
    super.initState();
    final f = ref.read(hotelFilterProvider);
    _maxPrice = f.maxPrice ?? 800.0;
    _minRating = f.minRating;
    _guestCapacity = f.guestCapacity ?? 1;
    _selectedAmenities.addAll(f.amenities);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Filter Hotels', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                ],
              ),
              const SizedBox(height: 16),
              // Max Price Slider
              Text('Max Price: ${DateFormatters.formatCurrency(_maxPrice)} / night', style: const TextStyle(fontWeight: FontWeight.w700)),
              Slider(
                value: _maxPrice,
                min: 100.0,
                max: 1000.0,
                divisions: 18,
                activeColor: AppColors.secondary,
                label: '\$${_maxPrice.round()}',
                onChanged: (v) => setState(() => _maxPrice = v),
              ),
              const SizedBox(height: 16),
              // Rating Selector
              const Text('Minimum Rating', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [3.5, 4.0, 4.5].map((rating) {
                  final isSelected = _minRating == rating;
                  return ChoiceChip(
                    label: Text('$rating+ ★'),
                    selected: isSelected,
                    onSelected: (sel) => setState(() => _minRating = sel ? rating : null),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              // Guest capacity
              const Text('Guest Capacity', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Row(
                children: [
                  IconButton.outlined(
                    icon: const Icon(Icons.remove),
                    onPressed: _guestCapacity > 1 ? () => setState(() => _guestCapacity--) : null,
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text('$_guestCapacity Guests', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                  IconButton.outlined(
                    icon: const Icon(Icons.add),
                    onPressed: () => setState(() => _guestCapacity++),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Amenities
              const Text('Popular Amenities', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ['wifi', 'pool', 'spa', 'beachfront', 'fitness'].map((amenity) {
                  final isSelected = _selectedAmenities.contains(amenity);
                  return FilterChip(
                    label: Text(amenity.toUpperCase()),
                    selected: isSelected,
                    onSelected: (sel) {
                      setState(() {
                        if (sel) {
                          _selectedAmenities.add(amenity);
                        } else {
                          _selectedAmenities.remove(amenity);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        ref.read(hotelFilterProvider.notifier).state = const HotelFilterState();
                        Navigator.pop(context);
                      },
                      child: const Text('Reset'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CustomButton(
                      text: 'Apply Filters',
                      onPressed: () {
                        ref.read(hotelFilterProvider.notifier).state = ref.read(hotelFilterProvider).copyWith(
                              maxPrice: _maxPrice,
                              minRating: _minRating,
                              guestCapacity: _guestCapacity,
                              amenities: _selectedAmenities,
                            );
                        Navigator.pop(context);
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
