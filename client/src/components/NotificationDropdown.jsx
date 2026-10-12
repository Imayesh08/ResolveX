import React, { useRef, useEffect } from 'react';
import { CheckCheck, BellOff, Loader2, Wifi, WifiOff } from 'lucide-react';
import NotificationItem from './NotificationItem';

const NotificationDropdown = ({
  notifications,
  unreadCount,
  loading,
  isConnected,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClose
}) => {
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 360,
        maxWidth: '90vw',
        backgroundColor: '#101720',
        border: '1px solid rgba(22, 136, 255, 0.25)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65), 0 0 20px rgba(22, 136, 255, 0.1)',
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
      role="dialog"
      aria-label="Notifications panel"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#151D27'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(22, 136, 255, 0.2)',
                color: '#1688FF',
                border: '1px solid rgba(22, 136, 255, 0.35)'
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Socket Connection Live Indicator */}
          <span
            title={isConnected ? 'Live updates active' : 'Connecting live stream...'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.6875rem',
              color: isConnected ? '#19D69A' : '#94A3B8'
            }}
          >
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span style={{ fontSize: '0.625rem' }}>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </span>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              style={{
                background: 'none',
                border: 'none',
                color: '#1688FF',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: 0
              }}
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Body: Notifications List */}
      <div
        style={{
          maxHeight: 380,
          overflowY: 'auto'
        }}
      >
        {loading && notifications.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: '#94A3B8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Loader2 size={24} className="spin" color="#1688FF" />
            <span style={{ fontSize: '0.8125rem' }}>Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: '#64748B',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              <BellOff size={20} color="#64748B" />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94A3B8' }}>
              No notifications yet
            </span>
            <span style={{ fontSize: '0.75rem' }}>
              You'll be alerted when tickets are updated or assigned.
            </span>
          </div>
        ) : (
          notifications.map((notif) => (
            <NotificationItem
              key={notif._id}
              notification={notif}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
              onCloseDropdown={onClose}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#151D27',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center'
          }}
        >
          <span style={{ fontSize: '0.6875rem', color: '#64748B' }}>
            Showing recent real-time alerts
          </span>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
