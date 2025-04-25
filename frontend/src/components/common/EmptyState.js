import React from 'react';

/**
 * Компонент для отображения пустого состояния (когда нет данных)
 * @param {Object} props - Свойства компонента
 * @param {string} props.message - Сообщение
 * @param {React.ReactNode} props.icon - Иконка
 * @param {React.ReactNode} props.action - Действие (кнопка или ссылка)
 * @param {string} props.className - Дополнительные CSS классы
 * @returns {JSX.Element}
 */
const EmptyState = ({
  message = 'Нет данных для отображения',
  icon,
  action,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
      {icon && (
        <div className="mb-4">
          {icon}
        </div>
      )}
      <p className="text-gray-500 dark:text-gray-400 mb-4">{message}</p>
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState; 