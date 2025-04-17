import React from 'react';
import { useStudio } from '../context/StudioContext';
import { useTranslation } from 'react-i18next';

const StudioSelector = ({ className }) => {
  const { t } = useTranslation();
  const { studios, selectedStudio, changeStudio, loading } = useStudio();

  if (loading) {
    return (
      <div className={`flex items-center ${className}`}>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('studio.loading', 'Loading studios...')}
        </span>
      </div>
    );
  }

  if (!studios || studios.length === 0) {
    return (
      <div className={`flex items-center ${className}`}>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('studio.noStudios', 'No studios available')}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <label htmlFor="studioSelect" className="mr-2 text-sm font-medium">
        {t('studio.select', 'Studio')}:
      </label>
      <select
        id="studioSelect"
        value={selectedStudio?.id || ''}
        onChange={(e) => changeStudio(e.target.value)}
        className="rounded border border-gray-300 dark:border-gray-600 py-1 px-2 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {studios.map((studio) => (
          <option key={studio.id} value={studio.id}>
            {studio.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StudioSelector; 