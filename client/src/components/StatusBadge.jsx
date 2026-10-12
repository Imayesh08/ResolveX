import React from 'react';

const STATUS_FORMAT = {
  OPEN: { label: 'Open', className: 'badge-open' },
  ASSIGNED: { label: 'Assigned', className: 'badge-assigned' },
  IN_PROGRESS: { label: 'In Progress', className: 'badge-in_progress' },
  WAITING_FOR_CUSTOMER: { label: 'Waiting for Customer', className: 'badge-waiting_for_customer' },
  RESOLVED: { label: 'Resolved', className: 'badge-resolved' },
  CLOSED: { label: 'Closed', className: 'badge-closed' },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_FORMAT[status] || { label: status, className: 'badge-open' };
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

export default StatusBadge;
