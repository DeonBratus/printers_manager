/**
 * Конфигурация API для адаптивного определения URL
 */

// Функция для определения базового URL API
const getApiBaseUrl = () => {
  // Если есть переменная окружения для API URL, используем её
  const envApiUrl = process.env.REACT_APP_API_URL;
  if (envApiUrl && envApiUrl.trim() !== '') {
    return envApiUrl;
  }
  
  // При доступе через туннель должны обращаться напрямую к бэкенду по IP/домену вашего хоста
  if (window.location.hostname.includes('tunnel')) {
    // Важно: изменить на реальный IP вашего компьютера в локальной сети
    // или на домен, если он есть
    return window.location.protocol === 'https:' 
      ? 'https://localhost:8000'  // Если туннель с HTTPS
      : 'http://localhost:8000';  // Если туннель без HTTPS
  }
  
  // Если не localhost, но и не туннель - используем относительный путь
  if (!window.location.hostname.includes('localhost')) {
    return '/api';
  }
  
  // В иных случаях используем localhost с явным портом бэкенда
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

// Для отладки - выводим в консоль, какой URL используется
console.log('Using API URL:', API_BASE_URL);

// Настройки для axios
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  withCredentials: false, // Важно для CORS запросов
  timeout: 30000, // Увеличиваем таймаут до 30 секунд
}; 