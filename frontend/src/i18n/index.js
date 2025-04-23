import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Импорт файлов с переводами
import ru from './locales/ru.json';
import en from './locales/en.json';

// Получаем сохраненный язык из localStorage или используем русский по умолчанию
let savedLanguage;
try {
  savedLanguage = localStorage.getItem('language') || 'ru';
} catch (e) {
  console.error('Error accessing localStorage:', e);
  savedLanguage = 'ru';
}

// Initialize i18next with better error handling
const initI18n = () => {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        ru: {
          translation: ru
        },
        en: {
          translation: en
        }
      },
      lng: savedLanguage,
      fallbackLng: 'ru',
      interpolation: {
        escapeValue: false // не экранировать HTML
      },
      react: {
        useSuspense: false, // Prevents issues with suspense
        wait: true // Wait for translations to be loaded before rendering
      },
      returnNull: false, // Return empty string instead of null for missing translations
      returnEmptyString: false, // Return key instead of empty string
      missingKeyHandler: (lng, ns, key) => {
        console.warn(`Missing translation key: ${key} in namespace: ${ns} for language: ${lng}`);
      },
      parseMissingKeyHandler: (key) => {
        return key; // Return the key as the fallback
      },
      initImmediate: false, // Синхронная инициализация
      load: 'currentOnly' // Загружать только текущий язык для ускорения
    });
};

// Initialize i18n
initI18n();

// Функция для смены языка
export const changeLanguage = (lng) => {
  try {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  } catch (e) {
    console.error('Error changing language:', e);
  }
};

// Helper function to safely translate keys
export const safeTranslate = (key, defaultValue, options = {}) => {
  try {
    if (!i18n.isInitialized) {
      return defaultValue || key;
    }
    return i18n.t(key, { defaultValue: defaultValue || key, ...options });
  } catch (e) {
    console.error(`Translation error for key "${key}":`, e);
    return defaultValue || key;
  }
};

export default i18n; 