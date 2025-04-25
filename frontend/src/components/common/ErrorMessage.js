import React from 'react';
import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Компонент для отображения сообщений об ошибках
 * @param {Object} props - Свойства компонента
 * @param {string} props.message - Текст сообщения об ошибке
 * @param {string} props.className - Дополнительные CSS классы
 * @param {boolean} props.dismissible - Можно ли закрыть сообщение
 * @param {Function} props.onDismiss - Функция, вызываемая при закрытии сообщения
 * @returns {JSX.Element}
 */
const ErrorMessage = ({
  message,
  className = '',
  dismissible = false,
  onDismiss
}) => {
  if (!message) return null;

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 p-3 rounded-md ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 dark:text-red-400" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {message}
          </p>
        </div>
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              className="inline-flex rounded-md bg-red-50 dark:bg-transparent text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 focus:outline-none"
              onClick={onDismiss}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage; 