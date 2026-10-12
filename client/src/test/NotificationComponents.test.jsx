import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import NotificationItem from '../components/NotificationItem';
import NotificationDropdown from '../components/NotificationDropdown';

describe('Frontend Real-Time Notification Components Tests', () => {
  const mockNotification = {
    _id: 'notif-123',
    type: 'COMPLAINT_ASSIGNED',
    title: 'New Complaint Assignment',
    message: 'You have been assigned to complaint #CMP-2026-0099.',
    isRead: false,
    createdAt: new Date().toISOString(),
    complaint: {
      _id: 'comp-999',
      ticketNumber: 'CMP-2026-0099'
    }
  };

  describe('1. NotificationItem Component', () => {
    it('renders notification title, message, and unread indicator dot', () => {
      render(
        <BrowserRouter>
          <NotificationItem
            notification={mockNotification}
            onMarkRead={vi.fn()}
            onDelete={vi.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('New Complaint Assignment')).toBeInTheDocument();
      expect(screen.getByText(/CMP-2026-0099/)).toBeInTheDocument();
      expect(screen.getByTitle('Unread notification')).toBeInTheDocument();
    });

    it('triggers onMarkRead when Read button is clicked', () => {
      const handleMarkRead = vi.fn();
      render(
        <BrowserRouter>
          <NotificationItem
            notification={mockNotification}
            onMarkRead={handleMarkRead}
            onDelete={vi.fn()}
          />
        </BrowserRouter>
      );

      const readBtn = screen.getByRole('button', { name: 'Mark as read' });
      fireEvent.click(readBtn);
      expect(handleMarkRead).toHaveBeenCalledWith('notif-123');
    });

    it('renders read notification without unread indicator dot', () => {
      const readNotif = { ...mockNotification, isRead: true };
      render(
        <BrowserRouter>
          <NotificationItem
            notification={readNotif}
            onMarkRead={vi.fn()}
            onDelete={vi.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.queryByTitle('Unread notification')).not.toBeInTheDocument();
    });
  });

  describe('2. NotificationDropdown Component', () => {
    it('renders empty state when there are no notifications', () => {
      render(
        <BrowserRouter>
          <NotificationDropdown
            notifications={[]}
            unreadCount={0}
            loading={false}
            isConnected={true}
            onMarkRead={vi.fn()}
            onMarkAllRead={vi.fn()}
            onDelete={vi.fn()}
            onClose={vi.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('renders notifications list and mark all read button when unread items exist', () => {
      const handleMarkAll = vi.fn();
      render(
        <BrowserRouter>
          <NotificationDropdown
            notifications={[mockNotification]}
            unreadCount={1}
            loading={false}
            isConnected={true}
            onMarkRead={vi.fn()}
            onMarkAllRead={handleMarkAll}
            onDelete={vi.fn()}
            onClose={vi.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('New Complaint Assignment')).toBeInTheDocument();
      const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
      expect(markAllBtn).toBeInTheDocument();

      fireEvent.click(markAllBtn);
      expect(handleMarkAll).toHaveBeenCalled();
    });
  });
});
