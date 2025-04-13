import React from 'react';

const StatusBadge = ({ status, size = 'sm' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          label: 'Свободен',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
        };
      case 'printing':
        return {
          label: 'Печатает',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
        };
      case 'paused':
        return {
          label: 'На паузе',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
        };
      case 'error':
        return {
          label: 'Ошибка',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
        };
      case 'waiting':
        return {
          label: 'Ожидание',
          color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300'
        };
      case 'completed':
        return {
          label: 'Завершен',
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
        };
      case 'cancelled':
        return {
          label: 'Отменен',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
        };
      default:
        return {
          label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Неизвестно',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
        };
    }
  };

  const { label, color } = getStatusConfig();
  
  // Определяем классы для разных размеров
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${color} ${sizeClasses[size]}`}>
      {label}
    </span>
  );
};

export default StatusBadge; 