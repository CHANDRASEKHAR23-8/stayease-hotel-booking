import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import userRepository from '../repositories/user.repository.js';
import hotelRepository from '../repositories/hotel.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import reviewRepository from '../repositories/review.repository.js';
import wishlistRepository from '../repositories/wishlist.repository.js';
import notificationRepository from '../repositories/notification.repository.js';

test('PHASE 7 SUITE: Admin Dashboard & User Management, Verified Reviews, Wishlists, and Notifications', async (t) => {
  // 1. Reset test stores
  userRepository.resetMockStore();
  hotelRepository.resetMockStore();
  bookingRepository.resetMockStore();
  reviewRepository.resetMockStore();
  wishlistRepository.resetMockStore();
  notificationRepository.resetMockStore();

  const pwHash = await bcrypt.hash('Password123!', 10);
  userRepository.seedMockUser({ id: 1, name: 'Admin Lead', email: 'admin@stayease.com', password_hash: pwHash, role: 'admin', status: 'active' });
  userRepository.seedMockUser({ id: 2, name: 'Owner Alpha', email: 'owner@stayease.com', password_hash: pwHash, role: 'owner', status: 'active' });
  userRepository.seedMockUser({ id: 4, name: 'Alice Customer', email: 'customer@stayease.com', password_hash: pwHash, role: 'customer', status: 'active' });
  userRepository.seedMockUser({ id: 5, name: 'Bob Ineligible', email: 'bob@stayease.com', password_hash: pwHash, role: 'customer', status: 'active' });

  // 2. Obtain auth tokens
  const adminRes = await request(app).post('/api/v1/auth/login').send({ email: 'admin@stayease.com', password: 'Password123!' });
  const adminToken = adminRes.body.data.tokens.accessToken;

  const ownerRes = await request(app).post('/api/v1/auth/login').send({ email: 'owner@stayease.com', password: 'Password123!' });
  const ownerToken = ownerRes.body.data.tokens.accessToken;

  const custRes = await request(app).post('/api/v1/auth/login').send({ email: 'customer@stayease.com', password: 'Password123!' });
  const customerToken = custRes.body.data.tokens.accessToken;

  const bobRes = await request(app).post('/api/v1/auth/login').send({ email: 'bob@stayease.com', password: 'Password123!' });
  const bobToken = bobRes.body.data.tokens.accessToken;

  // 3. Seed hotel and booking
  const hotel = {
    id: 501,
    owner_id: 2,
    name: 'Boutique Palm Villa',
    slug: 'boutique-palm-villa',
    description: 'Premier beachfront villa.',
    address: '10 Ocean Dr',
    city: 'Miami Beach',
    state: 'FL',
    country: 'United States',
    star_rating: 4.9,
    status: 'approved',
    starting_price: 290.0,
    review_count: 0,
    average_rating: 0.0
  };
  hotelRepository.seedMockHotel(hotel);

  const eligibleBooking = {
    id: 601,
    booking_reference: 'SE-REV-01',
    user_id: 4, // customer id
    hotel_id: 501,
    room_id: 10,
    check_in_date: '2026-08-01',
    check_out_date: '2026-08-05',
    total_rooms: 1,
    total_guests: 2,
    total_nights: 4,
    room_price_per_night: 290.0,
    total_amount: 1160.0,
    grand_total: 1299.2,
    booking_status: 'completed',
    payment_status: 'paid',
    created_at: new Date().toISOString()
  };
  bookingRepository.seedMockBooking(eligibleBooking);

  // --- A. ADMIN RBAC & OPERATIONS ---

  await t.test('1. Admin Dashboard - returns platform overview and metrics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.overview, 'Expected overview object');
    assert.ok(typeof res.body.data.overview.totalUsers === 'number');
    assert.ok(typeof res.body.data.overview.grossRevenue === 'number');
  });

  await t.test('2. Security: Customer and Owner CANNOT access admin dashboard (403)', async () => {
    const resCust = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.equal(resCust.status, 403);

    const resOwner = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(resOwner.status, 403);
  });

  await t.test('3. Admin User Management - lists users and updates status', async () => {
    const listRes = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data));

    // Suspend user 5
    const suspendRes = await request(app)
      .patch('/api/v1/admin/users/5/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });

    assert.equal(suspendRes.status, 200);
    assert.equal(suspendRes.body.data.status, 'suspended');
  });

  await t.test('4. Security: Admin cannot suspend their own account', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/users/1/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });

    assert.equal(res.status, 400);
  });

  await t.test('5. Admin Bookings & Reports - retrieves platform data', async () => {
    const bookingsRes = await request(app)
      .get('/api/v1/admin/bookings')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(bookingsRes.status, 200);
    assert.ok(Array.isArray(bookingsRes.body.data));

    const reportsRes = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(reportsRes.status, 200);
    assert.ok(typeof reportsRes.body.data.totalRevenue === 'number');
  });

  // --- B. REVIEWS WORKFLOW ---

  await t.test('6. Review Submission: Verified guest creates a review', async () => {
    const res = await request(app)
      .post('/api/v1/hotels/501/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: 601,
        rating: 5,
        comment: 'Breathtaking ocean views and impeccable service!'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.review.rating, 5);
  });

  await t.test('7. Review Validation: Rejects invalid rating outside 1-5', async () => {
    const res = await request(app)
      .post('/api/v1/hotels/501/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: 601,
        rating: 6,
        comment: 'Too high'
      });

    assert.equal(res.status, 400);
  });

  await t.test('8. Review Duplicate Prevention: Rejects second review for same booking', async () => {
    const res = await request(app)
      .post('/api/v1/hotels/501/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: 601,
        rating: 4,
        comment: 'Attempting duplicate review'
      });

    assert.equal(res.status, 400);
    assert.ok(res.body.error.message.includes('already been submitted'));
  });

  await t.test('9. Review Eligibility: Non-guest booking ID rejected', async () => {
    const res = await request(app)
      .post('/api/v1/hotels/501/reviews')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        bookingId: 601, // belongs to customer 4, not bob 5
        rating: 5,
        comment: 'Trying to review another user stay'
      });

    assert.equal(res.status, 403);
  });

  await t.test('10. Public Hotel Reviews: Lists approved reviews', async () => {
    const res = await request(app).get('/api/v1/hotels/501/reviews');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  // --- C. WISHLIST WORKFLOW ---

  await t.test('11. Wishlist: Add hotel, check status, list, and remove', async () => {
    // Add to wishlist
    const addRes = await request(app)
      .post('/api/v1/wishlist/501')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.equal(addRes.status, 200);
    assert.equal(addRes.body.data.wishlisted, true);

    // Check status
    const statusRes = await request(app)
      .get('/api/v1/wishlist/501/status')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.data.isWishlisted, true);

    // List wishlist
    const listRes = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data));

    // Remove from wishlist
    const delRes = await request(app)
      .delete('/api/v1/wishlist/501')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.data.wishlisted, false);
  });

  // --- D. NOTIFICATIONS WORKFLOW ---

  await t.test('12. Notifications: Create, retrieve, mark read, and verify recipient permissions', async () => {
    // Seed notification for customer 4
    const notif = await notificationRepository.create({
      user_id: 4,
      title: 'Booking Confirmed',
      message: 'Your stay at Boutique Palm Villa is confirmed.',
      type: 'booking'
    });

    // Customer 4 fetches notifications
    const getRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.equal(getRes.status, 200);
    assert.ok(Array.isArray(getRes.body.data));
    assert.ok(getRes.body.unreadCount >= 1);

    // Bob 5 tries to mark Customer 4 notification as read -> fails (404 / access denied)
    const bobMarkRes = await request(app)
      .patch(`/api/v1/notifications/${notif.id}/read`)
      .set('Authorization', `Bearer ${bobToken}`);
    assert.equal(bobMarkRes.status, 403);

    // Customer 4 marks it as read -> succeeds (200)
    const markRes = await request(app)
      .patch(`/api/v1/notifications/${notif.id}/read`)
      .set('Authorization', `Bearer ${customerToken}`);
    assert.equal(markRes.status, 200);
    assert.equal(markRes.body.data.is_read, true);

    // Mark all as read
    const markAllRes = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.equal(markAllRes.status, 200);
  });
});
