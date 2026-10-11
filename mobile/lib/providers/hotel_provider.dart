import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/hotel.dart';
import '../models/room.dart';
import 'auth_provider.dart';

class HotelFilterState {
  final String? city;
  final String? search;
  final double? minPrice;
  final double? maxPrice;
  final double? minRating;
  final int? guestCapacity;
  final List<String> amenities;

  const HotelFilterState({
    this.city,
    this.search,
    this.minPrice,
    this.maxPrice,
    this.minRating,
    this.guestCapacity,
    this.amenities = const [],
  });

  HotelFilterState copyWith({
    String? city,
    String? search,
    double? minPrice,
    double? maxPrice,
    double? minRating,
    int? guestCapacity,
    List<String>? amenities,
    bool clearCity = false,
    bool clearFilters = false,
  }) {
    if (clearFilters) {
      return const HotelFilterState();
    }
    return HotelFilterState(
      city: clearCity ? null : (city ?? this.city),
      search: search ?? this.search,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      minRating: minRating ?? this.minRating,
      guestCapacity: guestCapacity ?? this.guestCapacity,
      amenities: amenities ?? this.amenities,
    );
  }

  Map<String, dynamic> toQueryParams() {
    final params = <String, dynamic>{};
    if (city != null && city!.isNotEmpty) params['city'] = city;
    if (search != null && search!.isNotEmpty) params['search'] = search;
    if (minPrice != null) params['minPrice'] = minPrice;
    if (maxPrice != null) params['maxPrice'] = maxPrice;
    if (minRating != null) params['minRating'] = minRating;
    if (guestCapacity != null) params['guestCapacity'] = guestCapacity;
    if (amenities.isNotEmpty) params['amenities'] = amenities.join(',');
    return params;
  }
}

final hotelFilterProvider = StateProvider<HotelFilterState>((ref) {
  return const HotelFilterState();
});

// Hotels list provider reacting to filter changes
final hotelsListProvider = FutureProvider.autoDispose<List<Hotel>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final filter = ref.watch(hotelFilterProvider);

  final queryParams = filter.toQueryParams();
  queryParams['limit'] = 30;

  final res = await api.get('/hotels', queryParameters: queryParams);
  final data = res['data'] as List<dynamic>? ?? [];
  return data.map((json) => Hotel.fromJson(json as Map<String, dynamic>)).toList();
});

// Hotel details provider
final hotelDetailsProvider = FutureProvider.autoDispose.family<Hotel, int>((ref, hotelId) async {
  final api = ref.watch(apiServiceProvider);
  final res = await api.get('/hotels/$hotelId');
  return Hotel.fromJson(res['data']['hotel'] as Map<String, dynamic>);
});

// Hotel rooms provider
final hotelRoomsProvider = FutureProvider.autoDispose.family<List<Room>, int>((ref, hotelId) async {
  final api = ref.watch(apiServiceProvider);
  final res = await api.get('/hotels/$hotelId/rooms');
  final list = res['data']['rooms'] as List<dynamic>? ?? [];
  return list.map((json) => Room.fromJson(json as Map<String, dynamic>)).toList();
});
