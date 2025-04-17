import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { searchUsers, createStudioInvitation } from '../services/api';
import Button from './Button';
import { useStudio } from '../context/StudioContext';

const InviteUserForm = ({ onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const { selectedStudio } = useStudio();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (searchQuery.length < 3) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await searchUsers(searchQuery);
      setSearchResults(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError(t('inviteForm.searchError', 'Failed to search users'));
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    setEmailInput(user.email);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      setError(t('inviteForm.invalidEmail', 'Please enter a valid email address'));
      setIsLoading(false);
      return;
    }

    try {
      const invitationData = {
        email: emailInput,
        role: selectedRole
      };

      await createStudioInvitation(selectedStudio.id, invitationData);
      setSuccessMessage(
        t('inviteForm.success', 'Invitation sent successfully')
      );
      
      // Reset form
      setEmailInput('');
      setSelectedUser(null);
      setSelectedRole('member');
      
      // Call success callback after a short delay
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(
        err.response?.data?.detail || 
        t('inviteForm.error', 'Failed to send invitation')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleInvite} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('inviteForm.emailLabel', 'Email address')}
        </label>
        <div className="mt-1 relative">
          <input
            type="text"
            id="email"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              setSearchQuery(e.target.value);
              setSelectedUser(null);
            }}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
              focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
              dark:bg-gray-700 dark:text-white dark:border-gray-600"
            placeholder={t('inviteForm.emailPlaceholder', 'Enter email address')}
            required
          />
          
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md max-h-60 overflow-auto border border-gray-200 dark:border-gray-700">
              <ul className="py-1">
                {searchResults.map(user => (
                  <li 
                    key={user.id}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => selectUser(user)}
                  >
                    <div className="font-medium">{user.username}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('inviteForm.roleLabel', 'Role')}
        </label>
        <select
          id="role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            dark:bg-gray-700 dark:text-white dark:border-gray-600"
        >
          <option value="member">{t('roles.member', 'Member')}</option>
          <option value="admin">{t('roles.admin', 'Admin')}</option>
          <option value="manager">{t('roles.manager', 'Manager')}</option>
          <option value="viewer">{t('roles.viewer', 'Viewer')}</option>
        </select>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
          <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading || !emailInput}
        >
          {t('inviteForm.invite', 'Send Invitation')}
        </Button>
      </div>
    </form>
  );
};

export default InviteUserForm; 