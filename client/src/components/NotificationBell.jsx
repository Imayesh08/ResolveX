import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import NotificationDropdown from './NotificationDropdown';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="btn-ghost"
        style={{
          position: 'relative',
          padding: '0.45rem',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: isOpen ? 'rgba(22, 136, 255, 0.15)' : 'var(--color-surface-elevated)',
          border: isOpen ? '1px solid rgba(22, 136, 255, 0.4)' : '1px solid var(--color-border)',
          color: isOpen ? '#1688FF' : '#CBD5E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell size={18} />

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 9,
              backgroundColor: '#1688FF',
              color: '#FFFFFF',
              fontSize: '0.6875rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(22, 136, 255, 0.7)',
              border: '2px solid #090D12'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          isConnected={isConnected}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onDelete={deleteNotification}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
