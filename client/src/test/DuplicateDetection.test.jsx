import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import DuplicateSuggestionsPanel from '../components/DuplicateSuggestionsPanel';

describe('Frontend Duplicate Complaint Suggestions Panel Tests', () => {
  const mockMatches = [
    {
      complaintId: 'cmp-001',
      ticketNumber: 'RX-20261012-1001',
      title: 'Payment debited but order confirmation failed',
      category: 'Billing and Payment',
      status: 'OPEN',
      createdAt: '2026-10-12T10:00:00.000Z',
      similarityScore: 0.82,
      matchedTerms: ['payment', 'debit', 'order'],
      reasons: ['Matching category: Billing and Payment', 'High title similarity (85%)'],
      canView: true
    },
    {
      ticketNumber: 'RX-20261011-8842',
      title: 'Payment deducted from account but order...',
      category: 'Billing and Payment',
      status: 'IN_PROGRESS',
      createdAt: '2026-10-11T14:30:00.000Z',
      similarityScore: 0.65,
      matchedTerms: ['payment', 'order'],
      reasons: ['Matching category: Billing and Payment', 'Shared terms: payment, order'],
      canView: false // Cross-customer protected record
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when scanning is in progress', () => {
    render(
      <DuplicateSuggestionsPanel
        matches={[]}
        loading={true}
        hasChecked={false}
      />
    );

    expect(screen.getByText(/Scanning existing complaints for potential duplicates.../i)).toBeInTheDocument();
  });

  it('renders green clear state when check completed with zero duplicates', () => {
    render(
      <DuplicateSuggestionsPanel
        matches={[]}
        loading={false}
        hasChecked={true}
      />
    );

    expect(screen.getByText(/No duplicate complaints detected. Your issue appears unique./i)).toBeInTheDocument();
  });

  it('renders potential matches list with similarity score badge and reasons', () => {
    render(
      <BrowserRouter>
        <DuplicateSuggestionsPanel
          matches={mockMatches}
          loading={false}
          hasChecked={true}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/Potential Similar Complaints Found \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/#RX-20261012-1001/i)).toBeInTheDocument();
    expect(screen.getByText('82% Similarity')).toBeInTheDocument();
    expect(screen.getByText('65% Similarity')).toBeInTheDocument();
    expect(screen.getAllByText(/Matching category: Billing and Payment/i).length).toBe(2);
  });

  it('provides View Ticket link for authorized complaint and privacy shield for cross-customer', () => {
    render(
      <BrowserRouter>
        <DuplicateSuggestionsPanel
          matches={mockMatches}
          loading={false}
          hasChecked={true}
        />
      </BrowserRouter>
    );

    // First ticket is viewable
    const viewLink = screen.getByRole('link', { name: /View Ticket/i });
    expect(viewLink).toBeInTheDocument();
    expect(viewLink).toHaveAttribute('href', '/complaints/cmp-001');

    // Second ticket is cross-customer protected
    expect(screen.getByText(/Cross-customer record \(details protected\)/i)).toBeInTheDocument();
  });

  it('triggers onDismiss callback when customer clicks Continue with New Complaint', () => {
    const handleDismiss = vi.fn();
    render(
      <BrowserRouter>
        <DuplicateSuggestionsPanel
          matches={mockMatches}
          loading={false}
          hasChecked={true}
          onDismiss={handleDismiss}
        />
      </BrowserRouter>
    );

    const continueBtn = screen.getByRole('button', { name: /Continue with New Complaint/i });
    fireEvent.click(continueBtn);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders Select as Primary button in staff mode and triggers onSelectPrimary', () => {
    const handleSelectPrimary = vi.fn();
    render(
      <BrowserRouter>
        <DuplicateSuggestionsPanel
          matches={mockMatches}
          loading={false}
          hasChecked={true}
          isStaffMode={true}
          onSelectPrimary={handleSelectPrimary}
        />
      </BrowserRouter>
    );

    const selectBtns = screen.getAllByRole('button', { name: /Select as Primary/i });
    expect(selectBtns.length).toBe(2);

    fireEvent.click(selectBtns[0]);
    expect(handleSelectPrimary).toHaveBeenCalledWith(mockMatches[0]);
  });
});
