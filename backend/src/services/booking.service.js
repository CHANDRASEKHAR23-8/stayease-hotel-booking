import bookingRepository from '../repositories/booking.repository.js';
import roomRepository from '../repositories/room.repository.js';
import hotelRepository from '../repositories/hotel.repository.js';
import paymentRepository from '../repositories/payment.repository.js';
import { generateBookingReference } from '../utils/reference.js';
import { ApiError } from '../utils/apiResponse.js';

class BookingService {
  /**
   * Helper to parse and calculate nights between two ISO date strings (YYYY-MM-DD)
   */
  calculateNights(checkInStr, checkOutStr) {
    const inDate = new Date(checkInStr + 'T00:00:00Z');
    const outDate = new Date(checkOutStr + 'T00:00:00Z');
    const diffMs = outDate.getTime() - inDate.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return nights;
  }

  /**
   * Calculate authoritative price breakdown on the server using database rates
   */
  async calculatePricing(roomId, checkInStr, checkOutStr, totalRooms = 1) {
    const room = await roomRepository.findById(roomId);
    if (!room) {
      throw ApiError.notFound('Room not found');
    }

    const totalNights = this.calculateNights(checkInStr, checkOutStr);
    if (totalNights < 1) {
      throw ApiError.badRequest('Check-out date must be at least one day after check-in date');
    }

    const roomPricePerNight = Number(room.base_price);
    const totalAmount = Math.round(roomPricePerNight * Number(totalRooms) * totalNights * 100) / 100;
    const taxRate = 0.12; // 12% standard hotel occupancy tax
    const taxAmount = Math.round(totalAmount * taxRate * 100) / 100;
    const discountAmount = 0.00;
    const grandTotal = Math.round((totalAmount + taxAmount - discountAmount) * 100) / 100;

    return {
      roomId: room.id,
      roomName: room.room_name,
      roomPricePerNight,
      totalRooms: Number(totalRooms),
      totalNights,
      totalAmount,
      taxAmount,
      discountAmount,
      grandTotal
    };
  }

  /**
   * Check room availability for date range
   */
  async checkRoomAvailability(hotelId, roomId, checkInStr, checkOutStr, requestedRooms = 1) {
    const room = await roomRepository.findById(roomId);
    if (!room) {
      throw ApiError.notFound('Room not found');
    }

    if (hotelId && Number(room.hotel_id) !== Number(hotelId)) {
      throw ApiError.badRequest('Room does not belong to specified hotel');
    }

    if (!room.is_active) {
      return {
        isAvailable: false,
        availableRooms: 0,
        totalInventory: room.total_inventory,
        requestedRooms: Number(requestedRooms),
        reason: 'Room type is currently deactivated'
      };
    }

    const totalNights = this.calculateNights(checkInStr, checkOutStr);
    if (totalNights < 1) {
      throw ApiError.badRequest('Check-out date must be after check-in date');
    }

    const availableRooms = await bookingRepository.getRoomAvailability(
      roomId,
      room.total_inventory,
      checkInStr,
      checkOutStr
    );

    return {
      isAvailable: availableRooms >= Number(requestedRooms),
      availableRooms,
      totalInventory: room.total_inventory,
      requestedRooms: Number(requestedRooms),
      nights: totalNights
    };
  }

  /**
   * Transactional booking creation
   */
  async createBooking(userId, data, idempotencyKey = null) {
    const {
      hotel_id,
      room_id,
      check_in_date,
      check_out_date,
      total_rooms = 1,
      total_guests = 1,
      special_requests = null,
      guests = []
    } = data;

    // 1. Idempotency Check: if key already processed, return existing booking
    if (idempotencyKey) {
      const existing = await bookingRepository.findByIdempotencyKey(userId, idempotencyKey);
      if (existing) {
        return { booking: existing, isDuplicate: true };
      }
    }

    // 2. Validate dates
    const totalNights = this.calculateNights(check_in_date, check_out_date);
    if (totalNights < 1) {
      throw ApiError.badRequest('Check-out date must be at least one day after check-in date');
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (check_in_date < todayStr) {
      throw ApiError.badRequest('Check-in date cannot be in the past');
    }

    // 3. Fetch room and hotel
    const room = await roomRepository.findById(room_id);
    if (!room || !room.is_active) {
      throw ApiError.notFound('Selected room type is unavailable');
    }

    if (Number(room.hotel_id) !== Number(hotel_id)) {
      throw ApiError.badRequest('Room does not belong to specified hotel');
    }

    const hotel = await hotelRepository.findById(hotel_id);
    if (!hotel || hotel.status !== 'approved') {
      throw ApiError.badRequest('Hotel is not available for bookings');
    }

    // 4. Capacity validation: ensure rooms can accommodate all guests
    const maxAllowedGuests = Number(room.max_guests) * Number(total_rooms);
    if (Number(total_guests) > maxAllowedGuests) {
      throw ApiError.badRequest(
        `Selected room capacity (${maxAllowedGuests} guests for ${total_rooms} room(s)) is insufficient for ${total_guests} guests.`
      );
    }

    // 5. Pre-check availability
    const availableCount = await bookingRepository.getRoomAvailability(
      room.id,
      room.total_inventory,
      check_in_date,
      check_out_date
    );

    if (availableCount < Number(total_rooms)) {
      throw ApiError.conflict(
        `Only ${availableCount} room(s) available for the selected dates. You requested ${total_rooms}.`
      );
    }

    // 6. Authoritative Server-side Price Calculation (Never trust client prices)
    const pricing = await this.calculatePricing(room.id, check_in_date, check_out_date, total_rooms);

    // 7. Generate unique booking reference
    const booking_reference = generateBookingReference();

    // 8. Execute transactional reservation with concurrency locks
    const bookingResult = await bookingRepository.createTransactionalBooking({
      booking_reference,
      user_id: userId,
      hotel_id,
      room_id,
      check_in_date,
      check_out_date,
      total_rooms: Number(total_rooms),
      total_guests: Number(total_guests),
      total_nights: totalNights,
      room_price_per_night: pricing.roomPricePerNight,
      total_amount: pricing.totalAmount,
      tax_amount: pricing.taxAmount,
      discount_amount: pricing.discountAmount,
      grand_total: pricing.grandTotal,
      special_requests,
      idempotency_key: idempotencyKey || null,
      guests
    });

    const finalBooking = typeof bookingResult === 'object'
      ? bookingResult
      : await bookingRepository.findById(bookingResult);

    try {
      await paymentRepository.createPayment({
        booking_id: finalBooking.id,
        user_id: userId,
        payment_reference: `PAY-${finalBooking.booking_reference}`,
        amount: finalBooking.grand_total,
        currency: 'USD',
        payment_method: 'card',
        status: finalBooking.payment_status === 'paid' ? 'succeeded' : 'pending',
        gateway_response: { bookingReference: finalBooking.booking_reference, processedAt: new Date().toISOString() },
        paid_at: finalBooking.payment_status === 'paid' ? new Date().toISOString() : null
      });
    } catch (_) {
      // Non-blocking in mock/fallback
    }

    return { booking: finalBooking, isDuplicate: false };
  }

  /**
   * Get booking details with server-enforced authorization
   */
  async getBookingById(userId, userRole, bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }

    // Server-enforced ownership:
    // Admin can view any booking
    if (userRole === 'admin') {
      return booking;
    }

    // Customer can only view their own bookings
    if (userRole === 'customer') {
      if (Number(booking.user_id) !== Number(userId)) {
        throw ApiError.forbidden('You do not have permission to view this booking');
      }
      return booking;
    }

    // Owner can view bookings for their hotels
    if (userRole === 'owner') {
      const hotel = await hotelRepository.findById(booking.hotel_id);
      if (!hotel || Number(hotel.owner_id) !== Number(userId)) {
        throw ApiError.forbidden('You do not have permission to view this reservation');
      }
      return booking;
    }

    throw ApiError.forbidden('Unauthorized access');
  }

  /**
   * Cancel an eligible booking
   */
  async cancelBooking(userId, userRole, bookingId, reason = 'Customer requested cancellation') {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }

    // Ownership check: Customer can only cancel their own booking; admin can cancel any
    if (userRole !== 'admin' && Number(booking.user_id) !== Number(userId)) {
      throw ApiError.forbidden('You do not have permission to cancel this booking');
    }

    if (booking.booking_status === 'cancelled') {
      throw ApiError.badRequest('This booking is already cancelled');
    }

    if (booking.booking_status === 'completed') {
      throw ApiError.badRequest('Completed stays cannot be cancelled');
    }

    // Cancellation date check: Cannot cancel past bookings
    const todayStr = new Date().toISOString().slice(0, 10);
    const checkInStr = typeof booking.check_in_date === 'string'
      ? booking.check_in_date.slice(0, 10)
      : booking.check_in_date.toISOString().slice(0, 10);

    if (checkInStr < todayStr) {
      throw ApiError.badRequest('Cannot cancel past or ongoing stays');
    }

    const updated = await bookingRepository.cancelBooking(bookingId, reason);

    // Update payment record to refunded if payment exists
    try {
      const payment = await paymentRepository.findByBookingId(bookingId);
      if (payment && payment.status === 'succeeded') {
        await paymentRepository.updateStatus(payment.payment_reference, 'refunded', {
          refundReason: reason,
          refundedAt: new Date().toISOString()
        });
      }
    } catch (_) {
      // Non-blocking in mock/fallback
    }

    return updated;
  }

  /**
   * Customer: Get my booking history
   */
  async getUserBookings(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '10', 10)));
    return bookingRepository.findByUserId(userId, { page, limit });
  }

  /**
   * Owner: Get reservations for owned hotels
   */
  async getOwnerBookings(ownerId, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    return bookingRepository.findByOwnerId(ownerId, { page, limit });
  }
}

export default new BookingService();
