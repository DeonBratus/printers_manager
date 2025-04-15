import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Импорт файлов с переводами
import ru from './locales/ru.json';
import en from './locales/en.json';

// Получаем сохраненный язык из localStorage или используем русский по умолчанию
const savedLanguage = localStorage.getItem('language') || 'ru';

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
      useSuspense: false
    }
  });

// Функция для смены языка
export const changeLanguage = (lng) => {
  i18n.changeLanguage(lng);
  localStorage.setItem('language', lng);
};

export default i18n; 