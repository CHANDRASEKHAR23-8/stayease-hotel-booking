import 'room.dart';

class HotelImage {
  final int id;
  final String imageUrl;
  final String? caption;
  final bool isPrimary;

  const HotelImage({
    required this.id,
    required this.imageUrl,
    this.caption,
    this.isPrimary = false,
  });

  factory HotelImage.fromJson(Map<String, dynamic> json) {
    return HotelImage(
      id: json['id'] as int? ?? 0,
      imageUrl: json['image_url'] as String? ?? '',
      caption: json['caption'] as String?,
      isPrimary: json['is_primary'] == true || json['is_primary'] == 1,
    );
  }
}

class HotelAmenity {
  final int? id;
  final String name;
  final String slug;
  final String? icon;

  const HotelAmenity({
    this.id,
    required this.name,
    required this.slug,
    this.icon,
  });

  factory HotelAmenity.fromJson(dynamic json) {
    if (json is String) {
      return HotelAmenity(name: json, slug: json);
    }
    return HotelAmenity(
      id: json['id'] as int?,
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      icon: json['icon'] as String?,
    );
  }
}

class Hotel {
  final int id;
  final int ownerId;
  final String name;
  final String slug;
  final String description;
  final String address;
  final String city;
  final String? state;
  final String country;
  final double starRating;
  final double averageRating;
  final int reviewCount;
  final String status;
  final String? primaryImage;
  final double startingPrice;
  final List<HotelImage> images;
  final List<HotelAmenity> amenities;
  final List<Room> rooms;

  const Hotel({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.slug,
    required this.description,
    required this.address,
    required this.city,
    this.state,
    required this.country,
    required this.starRating,
    required this.averageRating,
    required this.reviewCount,
    required this.status,
    this.primaryImage,
    required this.startingPrice,
    this.images = const [],
    this.amenities = const [],
    this.rooms = const [],
  });

  String get locationString => state != null && state!.isNotEmpty ? '$city, $state' : city;
  int get totalRooms => rooms.isNotEmpty ? rooms.length : 1;
  bool get isDraft => status.toLowerCase() == 'draft';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isApproved => status.toLowerCase() == 'approved';
  bool get isRejected => status.toLowerCase() == 'rejected';

  factory Hotel.fromJson(Map<String, dynamic> json) {
    // Parse images
    final imagesList = (json['images'] as List<dynamic>?)
            ?.map((img) => HotelImage.fromJson(img as Map<String, dynamic>))
            .toList() ??
        [];

    // Parse amenities
    final amenitiesList = (json['amenities'] as List<dynamic>?)
            ?.map((a) => HotelAmenity.fromJson(a))
            .toList() ??
        [];

    // Parse rooms
    final roomsList = (json['rooms'] as List<dynamic>?)
            ?.map((r) => Room.fromJson(r as Map<String, dynamic>))
            .toList() ??
        [];

    return Hotel(
      id: json['id'] as int,
      ownerId: json['owner_id'] as int? ?? 0,
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      description: json['description'] as String? ?? '',
      address: json['address'] as String? ?? '',
      city: json['city'] as String? ?? '',
      state: json['state'] as String?,
      country: json['country'] as String? ?? 'United States',
      starRating: (json['star_rating'] as num?)?.toDouble() ?? 4.0,
      averageRating: (json['average_rating'] as num?)?.toDouble() ?? 0.0,
      reviewCount: json['review_count'] as int? ?? 0,
      status: json['status'] as String? ?? 'approved',
      primaryImage: json['primary_image'] as String? ?? (imagesList.isNotEmpty ? imagesList.first.imageUrl : null),
      startingPrice: (json['starting_price'] as num?)?.toDouble() ?? 0.0,
      images: imagesList,
      amenities: amenitiesList,
      rooms: roomsList,
    );
  }
}
