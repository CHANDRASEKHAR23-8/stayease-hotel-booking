import wishlistRepository from '../repositories/wishlist.repository.js';
import hotelRepository from '../repositories/hotel.repository.js';
import { ApiError } from '../utils/apiResponse.js';

class WishlistService {
  /**
   * Add hotel to customer wishlist
   */
  async addToWishlist(userId, hotelId) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    await wishlistRepository.add(userId, hotelId);
    return { wishlisted: true, hotelId: Number(hotelId) };
  }

  /**
   * Remove hotel from customer wishlist
   */
  async removeFromWishlist(userId, hotelId) {
    await wishlistRepository.remove(userId, hotelId);
    return { wishlisted: false, hotelId: Number(hotelId) };
  }

  /**
   * Get user's wishlisted hotels
   */
  async getUserWishlist(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    return wishlistRepository.findByUserId(userId, { page, limit });
  }

  /**
   * Check if hotel is wishlisted
   */
  async isWishlisted(userId, hotelId) {
    return wishlistRepository.isWishlisted(userId, hotelId);
  }
}

export default new WishlistService();
