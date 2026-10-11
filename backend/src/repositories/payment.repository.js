import { query, getDbStatus, withTransaction } from '../config/database.js';

class PaymentRepository {
  constructor() {
    this.memoryStore = new Map();
    this.nextId = 1;
    this.useMemoryMock = false;
  }

  isUsingMock() {
    return this.useMemoryMock || !getDbStatus().connected;
  }

  setMockMode(enable = true) {
    this.useMemoryMock = enable;
  }

  clearMockData() {
    this.memoryStore.clear();
    this.nextId = 1;
  }

  /**
   * Create a new payment record
   */
  async createPayment({
    booking_id,
    user_id,
    payment_reference,
    amount,
    currency = 'USD',
    payment_method = 'card',
    status = 'pending',
    gateway_response = null,
    paid_at = null
  }) {
    if (this.isUsingMock()) {
      const id = this.nextId++;
      const payment = {
        id,
        booking_id: Number(booking_id),
        user_id: Number(user_id),
        payment_reference,
        amount: Number(amount),
        currency,
        payment_method,
        status,
        gateway_response,
        paid_at: paid_at ? new Date(paid_at).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.memoryStore.set(payment_reference, payment);
      return payment;
    }

    const sql = `
      INSERT INTO payments (
        booking_id, user_id, payment_reference, amount, currency,
        payment_method, status, gateway_response, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const gatewayJson = gateway_response ? JSON.stringify(gateway_response) : null;
    const [result] = await query(sql, [
      Number(booking_id),
      Number(user_id),
      payment_reference,
      Number(amount),
      currency,
      payment_method,
      status,
      gatewayJson,
      paid_at
    ]);

    return this.findById(result.insertId);
  }

  /**
   * Find payment by ID
   */
  async findById(id) {
    if (this.isUsingMock()) {
      for (const p of this.memoryStore.values()) {
        if (p.id === Number(id)) return { ...p };
      }
      return null;
    }

    const [rows] = await query('SELECT * FROM payments WHERE id = ?', [Number(id)]);
    return rows[0] || null;
  }

  /**
   * Find payment by payment reference
   */
  async findByReference(payment_reference) {
    if (this.isUsingMock()) {
      const p = this.memoryStore.get(payment_reference);
      return p ? { ...p } : null;
    }

    const [rows] = await query('SELECT * FROM payments WHERE payment_reference = ?', [payment_reference]);
    return rows[0] || null;
  }

  /**
   * Find payment by booking ID
   */
  async findByBookingId(booking_id) {
    if (this.isUsingMock()) {
      for (const p of this.memoryStore.values()) {
        if (p.booking_id === Number(booking_id)) return { ...p };
      }
      return null;
    }

    const [rows] = await query(
      'SELECT * FROM payments WHERE booking_id = ? ORDER BY id DESC LIMIT 1',
      [Number(booking_id)]
    );
    return rows[0] || null;
  }

  /**
   * Update payment status and gateway details
   */
  async updateStatus(payment_reference, status, gateway_response = null, paid_at = null) {
    if (this.isUsingMock()) {
      const p = this.memoryStore.get(payment_reference);
      if (!p) return null;
      p.status = status;
      if (gateway_response) p.gateway_response = gateway_response;
      if (paid_at) p.paid_at = new Date(paid_at).toISOString();
      p.updated_at = new Date().toISOString();
      return { ...p };
    }

    const updates = ['status = ?'];
    const values = [status];

    if (gateway_response !== null) {
      updates.push('gateway_response = ?');
      values.push(JSON.stringify(gateway_response));
    }

    if (paid_at !== null) {
      updates.push('paid_at = ?');
      values.push(paid_at);
    }

    values.push(payment_reference);

    await query(
      `UPDATE payments SET ${updates.join(', ')} WHERE payment_reference = ?`,
      values
    );

    return this.findByReference(payment_reference);
  }

  /**
   * List payments with optional filters
   */
  async listPayments({ userId, status, page = 1, limit = 20 }) {
    if (this.isUsingMock()) {
      let items = Array.from(this.memoryStore.values());
      if (userId) items = items.filter(p => p.user_id === Number(userId));
      if (status) items = items.filter(p => p.status === status);
      const total = items.length;
      const start = (page - 1) * limit;
      return {
        items: items.slice(start, start + limit),
        total,
        page,
        limit
      };
    }

    const conditions = [];
    const values = [];

    if (userId) {
      conditions.push('user_id = ?');
      values.push(Number(userId));
    }
    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = await query(`SELECT COUNT(*) as total FROM payments ${whereClause}`, values);
    const total = countRows[0].total;

    const offset = (page - 1) * limit;
    values.push(limit, offset);
    const [items] = await query(
      `SELECT * FROM payments ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      values
    );

    return {
      items,
      total,
      page,
      limit
    };
  }
}

export default new PaymentRepository();
