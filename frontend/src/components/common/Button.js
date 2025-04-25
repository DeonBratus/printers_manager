import React from 'react';
import Spinner from './Spinner';

/**
 * Компонент для отображения кнопок
 * @param {Object} props - Свойства компонента
 * @param {React.ReactNode} props.children - Дочерние элементы
 * @param {string} props.type - Тип кнопки (button, submit, reset)
 * @param {Function} props.onClick - Обработчик клика
 * @param {string} props.variant - Вариант стиля (primary, secondary, success, danger, warning, info, outline, link)
 * @param {string} props.size - Размер (xs, sm, md, lg, xl)
 * @param {boolean} props.isLoading - Показывать индикатор загрузки
 * @param {boolean} props.disabled - Отключить кнопку
 * @param {string} props.className - Дополнительные CSS классы
 * @param {boolean} props.fullWidth - Растянуть на всю ширину
 * @param {React.ReactNode} props.icon - Иконка
 * @param {string} props.iconPosition - Позиция иконки (left, right)
 * @returns {JSX.Element}
 */
const Button = ({ 
  children, 
  type = 'button', 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  disabled = false,
  className = '',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600',
    secondary: 'text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white',
    success: 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500 dark:bg-green-500 dark:hover:bg-green-600',
    danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600',
    warning: 'text-white bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600',
    info: 'text-white bg-blue-500 hover:bg-blue-600 focus:ring-blue-400 dark:bg-blue-400 dark:hover:bg-blue-500',
    outline: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700',
    link: 'text-blue-600 bg-transparent hover:underline focus:ring-0 dark:text-blue-400',
  };
  
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    xl: 'px-6 py-3 text-base',
  };
  
  // Размеры для спиннера
  const spinnerSizes = {
    xs: 'sm',
    sm: 'sm',
    md: 'sm',
    lg: 'md',
    xl: 'md',
  };
  
  // Размеры для отступов иконок
  const iconSpacing = {
    xs: 'mr-1',
    sm: 'mr-1.5',
    md: 'mr-2',
    lg: 'mr-2',
    xl: 'mr-3',
  };
  
  const widthClasses = fullWidth ? 'w-full' : '';
  
  // Подготавливаем иконку с правильными отступами
  const renderIcon = () => {
    if (!icon) return null;
    
    const spacing = iconPosition === 'left' 
      ? iconSpacing[size] 
      : `ml-${iconSpacing[size].split('mr-')[1]}`;
    
    // Если иконка передана как React элемент, клонируем и добавляем класс
    return React.cloneElement(icon, {
      className: `${icon.props.className || ''} ${iconPosition === 'left' ? spacing : spacing}`
    });
  };
  
  return (
    <button
      type={type}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${widthClasses}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <Spinner 
          size={spinnerSizes[size] || 'sm'} 
          color="white" 
          className="mr-2"
        />
      )}
      
      {!isLoading && iconPosition === 'left' && renderIcon()}
      
      {children}
      
      {!isLoading && iconPosition === 'right' && renderIcon()}
    </button>
  );
};

export default Button; 