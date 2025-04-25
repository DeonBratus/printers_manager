import React from 'react';
import Spinner from './Spinner';

/**
 * Компонент для отображения наложения с индикатором загрузки
 * @param {Object} props - Свойства компонента
 * @param {boolean} props.isLoading - Показывать ли наложение
 * @param {string} props.message - Сообщение загрузки
 * @param {string} props.className - Дополнительные CSS классы
 * @param {string} props.spinnerSize - Размер спиннера
 * @param {string} props.spinnerColor - Цвет спиннера
 * @param {React.ReactNode} props.children - Дочерние элементы
 * @returns {JSX.Element}
 */
const LoadingOverlay = ({
  isLoading = false,
  message = '',
  className = '',
  spinnerSize = 'lg',
  spinnerColor = 'blue',
  children
}) => {
  if (!isLoading) return children || null;

  return (
    <div className="relative">
      {children}
      <div className={`absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex flex-col items-center justify-center z-10 ${className}`}>
        <Spinner size={spinnerSize} color={spinnerColor} />
        {message && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{message}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay; 