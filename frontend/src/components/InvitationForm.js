import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createStudioInvitation, searchUsers } from '../services/api';
import Button from './Button';
import { useStudio } from '../context/StudioContext';
import { UserPlusIcon } from '@heroicons/react/24/outline';

const InvitationForm = ({ onSuccess }) => {
  const { t } = useTranslation();
  const { selectedStudio } = useStudio();
  const [formData, setFormData] = useState({
    email: '',
    role: 'member',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear field error when changed
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
    
    // Clear success message when form is edited
    if (successMessage) {
      setSuccessMessage(null);
    }

    // Search for users when typing in email field
    if (name === 'email' && value.length > 2) {
      handleSearch(value);
    } else if (name === 'email' && value.length <= 2) {
      setSearchResults([]);
    }
  };

  const handleSearch = async (query) => {
    if (!query || query.length < 3) return;
    
    setIsSearching(true);
    try {
      const response = await searchUsers(query);
      setSearchResults(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (email) => {
    setFormData({ ...formData, email });
    setSearchResults([]);
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate email format
    if (!formData.email.trim()) {
      newErrors.email = t('invitationForm.emailRequired', 'Email is required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('invitationForm.invalidEmail', 'Please enter a valid email address');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setSuccessMessage(null);
      
      await createStudioInvitation(selectedStudio.id, {
        email: formData.email,
        role: formData.role
      });
      
      setSuccessMessage(t('invitationForm.success', 'Invitation sent successfully'));
      
      // Reset form
      setFormData({
        email: '',
        role: 'member'
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      
      const errorMessage = error.response?.data?.detail || 
                          t('invitationForm.error', 'Failed to send invitation');
      
      setErrors({ 
        submit: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
          <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}
      
      <div className="relative">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('invitationForm.email', 'Email Address')} *
        </label>
        <input
          type="text"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={`mt-1 block w-full border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            dark:bg-gray-700 dark:text-white dark:border-gray-600`}
          placeholder={t('invitationForm.emailPlaceholder', 'Enter email address')}
          required
        />
        {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
        
        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 shadow-lg rounded-md border border-gray-200 dark:border-gray-600 max-h-60 overflow-auto">
            {searchResults.map((user) => (
              <div 
                key={user.id} 
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                onClick={() => selectSearchResult(user.email)}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
              </div>
            ))}
          </div>
        )}
        
        {isSearching && (
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('common.searching', 'Searching...')}
          </div>
        )}
      </div>
      
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('invitationForm.role', 'Role')}
        </label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
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
      
      {errors.submit && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
        </div>
      )}
      
      <div className="pt-4">
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          icon={<UserPlusIcon className="h-5 w-5" />}
          className="w-full"
        >
          {t('invitationForm.send', 'Send Invitation')}
        </Button>
      </div>
    </form>
  );
};

export default InvitationForm; 