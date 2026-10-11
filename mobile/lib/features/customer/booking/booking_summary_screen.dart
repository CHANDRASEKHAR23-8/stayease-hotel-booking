import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../core/widgets/custom_text_field.dart';
import '../../../models/booking.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/booking_provider.dart';

class BookingSummaryScreen extends ConsumerStatefulWidget {
  const BookingSummaryScreen({super.key});

  @override
  ConsumerState<BookingSummaryScreen> createState() => _BookingSummaryScreenState();
}

class _BookingSummaryScreenState extends ConsumerState<BookingSummaryScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _guestNameController;
  final _specialRequestsController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final currentUser = ref.read(authStateProvider).value;
    _guestNameController = TextEditingController(text: currentUser?.name ?? '');
  }

  @override
  void dispose() {
    _guestNameController.dispose();
    _specialRequestsController.dispose();
    super.dispose();
  }

  Future<void> _selectDateRange() async {
    final draft = ref.read(bookingDraftProvider);
    final now = DateTime.now();

    final picked = await showDateRangePicker(
      context: context,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      initialDateRange: DateTimeRange(
        start: draft.checkInDate,
        end: draft.checkOutDate,
      ),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      ref.read(bookingDraftProvider.notifier).state = draft.copyWith(
        checkInDate: picked.start,
        checkOutDate: picked.end,
      );
    }
  }

  Future<void> _handleConfirmBooking() async {
    if (!_formKey.currentState!.validate()) return;

    final draft = ref.read(bookingDraftProvider);
    if (draft.hotel == null || draft.room == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a hotel and room first.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final booking = await ref.read(bookingControllerProvider).createBooking(
            hotelId: draft.hotel!.id,
            roomId: draft.room!.id,
            checkInDate: DateFormatters.toIsoDate(draft.checkInDate),
            checkOutDate: DateFormatters.toIsoDate(draft.checkOutDate),
            totalRooms: draft.totalRooms,
            totalGuests: draft.totalGuests,
            specialRequests: _specialRequestsController.text,
            guests: [
              BookingGuest(fullName: _guestNameController.text, isPrimary: true),
            ],
          );

      if (mounted) {
        context.go('/booking/confirmation', extra: booking);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(bookingDraftProvider);
    final hotel = draft.hotel;
    final room = draft.room;

    if (hotel == null || room == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Booking Summary')),
        body: Center(
          child: CustomButton(
            text: 'Browse Hotels',
            width: 200,
            onPressed: () => context.go('/home'),
          ),
        ),
      );
    }

    final nights = draft.nights;
    final subtotal = room.basePrice * draft.totalRooms * (nights > 0 ? nights : 1);
    final tax = subtotal * 0.12;
    final total = subtotal + tax;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Review & Book'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hotel Summary Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: SizedBox(
                        width: 80,
                        height: 80,
                        child: hotel.primaryImage != null
                            ? Image.network(
                                hotel.primaryImage!,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(color: AppColors.surfaceVariant),
                              )
                            : Container(color: AppColors.surfaceVariant),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            hotel.name,
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            hotel.locationString,
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.secondary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              room.roomName,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.secondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Date Selection Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('CHECK-IN', style: TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            Text(DateFormatters.formatDate(draft.checkInDate), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text('$nights nights', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('CHECK-OUT', style: TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            Text(DateFormatters.formatDate(draft.checkOutDate), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.date_range_outlined, size: 18),
                      label: const Text('Change Dates'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 40),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: _selectDateRange,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Guests & Rooms Steppers
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Rooms', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        Row(
                          children: [
                            IconButton.outlined(
                              icon: const Icon(Icons.remove, size: 16),
                              onPressed: draft.totalRooms > 1
                                  ? () => ref.read(bookingDraftProvider.notifier).state =
                                      draft.copyWith(totalRooms: draft.totalRooms - 1)
                                  : null,
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              child: Text('${draft.totalRooms}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                            ),
                            IconButton.outlined(
                              icon: const Icon(Icons.add, size: 16),
                              onPressed: draft.totalRooms < 5
                                  ? () => ref.read(bookingDraftProvider.notifier).state =
                                      draft.copyWith(totalRooms: draft.totalRooms + 1)
                                  : null,
                            ),
                          ],
                        ),
                      ],
                    ),
                    const Divider(height: 16, color: AppColors.border),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Guests', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        Row(
                          children: [
                            IconButton.outlined(
                              icon: const Icon(Icons.remove, size: 16),
                              onPressed: draft.totalGuests > 1
                                  ? () => ref.read(bookingDraftProvider.notifier).state =
                                      draft.copyWith(totalGuests: draft.totalGuests - 1)
                                  : null,
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              child: Text('${draft.totalGuests}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                            ),
                            IconButton.outlined(
                              icon: const Icon(Icons.add, size: 16),
                              onPressed: () => ref.read(bookingDraftProvider.notifier).state =
                                  draft.copyWith(totalGuests: draft.totalGuests + 1),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Guest Information Inputs
              CustomTextField(
                label: 'Primary Guest Name',
                hint: 'Full Name as on Passport/ID',
                controller: _guestNameController,
                prefixIcon: Icons.person_outline,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Primary guest name is required' : null,
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Special Requests (Optional)',
                hint: 'e.g. Quiet room, late check-in...',
                controller: _specialRequestsController,
                maxLines: 2,
                prefixIcon: Icons.message_outlined,
              ),
              const SizedBox(height: 24),

              // Price Breakdown Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Price Breakdown', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('${DateFormatters.formatCurrency(room.basePrice)} × $nights nights × ${draft.totalRooms} room(s)'),
                        Text(DateFormatters.formatCurrency(subtotal)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Taxes & Hospitality Fees (12%)'),
                        Text(DateFormatters.formatCurrency(tax)),
                      ],
                    ),
                    const Divider(height: 20, color: AppColors.border),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Amount', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                        Text(
                          DateFormatters.formatCurrency(total),
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.secondary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              CustomButton(
                text: 'Confirm & Book Stay',
                isLoading: _isSubmitting,
                onPressed: _handleConfirmBooking,
                icon: Icons.check_circle_outline_rounded,
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
