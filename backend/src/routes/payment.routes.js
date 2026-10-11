import { Router } from 'express';
import { body, param } from 'express-validator';
import paymentController from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../validators/auth.validator.js';

const router = Router();

// 1. Webhook Endpoint (Public, verified via HMAC-SHA256 signature header)
router.post('/webhook', paymentController.handleWebhook);

// 2. Create Payment Intent
router.post(
  '/intent',
  authenticate,
  [
    body('bookingId').isInt({ min: 1 }).withMessage('Valid bookingId is required'),
    body('paymentMethod').optional().isString().trim(),
    validate
  ],
  paymentController.createIntent
);

// 3. Verify Payment
router.post(
  '/verify',
  authenticate,
  [
    body('paymentReference').isString().notEmpty().withMessage('Payment reference is required'),
    body('transactionId').optional().isString().trim(),
    body('paymentMethod').optional().isString().trim(),
    validate
  ],
  paymentController.verifyPayment
);

// 4. Cancel In-flight Payment Session
router.post(
  '/:reference/cancel',
  authenticate,
  [
    param('reference').isString().notEmpty().withMessage('Payment reference is required'),
    body('reason').optional().isString().trim(),
    validate
  ],
  paymentController.cancelPayment
);

// 5. Get Payment Details for Booking
router.get(
  '/booking/:bookingId',
  authenticate,
  [
    param('bookingId').isInt({ min: 1 }).withMessage('Valid bookingId is required'),
    validate
  ],
  paymentController.getPaymentDetails
);

export default router;
