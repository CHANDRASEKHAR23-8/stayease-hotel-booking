import reviewRepository from '../repositories/review.repository.js';
import hotelRepository from '../repositories/hotel.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import { ApiError } from '../utils/apiResponse.js';

class ReviewService {
  /**
   * Submit a review for a verified stay
   */
  async createReview(userId, hotelId, { bookingId, rating, comment }) {
    const numericHotelId = Number(hotelId);
    const numericRating = Number(rating);

    // 1. Validate rating range (1-5)
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      throw ApiError.badRequest('Rating must be an integer between 1 and 5 stars');
    }

    if (!comment || !comment.trim()) {
      throw ApiError.badRequest('Review comment is required');
    }

    // 2. Validate hotel existence
    const hotel = await hotelRepository.findById(numericHotelId);
    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    // 3. Validate booking eligibility & ownership
    let eligibleBookingId = bookingId;
    if (eligibleBookingId) {
      const booking = await bookingRepository.findById(eligibleBookingId);
      if (!booking) {
        throw ApiError.notFound('Booking not found');
      }
      if (Number(booking.user_id) !== Number(userId)) {
        throw ApiError.forbidden('You can only review bookings made by your account');
      }
      if (Number(booking.hotel_id) !== numericHotelId) {
        throw ApiError.badRequest('This booking is not for the specified hotel');
      }
      if (!['confirmed', 'completed'].includes(booking.booking_status)) {
        throw ApiError.badRequest('You can only review after having a confirmed or completed stay');
      }
    } else {
      // Find an eligible booking if not explicitly provided
      const eligible = await reviewRepository.findEligibleBooking(userId, numericHotelId);
      if (!eligible) {
        throw ApiError.forbidden('Only verified guests with confirmed or completed stays can review this hotel');
      }
      eligibleBookingId = eligible.id;
    }

    // 4. Duplicate prevention: ensure booking has not already been reviewed
    const existing = await reviewRepository.findByBookingId(eligibleBookingId);
    if (existing) {
      throw ApiError.badRequest('A review has already been submitted for this booking reservation');
    }

    // 5. Create review and return
    const review = await reviewRepository.create({
      booking_id: eligibleBookingId,
      hotel_id: numericHotelId,
      user_id: userId,
      rating: numericRating,
      comment: comment.trim(),
      status: 'approved'
    });

    return review;
  }

  /**
   * List approved reviews for a hotel
   */
  async getHotelReviews(hotelId, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '10', 10)));
    return reviewRepository.findByHotelId(hotelId, { page, limit });
  }
}

export default new ReviewService();
