import crypto from 'crypto';
import paymentRepository from '../repositories/payment.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import notificationRepository from '../repositories/notification.repository.js';
import { generatePaymentReference } from '../utils/reference.js';
import { ApiError } from '../utils/apiResponse.js';
import env from '../config/env.js';

class PaymentService {
  /**
   * Helper: verify HMAC-SHA256 signature
   */
  verifyWebhookSignature(payload, signatureHeader) {
    if (!signatureHeader) {
      throw ApiError.unauthorized('Webhook signature missing');
    }

    const secret = env.paymentWebhookSecret;
    let expectedSignature;

    // Support both direct hex signature and standard "t=...,v1=..." formatted headers
    if (signatureHeader.includes('v1=')) {
      const parts = signatureHeader.split(',');
      const timestampPart = parts.find(p => p.startsWith('t='));
      const sigPart = parts.find(p => p.startsWith('v1='));

      if (!timestampPart || !sigPart) {
        throw ApiError.unauthorized('Invalid webhook signature format');
      }

      const timestamp = timestampPart.substring(2);
      const signature = sigPart.substring(3);
      const signedPayload = `${timestamp}.${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;

      expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      if (!this.timingSafeCompare(signature, expectedSignature)) {
        throw ApiError.unauthorized('Invalid webhook signature');
      }
      return true;
    }

    // Direct hex signature comparison
    const rawString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawString)
      .digest('hex');

    if (!this.timingSafeCompare(signatureHeader, expectedSignature)) {
      throw ApiError.unauthorized('Invalid webhook signature');
    }

    return true;
  }

  /**
   * Timing-safe buffer comparison to prevent timing attacks
   */
  timingSafeCompare(a, b) {
    try {
      const bufA = Buffer.from(a, 'utf8');
      const bufB = Buffer.from(b, 'utf8');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Generate signature for testing or outbound calls
   */
  generateTestSignature(payload) {
    const rawString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto
      .createHmac('sha256', env.paymentWebhookSecret)
      .update(rawString)
      .digest('hex');
  }

  /**
   * Initialize a payment intent/session for an existing booking
   */
  async createPaymentIntent(userId, { bookingId, paymentMethod = 'card' }) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }

    if (Number(booking.user_id) !== Number(userId)) {
      throw ApiError.forbidden('You are not authorized to pay for this reservation');
    }

    if (booking.booking_status === 'cancelled') {
      throw ApiError.badRequest('Cannot process payment for a cancelled reservation');
    }

    if (booking.payment_status === 'paid') {
      throw ApiError.badRequest('This reservation has already been paid');
    }

    // Check for existing pending payment
    const existing = await paymentRepository.findByBookingId(bookingId);
    if (existing && existing.status === 'pending') {
      return {
        paymentReference: existing.payment_reference,
        clientSecret: existing.gateway_response?.clientSecret || `pi_sec_${existing.payment_reference}`,
        amount: existing.amount,
        currency: existing.currency,
        status: existing.status,
        bookingId: booking.id
      };
    }

    const paymentReference = generatePaymentReference();
    const clientSecret = `pi_${crypto.randomBytes(16).toString('hex')}_secret_${crypto.randomBytes(12).toString('hex')}`;
    const amount = Number(booking.grand_total || booking.total_amount || 0);

    const payment = await paymentRepository.createPayment({
      booking_id: booking.id,
      user_id: userId,
      payment_reference: paymentReference,
      amount,
      currency: env.paymentCurrency,
      payment_method: paymentMethod,
      status: 'pending',
      gateway_response: {
        clientSecret,
        provider: env.paymentGatewayProvider,
        createdAt: new Date().toISOString()
      }
    });

    return {
      paymentReference: payment.payment_reference,
      clientSecret,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      bookingId: booking.id
    };
  }

  /**
   * Verify and complete payment transaction
   */
  async verifyPayment(userId, { paymentReference, transactionId, paymentMethod = 'card' }) {
    const payment = await paymentRepository.findByReference(paymentReference);
    if (!payment) {
      throw ApiError.notFound('Payment transaction not found');
    }

    if (Number(payment.user_id) !== Number(userId)) {
      throw ApiError.forbidden('Unauthorized access to payment transaction');
    }

    if (payment.status === 'succeeded') {
      return {
        success: true,
        paymentReference: payment.payment_reference,
        status: 'succeeded',
        alreadyProcessed: true
      };
    }

    // Simulating gateway failure check (e.g., if gateway returned an error or card declined)
    if (transactionId && (transactionId.startsWith('fail_') || transactionId === 'mock_fail')) {
      await paymentRepository.updateStatus(
        paymentReference,
        'failed',
        { transactionId, error: 'Card was declined by issuing bank', failedAt: new Date().toISOString() }
      );
      throw ApiError.badRequest('Payment processing failed: Card was declined by issuing bank');
    }

    const paidAt = new Date().toISOString();
    const updatedPayment = await paymentRepository.updateStatus(
      paymentReference,
      'succeeded',
      { transactionId: transactionId || `txn_${crypto.randomBytes(12).toString('hex')}`, provider: env.paymentGatewayProvider },
      paidAt
    );

    // Update booking payment and status
    const booking = await bookingRepository.findById(payment.booking_id);
    if (booking) {
      booking.payment_status = 'paid';
      booking.booking_status = 'confirmed';
      if (bookingRepository.isUsingMock()) {
        bookingRepository.memoryStore.set(booking.id, booking);
      } else {
        await bookingRepository.updateStatus(booking.id, 'confirmed');
      }

      // Notify customer of confirmation
      await notificationRepository.create({
        user_id: userId,
        title: 'Payment Successful',
        message: `Your payment of $${Number(payment.amount).toFixed(2)} was received. Booking ${booking.booking_reference} is confirmed!`,
        type: 'booking',
        reference_id: booking.booking_reference
      });
    }

    return {
      success: true,
      paymentReference: updatedPayment.payment_reference,
      bookingId: payment.booking_id,
      amount: updatedPayment.amount,
      status: 'succeeded',
      paidAt
    };
  }

  /**
   * Cancel an in-flight payment session
   */
  async cancelPayment(userId, paymentReference, reason = 'Customer cancelled checkout') {
    const payment = await paymentRepository.findByReference(paymentReference);
    if (!payment) {
      throw ApiError.notFound('Payment transaction not found');
    }

    if (Number(payment.user_id) !== Number(userId)) {
      throw ApiError.forbidden('Unauthorized payment transaction');
    }

    if (payment.status === 'succeeded') {
      throw ApiError.badRequest('Cannot cancel a completed payment transaction. Use refund flow instead.');
    }

    await paymentRepository.updateStatus(
      paymentReference,
      'failed',
      { reason, cancelledAt: new Date().toISOString() }
    );

    return {
      paymentReference,
      status: 'cancelled',
      reason
    };
  }

  /**
   * Handle Inbound Webhooks with Signature Verification and Duplicate Callback Protection
   */
  async handleWebhook(rawBody, signatureHeader) {
    // 1. Verify HMAC-SHA256 signature
    this.verifyWebhookSignature(rawBody, signatureHeader);

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const { event, data } = payload;

    if (!event || !data) {
      throw ApiError.badRequest('Malformed webhook payload structure');
    }

    const { payment_reference, transaction_id, reason } = data;
    const payment = await paymentRepository.findByReference(payment_reference);

    if (!payment) {
      throw ApiError.notFound(`Payment reference ${payment_reference} not found`);
    }

    // 2. Duplicate Callback Protection (Idempotency)
    if (event === 'payment.succeeded' && payment.status === 'succeeded') {
      return { received: true, status: 'already_processed', event };
    }

    if (event === 'payment.failed' && payment.status === 'failed') {
      return { received: true, status: 'already_processed', event };
    }

    if (event === 'payment.refunded' && payment.status === 'refunded') {
      return { received: true, status: 'already_processed', event };
    }

    // 3. Process events
    switch (event) {
      case 'payment.succeeded': {
        const paidAt = new Date().toISOString();
        await paymentRepository.updateStatus(
          payment_reference,
          'succeeded',
          { transaction_id, processedVia: 'webhook', processedAt: paidAt },
          paidAt
        );

        const booking = await bookingRepository.findById(payment.booking_id);
        if (booking) {
          booking.payment_status = 'paid';
          booking.booking_status = 'confirmed';
          if (bookingRepository.isUsingMock()) {
            bookingRepository.memoryStore.set(booking.id, booking);
          } else {
            await bookingRepository.updateStatus(booking.id, 'confirmed');
          }

          await notificationRepository.create({
            user_id: payment.user_id,
            title: 'Payment Confirmed',
            message: `Webhook confirmed payment for reservation ${booking.booking_reference}.`,
            type: 'booking',
            reference_id: booking.booking_reference
          });
        }
        break;
      }

      case 'payment.failed': {
        await paymentRepository.updateStatus(
          payment_reference,
          'failed',
          { transaction_id, reason: reason || 'Payment declined', failedAt: new Date().toISOString() }
        );

        const booking = await bookingRepository.findById(payment.booking_id);
        if (booking) {
          booking.payment_status = 'failed';
          if (bookingRepository.isUsingMock()) {
            bookingRepository.memoryStore.set(booking.id, booking);
          }
        }
        break;
      }

      case 'payment.refunded': {
        await paymentRepository.updateStatus(
          payment_reference,
          'refunded',
          { transaction_id, reason: reason || 'Refund issued', refundedAt: new Date().toISOString() }
        );

        const booking = await bookingRepository.findById(payment.booking_id);
        if (booking) {
          booking.payment_status = 'refunded';
          booking.booking_status = 'cancelled';
          if (bookingRepository.isUsingMock()) {
            bookingRepository.memoryStore.set(booking.id, booking);
          } else {
            await bookingRepository.cancelBooking(booking.id, 'Refund processed via webhook');
          }
        }
        break;
      }

      default:
        throw ApiError.badRequest(`Unhandled webhook event type: ${event}`);
    }

    return { received: true, status: 'processed', event };
  }

  /**
   * Get payment details by booking ID
   */
  async getPaymentByBooking(userId, bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }

    if (Number(booking.user_id) !== Number(userId)) {
      throw ApiError.forbidden('Access denied to booking payment details');
    }

    const payment = await paymentRepository.findByBookingId(bookingId);
    return payment;
  }
}

export default new PaymentService();
