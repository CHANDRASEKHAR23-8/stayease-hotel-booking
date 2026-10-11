import hotelService from '../services/hotel.service.js';
import roomService from '../services/room.service.js';
import { paginatedResponse, successResponse, ApiError } from '../utils/apiResponse.js';

class OwnerController {
  /**
   * GET /api/v1/owner/hotels
   */
  async listMyHotels(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const { items, total } = await hotelService.getOwnerHotels(req.user.id, req.query);
      return paginatedResponse(res, items, total, page, limit, 'Owner hotels retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/owner/hotels
   */
  async createHotel(req, res, next) {
    try {
      const hotel = await hotelService.createHotel(req.user.id, req.body);
      return successResponse(res, { hotel }, 'Hotel created as draft', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/owner/hotels/:hotelId
   */
  async getHotel(req, res, next) {
    try {
      const hotel = await hotelService.getHotelById(req.params.hotelId, req.user);
      return successResponse(res, { hotel }, 'Hotel retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/owner/hotels/:hotelId
   */
  async updateHotel(req, res, next) {
    try {
      const updated = await hotelService.updateHotel(req.user.id, req.params.hotelId, req.body);
      return successResponse(res, { hotel: updated }, 'Hotel updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/owner/hotels/:hotelId/submit
   */
  async submitHotel(req, res, next) {
    try {
      const submitted = await hotelService.submitHotel(req.user.id, req.params.hotelId);
      return successResponse(res, { hotel: submitted }, 'Hotel submitted for approval');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/owner/hotels/:hotelId/images
   */
  async uploadHotelImage(req, res, next) {
    try {
      if (!req.file) {
        throw ApiError.badRequest('No image file was uploaded');
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const { caption, is_primary } = req.body;
      const img = await hotelService.addHotelImage(req.user.id, req.params.hotelId, imageUrl, caption, is_primary === 'true' || is_primary === true);
      return successResponse(res, { image: img }, 'Hotel image uploaded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/owner/hotels/:hotelId/rooms
   */
  async createRoom(req, res, next) {
    try {
      const room = await roomService.createRoom(req.user.id, req.params.hotelId, req.body);
      return successResponse(res, { room }, 'Room created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/owner/rooms/:roomId
   */
  async updateRoom(req, res, next) {
    try {
      const updated = await roomService.updateRoom(req.user.id, req.params.roomId, req.body);
      return successResponse(res, { room: updated }, 'Room updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/owner/rooms/:roomId
   */
  async deactivateRoom(req, res, next) {
    try {
      await roomService.deactivateRoom(req.user.id, req.params.roomId);
      return successResponse(res, { deactivated: true }, 'Room deactivated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/owner/rooms/:roomId/images
   */
  async uploadRoomImage(req, res, next) {
    try {
      if (!req.file) {
        throw ApiError.badRequest('No image file was uploaded');
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const { caption, is_primary } = req.body;
      const img = await roomService.addRoomImage(req.user.id, req.params.roomId, imageUrl, caption, is_primary === 'true' || is_primary === true);
      return successResponse(res, { image: img }, 'Room image uploaded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/owner/dashboard & /api/v1/owner/analytics
   */
  async getOwnerDashboard(req, res, next) {
    try {
      const dashboard = await hotelService.getOwnerDashboard(req.user.id);
      return successResponse(res, dashboard, 'Owner dashboard analytics retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export default new OwnerController();
