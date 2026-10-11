import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import userRepository from '../repositories/user.repository.js';
import hotelRepository from '../repositories/hotel.repository.js';
import roomRepository from '../repositories/room.repository.js';
import bookingRepository from '../repositories/booking.repository.js';

test('PHASE 6 SUITE: Owner Dashboard, Analytics, Inventory, and Reservations', async (t) => {
  // Reset mock stores
  userRepository.resetMockStore();
  hotelRepository.resetMockStore();
  roomRepository.resetMockStore();
  bookingRepository.resetMockStore();

  const pwHash = await bcrypt.hash('Password123!', 10);
  userRepository.seedMockUser({ id: 2, name: 'Owner One', email: 'owner1@stayease.com', password_hash: pwHash, role: 'owner', status: 'active' });
  userRepository.seedMockUser({ id: 4, name: 'Customer', email: 'customer1@stayease.com', password_hash: pwHash, role: 'customer', status: 'active' });

  // 1. Login as owner & customer
  const ownerRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'owner1@stayease.com', password: 'Password123!' });
  const ownerToken = ownerRes.body.data.tokens.accessToken;

  const custRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'customer1@stayease.com', password: 'Password123!' });
  const customerToken = custRes.body.data.tokens.accessToken;

  // 2. Seed owner hotel, room, and booking
  const hotel = {
    id: 201,
    owner_id: 2,
    name: 'Owner Boutique Villa',
    slug: 'owner-boutique-villa',
    description: 'Exclusive seaside villa for testing owner features.',
    address: '77 Ocean Drive',
    city: 'Key West',
    state: 'FL',
    country: 'United States',
    star_rating: 4.8,
    status: 'approved',
    starting_price: 320.00,
    total_rooms: 5
  };
  hotelRepository.seedMockHotel(hotel);
  const ownerHotelId = hotel.id;

  const room = {
    id: 301,
    hotel_id: ownerHotelId,
    room_name: 'Presidential Suite',
    room_type: 'suite',
    base_price: 320.00,
    max_occupancy: 4,
    total_inventory: 5,
    is_active: true
  };
  roomRepository.seedMockRoom(room);
  const ownerRoomId = room.id;

  bookingRepository.seedMockBooking({
    id: 401,
    booking_reference: 'SE-TEST-OWNER-01',
    user_id: 4,
    hotel_id: ownerHotelId,
    room_id: ownerRoomId,
    check_in_date: '2027-04-10',
    check_out_date: '2027-04-15',
    total_rooms: 1,
    total_guests: 2,
    total_nights: 5,
    room_price_per_night: 320.00,
    total_amount: 1600.00,
    tax_amount: 192.00,
    discount_amount: 0.00,
    grand_total: 1792.00,
    booking_status: 'confirmed',
    payment_status: 'paid',
    created_at: new Date().toISOString()
  });

  await t.test('1. Owner Dashboard - returns analytics, revenue, occupancy, and hotel summaries', async () => {
    const res = await request(app)
      .get('/api/v1/owner/dashboard')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.stats, 'Expected stats object');
    assert.ok(typeof res.body.data.stats.totalRevenue === 'number');
    assert.ok(typeof res.body.data.stats.totalBookings === 'number');
    assert.ok(typeof res.body.data.stats.occupancyRate === 'number');
    assert.ok(Array.isArray(res.body.data.hotels));
    assert.ok(Array.isArray(res.body.data.recentBookings));
  });

  await t.test('2. Security: Customer cannot access owner dashboard (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/owner/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  await t.test('3. Security: Unauthenticated request cannot access owner dashboard (401 Unauthorized)', async () => {
    const res = await request(app).get('/api/v1/owner/dashboard');

    assert.equal(res.status, 401);
  });

  await t.test('4. Owner Reservations - retrieves reservations belonging to owned hotels', async () => {
    const res = await request(app)
      .get('/api/v1/owner/bookings')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination);
  });

  await t.test('5. Room Inventory Management - updates price, inventory, and capacity', async () => {
    const res = await request(app)
      .patch(`/api/v1/owner/rooms/${ownerRoomId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        room_name: 'Presidential Ocean Suite',
        base_price: 380.00,
        total_inventory: 6,
        max_occupancy: 5
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.room.base_price, 380.00);
    assert.equal(res.body.data.room.total_inventory, 6);
  });

  await t.test('6. Room Deactivation - toggles active status to false', async () => {
    const res = await request(app)
      .delete(`/api/v1/owner/rooms/${ownerRoomId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.deactivated, true);
  });
});
