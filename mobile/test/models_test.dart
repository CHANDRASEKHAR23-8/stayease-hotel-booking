import 'package:flutter_test/flutter_test.dart';
import 'package:stayease_mobile/models/app_user.dart';
import 'package:stayease_mobile/models/hotel.dart';
import 'package:stayease_mobile/models/room.dart';
import 'package:stayease_mobile/models/booking.dart';

void main() {
  group('Data Models Unit Tests', () {
    test('AppUser parses JSON correctly and role helpers work', () {
      final json = {
        'id': 1,
        'name': 'Sarah Jenkins',
        'email': 'sarah@example.com',
        'phone': '+1-555-0100',
        'role': 'customer',
        'status': 'active',
        'avatar_url': 'https://example.com/avatar.jpg',
        'created_at': '2026-10-11T12:00:00Z',
      };

      final user = AppUser.fromJson(json);

      expect(user.id, 1);
      expect(user.name, 'Sarah Jenkins');
      expect(user.email, 'sarah@example.com');
      expect(user.phone, '+1-555-0100');
      expect(user.isCustomer, true);
      expect(user.isOwner, false);
      expect(user.isAdmin, false);

      final outJson = user.toJson();
      expect(outJson['email'], 'sarah@example.com');
    });

    test('Hotel parses JSON with nested images, amenities, and starting price', () {
      final json = {
        'id': 10,
        'owner_id': 2,
        'name': 'Grand Azure Resort',
        'slug': 'grand-azure-resort',
        'description': 'Premier oceanfront hotel with private beach.',
        'address': '1201 Ocean Drive',
        'city': 'Miami Beach',
        'state': 'FL',
        'country': 'United States',
        'star_rating': 5.0,
        'average_rating': 4.9,
        'review_count': 142,
        'status': 'approved',
        'primary_image': 'https://example.com/azure.jpg',
        'starting_price': 289.0,
        'images': [
          {'id': 1, 'image_url': 'https://example.com/azure1.jpg', 'is_primary': true},
        ],
        'amenities': [
          {'name': 'High-Speed Wi-Fi', 'slug': 'wifi'},
          'pool',
        ],
      };

      final hotel = Hotel.fromJson(json);

      expect(hotel.id, 10);
      expect(hotel.name, 'Grand Azure Resort');
      expect(hotel.locationString, 'Miami Beach, FL');
      expect(hotel.averageRating, 4.9);
      expect(hotel.startingPrice, 289.0);
      expect(hotel.images.length, 1);
      expect(hotel.amenities.length, 2);
      expect(hotel.amenities[0].slug, 'wifi');
    });

    test('Room parses JSON and attributes', () {
      final json = {
        'id': 101,
        'hotel_id': 10,
        'room_name': 'Ocean Deluxe King',
        'room_type': 'deluxe',
        'description': 'Luxury room with panoramic ocean view.',
        'base_price': 289.00,
        'max_guests': 2,
        'total_inventory': 8,
        'is_active': 1,
        'size_sqm': 42,
        'bed_type': 'King Bed',
        'images': [
          {'id': 1, 'image_url': 'https://example.com/room.jpg', 'is_primary': 1}
        ]
      };

      final room = Room.fromJson(json);

      expect(room.id, 101);
      expect(room.roomName, 'Ocean Deluxe King');
      expect(room.basePrice, 289.00);
      expect(room.maxGuests, 2);
      expect(room.totalInventory, 8);
      expect(room.isActive, true);
      expect(room.primaryImageUrl, 'https://example.com/room.jpg');
    });

    test('Booking parses JSON and calculates status properties', () {
      final json = {
        'id': 50,
        'booking_reference': 'SE-202610-8842',
        'user_id': 4,
        'hotel_id': 10,
        'room_id': 101,
        'check_in_date': '2026-11-10T00:00:00Z',
        'check_out_date': '2026-11-14T00:00:00Z',
        'total_rooms': 1,
        'total_guests': 2,
        'total_nights': 4,
        'room_price_per_night': 289.00,
        'total_amount': 1156.00,
        'tax_amount': 138.72,
        'discount_amount': 0.00,
        'grand_total': 1294.72,
        'booking_status': 'confirmed',
        'payment_status': 'paid',
        'hotel_name': 'Grand Azure Resort',
        'hotel_city': 'Miami Beach',
        'room_name': 'Ocean Deluxe King',
      };

      final booking = Booking.fromJson(json);

      expect(booking.id, 50);
      expect(booking.bookingReference, 'SE-202610-8842');
      expect(booking.checkInDate, '2026-11-10');
      expect(booking.checkOutDate, '2026-11-14');
      expect(booking.totalNights, 4);
      expect(booking.grandTotal, 1294.72);
      expect(booking.isConfirmed, true);
      expect(booking.isCancelled, false);
    });
  });
}
