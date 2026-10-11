import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { adminService } from '../services/api';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Compass,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getReports();
      setReports(res);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div>
      <Header title="Platform Analytics & Financial Reports" />

      <div className="admin-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2>Financial & Destination Metrics</h2>
            <p>Aggregated real-time metrics generated directly from MySQL relational transactions</p>
          </div>

          <button onClick={loadReports} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh Report
          </button>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon-box" style={{ background: '#ECFDF5', color: '#059669' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div className="metric-val">
                ${reports ? (reports.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
              </div>
              <div className="metric-lbl">Total Gross Volume</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-box" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="metric-val">{reports?.totalReservations ?? 0}</div>
              <div className="metric-lbl">Total Completed Bookings</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-box" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
              <Compass size={24} />
            </div>
            <div>
              <div className="metric-val">{reports?.topDestinations?.length ?? 0}</div>
              <div className="metric-lbl">Active Destinations</div>
            </div>
          </div>
        </div>

        {/* Top Destinations Breakdown */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '0.25rem' }}>Top Destinations by Booking Volume</h3>
          <p style={{ marginBottom: '1.5rem' }}>Geographic travel demand across all active properties</p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Calculating destination distribution...</div>
          ) : !reports?.topDestinations || reports.topDestinations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No destination volume recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reports.topDestinations.map((dest, idx) => {
                const total = reports.totalReservations || 1;
                const pct = Math.round((dest.bookingCount / total) * 100);
                return (
                  <div key={dest.destination}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 700 }}>
                        {idx + 1}. {dest.destination}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {dest.bookingCount} reservation{dest.bookingCount > 1 ? 's' : ''} ({pct}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.max(5, pct)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #2563EB, #38BDF8)',
                          borderRadius: '9999px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
          Generated: {reports?.generatedAt ? new Date(reports.generatedAt).toLocaleString() : 'Just now'}
        </div>
      </div>
    </div>
  );
}
