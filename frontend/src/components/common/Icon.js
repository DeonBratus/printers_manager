import React from 'react';

/**
 * Компонент для отображения иконок с разными размерами и цветами
 * @param {Object} props - Свойства компонента
 * @param {React.ReactNode} props.icon - Компонент иконки
 * @param {string} props.size - Размер иконки (xs, sm, md, lg, xl)
 * @param {string} props.color - Цвет иконки (primary, success, warning, danger, info, neutral)
 * @param {string} props.className - Дополнительные CSS классы
 * @returns {JSX.Element}
 */
const Icon = ({
  icon,
  size = 'md',
  color = 'neutral',
  className = ''
}) => {
  // Если нет иконки, возвращаем null
  if (!icon) return null;
  
  // Размеры
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };
  
  // Цвета
  const colorClasses = {
    primary: 'text-blue-500 dark:text-blue-400',
    success: 'text-green-500 dark:text-green-400',
    warning: 'text-yellow-500 dark:text-yellow-400',
    danger: 'text-red-500 dark:text-red-400',
    info: 'text-cyan-500 dark:text-cyan-400',
    neutral: 'text-gray-500 dark:text-gray-400'
  };
  
  // Клонируем иконку с необходимыми классами
  return React.cloneElement(icon, {
    className: `${sizeClasses[size] || sizeClasses.md} ${colorClasses[color] || colorClasses.neutral} ${className}`
  });
};

export default Icon; 