import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserInvitations, updateInvitationStatus } from '../services/api';
import Button from './Button';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const UserInvitations = ({ onUpdate }) => {
  const { t } = useTranslation();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getUserInvitations();
      setInvitations(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError(t('invitations.fetchError', 'Failed to load invitations'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    await handleStatusUpdate(invitationId, 'accepted');
  };

  const handleReject = async (invitationId) => {
    await handleStatusUpdate(invitationId, 'rejected');
  };

  const handleStatusUpdate = async (invitationId, status) => {
    setProcessingId(invitationId);

    try {
      await updateInvitationStatus(invitationId, { status });
      // Remove the invitation from the list
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
      
      // Notify parent
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(`Error ${status === 'accepted' ? 'accepting' : 'rejecting'} invitation:`, err);
      alert(t(`invitations.${status}Error`, `Failed to ${status} invitation`));
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 dark:text-gray-400">{t('common.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          {t('invitations.noInvitationsForYou', 'You have no pending invitations')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t('invitations.pendingForYou', 'Pending Invitations')}
      </h3>
      
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('invitations.studio', 'Studio')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('invitations.from', 'From')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('invitations.role', 'Role')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('invitations.sent', 'Sent')}
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('common.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {invitations.map((invitation) => (
              <tr key={invitation.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {invitation.studio_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {invitation.inviter_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t(`roles.${invitation.role}`, invitation.role)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(invitation.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="success"
                      size="xs"
                      icon={<CheckIcon className="w-4 h-4" />}
                      isLoading={processingId === invitation.id}
                      disabled={processingId === invitation.id}
                      onClick={() => handleAccept(invitation.id)}
                    >
                      {t('invitations.accept', 'Accept')}
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      icon={<XMarkIcon className="w-4 h-4" />}
                      isLoading={processingId === invitation.id}
                      disabled={processingId === invitation.id}
                      onClick={() => handleReject(invitation.id)}
                    >
                      {t('invitations.reject', 'Reject')}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserInvitations; 