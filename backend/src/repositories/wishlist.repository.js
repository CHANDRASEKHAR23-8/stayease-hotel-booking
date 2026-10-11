import { query, getDbStatus } from '../config/database.js';

class WishlistRepository {
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

  seedMockWishlist(item) {
    this.memoryStore.set(item.id, { ...item });
  }

  /**
   * Add hotel to customer wishlist
   */
  async add(userId, hotelId) {
    const numericUserId = Number(userId);
    const numericHotelId = Number(hotelId);

    if (this.isUsingMock()) {
      for (const item of this.memoryStore.values()) {
        if (Number(item.user_id) === numericUserId && Number(item.hotel_id) === numericHotelId) {
          return { ...item };
        }
      }
      const id = this.nextId++;
      const item = {
        id,
        user_id: numericUserId,
        hotel_id: numericHotelId,
        created_at: new Date().toISOString()
      };
      this.memoryStore.set(id, item);
      return { ...item };
    }

    const sql = `
      INSERT IGNORE INTO wishlists (user_id, hotel_id)
      VALUES (?, ?)
    `;
    await query(sql, [numericUserId, numericHotelId]);
    return { user_id: numericUserId, hotel_id: numericHotelId };
  }

  /**
   * Remove hotel from customer wishlist
   */
  async remove(userId, hotelId) {
    const numericUserId = Number(userId);
    const numericHotelId = Number(hotelId);

    if (this.isUsingMock()) {
      for (const [id, item] of this.memoryStore.entries()) {
        if (Number(item.user_id) === numericUserId && Number(item.hotel_id) === numericHotelId) {
          this.memoryStore.delete(id);
          return true;
        }
      }
      return true;
    }

    const sql = 'DELETE FROM wishlists WHERE user_id = ? AND hotel_id = ?';
    await query(sql, [numericUserId, numericHotelId]);
    return true;
  }

  /**
   * Check if a hotel is wishlisted by user
   */
  async isWishlisted(userId, hotelId) {
    const numericUserId = Number(userId);
    const numericHotelId = Number(hotelId);

    if (this.isUsingMock()) {
      for (const item of this.memoryStore.values()) {
        if (Number(item.user_id) === numericUserId && Number(item.hotel_id) === numericHotelId) {
          return true;
        }
      }
      return false;
    }

    const sql = 'SELECT id FROM wishlists WHERE user_id = ? AND hotel_id = ? LIMIT 1';
    const rows = await query(sql, [numericUserId, numericHotelId]);
    return rows.length > 0;
  }

  /**
   * Get all wishlisted hotels for user
   */
  async findByUserId(userId, { page = 1, limit = 20 } = {}) {
    const numericUserId = Number(userId);
    const offset = (Number(page) - 1) * Number(limit);

    if (this.isUsingMock()) {
      const all = Array.from(this.memoryStore.values())
        .filter(w => Number(w.user_id) === numericUserId)
        .map(w => ({
          id: w.hotel_id,
          name: 'Wishlisted Luxury Hotel',
          city: 'Miami Beach',
          state: 'FL',
          country: 'United States',
          starting_price: 240.0,
          star_rating: 4.8,
          average_rating: 4.8,
          review_count: 50,
          primary_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
          wishlisted_at: w.created_at
        }));

      return {
        items: all.slice(offset, offset + Number(limit)),
        total: all.length
      };
    }

    const countRows = await query('SELECT COUNT(*) as total FROM wishlists WHERE user_id = ?', [numericUserId]);
    const total = countRows[0].total;

    const sql = `
      SELECT h.*, w.created_at AS wishlisted_at,
        (SELECT image_url FROM hotel_images hi WHERE hi.hotel_id = h.id ORDER BY is_primary DESC LIMIT 1) AS primary_image
      FROM wishlists w
      JOIN hotels h ON h.id = w.hotel_id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const items = await query(sql, [numericUserId, Number(limit), offset]);
    return { items, total };
  }
}

export default new WishlistRepository();
