import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { useTranslation } from 'react-i18next';
import { getProfile, updateUserSettings, uploadAvatar } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  UserCircleIcon, 
  MoonIcon, 
  SunIcon, 
  LanguageIcon,
  BellIcon,
  ArrowUpTrayIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const UserSettings = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUserInfo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [userSettings, setUserSettings] = useState({
    name: '',
    email: '',
    darkMode: localStorage.getItem('theme') === 'dark',
    language: 'russian',
    defaultPrinterView: 'grid',
    avatar: null
  });
  
  const profileImages = [
    { id: 'default1', src: '/images/profile1.png', alt: 'Default avatar 1' },
    { id: 'default2', src: '/images/profile2.png', alt: 'Default avatar 2' },
    { id: 'default3', src: '/images/profile3.png', alt: 'Default avatar 3' },
    { id: 'default4', src: '/images/profile4.png', alt: 'Default avatar 4' },
  ];
  
  const languages = [
    { id: 'english', name: 'English' },
    { id: 'russian', name: 'Русский' }
  ];
  
  // Load user settings from API
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const userData = await getProfile();
        const savedSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
        
        setUserSettings({
          name: userData.data?.username || user?.username || '',
          email: userData.data?.email || user?.email || '',
          darkMode: localStorage.getItem('theme') === 'dark',
          language: userData.data?.language || savedSettings.language || 'russian',
          defaultPrinterView: userData.data?.default_view || savedSettings.defaultPrinterView || 'grid',
          avatar: userData.data?.avatar || savedSettings.avatar || null
        });
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };
    
    loadUserSettings();
  }, [user]);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUserSettings({
      ...userSettings,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleProfileImageSelect = (imageId) => {
    setUserSettings({
      ...userSettings,
      profileImage: imageId
    });
  };
  
  const handleToggleDarkMode = () => {
    const newDarkMode = !userSettings.darkMode;
    setUserSettings({
      ...userSettings,
      darkMode: newDarkMode
    });
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Проверяем, что файл - изображение
    if (!file.type.startsWith('image/')) {
      setUploadError('Выберите изображение');
      return;
    }
    
    // Максимальный размер 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Максимальный размер файла - 5MB');
      return;
    }
    
    setUploadingAvatar(true);
    setUploadError(null);
    
    try {
      const response = await uploadAvatar(file);
      const avatarFilename = response.data.avatar;
      
      // Обновляем локальные настройки и контекст
      setUserSettings({
        ...userSettings,
        avatar: avatarFilename
      });
      
      // Обновляем настройки в localStorage
      const savedSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      localStorage.setItem('userSettings', JSON.stringify({
        ...savedSettings,
        avatar: avatarFilename
      }));
      
      // Обновляем информацию о пользователе в контексте
      await refreshUserInfo();
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setUploadError('Ошибка при загрузке аватара');
    } finally {
      setUploadingAvatar(false);
    }
  };
  
  const getAvatarUrl = () => {
    const baseUrl = process.env.REACT_APP_API_URL || '';
    return `${baseUrl}/auth/avatar/${user?.id}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Save settings to API
      await updateUserSettings({
        username: userSettings.name,
        email: userSettings.email,
        language: userSettings.language,
        default_view: userSettings.defaultPrinterView,
        avatar: userSettings.avatar
      });
      
      // Save settings locally
      localStorage.setItem('userSettings', JSON.stringify({
        language: userSettings.language,
        defaultPrinterView: userSettings.defaultPrinterView,
        avatar: userSettings.avatar
      }));
      
      // Update language if changed
      if (i18n.language !== userSettings.language) {
        i18n.changeLanguage(userSettings.language);
      }
      
      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">{t('userSettings.title')}</h1>
        <Button onClick={() => navigate(-1)} variant="secondary">
          {t('common.back')}
        </Button>
      </div>
      
      {saveSuccess && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                {t('userSettings.settingsSaved')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {uploadError && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {uploadError}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="p-4 lg:col-span-1">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="h-32 w-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {user?.id ? (
                  <img
                    src={getAvatarUrl()}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null; // Prevent infinite error loop
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<svg class="h-28 w-28 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>';
                    }}
                  />
                ) : (
                  <UserCircleIcon className="h-28 w-28 text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <button 
                className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg"
                onClick={() => document.getElementById('profile-upload').click()}
              >
                <CameraIcon className="h-5 w-5" />
              </button>
              <input 
                id="profile-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <h2 className="mt-4 text-xl font-semibold dark:text-white">{userSettings.name}</h2>
            <p className="text-gray-500 dark:text-gray-400">{userSettings.email}</p>
            <div className="w-full mt-6">
              <Button variant="outline" fullWidth onClick={handleToggleDarkMode}>
                {userSettings.darkMode ? (
                  <>
                    <SunIcon className="h-5 w-5 mr-2" />
                    {t('userSettings.lightMode')}
                  </>
                ) : (
                  <>
                    <MoonIcon className="h-5 w-5 mr-2" />
                    {t('userSettings.darkMode')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
        {/* Settings Form */}
        <Card className="p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">{t('userSettings.accountSettings')}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('common.name')}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={userSettings.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('common.email')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={userSettings.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            {/* Preferences */}
            <div>
              <h3 className="text-md font-medium mb-3 dark:text-white">{t('userSettings.preferences')}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <div className="flex items-center">
                      <LanguageIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
                      {t('user.language')}
                    </div>
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={userSettings.language}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {languages.map(language => (
                      <option key={language.id} value={language.id}>
                        {language.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="defaultPrinterView" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('userSettings.defaultPrinterView')}
                  </label>
                  <select
                    id="defaultPrinterView"
                    name="defaultPrinterView"
                    value={userSettings.defaultPrinterView}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="list">{t('userSettings.listView')}</option>
                    <option value="grid">{t('userSettings.gridView')}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => navigate(-1)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" isLoading={loading}>
                {t('userSettings.saveChanges')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default UserSettings;