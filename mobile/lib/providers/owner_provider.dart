import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/hotel.dart';
import '../models/room.dart';
import '../models/booking.dart';
import '../models/owner_dashboard.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

final ownerDashboardProvider = FutureProvider.autoDispose<OwnerDashboardData>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final res = await api.get('/owner/dashboard');
  final data = res.data['data'] as Map<String, dynamic>;
  return OwnerDashboardData.fromJson(data);
});

final ownerHotelsProvider = FutureProvider.autoDispose<List<Hotel>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final res = await api.get('/owner/hotels');
  final list = res.data['data'] as List<dynamic>;
  return list.map((item) => Hotel.fromJson(item as Map<String, dynamic>)).toList();
});

final ownerReservationsProvider = FutureProvider.autoDispose<List<Booking>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final res = await api.get('/owner/bookings');
  final list = res.data['data'] as List<dynamic>;
  return list.map((item) => Booking.fromJson(item as Map<String, dynamic>)).toList();
});

final ownerHotelRoomsProvider = FutureProvider.autoDispose.family<List<Room>, int>((ref, hotelId) async {
  final api = ref.watch(apiServiceProvider);
  final res = await api.get('/hotels/$hotelId/rooms');
  final list = res.data['data'] as List<dynamic>;
  return list.map((item) => Room.fromJson(item as Map<String, dynamic>)).toList();
});

class OwnerOperationsNotifier extends StateNotifier<AsyncValue<void>> {
  final ApiService _api;
  final Ref _ref;

  OwnerOperationsNotifier(this._api, this._ref) : super(const AsyncValue.data(null));

  Future<Hotel> createHotel(Map<String, dynamic> data) async {
    state = const AsyncValue.loading();
    try {
      final res = await _api.post('/owner/hotels', data: data);
      final hotel = Hotel.fromJson(res.data['data']['hotel'] as Map<String, dynamic>);
      state = const AsyncValue.data(null);
      _ref.invalidate(ownerDashboardProvider);
      _ref.invalidate(ownerHotelsProvider);
      return hotel;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<Hotel> updateHotel(int hotelId, Map<String, dynamic> data) async {
    state = const AsyncValue.loading();
    try {
      final res = await _api.patch('/owner/hotels/$hotelId', data: data);
      final hotel = Hotel.fromJson(res.data['data']['hotel'] as Map<String, dynamic>);
      state = const AsyncValue.data(null);
      _ref.invalidate(ownerDashboardProvider);
      _ref.invalidate(ownerHotelsProvider);
      return hotel;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> submitHotelForApproval(int hotelId) async {
    state = const AsyncValue.loading();
    try {
      await _api.post('/owner/hotels/$hotelId/submit');
      state = const AsyncValue.data(null);
      _ref.invalidate(ownerDashboardProvider);
      _ref.invalidate(ownerHotelsProvider);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<Room> createRoom(int hotelId, Map<String, dynamic> data) async {
    state = const AsyncValue.loading();
    try {
      final res = await _api.post('/owner/hotels/$hotelId/rooms', data: data);
      final room = Room.fromJson(res.data['data']['room'] as Map<String, dynamic>);
      state = const AsyncValue.data(null);
      _ref.invalidate(ownerHotelRoomsProvider(hotelId));
      _ref.invalidate(ownerDashboardProvider);
      return room;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<Room> updateRoom(int hotelId, int roomId, Map<String, dynamic> data) async {
    state = const AsyncValue.loading();
    try {
      final res = await _api.patch('/owner/rooms/$roomId', data: data);
      final room = Room.fromJson(res.data['data']['room'] as Map<String, dynamic>);
      state = const AsyncValue.data(null);
      _ref.invalidate(ownerHotelRoomsProvider(hotelId));
      return room;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> deactivateRoom(int hotelId, int roomId) async {
    state = const AsyncValue.loading();
    try {
      await _api.delete('/owner/rooms/$roomId');
      state = const AsyncValue.data(null);
      _ref.invalidate(ownerHotelRoomsProvider(hotelId));
      _ref.invalidate(ownerDashboardProvider);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final ownerOperationsProvider = StateNotifierProvider<OwnerOperationsNotifier, AsyncValue<void>>((ref) {
  final api = ref.watch(apiServiceProvider);
  return OwnerOperationsNotifier(api, ref);
});
