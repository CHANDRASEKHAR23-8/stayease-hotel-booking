import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import bcrypt from 'bcryptjs';

import app from '../app.js';
import userRepository from '../repositories/user.repository.js';
import hotelRepository from '../repositories/hotel.repository.js';
import roomRepository from '../repositories/room.repository.js';
import bookingRepository from '../repositories/booking.repository.js';

test('PHASE 4 SUITE: Availability, Pricing, Concurrency, Transactions, Idempotency, and Cancellations', async (t) => {
  // Clear all stores
  userRepository.resetMockStore();
  hotelRepository.resetMockStore();
  roomRepository.resetMockStore();
  bookingRepository.resetMockStore();

  const pwHash = await bcrypt.hash('Password123!', 10);

  // Seed Users: Admin (1), Owner (2), Customer 1 (3), Customer 2 (4)
  userRepository.seedMockUser({ id: 1, name: 'Admin', email: 'admin@stayease.com', password_hash: pwHash, role: 'admin', status: 'active' });
  userRepository.seedMockUser({ id: 2, name: 'Grand Owner', email: 'owner@stayease.com', password_hash: pwHash, role: 'owner', status: 'active' });
  userRepository.seedMockUser({ id: 3, name: 'Customer One', email: 'customer1@stayease.com', password_hash: pwHash, role: 'customer', status: 'active' });
  userRepository.seedMockUser({ id: 4, name: 'Customer Two', email: 'customer2@stayease.com', password_hash: pwHash, role: 'customer', status: 'active' });

  // Get Auth Tokens
  const getAuthToken = async (email) => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Password123!' });
    return res.body.data.tokens.accessToken;
  };

  const adminToken = await getAuthToken('admin@stayease.com');
  const ownerToken = await getAuthToken('owner@stayease.com');
  const customer1Token = await getAuthToken('customer1@stayease.com');
  const customer2Token = await getAuthToken('customer2@stayease.com');

  // Seed Approved Hotel (10)
  hotelRepository.seedMockHotel({
    id: 10,
    owner_id: 2,
    name: 'Seaside Grand Resort',
    slug: 'seaside-grand-resort',
    description: 'Premier seaside luxury resort with private beach.',
    address: '500 Boardwalk Ave',
    city: 'Miami Beach',
    state: 'FL',
    star_rating: 5.0,
    average_rating: 4.9,
    status: 'approved'
  });

  // Room 1: King Ocean Suite (Inventory = 1) -> Ideal for concurrency & single inventory tests
  roomRepository.seedMockRoom({
    id: 101,
    hotel_id: 10,
    room_name: 'Presidential Ocean Suite',
    room_type: 'suite',
    base_price: 300.00,
    max_guests: 2,
    total_inventory: 1,
    is_active: true
  });

  // Room 2: Classic Double Room (Inventory = 3) -> For multi-room tests
  roomRepository.seedMockRoom({
    id: 102,
    hotel_id: 10,
    room_name: 'Classic Double',
    room_type: 'double',
    base_price: 150.00,
    max_guests: 4,
    total_inventory: 3,
    is_active: true
  });

  // 1. NON-OVERLAPPING BOOKINGS & CHECK-OUT DATE EXCLUSION
  await t.test('1. Check-out date exclusion: Non-overlapping bookings on consecutive dates succeed', async () => {
    // Guest A books Oct 15 to Oct 17 (Nights: Oct 15, Oct 16)
    const resA = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        hotel_id: 10,
        room_id: 101,
        check_in_date: '2026-10-15',
        check_out_date: '2026-10-17',
        total_rooms: 1,
        total_guests: 2
      });

    assert.strictEqual(resA.status, 201);
    assert.strictEqual(resA.body.data.booking.booking_status, 'confirmed');

    // Guest B books Oct 17 to Oct 20 (Nights: Oct 17, 18, 19)
    // Check-in is Oct 17, exact day Guest A checks out -> MUST SUCCEED (Inventory = 1)
    const resB = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        hotel_id: 10,
        room_id: 101,
        check_in_date: '2026-10-17',
        check_out_date: '2026-10-20',
        total_rooms: 1,
        total_guests: 1
      });

    assert.strictEqual(resB.status, 201);
    assert.strictEqual(resB.body.data.booking.booking_status, 'confirmed');
  });

  // 2. OVERLAPPING BOOKING ATTEMPTS
  await t.test('2. Overlapping date ranges: Booking attempt for occupied dates is rejected with 409', async () => {
    // Room 101 is already occupied Oct 15-17 and Oct 17-20.
    // Try to book Oct 16 to Oct 18 (overlaps night of Oct 16 with Guest A)
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        hotel_id: 10,
        room_id: 101,
        check_in_date: '2026-10-16',
        check_out_date: '2026-10-18',
        total_rooms: 1,
        total_guests: 2
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.message.includes('available'));
  });

  // 3. MULTI-ROOM BOOKINGS & NEGATIVE INVENTORY PREVENTION
  await t.test('3. Multi-room inventory control: Cannot exceed total inventory', async () => {
    // Room 102 has total_inventory = 3.
    // Customer 1 books 2 rooms for Nov 10 - Nov 12
    const res1 = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        hotel_id: 10,
        room_id: 102,
        check_in_date: '2026-11-10',
        check_out_date: '2026-11-12',
        total_rooms: 2,
        total_guests: 4
      });

    assert.strictEqual(res1.status, 201);

    // Customer 2 attempts to book 2 rooms for the same dates (only 1 room left) -> 409 Conflict
    const resFail = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        hotel_id: 10,
        room_id: 102,
        check_in_date: '2026-11-10',
        check_out_date: '2026-11-12',
        total_rooms: 2,
        total_guests: 4
      });

    assert.strictEqual(resFail.status, 409);

    // Customer 2 books remaining 1 room -> 201 Created (0 rooms left)
    const resOk = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        hotel_id: 10,
        room_id: 102,
        check_in_date: '2026-11-10',
        check_out_date: '2026-11-12',
        total_rooms: 1,
        total_guests: 2
      });

    assert.strictEqual(resOk.status, 201);

    // Further booking attempt for 1 room fails -> Inventory cannot become negative
    const resDepleted = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        hotel_id: 10,
        room_id: 102,
        check_in_date: '2026-11-10',
        check_out_date: '2026-11-12',
        total_rooms: 1,
        total_guests: 1
      });

    assert.strictEqual(resDepleted.status, 409);
  });

  // 4. SERVER-SIDE PRICE CALCULATION INTEGRITY
  await t.test('4. Price integrity: Server calculates price using database rates and ignores client tampering', async () => {
    // Room 102 price is $150/night.
    // 2 rooms for 3 nights: 2 * 3 * 150 = $900.
    // Tax (12%): $108.
    // Grand Total: $1008.
    // Client maliciously sends $1.00 as base_price and grand_total.
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        hotel_id: 10,
        room_id: 102,
        check_in_date: '2026-12-01',
        check_out_date: '2026-12-04',
        total_rooms: 2,
        total_guests: 4,
        room_price_per_night: 1.00, // Malicious override
        grand_total: 1.00 // Malicious override
      });

    assert.strictEqual(res.status, 201);
    const booking = res.body.data.booking;
    assert.strictEqual(Number(booking.room_price_per_night), 150.00, 'Must use DB room price');
    assert.strictEqual(Number(booking.total_amount), 900.00);
    assert.strictEqual(Number(booking.tax_amount), 108.00);
    assert.strictEqual(Number(booking.grand_total), 1008.00, 'Must calculate authoritative total');
  });

  // 5. CONCURRENT BOOKING SIMULATION FOR LAST AVAILABLE ROOM
  await t.test('5. Concurrency safety: Simultaneous booking requests for the last room allow exactly one success', async () => {
    // Room 101 has inventory = 1.
    // Choose dates Dec 20 - Dec 23 (currently empty).
    // Send two concurrent requests simultaneously with Promise.all
    const bookingPayload = {
      hotel_id: 10,
      room_id: 101,
      check_in_date: '2026-12-20',
      check_out_date: '2026-12-23',
      total_rooms: 1,
      total_guests: 2
    };

    const [req1, req2] = await Promise.all([
      request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${customer1Token}`).send(bookingPayload),
      request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${customer2Token}`).send(bookingPayload)
    ]);

    const statuses = [req1.status, req2.status].sort();
    assert.deepStrictEqual(statuses, [201, 409], 'Exactly one request must succeed (201) and the other must fail with conflict (409)');
  });

  // 6. IDEMPOTENCY KEY PROTECTION
  await t.test('6. Idempotency: Repeated requests with same idempotency key return original booking safely', async () => {
    const idemKey = 'idem-unique-key-998877';
    const payload = {
      hotel_id: 10,
      room_id: 102,
      check_in_date: '2026-12-25',
      check_out_date: '2026-12-28',
      total_rooms: 1,
      total_guests: 2
    };

    // First request
    const firstRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .set('Idempotency-Key', idemKey)
      .send(payload);

    assert.strictEqual(firstRes.status, 201);
    assert.strictEqual(firstRes.body.data.isDuplicate, false);
    const initialReference = firstRes.body.data.booking.booking_reference;

    // Duplicate request with identical key
    const duplicateRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .set('Idempotency-Key', idemKey)
      .send(payload);

    assert.strictEqual(duplicateRes.status, 200);
    assert.strictEqual(duplicateRes.body.data.isDuplicate, true);
    assert.strictEqual(duplicateRes.body.data.booking.booking_reference, initialReference);
  });

  // 7. BOOKING HISTORY & ACCESS AUTHORIZATION
  let testBookingId = null;

  await t.test('7. Booking History: Customer sees their bookings; unauthorized access is blocked with 403', async () => {
    // Fetch Customer 1 bookings
    const myBookingsRes = await request(app)
      .get('/api/v1/bookings/my')
      .set('Authorization', `Bearer ${customer1Token}`);

    assert.strictEqual(myBookingsRes.status, 200);
    assert.ok(myBookingsRes.body.data.length > 0);
    testBookingId = myBookingsRes.body.data[0].id;

    // Customer 1 can view their own booking details
    const ownerView = await request(app)
      .get(`/api/v1/bookings/${testBookingId}`)
      .set('Authorization', `Bearer ${customer1Token}`);
    assert.strictEqual(ownerView.status, 200);

    // Customer 2 attempts to view Customer 1's booking -> 403 Forbidden
    const trespasserRes = await request(app)
      .get(`/api/v1/bookings/${testBookingId}`)
      .set('Authorization', `Bearer ${customer2Token}`);
    assert.strictEqual(trespasserRes.status, 403);

    // Hotel Owner can view the booking for their hotel
    const hotelOwnerView = await request(app)
      .get(`/api/v1/bookings/${testBookingId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.strictEqual(hotelOwnerView.status, 200);

    // Platform Admin can view the booking
    const adminView = await request(app)
      .get(`/api/v1/bookings/${testBookingId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(adminView.status, 200);
  });

  // 8. CANCELLATION ELIGIBILITY & INVENTORY RESTORATION
  await t.test('8. Cancellation: Cancels reservation, restores inventory, and blocks repeated cancellations', async () => {
    // Create a new booking for Customer 2 to cancel
    const bookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        hotel_id: 10,
        room_id: 101,
        check_in_date: '2027-01-10',
        check_out_date: '2027-01-15',
        total_rooms: 1,
        total_guests: 2
      });

    assert.strictEqual(bookRes.status, 201);
    const cancelTargetId = bookRes.body.data.booking.id;

    // Availability during Jan 10-15 should now be 0
    const availBefore = await request(app).get(`/api/v1/bookings/availability?hotelId=10&roomId=101&checkIn=2027-01-10&checkOut=2027-01-15`);
    assert.strictEqual(availBefore.body.data.availableRooms, 0);

    // Customer 2 cancels the booking
    const cancelRes = await request(app)
      .post(`/api/v1/bookings/${cancelTargetId}/cancel`)
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ reason: 'Trip rescheduled' });

    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.data.booking.booking_status, 'cancelled');

    // Repeated cancellation attempt fails with 400
    const repeatCancelRes = await request(app)
      .post(`/api/v1/bookings/${cancelTargetId}/cancel`)
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ reason: 'Try again' });

    assert.strictEqual(repeatCancelRes.status, 400);

    // Verify inventory restoration: Availability is now back to 1!
    const availAfter = await request(app).get(`/api/v1/bookings/availability?hotelId=10&roomId=101&checkIn=2027-01-10&checkOut=2027-01-15`);
    assert.strictEqual(availAfter.body.data.availableRooms, 1);
  });

  // 9. VALIDATION & SECURITY: INVALID DATES, NEGATIVE NUMBERS, CAPACITY
  await t.test('9. Validation & Security: Reject invalid dates, negative quantities, capacity overflow', async () => {
    // Check-out before check-in
    const badDateRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        hotel_id: 10,
        room_id: 101,
        check_in_date: '2026-11-20',
        check_out_date: '2026-11-19', // Out before in
        total_rooms: 1,
        total_guests: 1
      });
    assert.strictEqual(badDateRes.status, 400);

    // Zero or negative rooms
    const badRoomsRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        hotel_id: 10,
        room_id: 101,
        check_in_date: '2026-11-20',
        check_out_date: '2026-11-22',
        total_rooms: 0,
        total_guests: 1
      });
    assert.strictEqual(badRoomsRes.status, 400);

    // Capacity overflow: 10 guests in Room 101 (max_guests = 2)
    const overflowRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        hotel_id: 10,
        room_id: 101,
        check_in_date: '2026-11-20',
        check_out_date: '2026-11-22',
        total_rooms: 1,
        total_guests: 10
      });
    assert.strictEqual(overflowRes.status, 400);
    assert.ok(overflowRes.body.error.message.includes('capacity'));
  });
});
