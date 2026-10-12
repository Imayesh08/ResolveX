import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef(null);

  // Fetch paginated notifications from REST API
  const fetchNotifications = useCallback(async (params = { page: 1, limit: 20 }) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/notifications', { params });
      setNotifications(res.data.data.notifications || []);
      if (typeof res.data.data.unreadCount === 'number') {
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch unread count for badge
  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [token]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    if (!id) return;
    try {
      // Optimistic state update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Refresh to ensure consistency
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);

      await api.patch('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  // Delete notification
  const deleteNotification = useCallback(async (id) => {
    if (!id) return;
    try {
      const target = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.error('Failed to delete notification:', err);
      fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchNotifications({ page: 1, limit: 20 });
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
    }
  }, [isAuthenticated, token, fetchNotifications, fetchUnreadCount]);

  // Establish authenticated Socket.IO connection
  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Determine socket endpoint (Vite proxy handles /socket.io in dev)
    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;

    const socket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
    });

    // Listen for incoming real-time notifications
    socket.on('notification:new', (newNotif) => {
      if (!newNotif || !newNotif._id) return;

      setNotifications((prev) => {
        // Prevent duplicate items
        if (prev.some((n) => n._id === newNotif._id)) {
          return prev;
        }
        return [newNotif, ...prev];
      });

      setUnreadCount((prev) => prev + 1);

      // Trigger user-facing toast alert
      showToast(newNotif.title + ': ' + newNotif.message, 'info');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('notification:new');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, token, user, showToast]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    isConnected,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
