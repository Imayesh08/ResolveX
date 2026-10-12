import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import StatusBadge from '../components/StatusBadge';

describe('Frontend Unit Tests: StatusBadge Component', () => {
  it('renders OPEN status correctly with blue styling class', () => {
    render(<StatusBadge status="OPEN" />);
    const badge = screen.getByText('Open');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-open');
  });

  it('renders IN_PROGRESS status correctly', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    const badge = screen.getByText('In Progress');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-in_progress');
  });

  it('renders RESOLVED status correctly with success class', () => {
    render(<StatusBadge status="RESOLVED" />);
    const badge = screen.getByText('Resolved');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-resolved');
  });

  it('renders ASSIGNED and CLOSED statuses', () => {
    render(
      <>
        <StatusBadge status="ASSIGNED" />
        <StatusBadge status="CLOSED" />
      </>
    );
    expect(screen.getByText('Assigned')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });
});
