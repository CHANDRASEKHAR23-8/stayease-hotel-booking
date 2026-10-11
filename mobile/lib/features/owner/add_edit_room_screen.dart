import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/custom_text_field.dart';
import '../../providers/owner_provider.dart';

class AddEditRoomScreen extends ConsumerStatefulWidget {
  final int? hotelId;
  final int? roomId;

  const AddEditRoomScreen({super.key, this.hotelId, this.roomId});

  @override
  ConsumerState<AddEditRoomScreen> createState() => _AddEditRoomScreenState();
}

class _AddEditRoomScreenState extends ConsumerState<AddEditRoomScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _priceController = TextEditingController();
  final _inventoryController = TextEditingController();
  final _capacityController = TextEditingController(text: '2');
  final _bedTypeController = TextEditingController(text: '1 King Bed');
  String _selectedType = 'deluxe';
  bool _isLoading = false;

  final List<String> _roomTypes = ['standard', 'deluxe', 'suite', 'penthouse', 'villa'];

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _inventoryController.dispose();
    _capacityController.dispose();
    _bedTypeController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      final payload = {
        'room_name': _nameController.text.trim(),
        'room_type': _selectedType,
        'base_price': double.parse(_priceController.text.trim()),
        'total_inventory': int.parse(_inventoryController.text.trim()),
        'max_occupancy': int.parse(_capacityController.text.trim()),
        'bed_type': _bedTypeController.text.trim(),
      };

      if (widget.roomId != null) {
        await ref.read(ownerOperationsProvider.notifier).updateRoom(
              widget.hotelId ?? 0,
              widget.roomId!,
              payload,
            );
      } else if (widget.hotelId != null) {
        await ref.read(ownerOperationsProvider.notifier).createRoom(
              widget.hotelId!,
              payload,
            );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.roomId != null ? 'Room details updated!' : 'Room category created!'),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.roomId != null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          isEditing ? 'Edit Room Type' : 'Add Room Category',
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Room Category Details',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 14),
                CustomTextField(
                  label: 'Room Name',
                  hint: 'e.g. Deluxe Ocean View King',
                  controller: _nameController,
                  prefixIcon: Icons.meeting_room_rounded,
                  validator: (v) => v == null || v.trim().isEmpty ? 'Please enter room name' : null,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Room Type',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _selectedType,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                  ),
                  items: _roomTypes
                      .map((t) => DropdownMenuItem(value: t, child: Text(t.toUpperCase())))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedType = val);
                  },
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: CustomTextField(
                        label: 'Nightly Rate (USD)',
                        hint: '250',
                        controller: _priceController,
                        keyboardType: TextInputType.number,
                        prefixIcon: Icons.attach_money_rounded,
                        validator: (v) {
                          final val = double.tryParse(v ?? '');
                          if (val == null || val <= 0) return 'Invalid price';
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: CustomTextField(
                        label: 'Total Inventory Units',
                        hint: '10',
                        controller: _inventoryController,
                        keyboardType: TextInputType.number,
                        prefixIcon: Icons.inventory_2_outlined,
                        validator: (v) {
                          final val = int.tryParse(v ?? '');
                          if (val == null || val <= 0) return 'Must be >= 1';
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: CustomTextField(
                        label: 'Max Guests',
                        hint: '2',
                        controller: _capacityController,
                        keyboardType: TextInputType.number,
                        prefixIcon: Icons.people_outline_rounded,
                        validator: (v) {
                          final val = int.tryParse(v ?? '');
                          if (val == null || val <= 0) return 'Must be >= 1';
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: CustomTextField(
                        label: 'Bedding Configuration',
                        hint: '1 King Bed',
                        controller: _bedTypeController,
                        prefixIcon: Icons.bed_rounded,
                        validator: (v) => v == null || v.trim().isEmpty ? 'Bed type required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 36),
                CustomButton(
                  text: isEditing ? 'Update Room Details' : 'Save Room Category',
                  isLoading: _isLoading,
                  icon: Icons.check_circle_rounded,
                  onPressed: _handleSubmit,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
