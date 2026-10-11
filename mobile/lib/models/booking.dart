class BookingGuest {
  final int? id;
  final String fullName;
  final int? age;
  final bool isPrimary;

  const BookingGuest({
    this.id,
    required this.fullName,
    this.age,
    this.isPrimary = false,
  });

  factory BookingGuest.fromJson(Map<String, dynamic> json) {
    return BookingGuest(
      id: json['id'] as int?,
      fullName: json['full_name'] as String? ?? '',
      age: json['age'] as int?,
      isPrimary: json['is_primary'] == true || json['is_primary'] == 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'full_name': fullName,
      if (age != null) 'age': age,
      'is_primary': isPrimary,
    };
  }
}

class Booking {
  final int id;
  final String bookingReference;
  final int userId;
  final int hotelId;
  final int roomId;
  final String checkInDate;
  final String checkOutDate;
  final int totalRooms;
  final int totalGuests;
  final int totalNights;
  final double roomPricePerNight;
  final double totalAmount;
  final double taxAmount;
  final double discountAmount;
  final double grandTotal;
  final String bookingStatus;
  final String paymentStatus;
  final String? cancellationReason;
  final String? specialRequests;
  final String? hotelName;
  final String? hotelCity;
  final String? hotelImage;
  final String? roomName;
  final List<BookingGuest> guests;
  final String? createdAt;

  const Booking({
    required this.id,
    required this.bookingReference,
    required this.userId,
    required this.hotelId,
    required this.roomId,
    required this.checkInDate,
    required this.checkOutDate,
    required this.totalRooms,
    required this.totalGuests,
    required this.totalNights,
    required this.roomPricePerNight,
    required this.totalAmount,
    required this.taxAmount,
    required this.discountAmount,
    required this.grandTotal,
    required this.bookingStatus,
    required this.paymentStatus,
    this.cancellationReason,
    this.specialRequests,
    this.hotelName,
    this.hotelCity,
    this.hotelImage,
    this.roomName,
    this.guests = const [],
    this.createdAt,
  });

  bool get isConfirmed => bookingStatus == 'confirmed';
  bool get isCancelled => bookingStatus == 'cancelled';
  bool get isCompleted => bookingStatus == 'completed';

  factory Booking.fromJson(Map<String, dynamic> json) {
    final guestsList = (json['guests'] as List<dynamic>?)
            ?.map((g) => BookingGuest.fromJson(g as Map<String, dynamic>))
            .toList() ??
        [];

    return Booking(
      id: json['id'] as int,
      bookingReference: json['booking_reference'] as String? ?? '',
      userId: json['user_id'] as int? ?? 0,
      hotelId: json['hotel_id'] as int? ?? 0,
      roomId: json['room_id'] as int? ?? 0,
      checkInDate: json['check_in_date'] is String
          ? (json['check_in_date'] as String).sliceSafe(10)
          : json['check_in_date'].toString(),
      checkOutDate: json['check_out_date'] is String
          ? (json['check_out_date'] as String).sliceSafe(10)
          : json['check_out_date'].toString(),
      totalRooms: json['total_rooms'] as int? ?? 1,
      totalGuests: json['total_guests'] as int? ?? 1,
      totalNights: json['total_nights'] as int? ?? 1,
      roomPricePerNight: (json['room_price_per_night'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      taxAmount: (json['tax_amount'] as num?)?.toDouble() ?? 0.0,
      discountAmount: (json['discount_amount'] as num?)?.toDouble() ?? 0.0,
      grandTotal: (json['grand_total'] as num?)?.toDouble() ?? 0.0,
      bookingStatus: json['booking_status'] as String? ?? 'pending',
      paymentStatus: json['payment_status'] as String? ?? 'unpaid',
      cancellationReason: json['cancellation_reason'] as String?,
      specialRequests: json['special_requests'] as String?,
      hotelName: json['hotel_name'] as String?,
      hotelCity: json['hotel_city'] as String?,
      hotelImage: json['hotel_image'] as String?,
      roomName: json['room_name'] as String?,
      guests: guestsList,
      createdAt: json['created_at'] as String?,
    );
  }
}

extension SafeStringSlice on String {
  String sliceSafe(int length) {
    if (this.length <= length) return this;
    return substring(0, length);
  }
}
