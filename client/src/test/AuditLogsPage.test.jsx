import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import AuditLogsPage from '../pages/AuditLogsPage';
import api from '../api/axios';
import { ToastProvider } from '../context/ToastContext';

// Mock api
vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

const mockLogsData = {
  data: {
    status: 'success',
    results: 2,
    pagination: {
      total: 2,
      page: 1,
      pages: 1,
      limit: 20
    },
    summary: {
      totalEvents: 42,
      complaintEvents: 25,
      userEvents: 12,
      authFailures: 5
    },
    data: {
      logs: [
        {
          _id: 'log-001',
          actor: {
            _id: 'usr-1',
            name: 'Sarah Connor',
            email: 'sarah@example.com',
            department: 'Administration'
          },
          actorRole: 'admin',
          action: 'COMPLAINT_ASSIGNED',
          resourceType: 'Complaint',
          resourceId: 'cmp-98765',
          description: 'Complaint #RX-1002 assigned to John Doe',
          changes: {
            assignedTo: {
              before: null,
              after: 'usr-2'
            },
            status: {
              before: 'OPEN',
              after: 'ASSIGNED'
            }
          },
          metadata: {
            ip: '192.168.1.1',
            method: 'PATCH',
            path: '/api/v1/complaints/cmp-98765/assign'
          },
          outcome: 'SUCCESS',
          createdAt: '2026-10-12T10:00:00.000Z'
        },
        {
          _id: 'log-002',
          actor: null,
          actorRole: 'system',
          action: 'AUTH_LOGIN_FAILED',
          resourceType: 'Authentication',
          resourceId: 'intruder@unknown.com',
          description: 'Failed login attempt for intruder@unknown.com',
          changes: null,
          metadata: {
            ip: '203.0.113.195',
            method: 'POST',
            path: '/api/v1/auth/login',
            email: 'intruder@unknown.com',
            reason: 'Invalid credentials'
          },
          outcome: 'FAILURE',
          createdAt: '2026-10-12T10:05:00.000Z'
        }
      ]
    }
  }
};

describe('Frontend Audit Logs & Accountability Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(mockLogsData);
  });

  it('renders page header and summary KPI metrics cards', async () => {
    render(
      <ToastProvider>
        <AuditLogsPage />
      </ToastProvider>
    );

    // Verify Title
    expect(screen.getByText(/Audit Logs & Accountability/i)).toBeInTheDocument();

    // Verify Metric Cards
    await waitFor(() => {
      expect(screen.getByText('Total Audit Events')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Complaint Operations')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('User Governance')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Auth Failures')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('renders data table with audit entries, actor details, and outcome badges', async () => {
    render(
      <ToastProvider>
        <AuditLogsPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('COMPLAINT ASSIGNED')).toBeInTheDocument();
      expect(screen.getByText('#cmp-98765')).toBeInTheDocument();
      expect(screen.getByText('Complaint #RX-1002 assigned to John Doe')).toBeInTheDocument();
      expect(screen.getByText('OK')).toBeInTheDocument();
      expect(screen.getByText('FAIL')).toBeInTheDocument();
    });
  });

  it('opens detailed change diff and metadata modal when inspecting an entry', async () => {
    render(
      <ToastProvider>
        <AuditLogsPage />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });

    const inspectButtons = screen.getAllByTitle(/Inspect changes & metadata/i);
    expect(inspectButtons.length).toBeGreaterThan(0);

    fireEvent.click(inspectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Audit Log Record Details')).toBeInTheDocument();
      expect(screen.getByText('Recorded Changes (Before vs After)')).toBeInTheDocument();
      expect(screen.getByText('assignedTo')).toBeInTheDocument();
      expect(screen.getByText('ASSIGNED')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
      expect(screen.getByText('Copy Resource ID')).toBeInTheDocument();
    });
  });

  it('updates filters and triggers reset filters correctly', async () => {
    render(
      <ToastProvider>
        <AuditLogsPage />
      </ToastProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search description, resource ID.../i);
    fireEvent.change(searchInput, { target: { value: 'John Doe' } });
    expect(searchInput.value).toBe('John Doe');

    const resetBtn = screen.getByRole('button', { name: /Reset Filters/i });
    fireEvent.click(resetBtn);

    expect(searchInput.value).toBe('');
  });
});
