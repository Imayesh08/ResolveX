import React, { useState } from 'react';
import { User, KeyRound, Shield, AlertCircle, Mail, Building, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';

const ProfilePage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!passwordData.currentPassword) {
      setError('Current password is required.');
      return;
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch('/auth/update-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      showToast('Password updated successfully!', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'RX';

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.025em'
          }}
        >
          Profile & Security Settings
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
          Review your authenticated identity details, system permissions, and rotate security credentials.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }} className="profile-grid">
        {/* User Identity Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(22, 136, 255, 0.15)',
                border: '1px solid rgba(22, 136, 255, 0.3)',
                color: '#1688FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 0 16px rgba(22, 136, 255, 0.3)'
              }}
            >
              {userInitials}
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#FFFFFF' }}>
                {user?.name}
              </h2>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(22, 136, 255, 0.12)',
                  color: '#4BA2FF',
                  marginTop: '0.25rem'
                }}
              >
                {user?.role} Access
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
              <Mail size={16} style={{ color: 'var(--color-electric-blue)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Email Address</div>
                <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{user?.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
              <Building size={16} style={{ color: 'var(--color-electric-blue)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Department</div>
                <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{user?.department || 'General'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
              <Phone size={16} style={{ color: 'var(--color-electric-blue)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Phone Number</div>
                <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{user?.phone || 'Not recorded'}</div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--color-border-subtle)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Shield size={14} style={{ color: '#19D69A' }} />
            <span>Session secured with JWT via sessionStorage.</span>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Update Password</h2>
              <p className="card-subtitle">Maintain strong cryptographic account protection</p>
            </div>
            <KeyRound size={18} style={{ color: 'var(--color-electric-blue)' }} />
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(255, 98, 108, 0.12)',
                border: '1px solid rgba(255, 98, 108, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: '#FF626C',
                fontSize: '0.8125rem',
                marginBottom: '1rem'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="currentPassword">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">
                New Password (Min 6 chars)
              </label>
              <input
                id="newPassword"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
                disabled={submitting}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Save New Password'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
