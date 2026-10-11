import { query, getDbStatus } from '../config/database.js';

class RoomRepository {
  constructor() {
    this.memoryStore = new Map();
    this.nextId = 100;
  }

  isUsingMock() {
    return !getDbStatus().connected;
  }

  resetMockStore() {
    this.memoryStore.clear();
    this.nextId = 100;
  }

  seedMockRoom(room) {
    this.memoryStore.set(room.id, {
      ...room,
      images: room.images || [],
      amenities: room.amenities || []
    });
  }

  /**
   * List rooms for a hotel
   */
  async findByHotelId(hotelId, activeOnly = true) {
    const numericHotelId = Number(hotelId);

    if (this.isUsingMock()) {
      let list = Array.from(this.memoryStore.values()).filter(r => Number(r.hotel_id) === numericHotelId);
      if (activeOnly) {
        list = list.filter(r => r.is_active);
      }
      return list;
    }

    let sql = 'SELECT * FROM rooms WHERE hotel_id = ?';
    const params = [numericHotelId];

    if (activeOnly) {
      sql += ' AND is_active = TRUE';
    }

    sql += ' ORDER BY base_price ASC, id ASC';

    const rooms = await query(sql, params);

    // Fetch images for each room
    for (const room of rooms) {
      room.images = await query(
        'SELECT id, image_url, caption, is_primary, display_order FROM room_images WHERE room_id = ? ORDER BY is_primary DESC, display_order ASC',
        [room.id]
      );
      room.amenities = await query(
        `SELECT a.id, a.name, a.slug, a.icon FROM amenities a
         JOIN room_amenities ra ON ra.amenity_id = a.id
         WHERE ra.room_id = ?`,
        [room.id]
      );
    }

    return rooms;
  }

  /**
   * Find room by ID
   */
  async findById(id) {
    const numericId = Number(id);

    if (this.isUsingMock()) {
      const room = this.memoryStore.get(numericId);
      return room ? { ...room } : null;
    }

    const rows = await query('SELECT * FROM rooms WHERE id = ? LIMIT 1', [numericId]);
    if (rows.length === 0) return null;

    const room = rows[0];
    room.images = await query('SELECT id, image_url, caption, is_primary, display_order FROM room_images WHERE room_id = ? ORDER BY is_primary DESC', [numericId]);
    room.amenities = await query(
      `SELECT a.id, a.name, a.slug, a.icon FROM amenities a
       JOIN room_amenities ra ON ra.amenity_id = a.id
       WHERE ra.room_id = ?`,
      [numericId]
    );

    return room;
  }

  /**
   * Create new room
   */
  async create({ hotel_id, room_name, room_type = 'double', description, base_price, max_guests = 2, total_inventory = 1, is_active = true, size_sqm = 28, bed_type = 'King Bed' }) {
    if (this.isUsingMock()) {
      const id = this.nextId++;
      const newRoom = {
        id,
        hotel_id: Number(hotel_id),
        room_name,
        room_type,
        description,
        base_price: Number(base_price),
        max_guests: Number(max_guests),
        total_inventory: Number(total_inventory),
        is_active: Boolean(is_active),
        size_sqm: Number(size_sqm),
        bed_type,
        images: [],
        amenities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.memoryStore.set(id, newRoom);
      return { ...newRoom };
    }

    const sql = `
      INSERT INTO rooms (
        hotel_id, room_name, room_type, description, base_price,
        max_guests, total_inventory, is_active, size_sqm, bed_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const res = await query(sql, [
      Number(hotel_id), room_name, room_type, description, Number(base_price),
      Number(max_guests), Number(total_inventory), Boolean(is_active), Number(size_sqm), bed_type
    ]);

    return this.findById(res.insertId);
  }

  /**
   * Update room details
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

    const allowed = ['room_name', 'room_type', 'description', 'base_price', 'max_guests', 'total_inventory', 'is_active', 'size_sqm', 'bed_type'];
    for (const key of allowed) {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    }

    if (fields.length === 0) return this.findById(numericId);

    values.push(numericId);
    const sql = `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, values);
    return this.findById(numericId);
  }

  /**
   * Deactivate room
   */
  async deactivate(id) {
    return this.update(id, { is_active: false });
  }

  /**
   * Add image to room
   */
  async addImage(roomId, imageUrl, caption = '', isPrimary = false, displayOrder = 0) {
    const numericRoomId = Number(roomId);

    if (this.isUsingMock()) {
      const room = this.memoryStore.get(numericRoomId);
      if (!room) return null;
      const imgObj = {
        id: Math.floor(Math.random() * 10000),
        room_id: numericRoomId,
        image_url: imageUrl,
        caption,
        is_primary: Boolean(isPrimary),
        display_order: Number(displayOrder)
      };
      if (!room.images) room.images = [];
      room.images.push(imgObj);
      return imgObj;
    }

    if (isPrimary) {
      await query('UPDATE room_images SET is_primary = FALSE WHERE room_id = ?', [numericRoomId]);
    }

    const sql = `
      INSERT INTO room_images (room_id, image_url, caption, is_primary, display_order)
      VALUES (?, ?, ?, ?, ?)
    `;
    const res = await query(sql, [numericRoomId, imageUrl, caption, Boolean(isPrimary), Number(displayOrder)]);
    return {
      id: res.insertId,
      room_id: numericRoomId,
      image_url: imageUrl,
      caption,
      is_primary: Boolean(isPrimary),
      display_order: Number(displayOrder)
    };
  }
}

export default new RoomRepository();
