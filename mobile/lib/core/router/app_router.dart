import 'package:go_router/go_router.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/auth/login/login_screen.dart';
import '../../features/auth/register/register_screen.dart';
import '../../features/customer/main_nav_screen.dart';
import '../../features/customer/hotel_details/hotel_details_screen.dart';
import '../../features/customer/booking/booking_summary_screen.dart';
import '../../features/customer/booking/booking_confirmation_screen.dart';
import '../../features/owner/owner_dashboard_screen.dart';
import '../../features/owner/add_edit_hotel_screen.dart';
import '../../features/owner/owner_hotel_rooms_screen.dart';
import '../../features/owner/add_edit_room_screen.dart';
import '../../features/owner/owner_reservations_screen.dart';
import '../../features/customer/wishlist/wishlist_screen.dart';
import '../../features/customer/notifications/notifications_screen.dart';
import '../../models/booking.dart';

final appRouter = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(
      path: '/splash',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) => const MainNavScreen(initialIndex: 0),
    ),
    GoRoute(
      path: '/search',
      builder: (context, state) => const MainNavScreen(initialIndex: 1),
    ),
    GoRoute(
      path: '/bookings',
      builder: (context, state) => const MainNavScreen(initialIndex: 2),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const MainNavScreen(initialIndex: 3),
    ),
    GoRoute(
      path: '/hotel/:id',
      builder: (context, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
        return HotelDetailsScreen(hotelId: id);
      },
    ),
    GoRoute(
      path: '/booking/summary',
      builder: (context, state) => const BookingSummaryScreen(),
    ),
    GoRoute(
      path: '/booking/confirmation',
      builder: (context, state) {
        final booking = state.extra as Booking;
        return BookingConfirmationScreen(booking: booking);
      },
    ),
    GoRoute(
      path: '/wishlist',
      builder: (context, state) => const WishlistScreen(),
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),

    // Owner Routes
    GoRoute(
      path: '/owner',
      builder: (context, state) => const OwnerDashboardScreen(),
    ),
    GoRoute(
      path: '/owner/hotels/new',
      builder: (context, state) => const AddEditHotelScreen(),
    ),
    GoRoute(
      path: '/owner/hotels/:id/edit',
      builder: (context, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
        return AddEditHotelScreen(hotelId: id);
      },
    ),
    GoRoute(
      path: '/owner/hotels/:id/rooms',
      builder: (context, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
        return OwnerHotelRoomsScreen(hotelId: id);
      },
    ),
    GoRoute(
      path: '/owner/hotels/:hotelId/rooms/new',
      builder: (context, state) {
        final hotelId = int.tryParse(state.pathParameters['hotelId'] ?? '') ?? 0;
        return AddEditRoomScreen(hotelId: hotelId);
      },
    ),
    GoRoute(
      path: '/owner/rooms/:id/edit',
      builder: (context, state) {
        final roomId = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
        return AddEditRoomScreen(roomId: roomId);
      },
    ),
    GoRoute(
      path: '/owner/reservations',
      builder: (context, state) => const OwnerReservationsScreen(),
    ),
  ],
);
