import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import App from '../App';

describe('Phase 5 Frontend React Router & Component Tests', () => {
  it('renders ResolveX Landing Page with branding and hero headlines', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { level: 1, name: /Enterprise Customer Complaint Management System/i });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText(/Built for Three Distinct Stakeholders/i)).toBeInTheDocument();
  });

  it('renders Public Navigation buttons to Sign In and Register', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Register as Customer/i })).toBeInTheDocument();
  });
});
