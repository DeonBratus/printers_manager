import React from 'react';

/**
 * Компонент для отображения статусных индикаторов
 * @param {Object} props - Свойства компонента
 * @param {string} props.variant - Вариант стиля (primary, success, warning, danger, info, neutral)
 * @param {string} props.size - Размер (sm, md, lg)
 * @param {boolean} props.dot - Отображать точку слева
 * @param {React.ReactNode} props.icon - Иконка
 * @param {React.ReactNode} props.children - Дочерние элементы (текст)
 * @param {string} props.className - Дополнительные CSS классы
 * @returns {JSX.Element}
 */
const Badge = ({
  variant = 'primary',
  size = 'md',
  dot = false,
  icon,
  children,
  className = ''
}) => {
  // Цвета для различных вариантов
  const variantStyles = {
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    info: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  };
  
  // Размеры
  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1'
  };
  
  // Стили для точки
  const dotStyles = {
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-cyan-500',
    neutral: 'bg-gray-500'
  };
  
  const badgeClasses = `
    inline-flex items-center rounded-full font-medium
    ${variantStyles[variant] || variantStyles.primary}
    ${sizeStyles[size] || sizeStyles.md}
    ${className}
  `;
  
  return (
    <span className={badgeClasses}>
      {dot && (
        <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${dotStyles[variant] || dotStyles.primary}`}></span>
      )}
      {icon && (
        <span className="mr-1 -ml-0.5">{icon}</span>
      )}
      {children}
    </span>
  );
};

export default Badge; 