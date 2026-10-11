import 'package:flutter_test/flutter_test.dart';
import 'package:stayease_mobile/models/app_user.dart';
import 'package:stayease_mobile/models/hotel.dart';
import 'package:stayease_mobile/models/room.dart';
import 'package:stayease_mobile/models/owner_dashboard.dart';

void main() {
  group('Phase 6 Owner Flow & Models Unit Tests', () {
    test('OwnerStats and OwnerDashboardData parse JSON metrics accurately', () {
      final json = {
        'stats': {
          'totalHotels': 3,
          'approvedHotels': 2,
          'pendingHotels': 1,
          'draftHotels': 0,
          'rejectedHotels': 0,
          'totalBookings': 14,
          'confirmedBookings': 10,
          'completedBookings': 3,
          'cancelledBookings': 1,
          'totalRevenue': 5420.75,
          'occupancyRate': 72.5,
        },
        'hotels': [
          {
            'id': 201,
            'owner_id': 2,
            'name': 'Seaside Villa',
            'slug': 'seaside-villa',
            'description': 'Luxury seaside villa',
            'address': '12 Ocean Drive',
            'city': 'Key West',
            'state': 'FL',
            'country': 'United States',
            'star_rating': 5.0,
            'average_rating': 4.9,
            'review_count': 22,
            'status': 'approved',
            'starting_price': 350.0,
          }
        ],
        'recentBookings': [],
      };

      final data = OwnerDashboardData.fromJson(json);

      expect(data.stats.totalHotels, 3);
      expect(data.stats.approvedHotels, 2);
      expect(data.stats.pendingHotels, 1);
      expect(data.stats.totalBookings, 14);
      expect(data.stats.totalRevenue, 5420.75);
      expect(data.stats.occupancyRate, 72.5);
      expect(data.hotels.length, 1);
      expect(data.hotels.first.isApproved, true);
      expect(data.hotels.first.isDraft, false);
      expect(data.hotels.first.isPending, false);
    });

    test('Hotel status getters distinguish draft, pending, approved, and rejected', () {
      const draftHotel = Hotel(
        id: 1,
        ownerId: 2,
        name: 'Draft Resort',
        slug: 'draft-resort',
        description: 'New resort',
        address: '100 Main St',
        city: 'Denver',
        country: 'United States',
        starRating: 4.0,
        averageRating: 0.0,
        reviewCount: 0,
        status: 'draft',
        startingPrice: 180.0,
      );
      expect(draftHotel.isDraft, true);
      expect(draftHotel.isApproved, false);

      const pendingHotel = Hotel(
        id: 2,
        ownerId: 2,
        name: 'Pending Resort',
        slug: 'pending-resort',
        description: 'Under review',
        address: '101 Main St',
        city: 'Denver',
        country: 'United States',
        starRating: 4.0,
        averageRating: 0.0,
        reviewCount: 0,
        status: 'pending',
        startingPrice: 180.0,
      );
      expect(pendingHotel.isPending, true);
      expect(pendingHotel.isApproved, false);

      const rejectedHotel = Hotel(
        id: 3,
        ownerId: 2,
        name: 'Rejected Resort',
        slug: 'rejected-resort',
        description: 'Needs revision',
        address: '102 Main St',
        city: 'Denver',
        country: 'United States',
        starRating: 4.0,
        averageRating: 0.0,
        reviewCount: 0,
        status: 'rejected',
        startingPrice: 180.0,
      );
      expect(rejectedHotel.isRejected, true);
    });

    test('Room maxOccupancy alias matches maxGuests and inventory fields parse', () {
      const room = Room(
        id: 10,
        hotelId: 201,
        roomName: 'Grand Penthouse',
        roomType: 'penthouse',
        basePrice: 650.0,
        maxGuests: 6,
        totalInventory: 2,
        isActive: true,
      );

      expect(room.maxOccupancy, 6);
      expect(room.maxGuests, 6);
      expect(room.totalInventory, 2);
      expect(room.isActive, true);
    });

    test('Role-based routing distinguishes customer vs owner accounts', () {
      const customer = AppUser(
        id: 1,
        name: 'John Traveler',
        email: 'john@example.com',
        role: 'customer',
        status: 'active',
      );
      expect(customer.isOwner, false);
      expect(customer.isCustomer, true);

      const owner = AppUser(
        id: 2,
        name: 'Maria Hotelier',
        email: 'maria@example.com',
        role: 'owner',
        status: 'active',
      );
      expect(owner.isOwner, true);
      expect(owner.isCustomer, false);
    });
  });
}
