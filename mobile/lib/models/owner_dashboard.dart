import 'hotel.dart';
import 'booking.dart';

class OwnerStats {
  final int totalHotels;
  final int approvedHotels;
  final int pendingHotels;
  final int draftHotels;
  final int rejectedHotels;
  final int totalBookings;
  final int confirmedBookings;
  final int completedBookings;
  final int cancelledBookings;
  final double totalRevenue;
  final double occupancyRate;

  const OwnerStats({
    this.totalHotels = 0,
    this.approvedHotels = 0,
    this.pendingHotels = 0,
    this.draftHotels = 0,
    this.rejectedHotels = 0,
    this.totalBookings = 0,
    this.confirmedBookings = 0,
    this.completedBookings = 0,
    this.cancelledBookings = 0,
    this.totalRevenue = 0.0,
    this.occupancyRate = 0.0,
  });

  factory OwnerStats.fromJson(Map<String, dynamic> json) {
    return OwnerStats(
      totalHotels: json['totalHotels'] as int? ?? 0,
      approvedHotels: json['approvedHotels'] as int? ?? 0,
      pendingHotels: json['pendingHotels'] as int? ?? 0,
      draftHotels: json['draftHotels'] as int? ?? 0,
      rejectedHotels: json['rejectedHotels'] as int? ?? 0,
      totalBookings: json['totalBookings'] as int? ?? 0,
      confirmedBookings: json['confirmedBookings'] as int? ?? 0,
      completedBookings: json['completedBookings'] as int? ?? 0,
      cancelledBookings: json['cancelledBookings'] as int? ?? 0,
      totalRevenue: (json['totalRevenue'] as num?)?.toDouble() ?? 0.0,
      occupancyRate: (json['occupancyRate'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class OwnerDashboardData {
  final OwnerStats stats;
  final List<Hotel> hotels;
  final List<Booking> recentBookings;

  const OwnerDashboardData({
    required this.stats,
    this.hotels = const [],
    this.recentBookings = const [],
  });

  factory OwnerDashboardData.fromJson(Map<String, dynamic> json) {
    final statsJson = json['stats'] as Map<String, dynamic>? ?? {};
    final hotelsList = (json['hotels'] as List<dynamic>?)
            ?.map((h) => Hotel.fromJson(h as Map<String, dynamic>))
            .toList() ??
        [];
    final bookingsList = (json['recentBookings'] as List<dynamic>?)
            ?.map((b) => Booking.fromJson(b as Map<String, dynamic>))
            .toList() ??
        [];

    return OwnerDashboardData(
      stats: OwnerStats.fromJson(statsJson),
      hotels: hotelsList,
      recentBookings: bookingsList,
    );
  }
}
