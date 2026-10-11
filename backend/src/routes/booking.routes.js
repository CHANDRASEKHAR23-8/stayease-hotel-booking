import { Router } from 'express';
import bookingController from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  createBookingValidator,
  checkAvailabilityValidator,
  cancelBookingValidator
} from '../validators/booking.validator.js';

const router = Router();

// Availability and pricing calculation (can be public or authenticated)
router.get('/availability', checkAvailabilityValidator, bookingController.checkAvailability);
router.get('/pricing', bookingController.getPricing);

// Authenticated booking operations
router.post('/', authenticate, createBookingValidator, bookingController.createBooking);
router.get('/my', authenticate, bookingController.getMyBookings);
router.get('/:bookingId', authenticate, bookingController.getBookingDetails);
router.post('/:bookingId/cancel', authenticate, cancelBookingValidator, bookingController.cancelBooking);

export default router;
