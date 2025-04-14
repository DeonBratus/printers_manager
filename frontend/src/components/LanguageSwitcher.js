import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

const LanguageSwitcher = ({ className }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === 'ru' ? 'en' : 'ru';
    changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center px-3 py-2 text-sm rounded-md ${className}`}
    >
      <span className="mr-2">{t('user.language')}:</span>
      <span className="font-medium">
        {currentLang === 'ru' ? 'Русский' : 'English'}
      </span>
    </button>
  );
};

export default LanguageSwitcher; 