import { query, getDbStatus } from '../config/database.js';

class HotelRepository {
  constructor() {
    this.memoryStore = new Map();
    this.imagesStore = new Map();
    this.amenitiesStore = new Map();
    this.nextId = 100;
  }

  isUsingMock() {
    return !getDbStatus().connected;
  }

  resetMockStore() {
    this.memoryStore.clear();
    this.imagesStore.clear();
    this.amenitiesStore.clear();
    this.nextId = 100;
  }

  seedMockHotel(hotel) {
    this.memoryStore.set(hotel.id, {
      ...hotel,
      images: hotel.images || [],
      amenities: hotel.amenities || []
    });
  }

  /**
   * Search and filter approved hotels
   */
  async findApproved({ search, city, minPrice, maxPrice, minRating, guestCapacity, amenities = [] }, { page = 1, limit = 10 } = {}) {
    const offset = (Number(page) - 1) * Number(limit);

    if (this.isUsingMock()) {
      let list = Array.from(this.memoryStore.values()).filter(h => h.status === 'approved');

      if (city) {
        const lowerCity = city.toLowerCase();
        list = list.filter(h => h.city?.toLowerCase().includes(lowerCity));
      }

      if (search) {
        const q = search.toLowerCase();
        list = list.filter(h =>
          h.name?.toLowerCase().includes(q) ||
          h.city?.toLowerCase().includes(q) ||
          h.address?.toLowerCase().includes(q)
        );
      }

      if (minRating !== undefined && minRating !== null && minRating !== '') {
        const rating = Number(minRating);
        list = list.filter(h => (h.average_rating || h.star_rating || 0) >= rating);
      }

      if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
        const minP = Number(minPrice);
        list = list.filter(h => {
          if (!h.rooms || h.rooms.length === 0) return true;
          return h.rooms.some(r => r.base_price >= minP);
        });
      }

      if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
        const maxP = Number(maxPrice);
        list = list.filter(h => {
          if (!h.rooms || h.rooms.length === 0) return true;
          return h.rooms.some(r => r.base_price <= maxP);
        });
      }

      if (guestCapacity !== undefined && guestCapacity !== null && guestCapacity !== '') {
        const cap = Number(guestCapacity);
        list = list.filter(h => {
          if (!h.rooms || h.rooms.length === 0) return true;
          return h.rooms.some(r => r.max_guests >= cap);
        });
      }

      if (amenities && amenities.length > 0) {
        list = list.filter(h => {
          const hotelAmenitySlugs = (h.amenities || []).map(a => typeof a === 'string' ? a : a.slug || a.name?.toLowerCase());
          return amenities.every(reqAmenity => hotelAmenitySlugs.includes(reqAmenity.toLowerCase()));
        });
      }

      const total = list.length;
      const items = list.slice(offset, offset + Number(limit));
      return { items, total };
    }

    // MySQL Parameterized Query
    const conditions = ["h.status = 'approved'"];
    const params = [];

    if (city) {
      conditions.push('LOWER(h.city) LIKE ?');
      params.push(`%${city.toLowerCase()}%`);
    }

    if (search) {
      conditions.push('(LOWER(h.name) LIKE ? OR LOWER(h.city) LIKE ? OR LOWER(h.address) LIKE ?)');
      const q = `%${search.toLowerCase()}%`;
      params.push(q, q, q);
    }

    if (minRating !== undefined && minRating !== null && minRating !== '') {
      conditions.push('(h.average_rating >= ? OR (h.average_rating = 0 AND h.star_rating >= ?))');
      params.push(Number(minRating), Number(minRating));
    }

    if (minPrice || maxPrice || guestCapacity) {
      const roomConditions = ['r.is_active = TRUE'];
      if (minPrice) {
        roomConditions.push('r.base_price >= ?');
        params.push(Number(minPrice));
      }
      if (maxPrice) {
        roomConditions.push('r.base_price <= ?');
        params.push(Number(maxPrice));
      }
      if (guestCapacity) {
        roomConditions.push('r.max_guests >= ?');
        params.push(Number(guestCapacity));
      }
      conditions.push(`EXISTS (SELECT 1 FROM rooms r WHERE r.hotel_id = h.id AND ${roomConditions.join(' AND ')})`);
    }

    if (amenities && amenities.length > 0) {
      for (const amenity of amenities) {
        conditions.push(`EXISTS (
          SELECT 1 FROM hotel_amenities ha
          JOIN amenities a ON a.id = ha.amenity_id
          WHERE ha.hotel_id = h.id AND (LOWER(a.slug) = ? OR LOWER(a.name) = ?)
        )`);
        params.push(amenity.toLowerCase(), amenity.toLowerCase());
      }
    }

    const whereClause = conditions.join(' AND ');

    // Total Count
    const countSql = `SELECT COUNT(*) AS total FROM hotels h WHERE ${whereClause}`;
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    // Paginated results with primary image and lowest room price
    const dataSql = `
      SELECT 
        h.*,
        (SELECT image_url FROM hotel_images hi WHERE hi.hotel_id = h.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) AS primary_image,
        (SELECT MIN(base_price) FROM rooms r WHERE r.hotel_id = h.id AND r.is_active = TRUE) AS starting_price
      FROM hotels h
      WHERE ${whereClause}
      ORDER BY h.average_rating DESC, h.id DESC
      LIMIT ? OFFSET ?
    `;

    const items = await query(dataSql, [...params, Number(limit), offset]);
    return { items, total };
  }

  /**
   * Find hotel by ID with images and amenities
   */
  async findById(id) {
    const numericId = Number(id);

    if (this.isUsingMock()) {
      const hotel = this.memoryStore.get(numericId);
      return hotel ? { ...hotel } : null;
    }

    const hotelRows = await query('SELECT * FROM hotels WHERE id = ? LIMIT 1', [numericId]);
    if (hotelRows.length === 0) return null;

    const hotel = hotelRows[0];

    // Load images
    const images = await query('SELECT id, image_url, caption, is_primary, display_order FROM hotel_images WHERE hotel_id = ? ORDER BY is_primary DESC, display_order ASC', [numericId]);
    hotel.images = images;

    // Load amenities
    const amenities = await query(`
      SELECT a.id, a.name, a.slug, a.icon, a.category
      FROM amenities a
      JOIN hotel_amenities ha ON ha.amenity_id = a.id
      WHERE ha.hotel_id = ?
    `, [numericId]);
    hotel.amenities = amenities;

    return hotel;
  }

  /**
   * Find hotels belonging to an owner
   */
  async findByOwnerId(ownerId, { page = 1, limit = 20 } = {}) {
    const numericOwnerId = Number(ownerId);
    const offset = (Number(page) - 1) * Number(limit);

    if (this.isUsingMock()) {
      const all = Array.from(this.memoryStore.values()).filter(h => Number(h.owner_id) === numericOwnerId);
      return {
        items: all.slice(offset, offset + Number(limit)),
        total: all.length
      };
    }

    const countRows = await query('SELECT COUNT(*) as total FROM hotels WHERE owner_id = ?', [numericOwnerId]);
    const total = countRows[0].total;

    const sql = `
      SELECT h.*,
        (SELECT image_url FROM hotel_images hi WHERE hi.hotel_id = h.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) AS primary_image,
        (SELECT COUNT(*) FROM rooms r WHERE r.hotel_id = h.id) AS total_rooms_count
      FROM hotels h
      WHERE h.owner_id = ?
      ORDER BY h.id DESC
      LIMIT ? OFFSET ?
    `;
    const items = await query(sql, [numericOwnerId, Number(limit), offset]);
    return { items, total };
  }

  /**
   * Find hotels with pending approval (for Admin)
   */
  async findPendingApprovals({ page = 1, limit = 20 } = {}) {
    const offset = (Number(page) - 1) * Number(limit);

    if (this.isUsingMock()) {
      const pending = Array.from(this.memoryStore.values()).filter(h => h.status === 'pending_approval');
      return {
        items: pending.slice(offset, offset + Number(limit)),
        total: pending.length
      };
    }

    const countRows = await query("SELECT COUNT(*) as total FROM hotels WHERE status = 'pending_approval'");
    const total = countRows[0].total;

    const sql = `
      SELECT h.*, u.name AS owner_name, u.email AS owner_email,
        (SELECT image_url FROM hotel_images hi WHERE hi.hotel_id = h.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) AS primary_image
      FROM hotels h
      JOIN users u ON u.id = h.owner_id
      WHERE h.status = 'pending_approval'
      ORDER BY h.updated_at ASC
      LIMIT ? OFFSET ?
    `;
    const items = await query(sql, [Number(limit), offset]);
    return { items, total };
  }

  /**
   * Create new hotel
   */
  async create({ owner_id, name, slug, description, address, city, state, country = 'United States', postal_code, latitude, longitude, star_rating = 4.0, contact_email, contact_phone, check_in_time = '14:00', check_out_time = '11:00', cancellation_policy }) {
    if (this.isUsingMock()) {
      const id = this.nextId++;
      const newHotel = {
        id,
        owner_id: Number(owner_id),
        name,
        slug,
        description,
        address,
        city,
        state,
        country,
        postal_code,
        latitude,
        longitude,
        star_rating: Number(star_rating),
        average_rating: 0.0,
        review_count: 0,
        status: 'draft',
        rejection_reason: null,
        contact_email,
        contact_phone,
        check_in_time,
        check_out_time,
        cancellation_policy,
        images: [],
        amenities: [],
        rooms: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.memoryStore.set(id, newHotel);
      return { ...newHotel };
    }

    const sql = `
      INSERT INTO hotels (
        owner_id, name, slug, description, address, city, state, country,
        postal_code, latitude, longitude, star_rating, status,
        contact_email, contact_phone, check_in_time, check_out_time, cancellation_policy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      Number(owner_id), name, slug, description, address, city, state, country,
      postal_code, latitude, longitude, Number(star_rating),
      contact_email, contact_phone, check_in_time, check_out_time, cancellation_policy
    ]);

    return this.findById(result.insertId);
  }

  /**
   * Update hotel attributes
   */
  async update(id, updateData) {
    const numericId = Number(id);

    if (this.isUsingMock()) {
      const existing = this.memoryStore.get(numericId);
      if (!existing) return null;
      Object.assign(existing, updateData, { updated_at: new Date().toISOString() });
      this.memoryStore.set(numericId, existing);
      return { ...existing };
    }

    const fields = [];
    const values = [];

    const allowed = [
      'name', 'description', 'address', 'city', 'state', 'country', 'postal_code',
      'latitude', 'longitude', 'star_rating', 'contact_email', 'contact_phone',
      'check_in_time', 'check_out_time', 'cancellation_policy'
    ];

    for (const key of allowed) {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    }

    if (fields.length === 0) return this.findById(numericId);

    values.push(numericId);
    const sql = `UPDATE hotels SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, values);
    return this.findById(numericId);
  }

  /**
   * Update status workflow (draft -> pending_approval -> approved / rejected)
   */
  async updateStatus(id, status, rejectionReason = null) {
    const numericId = Number(id);

    if (this.isUsingMock()) {
      const existing = this.memoryStore.get(numericId);
      if (!existing) return null;
      existing.status = status;
      existing.rejection_reason = rejectionReason;
      existing.updated_at = new Date().toISOString();
      this.memoryStore.set(numericId, existing);
      return { ...existing };
    }

    const sql = 'UPDATE hotels SET status = ?, rejection_reason = ? WHERE id = ?';
    await query(sql, [status, rejectionReason, numericId]);
    return this.findById(numericId);
  }

  /**
   * Add image to hotel
   */
  async addImage(hotelId, imageUrl, caption = '', isPrimary = false, displayOrder = 0) {
    const numericHotelId = Number(hotelId);

    if (this.isUsingMock()) {
      const hotel = this.memoryStore.get(numericHotelId);
      if (!hotel) return null;
      const imgObj = {
        id: Math.floor(Math.random() * 10000),
        hotel_id: numericHotelId,
        image_url: imageUrl,
        caption,
        is_primary: Boolean(isPrimary),
        display_order: Number(displayOrder)
      };
      if (!hotel.images) hotel.images = [];
      hotel.images.push(imgObj);
      return imgObj;
    }

    if (isPrimary) {
      await query('UPDATE hotel_images SET is_primary = FALSE WHERE hotel_id = ?', [numericHotelId]);
    }

    const sql = `
      INSERT INTO hotel_images (hotel_id, image_url, caption, is_primary, display_order)
      VALUES (?, ?, ?, ?, ?)
    `;
    const res = await query(sql, [numericHotelId, imageUrl, caption, Boolean(isPrimary), Number(displayOrder)]);
    return {
      id: res.insertId,
      hotel_id: numericHotelId,
      image_url: imageUrl,
      caption,
      is_primary: Boolean(isPrimary),
      display_order: Number(displayOrder)
    };
  }
}

export default new HotelRepository();
