import React from 'react';
import { useStudio } from '../context/StudioContext';
import { useTranslation } from 'react-i18next';

const StudioSelector = ({ className }) => {
  const { t } = useTranslation();
  const { studios, selectedStudio, changeStudio, loading, getUserRole } = useStudio();

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

  const getRoleBadgeText = (role) => {
    switch(role) {
      case 'owner': return '👑 ';
      case 'admin': return '⚙️ ';
      case 'manager': return '📊 ';
      case 'member': return '👤 ';
      case 'viewer': return '👁️ ';
      default: return '';
    }
  };

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
        {studios.map((studio) => {
          const role = getUserRole(studio.id);
          const rolePrefix = role ? getRoleBadgeText(role) : '';
          
          return (
            <option key={studio.id} value={studio.id}>
              {rolePrefix}{studio.name}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default StudioSelector; 