import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../core/widgets/state_views.dart';
import '../../../models/booking.dart';
import '../../../providers/booking_provider.dart';

class MyBookingsScreen extends ConsumerStatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  ConsumerState<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends ConsumerState<MyBookingsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _handleCancel(Booking booking) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Reservation?'),
        content: Text(
          'Are you sure you want to cancel your stay at ${booking.hotelName ?? 'this hotel'}?\n\n'
          'Dates: ${DateFormatters.formatDate(booking.checkInDate)} - ${DateFormatters.formatDate(booking.checkOutDate)}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep Booking'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirm Cancellation'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        await ref.read(bookingControllerProvider).cancelBooking(
              booking.id,
              reason: 'Cancelled via mobile app',
            );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Reservation has been cancelled.'),
              backgroundColor: AppColors.primary,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingsAsync = ref.watch(myBookingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Reservations'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.secondary,
          tabs: const [
            Tab(text: 'Upcoming & Confirmed'),
            Tab(text: 'Cancelled & History'),
          ],
        ),
      ),
      body: bookingsAsync.when(
        data: (bookings) {
          final activeBookings = bookings.where((b) => b.isConfirmed).toList();
          final historyBookings = bookings.where((b) => !b.isConfirmed).toList();

          return TabBarView(
            controller: _tabController,
            children: [
              _BookingsList(
                bookings: activeBookings,
                emptyTitle: 'No upcoming trips',
                emptyDesc: 'Your confirmed reservations will appear here.',
                onCancel: _handleCancel,
              ),
              _BookingsList(
                bookings: historyBookings,
                emptyTitle: 'No past reservations',
                emptyDesc: 'Completed and cancelled stays will show here.',
                onCancel: null,
              ),
            ],
          );
        },
        loading: () => const LoadingView(message: 'Loading your bookings...'),
        error: (err, _) => ErrorStateView(
          message: err.toString(),
          onRetry: () => ref.invalidate(myBookingsProvider),
        ),
      ),
    );
  }
}

class _BookingsList extends StatelessWidget {
  final List<Booking> bookings;
  final String emptyTitle;
  final String emptyDesc;
  final void Function(Booking)? onCancel;

  const _BookingsList({
    required this.bookings,
    required this.emptyTitle,
    required this.emptyDesc,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    if (bookings.isEmpty) {
      return EmptyStateView(
        icon: Icons.hotel_class_outlined,
        title: emptyTitle,
        description: emptyDesc,
        actionText: 'Explore Hotels',
        onAction: () => context.go('/home'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: bookings.length,
      itemBuilder: (context, index) {
        final booking = bookings[index];
        return _BookingItemCard(booking: booking, onCancel: onCancel);
      },
    );
  }
}

class _BookingItemCard extends StatelessWidget {
  final Booking booking;
  final void Function(Booking)? onCancel;

  const _BookingItemCard({required this.booking, this.onCancel});

  @override
  Widget build(BuildContext context) {
    final statusColor = switch (booking.bookingStatus) {
      'confirmed' => AppColors.success,
      'cancelled' => AppColors.error,
      _ => AppColors.textSecondary,
    };

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  booking.bookingReference,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.textSecondary),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    booking.bookingStatus.toUpperCase(),
                    style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              booking.hotelName ?? 'StayEase Hotel',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            if (booking.hotelCity != null) ...[
              const SizedBox(height: 2),
              Text(booking.hotelCity!, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            ],
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('DATES', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                      const SizedBox(height: 2),
                      Text(
                        '${DateFormatters.formatShortDate(booking.checkInDate)} - ${DateFormatters.formatShortDate(booking.checkOutDate)}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('TOTAL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
                      const SizedBox(height: 2),
                      Text(
                        DateFormatters.formatCurrency(booking.grandTotal),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.secondary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (booking.isConfirmed && onCancel != null) ...[
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    ),
                    onPressed: () => onCancel!(booking),
                    child: const Text('Cancel Reservation', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
