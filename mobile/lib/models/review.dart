class Review {
  final int id;
  final int bookingId;
  final int hotelId;
  final int userId;
  final String userName;
  final String? userAvatar;
  final int rating;
  final String comment;
  final String status;
  final String createdAt;

  const Review({
    required this.id,
    required this.bookingId,
    required this.hotelId,
    required this.userId,
    required this.userName,
    this.userAvatar,
    required this.rating,
    required this.comment,
    this.status = 'approved',
    required this.createdAt,
  });

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id'] as int? ?? 0,
      bookingId: json['booking_id'] as int? ?? 0,
      hotelId: json['hotel_id'] as int? ?? 0,
      userId: json['user_id'] as int? ?? 0,
      userName: json['user_name'] as String? ?? 'Verified Guest',
      userAvatar: json['user_avatar'] as String?,
      rating: json['rating'] as int? ?? 5,
      comment: json['comment'] as String? ?? '',
      status: json['status'] as String? ?? 'approved',
      createdAt: json['created_at'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'booking_id': bookingId,
      'hotel_id': hotelId,
      'user_id': userId,
      'user_name': userName,
      'user_avatar': userAvatar,
      'rating': rating,
      'comment': comment,
      'status': status,
      'created_at': createdAt,
    };
  }
}
