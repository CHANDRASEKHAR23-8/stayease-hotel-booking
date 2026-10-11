import bookingService from '../services/booking.service.js';
import { paginatedResponse, successResponse } from '../utils/apiResponse.js';

class BookingController {
  /**
   * POST /api/v1/bookings
   */
  async createBooking(req, res, next) {
    try {
      const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotency_key || null;
      const { booking, isDuplicate } = await bookingService.createBooking(req.user.id, req.body, idempotencyKey);

      const status = isDuplicate ? 200 : 201;
      const message = isDuplicate
        ? 'Duplicate request recognized: returning existing reservation'
        : 'Reservation created and confirmed successfully';

      return successResponse(res, { booking, isDuplicate }, message, status);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/bookings/my
   */
  async getMyBookings(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '10', 10);
      const { items, total } = await bookingService.getUserBookings(req.user.id, req.query);
      return paginatedResponse(res, items, total, page, limit, 'Booking history retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/bookings/:bookingId
   */
  async getBookingDetails(req, res, next) {
    try {
      const booking = await bookingService.getBookingById(req.user.id, req.user.role, req.params.bookingId);
      return successResponse(res, { booking }, 'Reservation details retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/bookings/:bookingId/cancel
   */
  async cancelBooking(req, res, next) {
    try {
      const { reason } = req.body;
      const cancelledBooking = await bookingService.cancelBooking(req.user.id, req.user.role, req.params.bookingId, reason);
      return successResponse(res, { booking: cancelledBooking }, 'Booking cancelled successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/hotels/:hotelId/availability OR GET /api/v1/bookings/availability
   */
  async checkAvailability(req, res, next) {
    try {
      const hotelId = req.params.hotelId || req.query.hotelId;
      const roomId = req.query.roomId;
      const checkIn = req.query.checkIn;
      const checkOut = req.query.checkOut;
      const rooms = parseInt(req.query.rooms || '1', 10);

      const availability = await bookingService.checkRoomAvailability(hotelId, roomId, checkIn, checkOut, rooms);
      return successResponse(res, availability, 'Availability status checked');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/bookings/pricing
   */
  async getPricing(req, res, next) {
    try {
      const { roomId, checkIn, checkOut, rooms } = req.query;
      const pricing = await bookingService.calculatePricing(roomId, checkIn, checkOut, rooms || 1);
      return successResponse(res, { pricing }, 'Price calculation breakdown');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/owner/bookings
   */
  async getOwnerBookings(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const { items, total } = await bookingService.getOwnerBookings(req.user.id, req.query);
      return paginatedResponse(res, items, total, page, limit, 'Owner reservations retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export default new BookingController();
