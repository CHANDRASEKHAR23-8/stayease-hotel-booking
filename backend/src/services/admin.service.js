import userRepository from '../repositories/user.repository.js';
import hotelRepository from '../repositories/hotel.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import { ApiError } from '../utils/apiResponse.js';

class AdminService {
  /**
   * Admin Platform KPIs and Overview Metrics
   */
  async getDashboardMetrics() {
    const { total: totalUsers, items: users } = await userRepository.listUsers({ page: 1, limit: 100 });
    const { items: pendingHotels, total: pendingCount } = await hotelRepository.findPendingApprovals({ page: 1, limit: 100 });
    const { total: totalBookings, items: bookings } = await bookingRepository.findAll({ page: 1, limit: 100 });

    let grossRevenue = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;

    for (const b of bookings) {
      if (['confirmed', 'completed'].includes(b.booking_status)) {
        grossRevenue += Number(b.grand_total || b.total_amount || 0);
      }
      if (b.booking_status === 'confirmed') confirmedCount++;
      if (b.booking_status === 'cancelled') cancelledCount++;
    }

    const customersCount = users.filter(u => u.role === 'customer').length;
    const ownersCount = users.filter(u => u.role === 'owner').length;
    const suspendedCount = users.filter(u => u.status === 'suspended').length;

    return {
      overview: {
        totalUsers,
        customersCount,
        ownersCount,
        suspendedUsers: suspendedCount,
        pendingHotelApprovals: pendingCount,
        totalBookings,
        confirmedBookings: confirmedCount,
        cancelledBookings: cancelledCount,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
      },
      pendingHotels: pendingHotels.slice(0, 5),
      recentBookings: bookings.slice(0, 5)
    };
  }

  /**
   * Admin: List users with filters
   */
  async listUsers(query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    return userRepository.listUsers({
      search: query.search,
      role: query.role,
      status: query.status,
      page,
      limit
    });
  }

  /**
   * Admin: Suspend or activate user
   */
  async updateUserStatus(targetUserId, status, requestingAdminId) {
    if (!['active', 'suspended'].includes(status)) {
      throw ApiError.badRequest('Invalid status. Must be active or suspended');
    }

    if (Number(targetUserId) === Number(requestingAdminId) && status === 'suspended') {
      throw ApiError.badRequest('Administrators cannot suspend their own account');
    }

    const user = await userRepository.findById(targetUserId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    await userRepository.updateStatus(targetUserId, status);
    return { id: Number(targetUserId), status };
  }

  /**
   * Admin: List platform-wide reservations
   */
  async listBookings(query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    return bookingRepository.findAll({
      page,
      limit,
      status: query.status
    });
  }

  /**
   * Admin: Platform reports
   */
  async getReports() {
    const { items: bookings } = await bookingRepository.findAll({ page: 1, limit: 1000 });

    const destinationsMap = new Map();
    let totalRevenue = 0;

    for (const b of bookings) {
      const city = b.hotel_city || 'Miami';
      const amt = Number(b.grand_total || b.total_amount || 0);
      totalRevenue += amt;
      destinationsMap.set(city, (destinationsMap.get(city) || 0) + 1);
    }

    const topDestinations = Array.from(destinationsMap.entries())
      .map(([destination, bookingCount]) => ({ destination, bookingCount }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 5);

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalReservations: bookings.filter((b) => String(b.booking_status || '').toLowerCase() === 'completed').length,
      topDestinations,
      generatedAt: new Date().toISOString()
    };
  }
}

export default new AdminService();

