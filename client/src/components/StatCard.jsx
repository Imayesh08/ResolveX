import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'blue', subtext = null }) => {
  const colorMap = {
    blue: {
      bg: 'rgba(22, 136, 255, 0.12)',
      text: '#4BA2FF',
      border: 'rgba(22, 136, 255, 0.3)',
      glow: '0 0 12px rgba(22, 136, 255, 0.25)'
    },
    teal: {
      bg: 'rgba(25, 214, 154, 0.12)',
      text: '#19D69A',
      border: 'rgba(25, 214, 154, 0.3)',
      glow: '0 0 12px rgba(25, 214, 154, 0.2)'
    },
    green: {
      bg: 'rgba(25, 214, 154, 0.12)',
      text: '#19D69A',
      border: 'rgba(25, 214, 154, 0.3)',
      glow: '0 0 12px rgba(25, 214, 154, 0.2)'
    },
    amber: {
      bg: 'rgba(255, 181, 71, 0.12)',
      text: '#FFB547',
      border: 'rgba(255, 181, 71, 0.3)',
      glow: '0 0 12px rgba(255, 181, 71, 0.2)'
    },
    rose: {
      bg: 'rgba(255, 98, 108, 0.12)',
      text: '#FF626C',
      border: 'rgba(255, 98, 108, 0.3)',
      glow: '0 0 12px rgba(255, 98, 108, 0.2)'
    },
    indigo: {
      bg: 'rgba(22, 136, 255, 0.12)',
      text: '#4BA2FF',
      border: 'rgba(22, 136, 255, 0.3)',
      glow: '0 0 12px rgba(22, 136, 255, 0.25)'
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <article className="stat-card">
      {Icon && (
        <div
          className="stat-icon"
          style={{
            backgroundColor: scheme.bg,
            color: scheme.text,
            border: `1px solid ${scheme.border}`,
            boxShadow: scheme.glow
          }}
        >
          <Icon size={20} strokeWidth={2.2} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="stat-val">{value}</div>
        <div className="stat-label">{title}</div>
        {subtext && (
          <div className="stat-subtext" style={{ color: scheme.text }}>
            {subtext}
          </div>
        )}
      </div>
    </article>
  );
};

export default StatCard;
