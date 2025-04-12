import React from 'react';

const StatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          label: 'Idle',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
        };
      case 'printing':
        return {
          label: 'Printing',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
        };
      case 'paused':
        return {
          label: 'Paused',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
        };
      case 'error':
        return {
          label: 'Error',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
        };
      case 'completed':
        return {
          label: 'Completed',
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
        };
      default:
        return {
          label: status.charAt(0).toUpperCase() + status.slice(1),
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
        };
    }
  };

  const { label, color } = getStatusConfig();

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
};

export default StatusBadge; 