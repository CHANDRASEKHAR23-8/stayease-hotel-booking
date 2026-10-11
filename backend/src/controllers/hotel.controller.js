import hotelService from '../services/hotel.service.js';
import roomService from '../services/room.service.js';
import { paginatedResponse, successResponse } from '../utils/apiResponse.js';

class HotelController {
  /**
   * GET /api/v1/hotels
   */
  async listHotels(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '10', 10);
      const { items, total } = await hotelService.getPublicHotels(req.query);
      return paginatedResponse(res, items, total, page, limit, 'Hotels retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/hotels/:hotelId
   */
  async getHotelDetails(req, res, next) {
    try {
      const hotel = await hotelService.getHotelById(req.params.hotelId, req.user);
      return successResponse(res, { hotel }, 'Hotel details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/hotels/:hotelId/rooms
   */
  async getHotelRooms(req, res, next) {
    try {
      const rooms = await roomService.getRoomsForHotel(req.params.hotelId, req.user);
      return successResponse(res, { rooms }, 'Hotel rooms retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default new HotelController();
