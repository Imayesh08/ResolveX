import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import LoginPage from '../pages/LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

describe('Frontend Unit Tests: LoginPage Component & Validation', () => {
  it('renders login form elements and demo buttons', () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Sign In to ResolveX/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Admin Demo/i })).toBeInTheDocument();
  });

  it('populates fields when demo buttons are clicked', () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passInput = screen.getByLabelText(/Password/i);
    const adminDemoBtn = screen.getByRole('button', { name: /Admin Demo/i });

    fireEvent.click(adminDemoBtn);

    expect(emailInput.value).toBe('admin@resolvex.local');
    expect(passInput.value).toBe('Admin123!');
  });
});
