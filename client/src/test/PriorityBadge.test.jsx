import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import PriorityBadge from '../components/PriorityBadge';

describe('Frontend Unit Tests: PriorityBadge Component', () => {
  it('renders all priority tiers: LOW, MEDIUM, HIGH, URGENT', () => {
    render(
      <div>
        <PriorityBadge priority="LOW" />
        <PriorityBadge priority="MEDIUM" />
        <PriorityBadge priority="HIGH" />
        <PriorityBadge priority="URGENT" />
      </div>
    );

    expect(screen.getByText('Low')).toHaveClass('badge-low');
    expect(screen.getByText('Medium')).toHaveClass('badge-medium');
    expect(screen.getByText('High')).toHaveClass('badge-high');
    expect(screen.getByText('Urgent')).toHaveClass('badge-urgent');
  });
});
