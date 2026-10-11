import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Shield,
  Briefcase,
  User,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function UsersPage() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await adminService.getUsers(params);
      setUsers(res.items || res || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const actionLabel = newStatus === 'suspended' ? 'suspend' : 'reactivate';

    if (!window.confirm(`Are you sure you want to ${actionLabel} account for ${user.email}?`)) {
      return;
    }

    try {
      await adminService.updateUserStatus(user.id, newStatus);
      await loadUsers();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update user status');
    }
  };

  const roleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield size={14} color="#7C3AED" />;
      case 'owner':
        return <Briefcase size={14} color="#2563EB" />;
      default:
        return <User size={14} color="#059669" />;
    }
  };

  return (
    <div>
      <Header title="User Directory & Governance" />

      <div className="admin-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2>Registered Platform Accounts</h2>
            <p>Govern access permissions and audit compliance for all customers, hosts, and admins</p>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', width: '220px' }}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-input"
              style={{ width: '130px' }}
            >
              <option value="">All Roles</option>
              <option value="customer">Customer</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: '130px' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>

            <button type="submit" className="btn btn-secondary btn-sm">Filter</button>
          </form>
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
                <th>User Identity</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Governance Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Loading user directory...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No users match the search criteria.</td></tr>
              ) : (
                users.map((u) => {
                  const isCurrentAdmin = Number(u.id) === Number(currentAdmin?.id);
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: u.role === 'admin' ? '#F5F3FF' : u.role === 'owner' ? '#EFF6FF' : '#ECFDF5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: u.role === 'admin' ? '#7C3AED' : u.role === 'owner' ? '#2563EB' : '#059669',
                          }}>
                            {u.name ? u.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              {u.name} {isCurrentAdmin && <span style={{ fontSize: '0.7rem', color: '#2563EB' }}>(You)</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          u.role === 'admin' ? 'badge-primary' :
                          u.role === 'owner' ? 'badge-neutral' : 'badge-success'
                        }`} style={{ gap: '0.35rem' }}>
                          {roleIcon(u.role)}
                          {u.role}
                        </span>
                      </td>
                      <td>{u.phone || '—'}</td>
                      <td>
                        <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {u.created_at ? u.created_at.substring(0, 10) : '—'}
                      </td>
                      <td>
                        {isCurrentAdmin ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Self Protected</span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`btn btn-sm ${u.status === 'active' ? 'btn-secondary' : 'btn-success'}`}
                            style={u.status === 'active' ? { color: 'var(--danger)', borderColor: '#FCA5A5' } : {}}
                          >
                            {u.status === 'active' ? (
                              <>
                                <UserX size={14} />
                                Suspend
                              </>
                            ) : (
                              <>
                                <UserCheck size={14} />
                                Reactivate
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
