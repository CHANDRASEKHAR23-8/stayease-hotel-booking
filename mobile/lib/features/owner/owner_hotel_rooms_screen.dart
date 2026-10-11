import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/date_formatters.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/state_views.dart';
import '../../models/room.dart';
import '../../providers/owner_provider.dart';

class OwnerHotelRoomsScreen extends ConsumerWidget {
  final int hotelId;

  const OwnerHotelRoomsScreen({super.key, required this.hotelId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roomsAsync = ref.watch(ownerHotelRoomsProvider(hotelId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Room Inventory',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/owner/hotels/$hotelId/rooms/new'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Room Type', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: roomsAsync.when(
        loading: () => const LoadingView(message: 'Loading hotel rooms...'),
        error: (err, _) => ErrorStateView(
          message: err.toString(),
          onRetry: () => ref.refresh(ownerHotelRoomsProvider(hotelId)),
        ),
        data: (rooms) {
          if (rooms.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.bed_outlined, size: 56, color: AppColors.textSecondary),
                    const SizedBox(height: 16),
                    const Text(
                      'No rooms configured yet',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Define your room categories, pricing, and available inventory to accept reservations.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 20),
                    CustomButton(
                      text: 'Add First Room Type',
                      width: 200,
                      onPressed: () => context.push('/owner/hotels/$hotelId/rooms/new'),
                    ),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(ownerHotelRoomsProvider(hotelId).future),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
              itemCount: rooms.length,
              itemBuilder: (context, index) {
                final room = rooms[index];
                return _buildRoomCard(context, ref, room);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildRoomCard(BuildContext context, WidgetRef ref, Room room) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 3)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        room.roomName,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Type: ${room.roomType.toUpperCase()}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: (room.isActive ? AppColors.success : AppColors.textSecondary).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    room.isActive ? 'ACTIVE' : 'DEACTIVATED',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: room.isActive ? AppColors.success : AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildInfoBadge(Icons.attach_money_rounded, '${DateFormatters.formatCurrency(room.basePrice)} / night'),
                const SizedBox(width: 14),
                _buildInfoBadge(Icons.inventory_2_outlined, '${room.totalInventory} units'),
                const SizedBox(width: 14),
                _buildInfoBadge(Icons.people_outline_rounded, 'Max ${room.maxOccupancy} guests'),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (room.isActive)
                  TextButton.icon(
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Deactivate Room?'),
                          content: Text('Are you sure you want to deactivate "${room.roomName}"? Guests will not be able to book this category.'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                              onPressed: () => Navigator.pop(ctx, true),
                              child: const Text('Deactivate', style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      );

                      if (confirm == true) {
                        try {
                          await ref.read(ownerOperationsProvider.notifier).deactivateRoom(hotelId, room.id);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Room category deactivated.')),
                            );
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error),
                            );
                          }
                        }
                      }
                    },
                    icon: const Icon(Icons.pause_circle_outline_rounded, size: 16, color: AppColors.error),
                    label: const Text('Deactivate', style: TextStyle(color: AppColors.error, fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: () => context.push('/owner/rooms/${room.id}/edit'),
                  icon: const Icon(Icons.edit_outlined, size: 16),
                  label: const Text('Edit Rates & Inventory', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.border),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoBadge(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Text(
          text,
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}
