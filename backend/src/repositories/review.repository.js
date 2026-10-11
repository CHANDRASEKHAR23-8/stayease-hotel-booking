import { query, getDbStatus } from '../config/database.js';

class ReviewRepository {
  constructor() {
    this.memoryStore = new Map();
    this.nextId = 1;
  }

  isUsingMock() {
    return !getDbStatus().connected;
  }

  resetMockStore() {
    this.memoryStore.clear();
    this.nextId = 1;
  }

  seedMockReview(review) {
    this.memoryStore.set(review.id, { ...review });
  }

  /**
   * Check if user has an eligible stay (confirmed or completed) for the hotel
   */
  async findEligibleBooking(userId, hotelId) {
    const numericUserId = Number(userId);
    const numericHotelId = Number(hotelId);

    if (this.isUsingMock()) {
      // In mock, check booking repository memoryStore if imported or global mock
      return { id: 101, user_id: numericUserId, hotel_id: numericHotelId, booking_status: 'completed' };
    }

    const sql = `
      SELECT id, user_id, hotel_id, booking_status
      FROM bookings
      WHERE user_id = ? AND hotel_id = ? AND booking_status IN ('confirmed', 'completed')
      LIMIT 1
    `;
    const rows = await query(sql, [numericUserId, numericHotelId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find review by booking ID to prevent duplicates
   */
  async findByBookingId(bookingId) {
    const numericBookingId = Number(bookingId);

    if (this.isUsingMock()) {
      for (const r of this.memoryStore.values()) {
        if (Number(r.booking_id) === numericBookingId) {
          return { ...r };
        }
      }
      return null;
    }

    const sql = 'SELECT * FROM reviews WHERE booking_id = ? LIMIT 1';
    const rows = await query(sql, [numericBookingId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Create a review
   */
  async create({ booking_id, hotel_id, user_id, rating, comment, status = 'approved' }) {
    const numericBookingId = Number(booking_id);
    const numericHotelId = Number(hotel_id);
    const numericUserId = Number(user_id);
    const numericRating = parseInt(rating, 10);

    if (this.isUsingMock()) {
      const id = this.nextId++;
      const review = {
        id,
        booking_id: numericBookingId,
        hotel_id: numericHotelId,
        user_id: numericUserId,
        rating: numericRating,
        comment,
        status,
        user_name: 'Verified Guest',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.memoryStore.set(id, review);
      return { ...review };
    }

    const sql = `
      INSERT INTO reviews (booking_id, hotel_id, user_id, rating, comment, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const res = await query(sql, [numericBookingId, numericHotelId, numericUserId, numericRating, comment, status]);
    
    // Recalculate average rating on hotel
    await this.updateHotelAverageRating(numericHotelId);

    return this.findById(res.insertId);
  }

  async findById(id) {
    const numericId = Number(id);
    if (this.isUsingMock()) {
      return this.memoryStore.get(numericId) || null;
    }

    const sql = `
      SELECT r.*, u.name AS user_name, u.avatar_url AS user_avatar
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.id = ?
      LIMIT 1
    `;
    const rows = await query(sql, [numericId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * List approved reviews for a hotel
   */
  async findByHotelId(hotelId, { page = 1, limit = 10 } = {}) {
    const numericHotelId = Number(hotelId);
    const offset = (Number(page) - 1) * Number(limit);

    if (this.isUsingMock()) {
      const all = Array.from(this.memoryStore.values())
        .filter(r => Number(r.hotel_id) === numericHotelId && r.status === 'approved')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return {
        items: all.slice(offset, offset + Number(limit)),
        total: all.length
      };
    }

    const countRows = await query('SELECT COUNT(*) as total FROM reviews WHERE hotel_id = ? AND status = ?', [numericHotelId, 'approved']);
    const total = countRows[0].total;

    const sql = `
      SELECT r.*, u.name AS user_name, u.avatar_url AS user_avatar
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.hotel_id = ? AND r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const items = await query(sql, [numericHotelId, Number(limit), offset]);
    return { items, total };
  }

  /**
   * Update hotel review aggregate statistics
   */
  async updateHotelAverageRating(hotelId) {
    if (this.isUsingMock()) return;

    const sql = `
      UPDATE hotels h
      SET 
        review_count = (SELECT COUNT(*) FROM reviews WHERE hotel_id = ? AND status = 'approved'),
        average_rating = COALESCE((SELECT ROUND(AVG(rating), 2) FROM reviews WHERE hotel_id = ? AND status = 'approved'), 0.00)
      WHERE h.id = ?
    `;
    await query(sql, [hotelId, hotelId, hotelId]);
  }
}

export default new ReviewRepository();
