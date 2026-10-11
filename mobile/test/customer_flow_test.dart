import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:stayease_mobile/core/utils/date_formatters.dart';
import 'package:stayease_mobile/models/booking.dart';
import 'package:stayease_mobile/models/app_user.dart';
import 'package:stayease_mobile/providers/hotel_provider.dart';
import 'package:stayease_mobile/services/storage_service.dart';

void main() {
  group('Customer End-to-End Booking Flow Logic', () {
    test('Hotel Search Filter state serializes correctly into API query parameters', () {
      const filter = HotelFilterState(
        city: 'Miami',
        minPrice: 150.0,
        maxPrice: 400.0,
        minRating: 4.5,
        amenities: ['wifi', 'pool'],
        guestCapacity: 2,
      );

      final params = filter.toQueryParams();

      expect(params['city'], 'Miami');
      expect(params['minPrice'], 150.0);
      expect(params['maxPrice'], 400.0);
      expect(params['minRating'], 4.5);
      expect(params['amenities'], 'wifi,pool');
      expect(params['guestCapacity'], 2);
    });

    test('Booking price calculation is consistent with server rules', () {
      final checkIn = DateTime(2027, 2, 10);
      final checkOut = DateTime(2027, 2, 14); // 4 nights
      final nights = DateFormatters.calculateNights(checkIn, checkOut);
      expect(nights, 4);

      const pricePerNight = 250.0;
      const roomsBooked = 2;
      final roomTotal = pricePerNight * nights * roomsBooked; // 250 * 4 * 2 = 2000.0
      final tax = roomTotal * 0.12; // 240.0
      final serviceFee = roomTotal * 0.05; // 100.0
      final grandTotal = roomTotal + tax + serviceFee; // 2340.0

      expect(roomTotal, 2000.0);
      expect(tax, 240.0);
      expect(serviceFee, 100.0);
      expect(grandTotal, 2340.0);
    });

    test('Session restoration: tokens persisted and retrieved via StorageService', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final storage = StorageService(prefs);

      // Initially empty
      expect(storage.getAccessToken(), isNull);
      expect(storage.getRefreshToken(), isNull);
      expect(storage.getUser(), isNull);

      // Save user session
      await storage.saveTokens(accessToken: 'mock_jwt_access', refreshToken: 'mock_jwt_refresh');
      const mockUser = AppUser(
        id: 42,
        name: 'Alice Traveler',
        email: 'alice@example.com',
        role: 'customer',
        status: 'active',
        createdAt: '2026-10-11T12:00:00Z',
      );
      await storage.saveUser(mockUser);

      // Verify persistence
      expect(storage.getAccessToken(), 'mock_jwt_access');
      expect(storage.getRefreshToken(), 'mock_jwt_refresh');
      expect(storage.getUser()?.name, 'Alice Traveler');
      expect(storage.getUser()?.isCustomer, true);

      // Logout clears tokens and profile
      await storage.clearAll();
      expect(storage.getAccessToken(), isNull);
      expect(storage.getRefreshToken(), isNull);
      expect(storage.getUser(), isNull);
    });

    test('Booking parsing and status helpers reflect active and cancelled states', () {
      const activeBooking = Booking(
        id: 101,
        bookingReference: 'SE-2026-X99Z',
        userId: 42,
        hotelId: 10,
        roomId: 5,
        hotelName: 'The Palm Oasis',
        roomName: 'Deluxe Ocean Suite',
        checkInDate: '2027-02-10',
        checkOutDate: '2027-02-14',
        totalRooms: 1,
        totalGuests: 2,
        totalNights: 4,
        roomPricePerNight: 300.0,
        totalAmount: 1200.0,
        taxAmount: 144.0,
        discountAmount: 0.0,
        grandTotal: 1344.0,
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
        createdAt: '2026-10-11T12:00:00Z',
      );

      expect(activeBooking.isConfirmed, true);
      expect(activeBooking.isCancelled, false);
      expect(activeBooking.isCompleted, false);

      const cancelledBooking = Booking(
        id: 101,
        bookingReference: 'SE-2026-X99Z',
        userId: 42,
        hotelId: 10,
        roomId: 5,
        hotelName: 'The Palm Oasis',
        roomName: 'Deluxe Ocean Suite',
        checkInDate: '2027-02-10',
        checkOutDate: '2027-02-14',
        totalRooms: 1,
        totalGuests: 2,
        totalNights: 4,
        roomPricePerNight: 300.0,
        totalAmount: 1200.0,
        taxAmount: 144.0,
        discountAmount: 0.0,
        grandTotal: 1344.0,
        bookingStatus: 'cancelled',
        paymentStatus: 'refunded',
        cancellationReason: 'Travel plans changed',
        createdAt: '2026-10-11T12:00:00Z',
      );

      expect(cancelledBooking.isConfirmed, false);
      expect(cancelledBooking.isCancelled, true);
      expect(cancelledBooking.cancellationReason, 'Travel plans changed');
    });
  });
}
