import React from 'react';

/**
 * Компонент для отображения индикатора загрузки (спиннер)
 * @param {Object} props - Свойства компонента
 * @param {string} props.className - Дополнительные CSS классы
 * @param {string} props.size - Размер спиннера (sm, md, lg, xl)
 * @param {string} props.color - Цвет спиннера (blue, green, red, gray, white)
 * @returns {JSX.Element}
 */
const Spinner = ({ 
  className = '', 
  size = 'md', 
  color = 'blue' 
}) => {
  // Определяем классы размера
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-3'
  };
  
  // Определяем классы цвета
  const colorClasses = {
    blue: 'border-blue-500 border-t-transparent',
    green: 'border-green-500 border-t-transparent',
    red: 'border-red-500 border-t-transparent',
    gray: 'border-gray-300 border-t-transparent',
    white: 'border-white border-t-transparent'
  };
  
  const spinnerClasses = `
    inline-block rounded-full animate-spin
    ${sizeClasses[size] || sizeClasses.md}
    ${colorClasses[color] || colorClasses.blue}
    ${className}
  `;
  
  return <div className={spinnerClasses}></div>;
};

export default Spinner; 