import { query, getDbStatus } from '../config/database.js';

class UserRepository {
  constructor() {
    // In-memory mock store used when database is disconnected or in isolated test mode
    this.memoryStore = new Map();
    this.nextId = 100;
  }

  isUsingMock() {
    return !getDbStatus().connected;
  }

  // Clear mock store (useful in test teardown)
  resetMockStore() {
    this.memoryStore.clear();
    this.nextId = 100;
  }

  // Seed mock store with initial data
  seedMockUser(user) {
    this.memoryStore.set(user.id, { ...user });
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const normalizedEmail = (email || '').toLowerCase().trim();

    if (this.isUsingMock()) {
      for (const user of this.memoryStore.values()) {
        if (user.email.toLowerCase() === normalizedEmail) {
          return { ...user };
        }
      }
      return null;
    }

    const sql = `
      SELECT id, name, email, password_hash, phone, role, status, avatar_url, created_at, updated_at
      FROM users
      WHERE LOWER(email) = ?
      LIMIT 1
    `;
    const rows = await query(sql, [normalizedEmail]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find user by primary ID
   */
  async findById(id) {
    const numericId = Number(id);

    if (this.isUsingMock()) {
      const user = this.memoryStore.get(numericId);
      return user ? { ...user } : null;
    }

    const sql = `
      SELECT id, name, email, password_hash, phone, role, status, avatar_url, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    const rows = await query(sql, [numericId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Insert new user
   */
  async create({ name, email, password_hash, phone = null, role = 'customer', status = 'active', avatar_url = null }) {
    const normalizedEmail = (email || '').toLowerCase().trim();

    if (this.isUsingMock()) {
      const id = this.nextId++;
      const newUser = {
        id,
        name,
        email: normalizedEmail,
        password_hash,
        phone,
        role,
        status,
        avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.memoryStore.set(id, newUser);
      return { ...newUser };
    }

    const sql = `
      INSERT INTO users (name, email, password_hash, phone, role, status, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [name, normalizedEmail, password_hash, phone, role, status, avatar_url]);
    return this.findById(result.insertId);
  }

  /**
   * Update permitted profile fields
   */
  async update(id, { name, phone, avatar_url }) {
    const numericId = Number(id);

    if (this.isUsingMock()) {
      const existing = this.memoryStore.get(numericId);
      if (!existing) return null;
      if (name !== undefined) existing.name = name;
      if (phone !== undefined) existing.phone = phone;
      if (avatar_url !== undefined) existing.avatar_url = avatar_url;
      existing.updated_at = new Date().toISOString();
      this.memoryStore.set(numericId, existing);
      return { ...existing };
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      return this.findById(numericId);
    }

    values.push(numericId);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await query(sql, values);
    return this.findById(numericId);
  }

  /**
   * Update user password hash
   */
  async updatePassword(id, password_hash) {
    const numericId = Number(id);

    if (this.isUsingMock()) {
      const existing = this.memoryStore.get(numericId);
      if (!existing) return false;
      existing.password_hash = password_hash;
      existing.updated_at = new Date().toISOString();
      return true;
    }

    const sql = `UPDATE users SET password_hash = ? WHERE id = ?`;
    const result = await query(sql, [password_hash, numericId]);
    return result.affectedRows > 0;
  }

  /**
   * Update user status (active / suspended)
   */
  async updateStatus(id, status) {
    const numericId = Number(id);

    if (this.isUsingMock()) {
      const existing = this.memoryStore.get(numericId);
      if (!existing) return false;
      existing.status = status;
      return true;
    }

    const sql = `UPDATE users SET status = ? WHERE id = ?`;
    const result = await query(sql, [status, numericId]);
    return result.affectedRows > 0;
  }

  /**
   * Admin: List users with optional role, status, and search filters
   */
  async listUsers({ search, role, status, page = 1, limit = 20 } = {}) {
    const offset = (Number(page) - 1) * Number(limit);

    if (this.isUsingMock()) {
      let all = Array.from(this.memoryStore.values());
      if (role) all = all.filter(u => u.role === role);
      if (status) all = all.filter(u => u.status === status);
      if (search) {
        const q = search.toLowerCase();
        all = all.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      }
      return {
        items: all.slice(offset, offset + Number(limit)),
        total: all.length
      };
    }

    const whereClauses = [];
    const params = [];

    if (role) {
      whereClauses.push('role = ?');
      params.push(role);
    }
    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }
    if (search) {
      whereClauses.push('(LOWER(name) LIKE ? OR LOWER(email) LIKE ?)');
      const q = `%${search.toLowerCase()}%`;
      params.push(q, q);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countRows = await query(`SELECT COUNT(*) as total FROM users ${whereSql}`, params);
    const total = countRows[0].total;

    const sql = `
      SELECT id, name, email, phone, role, status, avatar_url, created_at
      FROM users
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const items = await query(sql, [...params, Number(limit), offset]);
    return { items, total };
  }
}

export default new UserRepository();
