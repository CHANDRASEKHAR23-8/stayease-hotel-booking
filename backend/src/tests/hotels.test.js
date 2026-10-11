import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import app from '../app.js';
import userRepository from '../repositories/user.repository.js';
import hotelRepository from '../repositories/hotel.repository.js';
import roomRepository from '../repositories/room.repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('PHASE 3 SUITE: Hotels, Rooms, Search Filters, RBAC, Moderation, and Uploads', async (t) => {
  // Reset test stores
  userRepository.resetMockStore();
  hotelRepository.resetMockStore();
  roomRepository.resetMockStore();

  const pwHash = await bcrypt.hash('Password123!', 10);

  // Seed Users: Admin, Owner 1, Owner 2, Customer
  userRepository.seedMockUser({ id: 1, name: 'Admin', email: 'admin@stayease.com', password_hash: pwHash, role: 'admin', status: 'active' });
  userRepository.seedMockUser({ id: 2, name: 'Owner One', email: 'owner1@stayease.com', password_hash: pwHash, role: 'owner', status: 'active' });
  userRepository.seedMockUser({ id: 3, name: 'Owner Two', email: 'owner2@stayease.com', password_hash: pwHash, role: 'owner', status: 'active' });
  userRepository.seedMockUser({ id: 4, name: 'Customer', email: 'customer@stayease.com', password_hash: pwHash, role: 'customer', status: 'active' });

  // Get Auth Tokens
  const getAuthToken = async (email) => {
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Password123!' });
    return res.body.data.tokens.accessToken;
  };

  const adminToken = await getAuthToken('admin@stayease.com');
  const owner1Token = await getAuthToken('owner1@stayease.com');
  const owner2Token = await getAuthToken('owner2@stayease.com');
  const customerToken = await getAuthToken('customer@stayease.com');

  // Seed 3 Approved Hotels for Search Testing
  hotelRepository.seedMockHotel({
    id: 10,
    owner_id: 2,
    name: 'Miami Beach Oasis Resort',
    slug: 'miami-beach-oasis-resort',
    description: 'Luxury beachfront resort in sunny Miami Beach with ocean views.',
    address: '100 Ocean Drive',
    city: 'Miami Beach',
    state: 'FL',
    country: 'United States',
    star_rating: 5.0,
    average_rating: 4.8,
    status: 'approved',
    amenities: ['wifi', 'pool', 'spa', 'beachfront'],
    rooms: [
      { id: 101, hotel_id: 10, room_name: 'Ocean King', room_type: 'deluxe', base_price: 250.00, max_guests: 2, is_active: true },
      { id: 102, hotel_id: 10, room_name: 'Family Suite', room_type: 'family', base_price: 450.00, max_guests: 5, is_active: true }
    ]
  });

  roomRepository.seedMockRoom({ id: 101, hotel_id: 10, room_name: 'Ocean King', room_type: 'deluxe', base_price: 250.00, max_guests: 2, is_active: true });
  roomRepository.seedMockRoom({ id: 102, hotel_id: 10, room_name: 'Family Suite', room_type: 'family', base_price: 450.00, max_guests: 5, is_active: true });

  hotelRepository.seedMockHotel({
    id: 20,
    owner_id: 3,
    name: 'Aspen Snowy Peaks Lodge',
    slug: 'aspen-snowy-peaks-lodge',
    description: 'Cozy ski lodge in Aspen with mountain views and fireside lounge.',
    address: '200 Mountain Way',
    city: 'Aspen',
    state: 'CO',
    country: 'United States',
    star_rating: 4.5,
    average_rating: 4.6,
    status: 'approved',
    amenities: ['wifi', 'fireplace', 'spa'],
    rooms: [
      { id: 201, hotel_id: 20, room_name: 'Mountain Queen', room_type: 'double', base_price: 180.00, max_guests: 2, is_active: true },
      { id: 202, hotel_id: 20, room_name: 'Chalet Penthouse', room_type: 'penthouse', base_price: 600.00, max_guests: 4, is_active: true }
    ]
  });

  roomRepository.seedMockRoom({ id: 201, hotel_id: 20, room_name: 'Mountain Queen', room_type: 'double', base_price: 180.00, max_guests: 2, is_active: true });
  roomRepository.seedMockRoom({ id: 202, hotel_id: 20, room_name: 'Chalet Penthouse', room_type: 'penthouse', base_price: 600.00, max_guests: 4, is_active: true });

  hotelRepository.seedMockHotel({
    id: 30,
    owner_id: 2,
    name: 'New York Central Grand',
    slug: 'new-york-central-grand',
    description: 'Metropolitan high-rise hotel close to Broadway and Central Park.',
    address: '500 7th Ave',
    city: 'New York',
    state: 'NY',
    country: 'United States',
    star_rating: 4.0,
    average_rating: 3.9,
    status: 'approved',
    amenities: ['wifi', 'gym'],
    rooms: [
      { id: 301, hotel_id: 30, room_name: 'Standard Single', room_type: 'single', base_price: 120.00, max_guests: 1, is_active: true }
    ]
  });

  roomRepository.seedMockRoom({ id: 301, hotel_id: 30, room_name: 'Standard Single', room_type: 'single', base_price: 120.00, max_guests: 1, is_active: true });

  // 1. PUBLIC HOTEL LIST & PAGINATION
  await t.test('1. Public Hotels List - returns approved hotels with pagination', async () => {
    const res = await request(app).get('/api/v1/hotels?page=1&limit=2');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.length, 2);
    assert.strictEqual(res.body.pagination.total, 3);
    assert.strictEqual(res.body.pagination.totalPages, 2);
    assert.strictEqual(res.body.pagination.hasNext, true);
  });

  // 2. SEARCH & INDIVIDUAL FILTERS
  await t.test('2. Filter: City / Destination', async () => {
    const res = await request(app).get('/api/v1/hotels?city=aspen');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].id, 20);
  });

  await t.test('3. Filter: Keyword search in name or description', async () => {
    const res = await request(app).get('/api/v1/hotels?search=oasis');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].id, 10);
  });

  await t.test('4. Filter: Minimum Rating', async () => {
    const res = await request(app).get('/api/v1/hotels?minRating=4.5');
    assert.strictEqual(res.status, 200);
    // Hotels with >= 4.5: Hotel 10 (4.8) and Hotel 20 (4.6)
    assert.strictEqual(res.body.data.length, 2);
  });

  await t.test('5. Filter: Price Range (minPrice / maxPrice)', async () => {
    // Hotels with rooms under $150: Hotel 30 ($120)
    const cheapRes = await request(app).get('/api/v1/hotels?maxPrice=150');
    assert.strictEqual(cheapRes.status, 200);
    assert.strictEqual(cheapRes.body.data.length, 1);
    assert.strictEqual(cheapRes.body.data[0].id, 30);

    // Hotels with rooms >= $500: Hotel 20 ($600)
    const luxuryRes = await request(app).get('/api/v1/hotels?minPrice=500');
    assert.strictEqual(luxuryRes.status, 200);
    assert.strictEqual(luxuryRes.body.data.length, 1);
    assert.strictEqual(luxuryRes.body.data[0].id, 20);
  });

  await t.test('6. Filter: Guest Capacity', async () => {
    // Hotels accommodating at least 5 guests: Hotel 10 (Family Suite max_guests=5)
    const res = await request(app).get('/api/v1/hotels?guestCapacity=5');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].id, 10);
  });

  await t.test('7. Filter: Amenities', async () => {
    // Hotels with beachfront
    const res = await request(app).get('/api/v1/hotels?amenities=beachfront');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].id, 10);
  });

  await t.test('8. Combined Multi-Criteria Filter: City + minRating + minPrice', async () => {
    const res = await request(app).get('/api/v1/hotels?city=miami&minRating=4.0&minPrice=200');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].id, 10);
  });

  // 9. PUBLIC HOTEL DETAILS & ROOMS
  await t.test('9. Hotel Details API - returns hotel with active rooms', async () => {
    const res = await request(app).get('/api/v1/hotels/10');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.hotel.name, 'Miami Beach Oasis Resort');
    assert.strictEqual(res.body.data.hotel.rooms.length, 2);
  });

  await t.test('10. Hotel Rooms Listing API', async () => {
    const res = await request(app).get('/api/v1/hotels/10/rooms');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.rooms.length, 2);
  });

  // 10. UNAPPROVED HOTELS VISIBILITY & OWNER ISOLATION
  let newDraftHotelId = null;

  await t.test('11. Owner creates a new hotel - starts in "draft" status', async () => {
    const res = await request(app)
      .post('/api/v1/owner/hotels')
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        name: 'Sunny Bay Boutique',
        description: 'Charming boutique hotel currently under interior preparation.',
        address: '77 Ocean View Lane',
        city: 'Santa Monica',
        contact_email: 'info@sunnybay.com',
        contact_phone: '+1-555-0188'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.hotel.status, 'draft');
    assert.strictEqual(res.body.data.hotel.owner_id, 2);
    newDraftHotelId = res.body.data.hotel.id;
  });

  await t.test('12. Security Check: Unapproved hotel MUST NOT be publicly visible', async () => {
    // 1. Must not appear in public hotel list
    const listRes = await request(app).get('/api/v1/hotels?city=santa+monica');
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.body.data.length, 0);

    // 2. Direct public GET details by customer must return 404 NOT_FOUND
    const detailsRes = await request(app)
      .get(`/api/v1/hotels/${newDraftHotelId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    assert.strictEqual(detailsRes.status, 404);

    // 3. But owner can view their own draft hotel
    const ownerRes = await request(app)
      .get(`/api/v1/owner/hotels/${newDraftHotelId}`)
      .set('Authorization', `Bearer ${owner1Token}`);
    assert.strictEqual(ownerRes.status, 200);
    assert.strictEqual(ownerRes.body.data.hotel.id, newDraftHotelId);
  });

  await t.test('13. Security Check: Cross-owner isolation on hotel updates', async () => {
    // Owner 2 attempts to edit Owner 1's hotel -> Must be 403 Forbidden
    const res = await request(app)
      .patch(`/api/v1/owner/hotels/${newDraftHotelId}`)
      .set('Authorization', `Bearer ${owner2Token}`)
      .send({ name: 'Hacked Hotel Name' });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('14. Security Check: Prevent tampering with protected hotel fields', async () => {
    // Attempt to directly set status to 'approved' via update
    const res = await request(app)
      .patch(`/api/v1/owner/hotels/${newDraftHotelId}`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({ status: 'approved' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  // 14. ROOM MANAGEMENT & CROSS-OWNER ISOLATION
  let newRoomId = null;

  await t.test('15. Owner adds room to their hotel', async () => {
    const res = await request(app)
      .post(`/api/v1/owner/hotels/${newDraftHotelId}/rooms`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({
        room_name: 'Deluxe Sunset Balcony',
        room_type: 'deluxe',
        base_price: 220.00,
        max_guests: 2,
        total_inventory: 5
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.room.room_name, 'Deluxe Sunset Balcony');
    newRoomId = res.body.data.room.id;
  });

  await t.test('16. Security Check: Cross-owner isolation on rooms', async () => {
    // Owner 2 attempts to add room to Owner 1's hotel -> 403
    const addRes = await request(app)
      .post(`/api/v1/owner/hotels/${newDraftHotelId}/rooms`)
      .set('Authorization', `Bearer ${owner2Token}`)
      .send({
        room_name: 'Intruder Room',
        base_price: 100,
        max_guests: 2,
        total_inventory: 1
      });
    assert.strictEqual(addRes.status, 403);

    // Owner 2 attempts to update Owner 1's room -> 403
    const updateRes = await request(app)
      .patch(`/api/v1/owner/rooms/${newRoomId}`)
      .set('Authorization', `Bearer ${owner2Token}`)
      .send({ base_price: 50.00 });
    assert.strictEqual(updateRes.status, 403);

    // Owner 2 attempts to deactivate Owner 1's room -> 403
    const deleteRes = await request(app)
      .delete(`/api/v1/owner/rooms/${newRoomId}`)
      .set('Authorization', `Bearer ${owner2Token}`);
    assert.strictEqual(deleteRes.status, 403);
  });

  // 17. SUBMISSION & ADMIN APPROVAL WORKFLOW
  await t.test('17. Owner submits hotel for approval', async () => {
    const res = await request(app)
      .post(`/api/v1/owner/hotels/${newDraftHotelId}/submit`)
      .set('Authorization', `Bearer ${owner1Token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.hotel.status, 'pending_approval');
  });

  await t.test('18. Security Check: Non-admins CANNOT approve or reject hotels', async () => {
    // Customer attempt -> 403
    const custRes = await request(app)
      .post(`/api/v1/admin/hotels/${newDraftHotelId}/approve`)
      .set('Authorization', `Bearer ${customerToken}`);
    assert.strictEqual(custRes.status, 403);

    // Owner attempt -> 403
    const ownerRes = await request(app)
      .post(`/api/v1/admin/hotels/${newDraftHotelId}/approve`)
      .set('Authorization', `Bearer ${owner1Token}`);
    assert.strictEqual(ownerRes.status, 403);
  });

  await t.test('19. Admin Moderation: Reject without reason should fail with 400', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/hotels/${newDraftHotelId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '' }); // Missing reason

    assert.strictEqual(res.status, 400);
  });

  await t.test('20. Admin Moderation: Approve hotel', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/hotels/${newDraftHotelId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.hotel.status, 'approved');

    // Verify hotel is now publicly visible
    const publicRes = await request(app).get(`/api/v1/hotels/${newDraftHotelId}`);
    assert.strictEqual(publicRes.status, 200);
    assert.strictEqual(publicRes.body.data.hotel.status, 'approved');
  });

  // 21. IMAGE UPLOADS: VALID, UNSUPPORTED, AND OVERSIZED
  const testUploadDir = path.resolve(__dirname, '../../uploads');
  if (!fs.existsSync(testUploadDir)) fs.mkdirSync(testUploadDir, { recursive: true });

  await t.test('21. Image Upload: Valid JPEG image upload succeeds', async () => {
    // Create a tiny 1x1 valid dummy JPEG buffer
    const dummyJpgBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
      0x00, 0xBF, 0x00, 0xFF, 0xD9
    ]);

    const res = await request(app)
      .post(`/api/v1/owner/hotels/${newDraftHotelId}/images`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .attach('image', dummyJpgBuffer, 'hotel_facade.jpg')
      .field('caption', 'Front Entrance')
      .field('is_primary', 'true');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.image.image_url.includes('/uploads/img-'));
  });

  await t.test('22. Image Upload: Rejects unsupported format (.txt)', async () => {
    const textBuffer = Buffer.from('This is a text file masquerading as image');

    const res = await request(app)
      .post(`/api/v1/owner/hotels/${newDraftHotelId}/images`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .attach('image', textBuffer, 'malicious.txt');

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'UNSUPPORTED_FILE_TYPE');
  });

  await t.test('23. Image Upload: Rejects oversized file (> 5MB)', async () => {
    // Generate a buffer slightly over 5MB (5.2MB)
    const largeBuffer = Buffer.alloc(5.2 * 1024 * 1024, 0);

    const res = await request(app)
      .post(`/api/v1/owner/hotels/${newDraftHotelId}/images`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .attach('image', largeBuffer, { filename: 'huge_photo.jpg', contentType: 'image/jpeg' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'FILE_TOO_LARGE');
  });
});
