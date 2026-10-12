import React from 'react';

const PRIORITY_FORMAT = {
  LOW: { label: 'Low', className: 'badge-low' },
  MEDIUM: { label: 'Medium', className: 'badge-medium' },
  HIGH: { label: 'High', className: 'badge-high' },
  URGENT: { label: 'Urgent', className: 'badge-urgent' },
};

const PriorityBadge = ({ priority }) => {
  const config = PRIORITY_FORMAT[priority] || { label: priority, className: 'badge-medium' };
  return (
    <span className={`badge ${config.className}`}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block'
        }}
      />
      {config.label}
    </span>
  );
};

export default PriorityBadge;
