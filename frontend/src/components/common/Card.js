import React from 'react';

/**
 * Компонент для отображения карточки с содержимым
 * @param {Object} props - Свойства компонента
 * @param {React.ReactNode} props.children - Дочерние элементы
 * @param {string} props.className - Дополнительные CSS классы
 * @param {string} props.variant - Вариант стиля (default, flat, outline)
 * @returns {JSX.Element}
 */
const Card = ({ 
  children, 
  className = '', 
  variant = 'default',
  ...props 
}) => {
  // Варианты стилей
  const variantStyles = {
    default: 'bg-white dark:bg-gray-800 shadow',
    flat: 'bg-white dark:bg-gray-800',
    outline: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
  };

  return (
    <div 
      className={`rounded-lg overflow-hidden ${variantStyles[variant] || variantStyles.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card; 