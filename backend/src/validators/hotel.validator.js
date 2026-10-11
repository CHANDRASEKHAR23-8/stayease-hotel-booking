import { body } from 'express-validator';
import { validate } from './auth.validator.js';

export const createHotelValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Hotel name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Hotel name must be between 2 and 200 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),

  body('address')
    .trim()
    .notEmpty().withMessage('Address is required'),

  body('city')
    .trim()
    .notEmpty().withMessage('City is required'),

  body('contact_email')
    .trim()
    .notEmpty().withMessage('Contact email is required')
    .isEmail().withMessage('Valid contact email is required')
    .normalizeEmail(),

  body('contact_phone')
    .trim()
    .notEmpty().withMessage('Contact phone is required'),

  validate
];

export const updateHotelValidator = [
  body().custom(bodyFields => {
    const forbidden = ['id', 'owner_id', 'status', 'rejection_reason', 'slug', 'created_at', 'updated_at'];
    for (const f of forbidden) {
      if (bodyFields[f] !== undefined) {
        throw new Error(`Directly modifying protected hotel field "${f}" is not permitted.`);
      }
    }
    return true;
  }),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Hotel name must be between 2 and 200 characters'),

  body('contact_email')
    .optional()
    .trim()
    .isEmail().withMessage('Valid contact email is required'),

  validate
];

export const createRoomValidator = [
  body('room_name')
    .trim()
    .notEmpty().withMessage('Room name is required'),

  body('base_price')
    .notEmpty().withMessage('Base price is required')
    .isFloat({ gt: 0 }).withMessage('Base price must be a positive number'),

  body('max_guests')
    .notEmpty().withMessage('Max guests is required')
    .isInt({ min: 1, max: 30 }).withMessage('Max guests must be between 1 and 30'),

  body('total_inventory')
    .notEmpty().withMessage('Total inventory count is required')
    .isInt({ min: 1 }).withMessage('Total inventory must be at least 1'),

  body('room_type')
    .optional()
    .isIn(['single', 'double', 'deluxe', 'suite', 'family', 'penthouse'])
    .withMessage('Invalid room type'),

  validate
];

export const updateRoomValidator = [
  body().custom(bodyFields => {
    const forbidden = ['id', 'hotel_id', 'created_at', 'updated_at'];
    for (const f of forbidden) {
      if (bodyFields[f] !== undefined) {
        throw new Error(`Directly modifying protected room field "${f}" is not permitted.`);
      }
    }
    return true;
  }),

  body('base_price')
    .optional()
    .isFloat({ gt: 0 }).withMessage('Base price must be a positive number'),

  body('max_guests')
    .optional()
    .isInt({ min: 1 }).withMessage('Max guests must be at least 1'),

  body('total_inventory')
    .optional()
    .isInt({ min: 0 }).withMessage('Total inventory must be 0 or greater'),

  validate
];

export const rejectHotelValidator = [
  body('reason')
    .trim()
    .notEmpty().withMessage('Rejection reason is required')
    .isLength({ min: 3, max: 500 }).withMessage('Rejection reason must be between 3 and 500 characters'),

  validate
];
