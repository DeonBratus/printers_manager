import React from 'react';
import { useTranslation } from 'react-i18next';

const StatusBadge = ({ status, size = 'sm', variant = 'default', className = '' }) => {
  const { t } = useTranslation();
  
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          label: t('printers.status.idle'),
          color: variant === 'light' 
            ? 'bg-green-100/70 text-white border border-white/20' 
            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
        };
      case 'printing':
        return {
          label: t('printers.status.printing'),
          color: variant === 'light' 
            ? 'bg-blue-100/70 text-white border border-white/20' 
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
        };
      case 'paused':
        return {
          label: t('printers.status.paused'),
          color: variant === 'light' 
            ? 'bg-yellow-100/70 text-white border border-white/20' 
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
        };
      case 'error':
        return {
          label: t('printers.status.error'),
          color: variant === 'light' 
            ? 'bg-red-100/70 text-white border border-white/20' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
        };
      case 'waiting':
        return {
          label: t('printers.status.waiting'),
          color: variant === 'light' 
            ? 'bg-indigo-100/70 text-white border border-white/20' 
            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300'
        };
      case 'completed':
        return {
          label: t('printings.status.completed'),
          color: variant === 'light' 
            ? 'bg-purple-100/70 text-white border border-white/20' 
            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
        };
      case 'cancelled':
        return {
          label: t('printings.status.cancelled'),
          color: variant === 'light' 
            ? 'bg-gray-100/70 text-white border border-white/20' 
            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
        };
      case 'pending_completion':
        return {
          label: t('printings.status.pending_completion'),
          color: variant === 'light' 
            ? 'bg-yellow-100/70 text-white border border-white/20' 
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
        };
      default:
        return {
          label: status ? status.charAt(0).toUpperCase() + status.slice(1) : t('common.unknown'),
          color: variant === 'light' 
            ? 'bg-gray-100/70 text-white border border-white/20' 
            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
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
    <span className={`inline-flex items-center rounded-full font-medium ${color} ${sizeClasses[size]} ${className}`}>
      {label}
    </span>
  );
};

export default StatusBadge; 