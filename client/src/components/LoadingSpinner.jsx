import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading data...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem',
        color: 'var(--color-text-secondary)',
        gap: '0.85rem',
      }}
    >
      <Loader2
        size={34}
        style={{
          color: 'var(--color-electric-blue)',
          filter: 'drop-shadow(0 0 10px rgba(22, 136, 255, 0.7))',
          animation: 'rx-spin 0.9s linear infinite'
        }}
      />
      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{message}</p>
      <style>{`
        @keyframes rx-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
