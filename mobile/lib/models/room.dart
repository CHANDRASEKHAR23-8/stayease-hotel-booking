class RoomImage {
  final int id;
  final String imageUrl;
  final String? caption;
  final bool isPrimary;

  const RoomImage({
    required this.id,
    required this.imageUrl,
    this.caption,
    this.isPrimary = false,
  });

  factory RoomImage.fromJson(Map<String, dynamic> json) {
    return RoomImage(
      id: json['id'] as int? ?? 0,
      imageUrl: json['image_url'] as String? ?? '',
      caption: json['caption'] as String?,
      isPrimary: json['is_primary'] == true || json['is_primary'] == 1,
    );
  }
}

class Room {
  final int id;
  final int hotelId;
  final String roomName;
  final String roomType;
  final String? description;
  final double basePrice;
  final int maxGuests;
  final int totalInventory;
  final bool isActive;
  final int sizeSqm;
  final String bedType;
  final List<RoomImage> images;

  const Room({
    required this.id,
    required this.hotelId,
    required this.roomName,
    required this.roomType,
    this.description,
    required this.basePrice,
    required this.maxGuests,
    required this.totalInventory,
    this.isActive = true,
    this.sizeSqm = 28,
    this.bedType = 'King Bed',
    this.images = const [],
  });

  String? get primaryImageUrl => images.isNotEmpty ? images.first.imageUrl : null;
  int get maxOccupancy => maxGuests;

  factory Room.fromJson(Map<String, dynamic> json) {
    final imagesList = (json['images'] as List<dynamic>?)
            ?.map((img) => RoomImage.fromJson(img as Map<String, dynamic>))
            .toList() ??
        [];

    return Room(
      id: json['id'] as int,
      hotelId: json['hotel_id'] as int? ?? 0,
      roomName: json['room_name'] as String? ?? 'Standard Room',
      roomType: json['room_type'] as String? ?? 'double',
      description: json['description'] as String?,
      basePrice: (json['base_price'] as num?)?.toDouble() ?? 0.0,
      maxGuests: json['max_guests'] as int? ?? 2,
      totalInventory: json['total_inventory'] as int? ?? 1,
      isActive: json['is_active'] == true || json['is_active'] == 1,
      sizeSqm: json['size_sqm'] as int? ?? 28,
      bedType: json['bed_type'] as String? ?? 'King Bed',
      images: imagesList,
    );
  }
}
