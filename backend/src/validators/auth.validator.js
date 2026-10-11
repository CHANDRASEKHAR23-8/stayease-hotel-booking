import { body, validationResult } from 'express-validator';
import { ApiError } from '../utils/apiResponse.js';

/**
 * Middleware that inspects validation errors and formats standard error response
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    return next(new ApiError('Validation failed', 400, 'VALIDATION_ERROR', formattedErrors));
  }
  next();
}

/**
 * Validation rules for user registration
 */
export const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 7, max: 25 }).withMessage('Phone number must be between 7 and 25 characters'),

  body('role')
    .optional()
    .custom(value => {
      if (value === 'admin') {
        throw new Error('Self-registering as admin is forbidden. Administrator accounts must be provisioned securely.');
      }
      if (!['customer', 'owner'].includes(value)) {
        throw new Error('Role must be either "customer" or "owner"');
      }
      return true;
    }),

  validate
];

/**
 * Validation rules for user login
 */
export const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  validate
];

/**
 * Validation rules for updating profile
 */
export const updateProfileValidator = [
  body().custom(bodyFields => {
    const forbiddenFields = ['role', 'status', 'id', 'email', 'password', 'password_hash', 'created_at', 'updated_at'];
    for (const field of forbiddenFields) {
      if (bodyFields[field] !== undefined) {
        throw new Error(`Modifying protected field "${field}" is not permitted.`);
      }
    }
    return true;
  }),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 7, max: 25 }).withMessage('Phone number must be between 7 and 25 characters'),

  body('avatar_url')
    .optional({ nullable: true })
    .trim()
    .isURL().withMessage('Avatar URL must be a valid URL'),

  validate
];

/**
 * Validation rules for changing password
 */
export const changePasswordValidator = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  validate
];
