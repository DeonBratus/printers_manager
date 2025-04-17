import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SunIcon, MoonIcon, UserCircleIcon, Bars3Icon, XMarkIcon, LanguageIcon, BellIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import StudioSelector from './StudioSelector';
import { getUserInvitations, updateInvitationStatus } from '../services/api';

const Layout = ({ children }) => {
  const { t } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

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

  // Fetch invitations periodically
  useEffect(() => {
    if (isAuthenticated) {
      fetchInvitations();
      const interval = setInterval(fetchInvitations, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const fetchInvitations = async () => {
    if (!isAuthenticated) return;
    
    setLoadingInvitations(true);
    try {
      const response = await getUserInvitations();
      setInvitations(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    await handleInvitationResponse(invitationId, 'accepted');
  };

  const handleRejectInvitation = async (invitationId) => {
    await handleInvitationResponse(invitationId, 'rejected');
  };

  const handleInvitationResponse = async (invitationId, status) => {
    setProcessingInvitation(invitationId);
    try {
      await updateInvitationStatus(invitationId, { status });
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error(`Error ${status} invitation:`, err);
    } finally {
      setProcessingInvitation(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
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
              {/* Studio Selector */}
              {isAuthenticated && (
                <StudioSelector 
                  className={`hidden sm:flex ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} 
                />
              )}
              
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
              
              {/* Notification Bell */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    className={`p-2 rounded-full relative ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      if (isProfileMenuOpen) setIsProfileMenuOpen(false);
                    }}
                  >
                    <BellIcon className="h-5 w-5" aria-hidden="true" />
                    {invitations.length > 0 && (
                      <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
                    )}
                  </button>
                
                  {isNotificationsOpen && (
                    <div 
                      className={`absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md shadow-lg py-1 ${
                        isDarkMode ? 'bg-gray-800' : 'bg-white'
                      } ring-1 ring-black ring-opacity-5`}
                    >
                      <div className={`px-4 py-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {t('notifications.title', 'Notifications')}
                        </h3>
                      </div>
                      
                      {loadingInvitations ? (
                        <div className="px-4 py-3 text-center">
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {t('common.loading', 'Loading...')}
                          </p>
                        </div>
                      ) : invitations.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto">
                          {invitations.map(invitation => (
                            <div 
                              key={invitation.id} 
                              className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} last:border-0`}
                            >
                              <div className="flex flex-col">
                                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {t('invitations.inviteFrom', 'Invite to join')} <span className="font-bold">{invitation.studio_name}</span>
                                </p>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {t('invitations.from', 'From')}: {invitation.inviter_name || 'Unknown'}
                                </p>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {t('invitations.role', 'Role')}: {t(`roles.${invitation.role}`, invitation.role)}
                                </p>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {formatDate(invitation.created_at)}
                                </p>
                                
                                <div className="flex justify-end space-x-2 mt-2">
                                  <button
                                    disabled={processingInvitation === invitation.id}
                                    onClick={() => handleRejectInvitation(invitation.id)}
                                    className={`px-2 py-1 text-xs rounded ${
                                      isDarkMode 
                                        ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50' 
                                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                                    }`}
                                  >
                                    {processingInvitation === invitation.id ? t('common.processing', 'Processing...') : t('invitations.reject', 'Reject')}
                                  </button>
                                  <button
                                    disabled={processingInvitation === invitation.id}
                                    onClick={() => handleAcceptInvitation(invitation.id)}
                                    className={`px-2 py-1 text-xs rounded ${
                                      isDarkMode 
                                        ? 'bg-green-900/30 text-green-300 hover:bg-green-900/50' 
                                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                                    }`}
                                  >
                                    {processingInvitation === invitation.id ? t('common.processing', 'Processing...') : t('invitations.accept', 'Accept')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-center">
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {t('notifications.noNotifications', 'No notifications')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* User profile */}
              <div className="relative ml-3">
                <div>
                  <button
                    className={`flex rounded-full focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-white' : 'focus:ring-blue-500'}`}
                    onClick={() => {
                      setIsProfileMenuOpen(!isProfileMenuOpen);
                      if (isNotificationsOpen) setIsNotificationsOpen(false);
                    }}
                  >
                    <UserCircleIcon className={`h-8 w-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                    {isAuthenticated && user && (
                      <span className={`ml-1.5 mt-1 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {user.username}
                      </span>
                    )}
                  </button>
                </div>
                
                {isProfileMenuOpen && (
                  <div 
                    className={`absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md shadow-lg py-1 ${
                      isDarkMode ? 'bg-gray-800' : 'bg-white'
                    } ring-1 ring-black ring-opacity-5`}
                  >
                    {isAuthenticated ? (
                      <>
                        <div className={`px-4 py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user?.email}
                        </div>
                        <div className={`px-4 py-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {t('auth.studio')}: {user?.studio_id || 'default'}
                        </div>
                        <Link
                          to="/settings"
                          className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          {t('user.profile')}
                        </Link>
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
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            handleLogout();
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          {t('user.logout')}
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/login"
                          className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          {t('auth.signIn')}
                        </Link>
                        <Link
                          to="/register"
                          className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          {t('auth.register')}
                        </Link>
                        <LanguageSwitcher 
                          className={`block w-full text-left ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                        />
                      </>
                    )}
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
              {/* Studio Selector в мобильном меню */}
              {isAuthenticated && (
                <div className={`px-3 py-2 ${
                  isDarkMode
                    ? 'text-gray-300 border-l-4 border-transparent'
                    : 'text-gray-600 border-l-4 border-transparent'
                }`}>
                  <StudioSelector />
                </div>
              )}
              
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
            </div>
            
            {/* Mobile menu notification bell */}
            {isAuthenticated && invitations.length > 0 && (
              <div className={`px-3 py-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center">
                  <BellIcon className={`h-5 w-5 mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {invitations.length} {t('invitations.pendingInvitations', 'pending invitations')}
                  </span>
                </div>
                <Link
                  to="/studios/manage"
                  className={`mt-2 block px-3 py-2 text-sm font-medium rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('invitations.viewAll', 'View all invitations')}
                </Link>
              </div>
            )}
            
            {/* Mobile profile/auth links */}
            <div className={`pt-4 pb-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              {isAuthenticated ? (
                <>
                  <div className="px-3 space-y-1">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserCircleIcon className={`h-8 w-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                      </div>
                      <div className="ml-3">
                        <div className={`text-base font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {user?.username}
                        </div>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user?.email}
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/settings"
                      className={`block px-3 py-2 text-base font-medium ${
                        isDarkMode
                          ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t('user.profile')}
                    </Link>
                    <Link
                      to="/help"
                      className={`block px-3 py-2 text-base font-medium ${
                        isDarkMode
                          ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t('common.helpSupport')}
                    </Link>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className={`block w-full text-left px-3 py-2 text-base font-medium ${
                        isDarkMode
                          ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {t('user.logout')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-3 space-y-1">
                  <Link
                    to="/login"
                    className={`block px-3 py-2 text-base font-medium ${
                      isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('auth.signIn')}
                  </Link>
                  <Link
                    to="/register"
                    className={`block px-3 py-2 text-base font-medium ${
                      isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('auth.register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
      
      {/* Main content */}
      <div className="pt-16">
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 