import React, { useState } from 'react';
import { Bell, CheckCheck, Filter, RefreshCw, Loader2, BellOff, Wifi, WifiOff } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import NotificationItem from '../components/NotificationItem';

const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    loading,
    isConnected,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'

  const filteredNotifications =
    filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            Notification Center
          </h1>
          <p style={{ color: '#A6B0BE', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Real-time feed of all ticket lifecycle alerts, assignments, and customer responses.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Live Socket Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: isConnected ? 'rgba(25, 214, 154, 0.1)' : 'rgba(255, 98, 108, 0.1)',
              border: isConnected ? '1px solid rgba(25, 214, 154, 0.3)' : '1px solid rgba(255, 98, 108, 0.3)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: isConnected ? '#19D69A' : '#FF626C'
            }}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? 'Socket.IO Connected (Live)' : 'Socket Disconnected'}</span>
          </div>

          <button
            type="button"
            onClick={() => fetchNotifications()}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8125rem' }}
            title="Refresh feed"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="btn btn-primary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8125rem' }}
            >
              <CheckCheck size={14} />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '0.5rem'
        }}
      >
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: filter === 'ALL' ? '#1688FF' : 'transparent',
            color: filter === 'ALL' ? '#FFFFFF' : '#A6B0BE',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('UNREAD')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: filter === 'UNREAD' ? '#1688FF' : 'transparent',
            color: filter === 'UNREAD' ? '#FFFFFF' : '#A6B0BE',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: '0.6875rem',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)'
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List Container */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#101720',
          border: '1px solid rgba(22, 136, 255, 0.15)'
        }}
      >
        {loading && notifications.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#94A3B8' }}>
            <Loader2 size={32} className="spin" color="#1688FF" style={{ margin: '0 auto 0.75rem' }} />
            <div>Loading notifications feed...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <BellOff size={36} color="#64748B" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.25rem' }}>
              {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications in history'}
            </div>
            <div style={{ fontSize: '0.8125rem' }}>
              Real-time activity alerts will appear here as complaints progress.
            </div>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <NotificationItem
              key={notif._id}
              notification={notif}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
