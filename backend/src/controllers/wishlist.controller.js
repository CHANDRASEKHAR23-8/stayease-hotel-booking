import wishlistService from '../services/wishlist.service.js';
import { paginatedResponse, successResponse } from '../utils/apiResponse.js';

class WishlistController {
  /**
   * POST /api/v1/wishlist/:hotelId
   */
  async addToWishlist(req, res, next) {
    try {
      const result = await wishlistService.addToWishlist(req.user.id, req.params.hotelId);
      return successResponse(res, result, 'Hotel saved to wishlist');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/wishlist/:hotelId
   */
  async removeFromWishlist(req, res, next) {
    try {
      const result = await wishlistService.removeFromWishlist(req.user.id, req.params.hotelId);
      return successResponse(res, result, 'Hotel removed from wishlist');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/wishlist
   */
  async getMyWishlist(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const { items, total } = await wishlistService.getUserWishlist(req.user.id, req.query);
      return paginatedResponse(res, items, total, page, limit, 'Wishlist items retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/wishlist/:hotelId/status
   */
  async checkStatus(req, res, next) {
    try {
      const isWishlisted = await wishlistService.isWishlisted(req.user.id, req.params.hotelId);
      return successResponse(res, { isWishlisted }, 'Wishlist status checked');
    } catch (err) {
      next(err);
    }
  }
}

export default new WishlistController();
