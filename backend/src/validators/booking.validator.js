import { body, query } from 'express-validator';
import { validate } from './auth.validator.js';

export const createBookingValidator = [
  body('hotel_id')
    .notEmpty().withMessage('Hotel ID is required')
    .isInt({ min: 1 }).withMessage('Valid Hotel ID is required'),

  body('room_id')
    .notEmpty().withMessage('Room ID is required')
    .isInt({ min: 1 }).withMessage('Valid Room ID is required'),

  body('check_in_date')
    .notEmpty().withMessage('Check-in date is required')
    .isISO8601().withMessage('Check-in date must be a valid date (YYYY-MM-DD)'),

  body('check_out_date')
    .notEmpty().withMessage('Check-out date is required')
    .isISO8601().withMessage('Check-out date must be a valid date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (value <= req.body.check_in_date) {
        throw new Error('Check-out date must be strictly after check-in date');
      }
      return true;
    }),

  body('total_rooms')
    .optional()
    .isInt({ min: 1, max: 20 }).withMessage('Total rooms must be between 1 and 20'),

  body('total_guests')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Total guests must be between 1 and 50'),

  body('guests')
    .optional()
    .isArray().withMessage('Guests must be an array'),

  validate
];

export const checkAvailabilityValidator = [
  query('checkIn')
    .notEmpty().withMessage('checkIn date parameter is required')
    .isISO8601().withMessage('checkIn must be a valid date (YYYY-MM-DD)'),

  query('checkOut')
    .notEmpty().withMessage('checkOut date parameter is required')
    .isISO8601().withMessage('checkOut must be a valid date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (value <= req.query.checkIn) {
        throw new Error('checkOut date must be strictly after checkIn date');
      }
      return true;
    }),

  validate
];

export const cancelBookingValidator = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Cancellation reason must not exceed 500 characters'),

  validate
];
