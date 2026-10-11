import test, { describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../app.js';
import paymentService from '../services/payment.service.js';
import paymentRepository from '../repositories/payment.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import hotelRepository from '../repositories/hotel.repository.js';
import roomRepository from '../repositories/room.repository.js';
import userRepository from '../repositories/user.repository.js';

const request = supertest(app);

describe('PHASE 8 SUITE: Payments, Webhooks, Idempotency, and End-to-End Flows', () => {
  let customerToken = null;
  let customerUser = null;
  let otherCustomerToken = null;
  let hotelId = 10;
  let roomId = 101;

  before(async () => {
    // 1. Ensure repositories have test data seeded
    userRepository.resetMockStore();
    hotelRepository.resetMockStore();
    roomRepository.resetMockStore();
    bookingRepository.resetMockStore();
    paymentRepository.clearMockData();

    // Seed hotel & room
    hotelRepository.seedMockHotel({
      id: 10,
      owner_id: 2,
      name: 'Azure Grand Resort',
      slug: 'azure-grand-resort',
      description: 'Luxury oceanfront resort in Miami Beach with panoramic views.',
      address: '100 Ocean Drive',
      city: 'Miami',
      state: 'FL',
      country: 'United States',
      star_rating: 5.0,
      average_rating: 4.9,
      review_count: 50,
      status: 'approved',
      primary_image: 'https://example.com/azure.jpg',
      starting_price: 250.00
    });

    roomRepository.seedMockRoom({
      id: 101,
      hotel_id: 10,
      room_name: 'Oceanview King Suite',
      room_type: 'deluxe',
      description: 'Spacious suite with balcony and marble bath',
      base_price: 250.00,
      max_guests: 3,
      total_inventory: 5,
      is_active: true,
      size_sqm: 45,
      bed_type: 'King Bed'
    });

    // Register primary customer
    const regRes = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Alex Mercer',
        email: 'alex.mercer@stayease-e2e.com',
        password: 'Password123!',
        role: 'customer',
        phone: '+1-555-0199'
      });
    customerToken = regRes.body.data.tokens?.accessToken || regRes.body.data.accessToken;
    customerUser = regRes.body.data.user;

    // Register second customer for isolation checks
    const otherRes = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Jordan Lee',
        email: 'jordan.lee@stayease-e2e.com',
        password: 'Password123!',
        role: 'customer',
        phone: '+1-555-0188'
      });
    otherCustomerToken = otherRes.body.data.tokens?.accessToken || otherRes.body.data.accessToken;
  });

  test('1. End-to-End: Search hotels and verify real-time room availability', async () => {
    const searchRes = await request
      .get('/api/v1/hotels?city=miami')
      .expect(200);

    assert.equal(searchRes.body.success, true);
    assert.ok(searchRes.body.data.length >= 1);
    assert.equal(searchRes.body.data[0].id, hotelId);

    const availRes = await request
      .get(`/api/v1/bookings/availability?hotelId=${hotelId}&roomId=${roomId}&checkIn=2027-02-10&checkOut=2027-02-14&requestedRooms=1`)
      .expect(200);

    assert.equal(availRes.body.success, true);
    assert.equal(availRes.body.data.isAvailable, true);
    assert.equal(availRes.body.data.nights, 4);
  });

  test('2. End-to-End: Create transactional booking and verify server-side pricing', async () => {
    const bookingRes = await request
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', 'idemp_e2e_booking_001')
      .send({
        hotel_id: hotelId,
        room_id: roomId,
        check_in_date: '2027-02-10',
        check_out_date: '2027-02-14',
        total_rooms: 1,
        total_guests: 2,
        special_requests: 'High floor preferred'
      })
      .expect(201);

    assert.equal(bookingRes.body.success, true);
    const booking = bookingRes.body.data.booking;
    assert.equal(booking.user_id, customerUser.id);
    assert.equal(booking.total_nights, 4);
    // 250 * 4 = 1000 + 12% tax = 1120
    assert.equal(Number(booking.total_amount), 1000.00);
    assert.equal(Number(booking.grand_total), 1120.00);
    assert.ok(booking.booking_reference.startsWith('SE-'));
  });

  test('3. Payment Intent: Create payment session for pending reservation', async () => {
    const unpaidBooking = {
      id: 999,
      booking_reference: 'SE-UNPAID-001',
      user_id: customerUser.id,
      hotel_id: hotelId,
      room_id: roomId,
      check_in_date: '2027-03-01',
      check_out_date: '2027-03-05',
      total_rooms: 1,
      total_guests: 2,
      total_nights: 4,
      room_price_per_night: 250,
      total_amount: 1000,
      tax_amount: 120,
      discount_amount: 0,
      grand_total: 1120,
      booking_status: 'pending',
      payment_status: 'unpaid'
    };
    bookingRepository.seedMockBooking(unpaidBooking);

    const intentRes = await request
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: 999, paymentMethod: 'card' })
      .expect(201);

    assert.equal(intentRes.body.success, true);
    assert.ok(intentRes.body.data.paymentReference.startsWith('PAY-'));
    assert.ok(intentRes.body.data.clientSecret.startsWith('pi_'));
    assert.equal(Number(intentRes.body.data.amount), 1120);
    assert.equal(intentRes.body.data.status, 'pending');
  });

  test('4. Security: Cross-customer payment intent blocked (403 Forbidden)', async () => {
    const res = await request
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({ bookingId: 999 })
      .expect(403);

    assert.equal(res.body.success, false);
  });

  test('5. Payment Failure Handling: Failed gateway charge leaves booking protected', async () => {
    const intentRes = await request
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: 999 });

    assert.ok([200, 201].includes(intentRes.status));

    const ref = intentRes.body.data.paymentReference;

    // Simulate gateway card decline
    const failRes = await request
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        paymentReference: ref,
        transactionId: 'fail_card_declined'
      })
      .expect(400);

    assert.equal(failRes.body.success, false);
    assert.match(failRes.body.error.message, /Payment processing failed/);

    const paymentRecord = await paymentRepository.findByReference(ref);
    assert.equal(paymentRecord.status, 'failed');
  });

  test('6. Payment Success & Verification: Completes payment and confirms booking', async () => {
    const freshRef = 'PAY-SE-TEST-SUCCESS-001';
    await paymentRepository.createPayment({
      booking_id: 999,
      user_id: customerUser.id,
      payment_reference: freshRef,
      amount: 1120.00,
      currency: 'USD',
      status: 'pending'
    });

    const verifyRes = await request
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        paymentReference: freshRef,
        transactionId: 'txn_mock_success_778899'
      })
      .expect(200);

    assert.equal(verifyRes.body.success, true);
    assert.equal(verifyRes.body.data.status, 'succeeded');

    // Verify booking updated to confirmed & paid
    const updatedBooking = await bookingRepository.findById(999);
    assert.equal(updatedBooking.payment_status, 'paid');
    assert.equal(updatedBooking.booking_status, 'confirmed');
  });

  test('7. Webhook Security: Rejects webhook missing or invalid HMAC signature (401)', async () => {
    const payload = {
      event: 'payment.succeeded',
      data: { payment_reference: 'PAY-NONEXISTENT', transaction_id: 'txn_123' }
    };

    // Missing signature
    await request
      .post('/api/v1/payments/webhook')
      .send(payload)
      .expect(401);

    // Forged signature
    await request
      .post('/api/v1/payments/webhook')
      .set('x-stayease-signature', 'forged_fake_signature_hex_1234567890')
      .send(payload)
      .expect(401);
  });

  test('8. Webhook Processing: Successfully processes payment.succeeded with valid HMAC signature', async () => {
    const myBookings = await request
      .get('/api/v1/bookings/my')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const booking = myBookings.body.data[0];
    const webhookPayRef = 'PAY-SE-WEBHOOK-999';

    await paymentRepository.createPayment({
      booking_id: booking.id,
      user_id: customerUser.id,
      payment_reference: webhookPayRef,
      amount: booking.grand_total,
      currency: 'USD',
      status: 'pending'
    });

    const payload = {
      event: 'payment.succeeded',
      data: {
        payment_reference: webhookPayRef,
        transaction_id: 'txn_webhook_valid_445566'
      }
    };

    const validSig = paymentService.generateTestSignature(payload);

    const webhookRes = await request
      .post('/api/v1/payments/webhook')
      .set('x-stayease-signature', validSig)
      .send(payload)
      .expect(200);

    assert.equal(webhookRes.body.success, true);
    assert.equal(webhookRes.body.data.status, 'processed');

    const paymentRecord = await paymentRepository.findByReference(webhookPayRef);
    assert.equal(paymentRecord.status, 'succeeded');
  });

  test('9. Duplicate Callback Protection: Idempotent webhook handling', async () => {
    const webhookPayRef = 'PAY-SE-WEBHOOK-999';
    const payload = {
      event: 'payment.succeeded',
      data: {
        payment_reference: webhookPayRef,
        transaction_id: 'txn_webhook_valid_445566'
      }
    };

    const validSig = paymentService.generateTestSignature(payload);

    // Send identical webhook a second time
    const dupeRes = await request
      .post('/api/v1/payments/webhook')
      .set('x-stayease-signature', validSig)
      .send(payload)
      .expect(200);

    assert.equal(dupeRes.body.success, true);
    assert.equal(dupeRes.body.data.status, 'already_processed');
  });

  test('10. In-flight Payment Cancellation: User cancels payment session', async () => {
    const cancelPayRef = 'PAY-SE-CANCEL-TEST';
    await paymentRepository.createPayment({
      booking_id: 100,
      user_id: customerUser.id,
      payment_reference: cancelPayRef,
      amount: 450.00,
      status: 'pending'
    });

    const cancelRes = await request
      .post(`/api/v1/payments/${cancelPayRef}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Customer selected different payment method' })
      .expect(200);

    assert.equal(cancelRes.body.success, true);
    assert.equal(cancelRes.body.data.status, 'cancelled');

    const paymentRecord = await paymentRepository.findByReference(cancelPayRef);
    assert.equal(paymentRecord.status, 'failed');
  });

  test('11. End-to-End: Booking Cancellation and automatic inventory and payment restoration', async () => {
    const myBookings = await request
      .get('/api/v1/bookings/my')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const booking = myBookings.body.data[0];

    const cancelRes = await request
      .post(`/api/v1/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Flight reschedule' })
      .expect(200);

    assert.equal(cancelRes.body.success, true);
    assert.equal(cancelRes.body.data.booking.booking_status, 'cancelled');

    // Room inventory restored
    const availCheck = await request
      .get(`/api/v1/bookings/availability?hotelId=${hotelId}&roomId=${roomId}&checkIn=2027-02-10&checkOut=2027-02-14`)
      .expect(200);

    assert.equal(availCheck.body.data.isAvailable, true);
    assert.equal(availCheck.body.data.availableRooms, 5); // Full 5 rooms restored
  });
});
