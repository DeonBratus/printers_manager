import React from 'react';
import { useTranslation } from 'react-i18next';
import Badge from './Badge';

/**
 * Компонент для отображения статуса
 * @param {Object} props - Свойства компонента
 * @param {string} props.status - Статус (idle, printing, paused, error, waiting, completed, cancelled)
 * @param {string} props.size - Размер (sm, md, lg)
 * @param {boolean} props.dot - Показывать точку
 * @param {string} props.className - Дополнительные CSS классы
 * @returns {JSX.Element}
 */
const StatusBadge = ({ 
  status, 
  size = 'sm', 
  dot = true, 
  className = '' 
}) => {
  const { t } = useTranslation();
  
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          label: t('printers.status.idle', 'Ожидание'),
          variant: 'success'
        };
      case 'printing':
        return {
          label: t('printers.status.printing', 'Печать'),
          variant: 'primary'
        };
      case 'paused':
        return {
          label: t('printers.status.paused', 'Пауза'),
          variant: 'warning'
        };
      case 'error':
        return {
          label: t('printers.status.error', 'Ошибка'),
          variant: 'danger'
        };
      case 'waiting':
        return {
          label: t('printers.status.waiting', 'Ожидание'),
          variant: 'info'
        };
      case 'completed':
        return {
          label: t('printings.status.completed', 'Завершено'),
          variant: 'success'
        };
      case 'cancelled':
        return {
          label: t('printings.status.cancelled', 'Отменено'),
          variant: 'neutral'
        };
      case 'pending_completion':
        return {
          label: t('printings.status.pending_completion', 'Ожидает завершения'),
          variant: 'warning'
        };
      default:
        return {
          label: status ? status.charAt(0).toUpperCase() + status.slice(1) : t('common.unknown', 'Неизвестно'),
          variant: 'neutral'
        };
    }
  };

  const { label, variant } = getStatusConfig();

  return (
    <Badge 
      variant={variant} 
      size={size} 
      dot={dot} 
      className={className}
    >
      {label}
    </Badge>
  );
};

export default StatusBadge; 