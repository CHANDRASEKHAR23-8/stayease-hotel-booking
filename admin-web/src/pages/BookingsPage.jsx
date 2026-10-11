import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { adminService } from '../services/api';
import {
  CalendarCheck,
  Calendar,
  Building,
  User,
  DollarSign,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter) params.status = statusFilter;
      
const res = await adminService.getBookings(params);

const list = Array.isArray(res)
  ? res
  : Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.items)
        ? res.items
        : [];

setBookings(list);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [statusFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="badge badge-success">Confirmed</span>;
      case 'completed':
        return <span className="badge badge-primary">Completed</span>;
      case 'cancelled':
        return <span className="badge badge-danger">Cancelled</span>;
      case 'pending':
        return <span className="badge badge-warning">Pending Payment</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div>
      <Header title="Platform Reservations Oversight" />

      <div className="admin-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2>All Guest Bookings</h2>
            <p>Live transaction ledger with guest records, room allocation, and financial totals</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: '160px' }}
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>

            <button onClick={loadBookings} className="btn btn-secondary btn-sm" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Reference #</th>
                <th>Hotel Property</th>
                <th>Guest Details</th>
                <th>Dates & Nights</th>
                <th>Financial Total</th>
                <th>Reservation Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Loading platform bookings...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No bookings matching criteria found.</td></tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent)' }}>
                        {b.booking_reference || `BK-${b.id}`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ID: #{b.id}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{b.hotel_name || 'Hotel Property'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {b.hotel_city ? `${b.hotel_city}, ${b.hotel_state || ''}` : `Room #${b.room_id || '101'}`}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.guest_name || b.user_name || 'Guest User'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.guest_email || b.user_email || ''}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                        {b.check_in_date ? b.check_in_date.substring(0, 10) : '—'} → {b.check_out_date ? b.check_out_date.substring(0, 10) : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {b.total_nights || 1} Night{(b.total_nights || 1) > 1 ? 's' : ''} • {b.room_count || 1} Room
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                        ${Number(b.grand_total || b.total_amount || 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Tax incl.
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(b.booking_status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
