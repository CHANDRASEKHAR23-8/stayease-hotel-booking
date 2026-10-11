import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/custom_text_field.dart';
import '../../providers/owner_provider.dart';

class AddEditHotelScreen extends ConsumerStatefulWidget {
  final int? hotelId;

  const AddEditHotelScreen({super.key, this.hotelId});

  @override
  ConsumerState<AddEditHotelScreen> createState() => _AddEditHotelScreenState();
}

class _AddEditHotelScreenState extends ConsumerState<AddEditHotelScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _countryController = TextEditingController(text: 'United States');
  final _priceController = TextEditingController();
  double _starRating = 4.5;
  bool _isLoading = false;

  final List<String> _availableAmenities = [
    'wifi',
    'pool',
    'spa',
    'ocean_view',
    'restaurant',
    'gym',
    'parking',
    'concierge',
  ];
  final Set<String> _selectedAmenities = {'wifi'};

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _countryController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      final payload = {
        'name': _nameController.text.trim(),
        'description': _descController.text.trim(),
        'address': _addressController.text.trim(),
        'city': _cityController.text.trim(),
        'state': _stateController.text.trim(),
        'country': _countryController.text.trim(),
        'star_rating': _starRating,
        'starting_price': double.tryParse(_priceController.text.trim()) ?? 150.0,
        'amenities': _selectedAmenities.toList(),
      };

      if (widget.hotelId != null) {
        await ref.read(ownerOperationsProvider.notifier).updateHotel(widget.hotelId!, payload);
      } else {
        await ref.read(ownerOperationsProvider.notifier).createHotel(payload);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.hotelId != null ? 'Hotel listing updated!' : 'New hotel drafted successfully!'),
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
    final isEditing = widget.hotelId != null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          isEditing ? 'Edit Hotel Listing' : 'List New Property',
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
                  'Property Information',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 14),
                CustomTextField(
                  label: 'Hotel Name',
                  hint: 'e.g. The Grand Azure Resort',
                  controller: _nameController,
                  prefixIcon: Icons.apartment_rounded,
                  validator: (v) => v == null || v.trim().isEmpty ? 'Please enter hotel name' : null,
                ),
                const SizedBox(height: 14),
                CustomTextField(
                  label: 'Street Address',
                  hint: 'e.g. 100 Ocean Drive',
                  controller: _addressController,
                  prefixIcon: Icons.location_on_outlined,
                  validator: (v) => v == null || v.trim().isEmpty ? 'Address is required' : null,
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: CustomTextField(
                        label: 'City',
                        hint: 'Miami Beach',
                        controller: _cityController,
                        validator: (v) => v == null || v.trim().isEmpty ? 'City is required' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: CustomTextField(
                        label: 'State / Prov',
                        hint: 'FL',
                        controller: _stateController,
                        validator: (v) => v == null || v.trim().isEmpty ? 'State required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                CustomTextField(
                  label: 'Country',
                  hint: 'United States',
                  controller: _countryController,
                  validator: (v) => v == null || v.trim().isEmpty ? 'Country is required' : null,
                ),
                const SizedBox(height: 14),
                CustomTextField(
                  label: 'Description & Highlights',
                  hint: 'Describe what makes your property unique, nearby attractions, views...',
                  controller: _descController,
                  maxLines: 4,
                  validator: (v) => v == null || v.trim().length < 10 ? 'Description must be at least 10 characters' : null,
                ),
                const SizedBox(height: 20),

                // Star Rating & Starting Rate
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Star Rating',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              DropdownButton<double>(
                                value: _starRating,
                                items: [3.0, 3.5, 4.0, 4.5, 5.0]
                                    .map((r) => DropdownMenuItem(value: r, child: Text('$r Stars')))
                                    .toList(),
                                onChanged: (val) {
                                  if (val != null) setState(() => _starRating = val);
                                },
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: CustomTextField(
                        label: 'Starting Price (USD)',
                        hint: '250',
                        controller: _priceController,
                        keyboardType: TextInputType.number,
                        prefixIcon: Icons.attach_money_rounded,
                        validator: (v) {
                          final p = double.tryParse(v ?? '');
                          if (p == null || p <= 0) return 'Enter valid price';
                          return null;
                        },
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),
                const Text(
                  'Featured Amenities',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _availableAmenities.map((amenity) {
                    final isSelected = _selectedAmenities.contains(amenity);
                    return FilterChip(
                      label: Text(amenity.replaceAll('_', ' ').toUpperCase()),
                      selected: isSelected,
                      selectedColor: AppColors.secondary.withValues(alpha: 0.15),
                      checkmarkColor: AppColors.secondary,
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? AppColors.secondary : AppColors.textPrimary,
                      ),
                      onSelected: (selected) {
                        setState(() {
                          if (selected) {
                            _selectedAmenities.add(amenity);
                          } else {
                            _selectedAmenities.remove(amenity);
                          }
                        });
                      },
                    );
                  }).toList(),
                ),

                const SizedBox(height: 36),
                CustomButton(
                  text: isEditing ? 'Save Changes' : 'Create Draft Property',
                  isLoading: _isLoading,
                  icon: isEditing ? Icons.save_rounded : Icons.check_circle_rounded,
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
