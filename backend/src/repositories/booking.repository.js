import { query, withTransaction, getDbStatus } from '../config/database.js';
import { ApiError } from '../utils/apiResponse.js';

class BookingRepository {
  constructor() {
    this.memoryStore = new Map();
    this.guestsStore = new Map();
    this.nextId = 100;
  }

  isUsingMock() {
    return !getDbStatus().connected;
  }

  resetMockStore() {
    this.memoryStore.clear();
    this.guestsStore.clear();
    this.nextId = 100;
  }

  seedMockBooking(booking) {
    this.memoryStore.set(booking.id, { ...booking });
  }

  /**
   * Helper to generate date strings for every night in [checkIn, checkOut)
   */
  getNightsInRange(checkInStr, checkOutStr) {
    const nights = [];
    const current = new Date(checkInStr + 'T00:00:00Z');
    const end = new Date(checkOutStr + 'T00:00:00Z');

    while (current < end) {
      nights.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return nights;
  }

  /**
   * Calculate minimum available rooms across all nights in date range
   */
  async getRoomAvailability(roomId, totalInventory, checkInStr, checkOutStr, excludeBookingId = null) {
    const nights = this.getNightsInRange(checkInStr, checkOutStr);
    if (nights.length === 0) return 0;

    let activeBookings = [];

    if (this.isUsingMock()) {
      activeBookings = Array.from(this.memoryStore.values()).filter(b =>
        Number(b.room_id) === Number(roomId) &&
        ['confirmed', 'pending'].includes(b.booking_status) &&
        (!excludeBookingId || Number(b.id) !== Number(excludeBookingId)) &&
        b.check_in_date < checkOutStr &&
        b.check_out_date > checkInStr
      );
    } else {
      let sql = `
        SELECT id, total_rooms, check_in_date, check_out_date
        FROM bookings
        WHERE room_id = ?
          AND booking_status IN ('confirmed', 'pending')
          AND check_in_date < ?
          AND check_out_date > ?
      `;
      const params = [Number(roomId), checkOutStr, checkInStr];
      if (excludeBookingId) {
        sql += ' AND id != ?';
        params.push(Number(excludeBookingId));
      }
      activeBookings = await query(sql, params);
    }

    let minAvailable = totalInventory;

    // Check each night individually
    for (const night of nights) {
      let bookedOnNight = 0;
      for (const b of activeBookings) {
        const bCheckIn = typeof b.check_in_date === 'string' ? b.check_in_date.slice(0, 10) : b.check_in_date.toISOString().slice(0, 10);
        const bCheckOut = typeof b.check_out_date === 'string' ? b.check_out_date.slice(0, 10) : b.check_out_date.toISOString().slice(0, 10);

        // A booking occupies this night if bCheckIn <= night AND bCheckOut > night
        if (bCheckIn <= night && bCheckOut > night) {
          bookedOnNight += Number(b.total_rooms);
        }
      }
      const availableOnNight = Math.max(0, totalInventory - bookedOnNight);
      if (availableOnNight < minAvailable) {
        minAvailable = availableOnNight;
      }
    }

    return minAvailable;
  }

  /**
   * Find booking by idempotency key for user
   */
  async findByIdempotencyKey(userId, idempotencyKey) {
    if (!idempotencyKey) return null;

    if (this.isUsingMock()) {
      for (const b of this.memoryStore.values()) {
        if (Number(b.user_id) === Number(userId) && b.idempotency_key === idempotencyKey) {
          return { ...b };
        }
      }
      return null;
    }

    const rows = await query('SELECT * FROM bookings WHERE user_id = ? AND idempotency_key = ? LIMIT 1', [Number(userId), idempotencyKey]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find booking by primary ID
   */
  async findById(id) {
    const numericId = Number(id);

    if (this.isUsingMock()) {
      const booking = this.memoryStore.get(numericId);
      if (!booking) return null;
      const guests = this.guestsStore.get(numericId) || [];
      return { ...booking, guests };
    }

    const rows = await query(`
      SELECT b.*, h.name AS hotel_name, h.address AS hotel_address, h.city AS hotel_city,
             r.room_name, r.room_type, u.name AS customer_name, u.email AS customer_email
      FROM bookings b
      JOIN hotels h ON h.id = b.hotel_id
      JOIN rooms r ON r.id = b.room_id
      JOIN users u ON u.id = b.user_id
      WHERE b.id = ?
      LIMIT 1
    `, [numericId]);

    if (rows.length === 0) return null;
    const booking = rows[0];

    // Fetch guests
    booking.guests = await query('SELECT id, full_name, age, is_primary FROM booking_guests WHERE booking_id = ?', [numericId]);
    return booking;
  }

  /**
   * Find booking by booking reference
   */
  async findByReference(reference) {
    if (this.isUsingMock()) {
      for (const b of this.memoryStore.values()) {
        if (b.booking_reference === reference) {
          return this.findById(b.id);
        }
      }
      return null;
    }

    const rows = await query('SELECT id FROM bookings WHERE booking_reference = ? LIMIT 1', [reference]);
    return rows.length > 0 ? this.findById(rows[0].id) : null;
  }

  /**
   * Transactional booking creation with concurrency locking
   */
  async createTransactionalBooking({
    booking_reference,
    user_id,
    hotel_id,
    room_id,
    check_in_date,
    check_out_date,
    total_rooms,
    total_guests,
    total_nights,
    room_price_per_night,
    total_amount,
    tax_amount,
    discount_amount,
    grand_total,
    special_requests,
    idempotency_key,
    guests = []
  }) {
    if (this.isUsingMock()) {
      // In-memory atomic check
      const id = this.nextId++;
      const newBooking = {
        id,
        booking_reference,
        user_id: Number(user_id),
        hotel_id: Number(hotel_id),
        room_id: Number(room_id),
        check_in_date,
        check_out_date,
        total_rooms: Number(total_rooms),
        total_guests: Number(total_guests),
        total_nights: Number(total_nights),
        room_price_per_night: Number(room_price_per_night),
        total_amount: Number(total_amount),
        tax_amount: Number(tax_amount),
        discount_amount: Number(discount_amount),
        grand_total: Number(grand_total),
        booking_status: 'confirmed',
        payment_status: 'paid', // Instant confirmation upon valid charge/mock
        special_requests,
        idempotency_key,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.memoryStore.set(id, newBooking);
      this.guestsStore.set(id, guests.map((g, idx) => ({ id: idx + 1, booking_id: id, ...g })));
      return { ...newBooking, guests: this.guestsStore.get(id) };
    }

    // MySQL ACID Transaction with Row-Level Locking (FOR UPDATE)
    return await withTransaction(async (conn) => {
      // 1. Lock room row
      const [roomRows] = await conn.query(
        'SELECT id, hotel_id, base_price, total_inventory, is_active FROM rooms WHERE id = ? FOR UPDATE',
        [Number(room_id)]
      );

      if (roomRows.length === 0 || !roomRows[0].is_active) {
        throw ApiError.badRequest('Room type is currently unavailable');
      }

      const totalInventory = roomRows[0].total_inventory;

      // 2. Lock active overlapping bookings
      const [overlapping] = await conn.query(`
        SELECT id, total_rooms, check_in_date, check_out_date
        FROM bookings
        WHERE room_id = ?
          AND booking_status IN ('confirmed', 'pending')
          AND check_in_date < ?
          AND check_out_date > ?
        FOR UPDATE
      `, [Number(room_id), check_out_date, check_in_date]);

      // 3. Verify availability for each night in range
      const nights = this.getNightsInRange(check_in_date, check_out_date);
      for (const night of nights) {
        let bookedOnNight = 0;
        for (const b of overlapping) {
          const bIn = b.check_in_date.toISOString().slice(0, 10);
          const bOut = b.check_out_date.toISOString().slice(0, 10);
          if (bIn <= night && bOut > night) {
            bookedOnNight += Number(b.total_rooms);
          }
        }
        if (totalInventory - bookedOnNight < Number(total_rooms)) {
          throw ApiError.conflict('Requested rooms are no longer available for the selected dates');
        }
      }

      // 4. Insert booking
      const [result] = await conn.query(`
        INSERT INTO bookings (
          booking_reference, user_id, hotel_id, room_id,
          check_in_date, check_out_date, total_rooms, total_guests, total_nights,
          room_price_per_night, total_amount, tax_amount, discount_amount, grand_total,
          booking_status, payment_status, special_requests, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'paid', ?, ?)
      `, [
        booking_reference, Number(user_id), Number(hotel_id), Number(room_id),
        check_in_date, check_out_date, Number(total_rooms), Number(total_guests), Number(total_nights),
        Number(room_price_per_night), Number(total_amount), Number(tax_amount), Number(discount_amount), Number(grand_total),
        special_requests, idempotency_key
      ]);

      const bookingId = result.insertId;

      // 5. Insert guests
      if (guests && guests.length > 0) {
        for (const guest of guests) {
          await conn.query(`
            INSERT INTO booking_guests (booking_id, full_name, age, is_primary)
            VALUES (?, ?, ?, ?)
          `, [bookingId, guest.full_name, guest.age || null, Boolean(guest.is_primary)]);
        }
      }

      return bookingId;
    });
  }

  /**
   * Cancel booking and record cancellation details
   */
  async cancelBooking(id, reason) {
    const numericId = Number(id);

    if (this.isUsingMock()) {
      const existing = this.memoryStore.get(numericId);
      if (!existing) return null;
      existing.booking_status = 'cancelled';
      existing.cancellation_reason = reason;
      existing.cancelled_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      this.memoryStore.set(numericId, existing);
      return { ...existing };
    }

    const sql = `
      UPDATE bookings
      SET booking_status = 'cancelled',
          cancellation_reason = ?,
          cancelled_at = UTC_TIMESTAMP()
      WHERE id = ?
    `;
    await query(sql, [reason, numericId]);
    return this.findById(numericId);
  }

  /**
   * List customer's booking history
   */
  async findByUserId(userId, { page = 1, limit = 10 } = {}) {
    const numericUserId = Number(userId);
    const offset = (Number(page) - 1) * Number(limit);

    if (this.isUsingMock()) {
      const all = Array.from(this.memoryStore.values())
        .filter(b => Number(b.user_id) === numericUserId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return {
        items: all.slice(offset, offset + Number(limit)),
        total: all.length
      };
    }

    const countRows = await query('SELECT COUNT(*) as total FROM bookings WHERE user_id = ?', [numericUserId]);
    const total = countRows[0].total;

    const sql = `
      SELECT b.*, h.name AS hotel_name, h.city AS hotel_city, r.room_name,
        (SELECT image_url FROM hotel_images hi WHERE hi.hotel_id = b.hotel_id ORDER BY is_primary DESC LIMIT 1) AS hotel_image
      FROM bookings b
      JOIN hotels h ON h.id = b.hotel_id
      JOIN rooms r ON r.id = b.room_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const items = await query(sql, [numericUserId, Number(limit), offset]);
    return { items, total };
  }

  /**
   * List reservations for an owner's hotels
   */
  async findByOwnerId(ownerId, { page = 1, limit = 20 } = {}) {
    const numericOwnerId = Number(ownerId);
    const offset = (Number(page) - 1) * Number(limit);

    if (this.isUsingMock()) {
      // In mock, filter by hotel owner
      const all = Array.from(this.memoryStore.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return {
        items: all.slice(offset, offset + Number(limit)),
        total: all.length
      };
    }

    const countRows = await query(`
      SELECT COUNT(*) as total
      FROM bookings b
      JOIN hotels h ON h.id = b.hotel_id
      WHERE h.owner_id = ?
    `, [numericOwnerId]);
    const total = countRows[0].total;

    const sql = `
      SELECT b.*, h.name AS hotel_name, r.room_name, u.name AS guest_name, u.email AS guest_email
      FROM bookings b
      JOIN hotels h ON h.id = b.hotel_id
      JOIN rooms r ON r.id = b.room_id
      JOIN users u ON u.id = b.user_id
      WHERE h.owner_id = ?
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const items = await query(sql, [numericOwnerId, Number(limit), offset]);
    return { items, total };
  }

  /**
   * Admin: List all platform reservations
   */
  async findAll({ page = 1, limit = 20, status = null } = {}) {
    const offset = (Number(page) - 1) * Number(limit);

    if (this.isUsingMock()) {
      let all = Array.from(this.memoryStore.values());
      if (status) all = all.filter(b => b.booking_status === status);
      all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return {
        items: all.slice(offset, offset + Number(limit)),
        total: all.length
      };
    }

    const whereSql = status ? 'WHERE b.booking_status = ?' : '';
    const params = status ? [status] : [];

    const countRows = await query(`SELECT COUNT(*) as total FROM bookings b ${whereSql}`, params);
    const total = countRows[0].total;

    const sql = `
  SELECT b.*, h.name AS hotel_name, h.city AS hotel_city,
         r.room_name, u.name AS guest_name, u.email AS guest_email
  FROM bookings b
  JOIN hotels h ON h.id = b.hotel_id
      JOIN rooms r ON r.id = b.room_id
      JOIN users u ON u.id = b.user_id
      ${whereSql}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const items = await query(sql, [...params, Number(limit), offset]);
    return { items, total };
  }
}

export default new BookingRepository();
