import React, { useState } from 'react';
import { Star, CheckCircle2, AlertCircle, Loader2, MessageSquare, ThumbsUp } from 'lucide-react';
import api from '../api/axios';

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent'
};

const FeedbackForm = ({ complaintId, existingFeedback, isOwner, userRole, onFeedbackSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(existingFeedback || null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const activeRating = hoverRating || rating;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a star rating from 1 to 5.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await api.post(`/complaints/${complaintId}/feedback`, {
        rating,
        comment: comment.trim()
      });

      const savedFeedback = res.data.data.feedback;
      setFeedback(savedFeedback);
      setSubmittedSuccess(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(savedFeedback);
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Case 1: Feedback has already been submitted (or was just submitted)
  if (feedback) {
    return (
      <div
        className="card"
        style={{
          marginTop: '1.5rem',
          backgroundColor: '#101720',
          border: '1px solid rgba(25, 214, 154, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'rgba(25, 214, 154, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#19D69A'
              }}
            >
              <ThumbsUp size={16} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                {isOwner ? 'Your Feedback & Rating' : 'Customer Satisfaction Feedback'}
              </h4>
              <span style={{ fontSize: '0.75rem', color: '#19D69A', fontWeight: 600 }}>
                Feedback Recorded
              </span>
            </div>
          </div>

          {feedback.createdAt && (
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              {new Date(feedback.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          )}
        </div>

        {submittedSuccess && (
          <div
            style={{
              padding: '0.6rem 0.85rem',
              backgroundColor: 'rgba(25, 214, 154, 0.1)',
              border: '1px solid rgba(25, 214, 154, 0.25)',
              borderRadius: 'var(--radius-sm)',
              color: '#19D69A',
              fontSize: '0.8125rem',
              fontWeight: 500,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <CheckCircle2 size={16} />
            <span>Thank you for your feedback! Your response helps us continuously improve ResolveX support.</span>
          </div>
        )}

        {/* Display Submitted Stars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3, 4, 5].map((starVal) => (
              <Star
                key={starVal}
                size={22}
                fill={starVal <= feedback.rating ? '#FFB547' : 'transparent'}
                color={starVal <= feedback.rating ? '#FFB547' : '#334155'}
              />
            ))}
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFB547', marginLeft: '0.25rem' }}>
            {RATING_LABELS[feedback.rating] || `${feedback.rating} Stars`} ({feedback.rating}/5)
          </span>
        </div>

        {feedback.comment && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--color-surface-inset)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              color: '#CBD5E1',
              lineHeight: 1.5
            }}
          >
            <span style={{ fontSize: '0.6875rem', color: '#64748B', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Customer Comments
            </span>
            {feedback.comment}
          </div>
        )}
      </div>
    );
  }

  // Case 2: Only the complaint owner can view the feedback submission form
  if (!isOwner) {
    return null;
  }

  // Case 3: Owner submitting feedback
  return (
    <div
      className="card"
      style={{
        marginTop: '1.5rem',
        backgroundColor: '#101720',
        border: '1px solid rgba(22, 136, 255, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'rgba(22, 136, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1688FF'
          }}
        >
          <MessageSquare size={16} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
            How was your support experience?
          </h3>
          <p style={{ fontSize: '0.8125rem', color: '#94A3B8', margin: '0.2rem 0 0 0' }}>
            Your ticket is resolved. Please take a moment to rate our service quality.
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            margin: '0.75rem 0',
            padding: '0.6rem 0.85rem',
            backgroundColor: 'rgba(255, 98, 108, 0.1)',
            border: '1px solid rgba(255, 98, 108, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#FF626C',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        {/* Interactive Star Selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#CBD5E1',
              marginBottom: '0.5rem'
            }}
          >
            Overall Experience Rating <span style={{ color: '#FF626C' }}>*</span>
          </label>

          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
            role="radiogroup"
            aria-label="Star rating from 1 to 5"
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isLit = starVal <= activeRating;
                return (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => {
                      setRating(starVal);
                      setError(null);
                    }}
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setRating(starVal);
                      }
                    }}
                    role="radio"
                    aria-checked={rating === starVal}
                    aria-label={`${starVal} star - ${RATING_LABELS[starVal]}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-xs)',
                      transition: 'transform 0.15s ease',
                      transform: starVal <= activeRating ? 'scale(1.15)' : 'scale(1)',
                      outline: 'none'
                    }}
                    className="star-button"
                  >
                    <Star
                      size={28}
                      fill={isLit ? '#FFB547' : 'transparent'}
                      color={isLit ? '#FFB547' : '#475569'}
                      style={{ filter: isLit ? 'drop-shadow(0 0 6px rgba(255, 181, 71, 0.5))' : 'none' }}
                    />
                  </button>
                );
              })}
            </div>

            {activeRating > 0 && (
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#FFB547',
                  padding: '0.2rem 0.6rem',
                  backgroundColor: 'rgba(255, 181, 71, 0.1)',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(255, 181, 71, 0.25)'
                }}
              >
                {RATING_LABELS[activeRating]}
              </span>
            )}
          </div>
        </div>

        {/* Comment Textarea */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="feedback-comment"
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#CBD5E1',
              marginBottom: '0.4rem'
            }}
          >
            Additional Comments or Suggestions <span style={{ color: '#64748B', fontWeight: 400 }}>(Optional)</span>
          </label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Tell us what went well or how our support engineer could have assisted you better..."
            className="form-control"
            style={{
              width: '100%',
              backgroundColor: 'var(--color-surface-inset)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              padding: '0.75rem',
              resize: 'vertical'
            }}
          />
          <div style={{ textAlign: 'right', fontSize: '0.6875rem', color: '#64748B', marginTop: '0.25rem' }}>
            {comment.length} / 1000 characters
          </div>
        </div>

        {/* Submit Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="btn btn-primary"
            style={{
              padding: '0.55rem 1.25rem',
              fontSize: '0.875rem',
              opacity: submitting || rating === 0 ? 0.6 : 1,
              cursor: submitting || rating === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Submitting Feedback...</span>
              </>
            ) : (
              <span>Submit Feedback</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm;
