import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayease_mobile/features/customer/notifications/notifications_screen.dart';
import 'package:stayease_mobile/features/customer/wishlist/wishlist_screen.dart';
import 'package:stayease_mobile/models/app_notification.dart';
import 'package:stayease_mobile/models/hotel.dart';
import 'package:stayease_mobile/models/review.dart';
import 'package:stayease_mobile/providers/notification_provider.dart';
import 'package:stayease_mobile/providers/wishlist_provider.dart';

void main() {
  group('Phase 7 Models & Flow Tests', () {
    test('Review model deserializes and serializes correctly', () {
      final json = {
        'id': 101,
        'booking_id': 55,
        'hotel_id': 12,
        'user_id': 7,
        'user_name': 'Eleanor Vance',
        'user_avatar': 'https://example.com/eleanor.jpg',
        'rating': 5,
        'comment': 'Exceptional stay with immaculate service and breathtaking ocean views.',
        'status': 'approved',
        'created_at': '2026-10-11T14:30:00Z',
      };

      final review = Review.fromJson(json);

      expect(review.id, 101);
      expect(review.bookingId, 55);
      expect(review.hotelId, 12);
      expect(review.userId, 7);
      expect(review.userName, 'Eleanor Vance');
      expect(review.userAvatar, 'https://example.com/eleanor.jpg');
      expect(review.rating, 5);
      expect(review.comment, 'Exceptional stay with immaculate service and breathtaking ocean views.');
      expect(review.status, 'approved');

      final out = review.toJson();
      expect(out['id'], 101);
      expect(out['booking_id'], 55);
      expect(out['rating'], 5);
      expect(out['user_name'], 'Eleanor Vance');
    });

    test('AppNotification deserializes boolean and integer is_read values correctly', () {
      final jsonBool = {
        'id': 1,
        'user_id': 20,
        'title': 'Booking Confirmed',
        'message': 'Your reservation at Grand Azure is confirmed!',
        'type': 'booking',
        'is_read': false,
        'reference_id': 'BK-20261011-0001',
        'created_at': '2026-10-11T12:00:00Z',
      };

      final notif1 = AppNotification.fromJson(jsonBool);
      expect(notif1.id, 1);
      expect(notif1.title, 'Booking Confirmed');
      expect(notif1.isRead, false);
      expect(notif1.referenceId, 'BK-20261011-0001');

      // Integer 1 from MySQL TINYINT
      final jsonInt = {
        'id': 2,
        'user_id': 20,
        'title': 'Welcome to StayEase',
        'message': 'Explore luxury hotels worldwide.',
        'type': 'general',
        'is_read': 1,
        'reference_id': null,
        'created_at': '2026-10-11T10:00:00Z',
      };

      final notif2 = AppNotification.fromJson(jsonInt);
      expect(notif2.id, 2);
      expect(notif2.isRead, true);
      expect(notif2.referenceId, isNull);
    });

    testWidgets('WishlistScreen displays empty state when wishlist is empty', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            wishlistProvider.overrideWith((ref) async => <Hotel>[]),
          ],
          child: const MaterialApp(
            home: WishlistScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Saved Stays'), findsOneWidget);
      expect(find.text('No saved hotels yet'), findsOneWidget);
    });

    testWidgets('WishlistScreen displays saved hotel cards when items exist', (tester) async {
      const sampleHotel = Hotel(
        id: 1,
        ownerId: 2,
        name: 'The Beverly Mirage',
        slug: 'the-beverly-mirage',
        description: 'Iconic Beverly Hills luxury hotel.',
        address: '9876 Wilshire Blvd',
        city: 'Beverly Hills',
        state: 'CA',
        country: 'United States',
        starRating: 5.0,
        averageRating: 4.8,
        reviewCount: 94,
        status: 'approved',
        startingPrice: 349.0,
        rooms: [],
        amenities: [],
        images: [],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            wishlistProvider.overrideWith((ref) async => [sampleHotel]),
          ],
          child: const MaterialApp(
            home: WishlistScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Saved Stays'), findsOneWidget);
      expect(find.text('The Beverly Mirage'), findsOneWidget);
      expect(find.text('Beverly Hills, CA'), findsOneWidget);
      expect(find.text('View & Book'), findsOneWidget);
    });

    testWidgets('NotificationsScreen displays notifications list with unread markers', (tester) async {
      final notifs = [
        const AppNotification(
          id: 10,
          userId: 5,
          title: 'Booking Confirmed',
          message: 'Your stay is booked successfully.',
          type: 'booking',
          isRead: false,
          referenceId: 'BK-001',
          createdAt: '2026-10-11',
        ),
        const AppNotification(
          id: 11,
          userId: 5,
          title: 'Review Published',
          message: 'Your review has been verified.',
          type: 'review',
          isRead: true,
          referenceId: null,
          createdAt: '2026-10-10',
        ),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            notificationsProvider.overrideWith((ref) async => notifs),
          ],
          child: const MaterialApp(
            home: NotificationsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Notifications'), findsOneWidget);
      expect(find.text('Booking Confirmed'), findsOneWidget);
      expect(find.text('Review Published'), findsOneWidget);
      expect(find.text('Mark all read'), findsOneWidget);
    });
  });
}
