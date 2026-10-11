import reviewService from '../services/review.service.js';
import { paginatedResponse, successResponse } from '../utils/apiResponse.js';

class ReviewController {
  /**
   * POST /api/v1/hotels/:hotelId/reviews
   */
  async createReview(req, res, next) {
    try {
      const review = await reviewService.createReview(req.user.id, req.params.hotelId, req.body);
      return successResponse(res, { review }, 'Review submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/hotels/:hotelId/reviews
   */
  async getHotelReviews(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '10', 10);
      const { items, total } = await reviewService.getHotelReviews(req.params.hotelId, req.query);
      return paginatedResponse(res, items, total, page, limit, 'Hotel reviews retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export default new ReviewController();
