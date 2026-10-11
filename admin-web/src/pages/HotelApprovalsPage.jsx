import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { adminService } from '../services/api';
import {
  Building2,
  CheckCircle2,
  XCircle,
  MapPin,
  Star,
  Layers,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function HotelApprovalsPage() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectModal, setRejectModal] = useState({ open: false, hotel: null, reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadPendingHotels = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getPendingHotels();
      setHotels(res.items || res || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to fetch pending hotels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingHotels();
  }, []);

  const handleApprove = async (hotelId) => {
    if (!window.confirm('Are you sure you want to approve this hotel for public booking?')) return;
    try {
      setSubmitting(true);
      await adminService.approveHotel(hotelId);
      await loadPendingHotels();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModal.reason.trim()) {
      alert('Please specify a valid rejection reason.');
      return;
    }
    try {
      setSubmitting(true);
      await adminService.rejectHotel(rejectModal.hotel.id, rejectModal.reason.trim());
      setRejectModal({ open: false, hotel: null, reason: '' });
      await loadPendingHotels();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Rejection failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Header title="Hotel Moderation Queue" />

      <div className="admin-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2>Pending Hotel Listings</h2>
            <p>Review properties submitted by hoteliers before publishing to the StayEase platform</p>
          </div>
          <button onClick={loadPendingHotels} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh Queue
          </button>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            Loading pending hotel approvals...
          </div>
        ) : hotels.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ width: 64, height: 64, background: '#ECFDF5', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#059669', marginBottom: '1rem' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3>Moderation Queue Clear</h3>
            <p style={{ maxWidth: '400px', margin: '0.5rem auto 0' }}>
              All submitted hotel properties have been reviewed. New owner submissions will appear here automatically.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {hotels.map((hotel) => (
              <div key={hotel.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                      <h3 style={{ fontSize: '1.25rem' }}>{hotel.name}</h3>
                      <span className="badge badge-warning">Pending Review</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#F59E0B', fontSize: '0.85rem', fontWeight: 700 }}>
                        <Star size={14} fill="#F59E0B" />
                        <span>{hotel.star_rating || 4.5}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <MapPin size={15} />
                      <span>{hotel.address}, {hotel.city}, {hotel.state}, {hotel.country}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => setRejectModal({ open: true, hotel, reason: '' })}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--danger)', borderColor: '#FCA5A5' }}
                      disabled={submitting}
                    >
                      <XCircle size={15} />
                      Reject Listing
                    </button>
                    <button
                      onClick={() => handleApprove(hotel.id)}
                      className="btn btn-success btn-sm"
                      disabled={submitting}
                    >
                      <CheckCircle2 size={15} />
                      Approve & Publish
                    </button>
                  </div>
                </div>

                <p style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {hotel.description || 'No hotel description provided.'}
                </p>

                <div style={{ display: 'flex', gap: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div><strong>Owner ID:</strong> #{hotel.owner_id}</div>
                  <div><strong>Contact:</strong> {hotel.email || hotel.phone || 'Available in profile'}</div>
                  <div><strong>Status:</strong> {hotel.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        {rejectModal.open && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 style={{ marginBottom: '0.5rem' }}>Reject Hotel Listing</h3>
              <p style={{ marginBottom: '1.25rem' }}>
                Specify the compliance or verification issues for <strong>{rejectModal.hotel?.name}</strong>. This feedback will be sent to the hotel owner.
              </p>

              <form onSubmit={handleRejectSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Rejection Reason (Required)
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={rejectModal.reason}
                    onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                    className="form-input"
                    placeholder="e.g. High-resolution primary photo required, invalid business registration address..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setRejectModal({ open: false, hotel: null, reason: '' })}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-danger"
                  >
                    {submitting ? 'Submitting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
