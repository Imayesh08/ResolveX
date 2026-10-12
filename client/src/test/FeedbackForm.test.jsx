import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import FeedbackForm from '../components/FeedbackForm';
import api from '../api/axios';

// Mock api axios calls
vi.mock('../api/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

describe('Frontend Customer Feedback and Ratings Component Tests', () => {
  const complaintId = 'cmp-67890';

  it('renders feedback form heading and 5 accessible star rating buttons', () => {
    render(
      <FeedbackForm
        complaintId={complaintId}
        existingFeedback={null}
        isOwner={true}
        userRole="customer"
      />
    );

    expect(screen.getByText(/How was your support experience\?/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /Star rating from 1 to 5/i })).toBeInTheDocument();

    const starButtons = screen.getAllByRole('radio');
    expect(starButtons.length).toBe(5);

    // Initial submit button should be disabled when rating is 0
    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });
    expect(submitBtn).toBeDisabled();
  });

  it('allows selecting star ratings and displays corresponding rating label', () => {
    render(
      <FeedbackForm
        complaintId={complaintId}
        existingFeedback={null}
        isOwner={true}
        userRole="customer"
      />
    );

    const star5 = screen.getByRole('radio', { name: /5 star - Excellent/i });
    fireEvent.click(star5);

    // Rating label "Excellent" should now be displayed
    expect(screen.getByText('Excellent')).toBeInTheDocument();

    // Submit button should now be enabled
    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('submits rating and comment, and displays thank-you confirmation state', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          feedback: {
            _id: 'fb-101',
            rating: 5,
            comment: 'Exceptional service by the engineering team!',
            createdAt: new Date().toISOString()
          }
        }
      }
    });

    const onSubmitted = vi.fn();

    render(
      <FeedbackForm
        complaintId={complaintId}
        existingFeedback={null}
        isOwner={true}
        userRole="customer"
        onFeedbackSubmitted={onSubmitted}
      />
    );

    // Select 5 stars
    const star5 = screen.getByRole('radio', { name: /5 star - Excellent/i });
    fireEvent.click(star5);

    // Enter comment
    const commentInput = screen.getByPlaceholderText(/Tell us what went well/i);
    fireEvent.change(commentInput, {
      target: { value: 'Exceptional service by the engineering team!' }
    });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(`/complaints/${complaintId}/feedback`, {
        rating: 5,
        comment: 'Exceptional service by the engineering team!'
      });
    });

    // Verify thank-you confirmation message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Thank you for your feedback!/i)).toBeInTheDocument();
      expect(screen.getByText(/Feedback Recorded/i)).toBeInTheDocument();
    });

    expect(onSubmitted).toHaveBeenCalled();
  });

  it('renders submitted feedback card when feedback already exists', () => {
    const existing = {
      _id: 'fb-existing',
      rating: 4,
      comment: 'Very rapid turnaround time on the server reboot.',
      createdAt: new Date('2026-10-10').toISOString()
    };

    render(
      <FeedbackForm
        complaintId={complaintId}
        existingFeedback={existing}
        isOwner={true}
        userRole="customer"
      />
    );

    expect(screen.getByText(/Your Feedback & Rating/i)).toBeInTheDocument();
    expect(screen.getByText(/Very Good \(4\/5\)/i)).toBeInTheDocument();
    expect(screen.getByText('Very rapid turnaround time on the server reboot.')).toBeInTheDocument();
  });

  it('does not render feedback submission form for non-owner customers', () => {
    const { container } = render(
      <FeedbackForm
        complaintId={complaintId}
        existingFeedback={null}
        isOwner={false}
        userRole="customer"
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
