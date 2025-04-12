import React from 'react';

const StatusBadge = ({ status, className = '' }) => {
  const statusConfig = {
    idle: {
      color: 'bg-gray-100 text-gray-800',
      label: 'Idle',
    },
    printing: {
      color: 'bg-blue-100 text-blue-800',
      label: 'Printing',
    },
    waiting: {
      color: 'bg-yellow-100 text-yellow-800',
      label: 'Waiting',
    },
    paused: {
      color: 'bg-yellow-100 text-yellow-800',
      label: 'Paused',
    },
    completed: {
      color: 'bg-green-100 text-green-800',
      label: 'Completed',
    },
    cancelled: {
      color: 'bg-red-100 text-red-800',
      label: 'Cancelled',
    },
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge; 