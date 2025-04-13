import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  UserCircleIcon, 
  MoonIcon, 
  SunIcon, 
  LanguageIcon,
  BellIcon,
  ArrowUpTrayIcon,
  CameraIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const UserSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userSettings, setUserSettings] = useState({
    name: 'Admin User',
    email: 'admin@example.com',
    darkMode: localStorage.getItem('theme') === 'dark',
    language: 'russian',
    notifications: true,
    profileImage: 'default1',
    defaultPrinterView: 'grid',
    autoRefresh: true,
    refreshInterval: 30,
    emailNotifications: true,
    pushNotifications: false, 
    slackNotifications: false,
    apiAccess: false,
    apiKey: 'xxxx-xxxx-xxxx-xxxx'
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Here you would normally make an API call to save user settings
      // For now, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
        <h1 className="text-2xl font-bold dark:text-white">User Settings</h1>
        <Button onClick={() => navigate(-1)} variant="secondary">
          Back
        </Button>
      </div>
      
      {saveSuccess && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Settings saved successfully!
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
                {/* This would normally be an actual image */}
                <UserCircleIcon className="h-28 w-28 text-gray-400 dark:text-gray-500" />
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
              />
            </div>
            
            <h2 className="mt-4 text-xl font-semibold dark:text-white">{userSettings.name}</h2>
            <p className="text-gray-500 dark:text-gray-400">{userSettings.email}</p>
            
            <div className="w-full mt-6">
              <Button variant="outline" fullWidth onClick={handleToggleDarkMode}>
                {userSettings.darkMode ? (
                  <>
                    <SunIcon className="h-5 w-5 mr-2" />
                    Switch to Light Mode
                  </>
                ) : (
                  <>
                    <MoonIcon className="h-5 w-5 mr-2" />
                    Switch to Dark Mode
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
        
        {/* Settings Form */}
        <Card className="p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Account Settings</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Display Name
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
                  Email Address
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
              <h3 className="text-md font-medium mb-3 dark:text-white">Preferences</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <div className="flex items-center">
                      <LanguageIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
                      Language
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
                
                <div className="flex items-center">
                  <input
                    id="notifications"
                    name="notifications"
                    type="checkbox"
                    checked={userSettings.notifications}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-center">
                      <BellIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
                      Enable Notifications
                    </div>
                  </label>
                </div>

                <div>
                  <label htmlFor="defaultPrinterView" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Default Printer View
                  </label>
                  <select
                    id="defaultPrinterView"
                    name="defaultPrinterView"
                    value={userSettings.defaultPrinterView}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="grid">Grid View</option>
                    <option value="list">List View</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    id="autoRefresh"
                    name="autoRefresh"
                    type="checkbox"
                    checked={userSettings.autoRefresh}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoRefresh" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Auto-refresh data
                  </label>
                </div>

                {userSettings.autoRefresh && (
                  <div>
                    <label htmlFor="refreshInterval" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Refresh Interval (seconds)
                    </label>
                    <input
                      type="number"
                      id="refreshInterval"
                      name="refreshInterval"
                      value={userSettings.refreshInterval}
                      onChange={handleInputChange}
                      min="10"
                      max="300"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Notification Settings */}
            <div>
              <h3 className="text-md font-medium mb-3 dark:text-white">Notification Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="emailNotifications"
                    name="emailNotifications"
                    type="checkbox"
                    checked={userSettings.emailNotifications}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Email Notifications
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="pushNotifications"
                    name="pushNotifications"
                    type="checkbox"
                    checked={userSettings.pushNotifications}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="pushNotifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Push Notifications
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="slackNotifications"
                    name="slackNotifications"
                    type="checkbox"
                    checked={userSettings.slackNotifications}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="slackNotifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Slack Notifications
                  </label>
                </div>
              </div>
            </div>

            {/* API Access */}
            <div>
              <h3 className="text-md font-medium mb-3 dark:text-white">API Access</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="apiAccess"
                    name="apiAccess"
                    type="checkbox"
                    checked={userSettings.apiAccess}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="apiAccess" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Enable API Access
                  </label>
                </div>

                {userSettings.apiAccess && (
                  <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      API Key
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        id="apiKey"
                        name="apiKey"
                        value={userSettings.apiKey}
                        readOnly
                        className="block w-full flex-1 rounded-none rounded-l-md border-gray-300 bg-gray-100 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="inline-flex items-center rounded-none rounded-r-md"
                      >
                        Regenerate
                      </Button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Use this key to access the API programmatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Avatar Selection */}
            <div>
              <h3 className="text-md font-medium mb-3 dark:text-white">Default Avatar</h3>
              
              <div className="grid grid-cols-4 gap-4">
                {profileImages.map(image => (
                  <div 
                    key={image.id}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                      userSettings.profileImage === image.id 
                        ? 'border-blue-500 dark:border-blue-400' 
                        : 'border-transparent'
                    }`}
                    onClick={() => handleProfileImageSelect(image.id)}
                  >
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {/* This would be an actual image in a real app */}
                      <UserCircleIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                    </div>
                    {userSettings.profileImage === image.id && (
                      <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                        <CheckCircleIcon className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                You can also upload a custom avatar using the camera button.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default UserSettings; 