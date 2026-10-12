import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  Tag,
  Loader2,
  X
} from 'lucide-react';
import StatusBadge from './StatusBadge';

/**
 * DuplicateSuggestionsPanel
 * Displays real-time duplicate complaint recommendations with explainable scores,
 * privacy-safe summaries, and actionable user controls.
 */
const DuplicateSuggestionsPanel = ({
  matches = [],
  loading = false,
  onDismiss = null,
  onSelectPrimary = null,
  isStaffMode = false,
  hasChecked = false
}) => {
  if (loading) {
    return (
      <div
        style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'rgba(22, 136, 255, 0.08)',
          border: '1px solid rgba(22, 136, 255, 0.25)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#4BA2FF',
          fontSize: '0.875rem'
        }}
      >
        <Loader2 size={18} className="animate-spin" style={{ flexShrink: 0 }} />
        <span>Scanning existing complaints for potential duplicates...</span>
      </div>
    );
  }

  if (hasChecked && matches.length === 0) {
    return (
      <div
        style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: 'rgba(25, 214, 154, 0.08)',
          border: '1px solid rgba(25, 214, 154, 0.25)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          color: '#19D69A',
          fontSize: '0.875rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>No duplicate complaints detected. Your issue appears unique.</span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer'
            }}
            title="Dismiss"
          >
            <X size={15} />
          </button>
        )}
      </div>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid rgba(255, 181, 71, 0.35)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <AlertTriangle size={20} style={{ color: '#FFB547', flexShrink: 0 }} />
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Potential Similar Complaints Found ({matches.length})
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0 0' }}>
              {isStaffMode
                ? 'Review algorithmic suggestions below to link duplicates and avoid fragmented investigations.'
                : 'A similar issue may already be under review. You may inspect your matching tickets or continue with submission.'}
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="btn btn-secondary"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              flexShrink: 0
            }}
          >
            Continue with New Complaint
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {matches.map((item, idx) => {
          const scorePercent = Math.round((item.similarityScore || 0) * 100);
          const scoreColor = scorePercent >= 75 ? '#FF626C' : scorePercent >= 60 ? '#FFB547' : '#1688FF';

          return (
            <div
              key={item.ticketNumber || idx}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.875rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                transition: 'var(--transition-smooth)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="ticket-number-cell" style={{ fontSize: '0.8125rem', padding: '0.2rem 0.5rem' }}>
                    #{item.ticketNumber}
                  </span>
                  <StatusBadge status={item.status} />
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: 'var(--radius-full)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    {item.category}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: `${scoreColor}22`,
                      color: scoreColor,
                      border: `1px solid ${scoreColor}44`
                    }}
                  >
                    {scorePercent}% Similarity
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF' }}>
                {item.title}
              </div>

              {item.reasons && item.reasons.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.1rem' }}>
                  {item.reasons.map((r, rIdx) => (
                    <span
                      key={rIdx}
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--color-text-secondary)',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px'
                      }}
                    >
                      &bull; {r}
                    </span>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '0.25rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-tertiary)'
                }}
              >
                <span>
                  Filed: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                </span>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {item.canView && item.complaintId && (
                    <Link
                      to={`/complaints/${item.complaintId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: '#4BA2FF',
                        fontWeight: 600,
                        textDecoration: 'none'
                      }}
                    >
                      View Ticket <ExternalLink size={12} />
                    </Link>
                  )}

                  {!item.canView && (
                    <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Shield size={11} /> Cross-customer record (details protected)
                    </span>
                  )}

                  {isStaffMode && onSelectPrimary && (
                    <button
                      type="button"
                      onClick={() => onSelectPrimary(item)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                    >
                      Select as Primary
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DuplicateSuggestionsPanel;
