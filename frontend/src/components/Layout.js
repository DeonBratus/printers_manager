import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SunIcon, MoonIcon, UserCircleIcon, Bars3Icon, XMarkIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Layout = ({ children }) => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const location = useLocation();

  // Set up dark mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(initialDarkMode);
    
    if (initialDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navigation = [
    { name: t('navigation.dashboard'), href: '/' },
    { name: t('navigation.printers'), href: '/printers' },
    { name: t('navigation.models'), href: '/models' },
    { name: t('navigation.printings'), href: '/printings' },
    { name: t('navigation.reports'), href: '/reports' },
    { name: t('navigation.debug'), href: '/debug' },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Top header with navigation */}
      <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} fixed top-0 left-0 right-0 z-10 border-b`}>
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>3D Print Manager</h1>
              </div>
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                      location.pathname === item.href || 
                      (item.href !== '/' && location.pathname.startsWith(item.href))
                        ? isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-600 text-blue-600'
                        : isDarkMode ? 'border-transparent text-gray-300 hover:border-gray-300 hover:text-gray-200' 
                                     : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } border-b-2`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Theme toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {isDarkMode ? (
                  <SunIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <MoonIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
              
              {/* User profile */}
              <div className="relative ml-3">
                <div>
                  <button
                    className={`flex rounded-full focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-white' : 'focus:ring-blue-500'}`}
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  >
                    <UserCircleIcon className={`h-8 w-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                  </button>
                </div>
                
                {isProfileMenuOpen && (
                  <div 
                    className={`absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md shadow-lg py-1 ${
                      isDarkMode ? 'bg-gray-800' : 'bg-white'
                    } ring-1 ring-black ring-opacity-5`}
                  >
                    <Link
                      to="/settings"
                      className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      {t('user.profile')}
                    </Link>
                    
                    {/* Language Switcher */}
                    <LanguageSwitcher 
                      className={`block w-full text-left ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                    />
                    
                    <Link
                      to="/help"
                      className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      {t('common.helpSupport')}
                    </Link>
                    <a
                      href="#"
                      className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {t('user.logout')}
                    </a>
                  </div>
                )}
              </div>
              
              {/* Mobile menu button */}
              <div className="flex items-center sm:hidden">
                <button
                  type="button"
                  className={`inline-flex items-center justify-center rounded-md p-2 ${
                    isDarkMode 
                      ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  } focus:outline-none`}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <span className="sr-only">Open menu</span>
                  {isMobileMenuOpen ? (
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className={`sm:hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="space-y-1 pt-2 pb-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-3 py-2 text-base font-medium ${
                    location.pathname === item.href || 
                    (item.href !== '/' && location.pathname.startsWith(item.href))
                      ? isDarkMode 
                        ? 'bg-gray-900 text-blue-400 border-l-4 border-blue-400' 
                        : 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white border-l-4 border-transparent'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Language switcher in mobile menu */}
              <div className={`block px-3 py-2 text-base font-medium ${
                isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white border-l-4 border-transparent'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
              }`}>
                <LanguageSwitcher />
              </div>
              
              {/* Add settings link to mobile menu */}
              <Link
                to="/settings"
                className={`block px-3 py-2 text-base font-medium ${
                  location.pathname === '/settings' 
                    ? isDarkMode 
                      ? 'bg-gray-900 text-blue-400 border-l-4 border-blue-400' 
                      : 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white border-l-4 border-transparent'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('user.profile')}
              </Link>
              
              {/* Add help & support link to mobile menu */}
              <Link
                to="/help"
                className={`block px-3 py-2 text-base font-medium ${
                  location.pathname === '/help' 
                    ? isDarkMode 
                      ? 'bg-gray-900 text-blue-400 border-l-4 border-blue-400' 
                      : 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white border-l-4 border-transparent'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('common.helpSupport')}
              </Link>
            </div>
          </div>
        )}
      </header>
      
      {/* Main content */}
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-8xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout; 