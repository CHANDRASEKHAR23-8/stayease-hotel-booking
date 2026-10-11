import { Router } from 'express';
import hotelController from '../controllers/hotel.controller.js';
import bookingController from '../controllers/booking.controller.js';
import reviewController from '../controllers/review.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { checkAvailabilityValidator } from '../validators/booking.validator.js';

const router = Router();

// Public hotel endpoints
router.get('/', optionalAuthenticate, hotelController.listHotels);
router.get('/:hotelId', optionalAuthenticate, hotelController.getHotelDetails);
router.get('/:hotelId/rooms', optionalAuthenticate, hotelController.getHotelRooms);
router.get('/:hotelId/availability', checkAvailabilityValidator, bookingController.checkAvailability);

// Hotel Reviews
router.get('/:hotelId/reviews', reviewController.getHotelReviews);
router.post('/:hotelId/reviews', authenticate, reviewController.createReview);

export default router;
