import hotelRepository from '../repositories/hotel.repository.js';
import roomRepository from '../repositories/room.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import { ApiError } from '../utils/apiResponse.js';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

class HotelService {
  /**
   * Public: Browse and search approved hotels
   */
  async getPublicHotels(query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '10', 10)));

    let amenitiesList = [];
    if (query.amenities) {
      amenitiesList = Array.isArray(query.amenities)
        ? query.amenities
        : query.amenities.split(',').map(s => s.trim()).filter(Boolean);
    }

    const filters = {
      search: query.search || query.query,
      city: query.city || query.destination,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      minRating: query.minRating,
      guestCapacity: query.guestCapacity || query.guests,
      amenities: amenitiesList
    };

    return hotelRepository.findApproved(filters, { page, limit });
  }

  /**
   * Public: View detailed hotel by ID
   */
  async getHotelById(hotelId, requestingUser = null) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    // Visibility check: If not approved, only the owner or an admin can view it
    if (hotel.status !== 'approved') {
      const isOwner = requestingUser && Number(requestingUser.id) === Number(hotel.owner_id);
      const isAdmin = requestingUser && requestingUser.role === 'admin';
      if (!isOwner && !isAdmin) {
        throw ApiError.notFound('Hotel not found or is currently not available');
      }
    }

    // Fetch active rooms for this hotel
    const rooms = await roomRepository.findByHotelId(hotel.id, true);
    hotel.rooms = rooms;

    return hotel;
  }

  /**
   * Owner: List all hotels owned by user
   */
  async getOwnerHotels(ownerId, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    return hotelRepository.findByOwnerId(ownerId, { page, limit });
  }

  /**
   * Owner: Create a new hotel (starts in draft status)
   */
  async createHotel(ownerId, data) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const baseSlug = slugify(data.name || 'hotel');
    const slug = `${baseSlug}-${randomSuffix}`;

    return hotelRepository.create({
      ...data,
      owner_id: ownerId,
      slug
    });
  }

  /**
   * Owner: Update existing hotel details
   */
  async updateHotel(ownerId, hotelId, updateData) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    // Server-enforced ownership verification
    if (Number(hotel.owner_id) !== Number(ownerId)) {
      throw ApiError.forbidden('You do not have permission to manage this hotel');
    }

    return hotelRepository.update(hotelId, updateData);
  }

  /**
   * Owner: Submit hotel for platform approval
   */
  async submitHotel(ownerId, hotelId) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    if (Number(hotel.owner_id) !== Number(ownerId)) {
      throw ApiError.forbidden('You do not have permission to submit this hotel');
    }

    if (hotel.status === 'approved') {
      throw ApiError.badRequest('Hotel is already approved');
    }

    return hotelRepository.updateStatus(hotelId, 'pending_approval', null);
  }

  /**
   * Owner: Add uploaded image to hotel
   */
  async addHotelImage(ownerId, hotelId, imageUrl, caption = '', isPrimary = false) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    if (Number(hotel.owner_id) !== Number(ownerId)) {
      throw ApiError.forbidden('You do not have permission to upload images for this hotel');
    }

    return hotelRepository.addImage(hotelId, imageUrl, caption, isPrimary);
  }

  /**
   * Admin: List hotels awaiting approval
   */
  async getPendingHotels(query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    return hotelRepository.findPendingApprovals({ page, limit });
  }

  /**
   * Admin: Approve hotel submission
   */
  async approveHotel(hotelId) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    return hotelRepository.updateStatus(hotelId, 'approved', null);
  }

  /**
   * Admin: Reject hotel submission with reason
   */
  async rejectHotel(hotelId, reason) {
    if (!reason || !reason.trim()) {
      throw ApiError.badRequest('Rejection reason is required');
    }

    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    return hotelRepository.updateStatus(hotelId, 'rejected', reason.trim());
  }

  /**
   * Owner: Get dashboard stats, occupancy, revenue, and summaries
   */
  async getOwnerDashboard(ownerId) {
    const { items: hotels, total: totalHotels } = await hotelRepository.findByOwnerId(ownerId, { page: 1, limit: 100 });
    const { items: bookings, total: totalBookings } = await bookingRepository.findByOwnerId(ownerId, { page: 1, limit: 100 });

    const approvedHotels = hotels.filter(h => h.status === 'approved').length;
    const pendingHotels = hotels.filter(h => h.status === 'pending').length;
    const draftHotels = hotels.filter(h => h.status === 'draft').length;
    const rejectedHotels = hotels.filter(h => h.status === 'rejected').length;

    let totalRevenue = 0;
    let confirmedBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;

    for (const b of bookings) {
      if (['confirmed', 'completed'].includes(b.booking_status)) {
        totalRevenue += Number(b.grand_total || b.total_amount || 0);
      }
      if (b.booking_status === 'confirmed') confirmedBookings++;
      if (b.booking_status === 'completed') completedBookings++;
      if (b.booking_status === 'cancelled') cancelledBookings++;
    }

    const totalRooms = hotels.reduce((sum, h) => sum + (Number(h.total_rooms) || 0), 0);
    const activeReservations = confirmedBookings;
    const occupancyRate = totalRooms > 0 ? Math.min(100, Math.round((activeReservations / totalRooms) * 100 * 10) / 10) : 0;

    return {
      stats: {
        totalHotels,
        approvedHotels,
        pendingHotels,
        draftHotels,
        rejectedHotels,
        totalBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        occupancyRate
      },
      hotels: hotels.slice(0, 5),
      recentBookings: bookings.slice(0, 5)
    };
  }
}

export default new HotelService();
