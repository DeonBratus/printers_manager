import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab } from '@headlessui/react';
import InvitationForm from './InvitationForm';
import InvitationsList from './InvitationsList';
import { useStudio } from '../context/StudioContext';
import Button from './Button';
import { UserGroupIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const StudioManagement = () => {
  const { t } = useTranslation();
  const { selectedStudio, studioMembers, fetchStudioMembers, removeStudioMember } = useStudio();
  const [isRemoving, setIsRemoving] = useState(false);
  const [invitationsUpdated, setInvitationsUpdated] = useState(false);

  const handleInvitationSuccess = () => {
    setInvitationsUpdated(!invitationsUpdated);
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
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {t('studioManagement.title', 'Studio Management')}
      </h2>
      
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {t('studioManagement.inviteUsers', 'Invite Users')}
                  </h3>
                  <InvitationForm onSuccess={handleInvitationSuccess} />
                </div>
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <InvitationsList key={invitationsUpdated} onUpdate={handleInvitationSuccess} />
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default StudioManagement; 