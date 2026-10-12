import React from 'react';

/**
 * ResolveX Brand Logo
 * Matching reference image: ResolveX with glowing Electric Blue 'X' accent
 */
const BrandLogo = ({ size = 28, showText = true }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(22, 136, 255, 0.6))' }}
      >
        <rect
          width="36"
          height="36"
          rx="10"
          fill="#101720"
          stroke="rgba(22, 136, 255, 0.4)"
          strokeWidth="1.5"
        />
        {/* Abstract electric blue checkmark/X apex */}
        <path
          d="M10 18.5L15.5 24L26 12.5"
          stroke="#1688FF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="26" cy="12.5" r="2" fill="#19D69A" />
      </svg>

      {showText && (
        <span
          style={{
            fontWeight: 800,
            fontSize: size >= 28 ? '1.25rem' : '1.1rem',
            letterSpacing: '-0.03em',
            color: '#F5F7FA',
            display: 'flex',
            alignItems: 'baseline'
          }}
        >
          Resolve<span style={{ color: '#1688FF', textShadow: '0 0 10px rgba(22, 136, 255, 0.8)' }}>X</span>
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
