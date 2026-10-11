import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/booking.dart';
import '../models/hotel.dart';
import '../models/room.dart';
import 'auth_provider.dart';

// Booking draft state during checkout
class BookingDraftState {
  final Hotel? hotel;
  final Room? room;
  final DateTime checkInDate;
  final DateTime checkOutDate;
  final int totalRooms;
  final int totalGuests;
  final String? specialRequests;
  final List<BookingGuest> guests;

  BookingDraftState({
    this.hotel,
    this.room,
    DateTime? checkInDate,
    DateTime? checkOutDate,
    this.totalRooms = 1,
    this.totalGuests = 1,
    this.specialRequests,
    this.guests = const [],
  })  : checkInDate = checkInDate ?? DateTime.now().add(const Duration(days: 1)),
        checkOutDate = checkOutDate ?? DateTime.now().add(const Duration(days: 3));

  int get nights => checkOutDate.difference(checkInDate).inDays;

  BookingDraftState copyWith({
    Hotel? hotel,
    Room? room,
    DateTime? checkInDate,
    DateTime? checkOutDate,
    int? totalRooms,
    int? totalGuests,
    String? specialRequests,
    List<BookingGuest>? guests,
  }) {
    return BookingDraftState(
      hotel: hotel ?? this.hotel,
      room: room ?? this.room,
      checkInDate: checkInDate ?? this.checkInDate,
      checkOutDate: checkOutDate ?? this.checkOutDate,
      totalRooms: totalRooms ?? this.totalRooms,
      totalGuests: totalGuests ?? this.totalGuests,
      specialRequests: specialRequests ?? this.specialRequests,
      guests: guests ?? this.guests,
    );
  }
}

final bookingDraftProvider = StateProvider<BookingDraftState>((ref) {
  return BookingDraftState();
});

// My Bookings Provider
final myBookingsProvider = FutureProvider.autoDispose<List<Booking>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final res = await api.get('/bookings/my?limit=50');
  final list = res['data'] as List<dynamic>? ?? [];
  return list.map((json) => Booking.fromJson(json as Map<String, dynamic>)).toList();
});

// Booking Action Controller
class BookingController {
  final Ref _ref;

  BookingController(this._ref);

  Future<Booking> createBooking({
    required int hotelId,
    required int roomId,
    required String checkInDate,
    required String checkOutDate,
    required int totalRooms,
    required int totalGuests,
    String? specialRequests,
    List<BookingGuest> guests = const [],
  }) async {
    final api = _ref.read(apiServiceProvider);

    // Create unique client idempotency key to prevent accidental double submissions
    final idempotencyKey = 'idem-mob-${DateTime.now().millisecondsSinceEpoch}';

    final res = await api.post(
      '/bookings',
      data: {
        'hotel_id': hotelId,
        'room_id': roomId,
        'check_in_date': checkInDate,
        'check_out_date': checkOutDate,
        'total_rooms': totalRooms,
        'total_guests': totalGuests,
        if (specialRequests != null && specialRequests.trim().isNotEmpty)
          'special_requests': specialRequests.trim(),
        if (guests.isNotEmpty) 'guests': guests.map((g) => g.toJson()).toList(),
      },
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    );

    final bookingJson = res['data']['booking'];
    final booking = Booking.fromJson(bookingJson);

    // Invalidate bookings list to trigger refresh
    _ref.invalidate(myBookingsProvider);
    return booking;
  }

  Future<void> cancelBooking(int bookingId, {String? reason}) async {
    final api = _ref.read(apiServiceProvider);
    await api.post('/bookings/$bookingId/cancel', data: {
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
    });
    _ref.invalidate(myBookingsProvider);
  }
}

final bookingControllerProvider = Provider<BookingController>((ref) {
  return BookingController(ref);
});
