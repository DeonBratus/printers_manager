import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab } from '@headlessui/react';
import InvitationForm from './InvitationForm';
import InvitationsList from './InvitationsList';
import Modal from './Modal';
import { useStudio } from '../context/StudioContext';
import Button from './Button';
import { UserGroupIcon, EnvelopeIcon, PencilIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { updateStudio } from '../services/api';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const StudioManagement = () => {
  const { t } = useTranslation();
  const { selectedStudio, studioMembers, fetchStudioMembers, removeStudioMember, fetchStudios } = useStudio();
  const [isRemoving, setIsRemoving] = useState(false);
  const [invitationsUpdated, setInvitationsUpdated] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  });

  // Initialize form when studio changes
  React.useEffect(() => {
    if (selectedStudio) {
      setEditForm({
        name: selectedStudio.name || '',
        description: selectedStudio.description || ''
      });
    }
  }, [selectedStudio]);

  const handleInvitationSuccess = () => {
    setInvitationsUpdated(!invitationsUpdated);
    setIsInviteModalOpen(false);
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleInviteClick = () => {
    setIsInviteModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateStudio(selectedStudio.id, editForm);
      // Refresh studios to update the name and description
      await fetchStudios();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating studio:', error);
      alert(t('studios.updateError', 'Failed to update studio'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm(t('studioManagement.confirmRemove', 'Are you sure you want to remove this member?'))) {
      return;
    }

    setIsRemoving(true);
    try {
      await removeStudioMember(selectedStudio.id, userId);
      fetchStudioMembers(selectedStudio.id);
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'member': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'viewer': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (!selectedStudio) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          {t('studioManagement.selectStudio', 'Please select a studio to manage')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Studio Details Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedStudio.name}
            </h2>
            {selectedStudio.description && (
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                {selectedStudio.description}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('studios.createdAt', 'Created')}: {new Date(selectedStudio.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleEditClick}
              variant="outline"
              size="sm"
              icon={<PencilIcon className="w-4 h-4" />}
              title={t('studios.edit', 'Edit Studio')}
            >
              {t('common.edit', 'Edit')}
            </Button>
            <Button
              onClick={handleInviteClick}
              variant="primary"
              size="sm"
              icon={<UserPlusIcon className="w-4 h-4" />}
              title={t('studios.invite', 'Invite Users')}
            >
              {t('studios.invite', 'Invite')}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Tabs Section */}
      <div className="p-4">
        <Tab.Group>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-6">
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none',
                  selected
                    ? 'bg-white dark:bg-gray-700 shadow text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-white/[0.12] hover:text-blue-600'
                )
              }
            >
              <div className="flex items-center justify-center">
                <UserGroupIcon className="w-5 h-5 mr-2" />
                {t('studioManagement.members', 'Members')}
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none',
                  selected
                    ? 'bg-white dark:bg-gray-700 shadow text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-white/[0.12] hover:text-blue-600'
                )
              }
            >
              <div className="flex items-center justify-center">
                <EnvelopeIcon className="w-5 h-5 mr-2" />
                {t('studioManagement.invitations', 'Invitations')}
              </div>
            </Tab>
          </Tab.List>
          
          <Tab.Panels>
            {/* Members Tab */}
            <Tab.Panel className="rounded-xl p-3">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('studioManagement.user', 'User')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('studioManagement.email', 'Email')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('studioManagement.role', 'Role')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('common.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {studioMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{member.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(member.role)}`}>
                            {t(`roles.${member.role}`, member.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="danger"
                            size="xs"
                            isLoading={isRemoving}
                            disabled={isRemoving}
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            {t('common.remove', 'Remove')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {studioMembers.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('studioManagement.noMembers', 'No members found')}
                    </p>
                  </div>
                )}
              </div>
            </Tab.Panel>
            
            {/* Invitations Tab */}
            <Tab.Panel className="rounded-xl p-3">
              <InvitationsList key={invitationsUpdated} onUpdate={handleInvitationSuccess} />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
      
      {/* Edit Studio Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t('studios.editStudio', 'Edit Studio')}
        size="md"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              className="mr-2"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleEditSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting || !editForm.name.trim()}
            >
              {t('common.save', 'Save')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('studios.name', 'Name')} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={editForm.name}
              onChange={handleEditChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
                dark:bg-gray-700 dark:text-white dark:border-gray-600"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('studios.description', 'Description')}
            </label>
            <textarea
              id="description"
              name="description"
              value={editForm.description}
              onChange={handleEditChange}
              rows="3"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
                dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
        </form>
      </Modal>
      
      {/* Invite User Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title={t('studios.inviteUsers', 'Invite Users')}
        size="md"
      >
        <InvitationForm onSuccess={handleInvitationSuccess} />
      </Modal>
    </div>
  );
};

export default StudioManagement; 