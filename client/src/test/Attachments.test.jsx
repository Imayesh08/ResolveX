import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import EvidenceSection, { formatBytes } from '../components/EvidenceSection';
import api from '../api/axios';
import { ToastProvider } from '../context/ToastContext';

// Mock api axios calls
vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock URL methods
window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost:5173/fake-blob');
window.URL.revokeObjectURL = vi.fn();

describe('Frontend Evidence & Attachments Component Tests', () => {
  const complaintId = 'cmp-55555';

  const mockAttachments = [
    {
      _id: 'att-001',
      originalName: 'error_screenshot.png',
      mimeType: 'image/png',
      size: 1048576, // 1 MB
      uploadedAt: '2026-10-12T10:00:00.000Z',
      uploadedBy: { _id: 'u-1', name: 'John Doe', role: 'customer' },
      description: 'Error code 500 screenshot'
    },
    {
      _id: 'att-002',
      originalName: 'invoice_billing.pdf',
      mimeType: 'application/pdf',
      size: 512000, // 500 KB
      uploadedAt: '2026-10-12T10:05:00.000Z',
      uploadedBy: { _id: 'u-1', name: 'John Doe', role: 'customer' },
      description: 'Official invoice copy'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats byte sizes into human-readable strings correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(5242880)).toBe('5 MB');
  });

  it('renders empty state when complaint has no attachments', () => {
    render(
      <ToastProvider>
        <EvidenceSection
          complaintId={complaintId}
          attachments={[]}
          isOwner={true}
          userRole="customer"
          complaintStatus="OPEN"
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Evidence & Attachments/i)).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 5/i)).toBeInTheDocument();
    expect(screen.getByText(/No evidence attachments uploaded yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload Evidence/i })).toBeInTheDocument();
  });

  it('renders list of uploaded attachments with filenames, sizes, and badges', () => {
    render(
      <ToastProvider>
        <EvidenceSection
          complaintId={complaintId}
          attachments={mockAttachments}
          isOwner={true}
          userRole="customer"
          complaintStatus="OPEN"
        />
      </ToastProvider>
    );

    expect(screen.getByText('error_screenshot.png')).toBeInTheDocument();
    expect(screen.getByText('invoice_billing.pdf')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
    expect(screen.getByText('500 KB')).toBeInTheDocument();
    expect(screen.getByText(/"Error code 500 screenshot"/i)).toBeInTheDocument();

    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    expect(viewButtons.length).toBe(2);

    const downloadButtons = screen.getAllByRole('button', { name: /Download/i });
    expect(downloadButtons.length).toBe(2);
  });

  it('triggers authenticated download when clicking download button', async () => {
    api.get.mockResolvedValueOnce({
      data: new Blob(['fake binary content'], { type: 'image/png' })
    });

    render(
      <ToastProvider>
        <EvidenceSection
          complaintId={complaintId}
          attachments={mockAttachments}
          isOwner={true}
          userRole="customer"
          complaintStatus="OPEN"
        />
      </ToastProvider>
    );

    const downloadButtons = screen.getAllByRole('button', { name: /Download/i });
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        `/complaints/${complaintId}/attachments/att-001?download=true`,
        expect.objectContaining({ responseType: 'blob' })
      );
    });
  });

  it('opens authenticated image preview modal when clicking view button', async () => {
    api.get.mockResolvedValueOnce({
      data: new Blob(['fake image binary'], { type: 'image/png' })
    });

    render(
      <ToastProvider>
        <EvidenceSection
          complaintId={complaintId}
          attachments={mockAttachments}
          isOwner={true}
          userRole="customer"
          complaintStatus="OPEN"
        />
      </ToastProvider>
    );

    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        `/complaints/${complaintId}/attachments/att-001`,
        expect.objectContaining({ responseType: 'blob' })
      );
      expect(screen.getByText(/Evidence Preview: error_screenshot.png/i)).toBeInTheDocument();
    });
  });

  it('allows owner to delete attachment while complaint is OPEN', async () => {
    api.delete.mockResolvedValueOnce({
      data: { status: 'success', message: 'Attachment deleted' }
    });
    api.get.mockResolvedValueOnce({
      data: { data: { attachments: [mockAttachments[1]] } }
    });

    const onUpdated = vi.fn();

    render(
      <ToastProvider>
        <EvidenceSection
          complaintId={complaintId}
          attachments={mockAttachments}
          isOwner={true}
          userRole="customer"
          complaintStatus="OPEN"
          onAttachmentsUpdated={onUpdated}
        />
      </ToastProvider>
    );

    const deleteButtons = screen.getAllByTitle(/Delete attachment/i);
    expect(deleteButtons.length).toBe(2);

    // Click delete on first attachment -> opens confirmation modal
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText(/Confirm Attachment Deletion/i)).toBeInTheDocument();
    expect(screen.getByText(/Permanently remove this evidence file\?/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Delete Evidence/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/complaints/${complaintId}/attachments/att-001`);
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('hides delete button for customer when complaint is IN_PROGRESS or RESOLVED', () => {
    render(
      <ToastProvider>
        <EvidenceSection
          complaintId={complaintId}
          attachments={mockAttachments}
          isOwner={true}
          userRole="customer"
          complaintStatus="IN_PROGRESS"
        />
      </ToastProvider>
    );

    const deleteButtons = screen.queryAllByTitle(/Delete attachment/i);
    expect(deleteButtons.length).toBe(0);
  });
});
