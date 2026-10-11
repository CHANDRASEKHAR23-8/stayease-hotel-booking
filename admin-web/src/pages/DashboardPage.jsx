import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { adminService } from '../services/api';
import {
  Users,
  DollarSign,
  CalendarCheck,
  Building2,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getDashboard();
      setData(res);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickApprove = async (hotelId) => {
    try {
      await adminService.approveHotel(hotelId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to approve hotel');
    }
  };

  return (
    <div>
      <Header title="Platform Executive Overview" />

      <div className="admin-content">
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button onClick={loadData} className="btn btn-secondary btn-sm">Retry</button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon-box" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div className="metric-val">
                ${data ? (data.overview.grossRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
              </div>
              <div className="metric-lbl">Gross Platform Revenue</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-box" style={{ background: '#ECFDF5', color: '#059669' }}>
              <CalendarCheck size={24} />
            </div>
            <div>
              <div className="metric-val">{data?.overview?.confirmedBookings ?? 0}</div>
              <div className="metric-lbl">Confirmed Bookings</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-box" style={{ background: '#FFFBEB', color: '#D97706' }}>
              <Clock size={24} />
            </div>
            <div>
              <div className="metric-val">{data?.overview?.pendingHotelApprovals ?? 0}</div>
              <div className="metric-lbl">Pending Approvals</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-box" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
              <Users size={24} />
            </div>
            <div>
              <div className="metric-val">{data?.overview?.totalUsers ?? 0}</div>
              <div className="metric-lbl">Total Registered Users</div>
            </div>
          </div>
        </div>

        {/* Pending Hotel Approvals Action Area */}
        {data?.overview?.pendingHotelApprovals > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            color: 'white',
            borderRadius: '16px',
            padding: '1.5rem 2rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#F59E0B', padding: '0.75rem', borderRadius: '12px' }}>
                <Building2 size={24} color="#FFFFFF" />
              </div>
              <div>
                <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.2rem' }}>
                  {data.overview.pendingHotelApprovals} Hotel Listing{data.overview.pendingHotelApprovals > 1 ? 's' : ''} Awaiting Moderation
                </h3>
                <p style={{ color: '#94A3B8' }}>
                  Verify amenities, room inventory, and owner credentials before publishing to customer search.
                </p>
              </div>
            </div>
            <Link to="/approvals" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
              Review Approvals Queue
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* 2-Column Section: Pending Hoteles & Recent Bookings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
          {/* Pending Hotels Queue */}
          <div className="table-container">
            <div className="table-header-bar">
              <div>
                <h3>Pending Approval Queue</h3>
                <p>Hotels submitted by verified property owners</p>
              </div>
              <Link to="/approvals" className="btn btn-secondary btn-sm">View All</Link>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Hotel Property</th>
                  <th>Location</th>
                  <th>Rooms</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Loading properties...</td></tr>
                ) : !data?.pendingHotels || data.pendingHotels.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>All hotel listings are moderated.</td></tr>
                ) : (
                  data.pendingHotels.map((hotel) => (
                    <tr key={hotel.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{hotel.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #{hotel.id}</div>
                      </td>
                      <td>{hotel.city}, {hotel.state}</td>
                      <td><span className="badge badge-neutral">{hotel.room_count || 1} Rooms</span></td>
                      <td>
                        <button
                          onClick={() => handleQuickApprove(hotel.id)}
                          className="btn btn-success btn-sm"
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Bookings */}
          <div className="table-container">
            <div className="table-header-bar">
              <div>
                <h3>Recent Platform Bookings</h3>
                <p>Real-time customer reservations</p>
              </div>
              <Link to="/bookings" className="btn btn-secondary btn-sm">View All</Link>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Guest</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Loading reservations...</td></tr>
                ) : !data?.recentBookings || data.recentBookings.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No reservations recorded yet.</td></tr>
                ) : (
                  data.recentBookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {b.booking_reference || `BK-${b.id}`}
                      </td>
                      <td>{b.guest_name || b.user_name || 'Guest'}</td>
                      <td>
                        <span className={`badge ${
                          b.booking_status === 'confirmed' ? 'badge-success' :
                          b.booking_status === 'cancelled' ? 'badge-danger' : 'badge-neutral'
                        }`}>
                          {b.booking_status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        ${Number(b.grand_total || b.total_amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
