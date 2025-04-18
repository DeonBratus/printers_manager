import React from 'react';
import { useStudio } from '../context/StudioContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Cog6ToothIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';

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
        <Link to="/studios" className="ml-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
          {t('studios.createFirst', 'Create your first studio')}
        </Link>
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
  
  // Get current user's role in selected studio
  const currentRole = selectedStudio ? getUserRole(selectedStudio.id) : null;
  const canManageStudio = currentRole === 'owner' || currentRole === 'admin';

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
      
      {/* Кнопки управления студией */}
      <div className="flex space-x-1 ml-2">
        <Link 
          to="/studios/manage" 
          className="p-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
          title={t('studioManagement.title', 'Studio Management')}
        >
          <UserGroupIcon className="w-5 h-5" />
        </Link>
        {/* <Link 
          to="/studios" 
          className="p-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
          title={t('studios.title', 'Studios')}
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </Link> */}
      </div>
    </div>
  );
};

export default StudioSelector; 