import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({
  title = 'No records found',
  description = 'There is currently no data matching your criteria.',
  action = null
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem 1.5rem',
        textAlign: 'center',
        backgroundColor: 'var(--color-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--color-border)',
        margin: '1rem 0'
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-tertiary)',
          marginBottom: '1rem'
        }}
      >
        <Inbox size={26} />
      </div>
      <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: 420, marginBottom: action ? '1.25rem' : '0' }}>
        {description}
      </p>
      {action}
    </div>
  );
};

export default EmptyState;
