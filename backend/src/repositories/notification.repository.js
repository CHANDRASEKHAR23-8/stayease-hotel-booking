import { query, getDbStatus } from '../config/database.js';

class NotificationRepository {
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

  seedMockNotification(notif) {
    this.memoryStore.set(notif.id, { ...notif });
  }

  /**
   * Create a notification
   */
  async create({ user_id, title, message, type = 'general', reference_id = null }) {
    const numericUserId = Number(user_id);

    if (this.isUsingMock()) {
      const id = this.nextId++;
      const notif = {
        id,
        user_id: numericUserId,
        title,
        message,
        type,
        is_read: false,
        reference_id: reference_id ? String(reference_id) : null,
        created_at: new Date().toISOString()
      };
      this.memoryStore.set(id, notif);
      return { ...notif };
    }

    const sql = `
      INSERT INTO notifications (user_id, title, message, type, is_read, reference_id)
      VALUES (?, ?, ?, ?, FALSE, ?)
    `;
    const res = await query(sql, [numericUserId, title, message, type, reference_id]);
    return this.findById(res.insertId);
  }

  async findById(id) {
    const numericId = Number(id);
    if (this.isUsingMock()) {
      return this.memoryStore.get(numericId) || null;
    }

    const sql = 'SELECT * FROM notifications WHERE id = ? LIMIT 1';
    const rows = await query(sql, [numericId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find notifications for a specific user
   */
  async findByUserId(userId, { page = 1, limit = 20 } = {}) {
    const numericUserId = Number(userId);
    const offset = (Number(page) - 1) * Number(limit);

    if (this.isUsingMock()) {
      const all = Array.from(this.memoryStore.values())
        .filter(n => Number(n.user_id) === numericUserId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return {
        items: all.slice(offset, offset + Number(limit)),
        total: all.length
      };
    }

    const countRows = await query('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?', [numericUserId]);
    const total = countRows[0].total;

    const sql = `
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const items = await query(sql, [numericUserId, Number(limit), offset]);
    return { items, total };
  }

  /**
   * Mark a notification as read with recipient check
   */
  async markAsRead(notificationId, userId) {
    const numericId = Number(notificationId);
    const numericUserId = Number(userId);

    if (this.isUsingMock()) {
      const notif = this.memoryStore.get(numericId);
      if (!notif || Number(notif.user_id) !== numericUserId) {
        return false;
      }
      notif.is_read = true;
      return true;
    }

    const sql = 'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?';
    const res = await query(sql, [numericId, numericUserId]);
    return res.affectedRows > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    const numericUserId = Number(userId);

    if (this.isUsingMock()) {
      for (const notif of this.memoryStore.values()) {
        if (Number(notif.user_id) === numericUserId) {
          notif.is_read = true;
        }
      }
      return true;
    }

    const sql = 'UPDATE notifications SET is_read = TRUE WHERE user_id = ?';
    await query(sql, [numericUserId]);
    return true;
  }

  /**
   * Count unread notifications
   */
  async countUnread(userId) {
    const numericUserId = Number(userId);

    if (this.isUsingMock()) {
      return Array.from(this.memoryStore.values())
        .filter(n => Number(n.user_id) === numericUserId && !n.is_read)
        .length;
    }

    const rows = await query('SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = FALSE', [numericUserId]);
    return rows[0].unread;
  }
}

export default new NotificationRepository();
