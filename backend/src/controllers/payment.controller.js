import paymentService from '../services/payment.service.js';
import { successResponse } from '../utils/apiResponse.js';

class PaymentController {
  async createIntent(req, res, next) {
    try {
      const userId = req.user.id;
      const { bookingId, paymentMethod } = req.body;
      const result = await paymentService.createPaymentIntent(userId, { bookingId, paymentMethod });
      return successResponse(res, result, 'Payment intent created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async verifyPayment(req, res, next) {
    try {
      const userId = req.user.id;
      const { paymentReference, transactionId, paymentMethod } = req.body;
      const result = await paymentService.verifyPayment(userId, {
        paymentReference,
        transactionId,
        paymentMethod
      });
      return successResponse(res, result, 'Payment verified and booking confirmed');
    } catch (err) {
      next(err);
    }
  }

  async cancelPayment(req, res, next) {
    try {
      const userId = req.user.id;
      const { reference } = req.params;
      const { reason } = req.body;
      const result = await paymentService.cancelPayment(userId, reference, reason);
      return successResponse(res, result, 'Payment session cancelled');
    } catch (err) {
      next(err);
    }
  }

  async handleWebhook(req, res, next) {
    try {
      const signature = req.headers['x-stayease-signature'] || req.headers['stripe-signature'];
      const rawBody = req.body;
      const result = await paymentService.handleWebhook(rawBody, signature);
      return successResponse(res, result, 'Webhook processed successfully');
    } catch (err) {
      next(err);
    }
  }

  async getPaymentDetails(req, res, next) {
    try {
      const userId = req.user.id;
      const { bookingId } = req.params;
      const result = await paymentService.getPaymentByBooking(userId, bookingId);
      return successResponse(res, result, 'Payment details retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export default new PaymentController();
