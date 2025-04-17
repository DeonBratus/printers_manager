import React, { useState, useEffect } from 'react';
import Button from './Button';
import { useTranslation } from 'react-i18next';
import { createStudio, updateStudio, getUsers } from '../services/api';

const StudioForm = ({ studio, onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initial_users: []
  });
  
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load available users for adding to the studio
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const response = await getUsers();
        const userData = Array.isArray(response) ? response : response.data || [];
        setUsers(userData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    // If editing an existing studio, fill form with data
    if (studio) {
      setFormData({
        name: studio.name || '',
        description: studio.description || '',
        initial_users: []
      });
    } else {
      // Reset form when creating a new studio
      setFormData({
        name: '',
        description: '',
        initial_users: []
      });
    }
    // Reset user selection and errors when opening form
    setSelectedUsers([]);
    setErrors({});
  }, [studio]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear field error when changed
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleUserSelect = (e) => {
    const userId = parseInt(e.target.value);
    const role = "member"; // Default role
    
    // Add user to selected list if not already added
    if (userId && !selectedUsers.some(u => u.user_id === userId)) {
      setSelectedUsers([...selectedUsers, { user_id: userId, role }]);
    }
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.user_id !== userId));
  };

  const handleUserRoleChange = (userId, newRole) => {
    setSelectedUsers(selectedUsers.map(u => 
      u.user_id === userId ? { ...u, role: newRole } : u
    ));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate required fields
    if (!formData.name.trim()) {
      newErrors.name = t('studioForm.nameRequired', 'Studio name is required');
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
      
      // Prepare data for submission
      const studioData = {
        name: formData.name,
        description: formData.description
      };
      
      // Add initial users when creating a new studio
      if (!studio && selectedUsers.length > 0) {
        studioData.initial_users = selectedUsers;
      }
      
      if (studio) {
        await updateStudio(studio.id, studioData);
      } else {
        await createStudio(studioData);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving studio:', error);
      setErrors({ 
        submit: error.response?.data?.detail || t('studioForm.saveFailed', 'Failed to save studio')
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to get user name by ID
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.username : `User #${userId}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('studios.name', 'Name')} *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`mt-1 block w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            dark:bg-gray-700 dark:text-white dark:border-gray-600`}
          required
        />
        {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('studios.description', 'Description')}
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
      </div>
      
      {/* User selection section - only show when creating a new studio */}
      {!studio && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('studios.addUsers', 'Add Users to Studio')}
          </h3>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedUsers.map(user => (
              <div 
                key={user.user_id} 
                className="flex items-center bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded"
              >
                <span className="text-sm text-blue-700 dark:text-blue-300">{getUserName(user.user_id)}</span>
                <select
                  value={user.role}
                  onChange={(e) => handleUserRoleChange(user.user_id, e.target.value)}
                  className="ml-2 px-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                >
                  <option value="member">{t('roles.member', 'Member')}</option>
                  <option value="admin">{t('roles.admin', 'Admin')}</option>
                  <option value="manager">{t('roles.manager', 'Manager')}</option>
                  <option value="viewer">{t('roles.viewer', 'Viewer')}</option>
                </select>
                <button 
                  type="button" 
                  onClick={() => handleRemoveUser(user.user_id)}
                  className="ml-1 text-gray-500 hover:text-red-500"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <select
              disabled={isLoadingUsers}
              onChange={handleUserSelect}
              defaultValue=""
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
                dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              <option value="" disabled>{isLoadingUsers ? t('common.loading', 'Loading...') : t('studios.selectUser', 'Select a user to add')}</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {errors.submit && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
        </div>
      )}
      
      <div className="flex justify-end space-x-3 pt-5 border-t border-gray-200 dark:border-gray-700 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {studio ? t('common.update', 'Update') : t('common.create', 'Create')}
        </Button>
      </div>
    </form>
  );
};

export default StudioForm; 