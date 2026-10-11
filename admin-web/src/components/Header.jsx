import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Bell } from 'lucide-react';

export default function Header({ title }) {
  const { user } = useAuth();

  return (
    <header className="admin-header">
      <div>
        <h1>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ECFDF5', padding: '0.4rem 0.85rem', borderRadius: '9999px', border: '1px solid #A7F3D0' }}>
          <Activity size={14} color="#059669" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065F46' }}>API v1 Active</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border)', paddingLeft: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{user?.email}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role: Administrator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
