import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  UserCheck,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  Clock,
  Check,
  Trash2
} from 'lucide-react';

const NotificationItem = ({
  notification,
  onMarkRead,
  onDelete,
  onCloseDropdown
}) => {
  const navigate = useNavigate();

  const getIconForType = (type) => {
    switch (type) {
      case 'COMPLAINT_CREATED':
        return <FileText size={16} color="#1688FF" />;
      case 'COMPLAINT_ASSIGNED':
        return <UserCheck size={16} color="#FFB547" />;
      case 'STATUS_CHANGED':
        return <CheckCircle2 size={16} color="#19D69A" />;
      case 'NEW_RESPONSE':
        return <MessageSquare size={16} color="#4BA2FF" />;
      default:
        return <AlertTriangle size={16} color="#FF626C" />;
    }
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleClick = () => {
    if (!notification.isRead && onMarkRead) {
      onMarkRead(notification._id);
    }
    if (notification.complaint) {
      const complaintId =
        typeof notification.complaint === 'object'
          ? notification.complaint._id
          : notification.complaint;
      if (complaintId) {
        if (onCloseDropdown) onCloseDropdown();
        navigate(`/complaints/${complaintId}`);
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backgroundColor: notification.isRead ? 'transparent' : 'rgba(22, 136, 255, 0.06)',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        position: 'relative'
      }}
      className="notification-item-hover"
    >
      {/* Icon Badge */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-xs)',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px'
        }}
      >
        {getIconForType(notification.type)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: notification.isRead ? 500 : 700,
              color: notification.isRead ? '#CBD5E1' : '#FFFFFF',
              lineHeight: 1.3
            }}
          >
            {notification.title}
          </span>
          {!notification.isRead && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#1688FF',
                boxShadow: '0 0 6px #1688FF',
                flexShrink: 0
              }}
              title="Unread notification"
            />
          )}
        </div>

        <p
          style={{
            fontSize: '0.75rem',
            color: '#94A3B8',
            marginTop: '0.2rem',
            marginBottom: '0.35rem',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {notification.message}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.6875rem',
              color: '#64748B'
            }}
          >
            <Clock size={11} />
            {formatTimestamp(notification.createdAt)}
          </span>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {!notification.isRead && (
              <button
                type="button"
                onClick={() => onMarkRead && onMarkRead(notification._id)}
                aria-label="Mark as read"
                title="Mark as read"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px 4px',
                  color: '#1688FF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '0.6875rem'
                }}
              >
                <Check size={12} />
                <span>Read</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(notification._id)}
                title="Delete notification"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px 4px',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
