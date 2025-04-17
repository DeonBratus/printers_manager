import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getStudioInvitations, deleteInvitation } from '../services/api';
import Button from './Button';
import { useStudio } from '../context/StudioContext';

const InvitationsList = ({ onUpdate }) => {
  const { t } = useTranslation();
  const { selectedStudio } = useStudio();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    if (selectedStudio) {
      fetchInvitations();
    }
  }, [selectedStudio, statusFilter]);

  const fetchInvitations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getStudioInvitations(selectedStudio.id, statusFilter);
      setInvitations(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError(t('invitations.fetchError', 'Failed to load invitations'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (invitationId) => {
    if (!window.confirm(t('invitations.confirmDelete', 'Are you sure you want to delete this invitation?'))) {
      return;
    }

    try {
      await deleteInvitation(invitationId);
      // Refresh the list
      fetchInvitations();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error deleting invitation:', err);
      alert(t('invitations.deleteError', 'Failed to delete invitation'));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Status badge color mapping
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('invitations.title', 'Invitations')}
        </h3>
        
        <div className="flex space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded text-sm p-1 bg-white dark:bg-gray-700"
          >
            <option value="pending">{t('invitations.statusPending', 'Pending')}</option>
            <option value="accepted">{t('invitations.statusAccepted', 'Accepted')}</option>
            <option value="rejected">{t('invitations.statusRejected', 'Rejected')}</option>
            <option value="expired">{t('invitations.statusExpired', 'Expired')}</option>
            <option value="">{t('invitations.statusAll', 'All')}</option>
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvitations}
            icon="refresh"
          >
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>
      
      {invitations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            {t('invitations.noInvitations', 'No invitations found')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('invitations.email', 'Email')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('invitations.role', 'Role')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('invitations.status', 'Status')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('invitations.sent', 'Sent')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('invitations.expires', 'Expires')}
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
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{invitation.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t(`roles.${invitation.role}`, invitation.role)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(invitation.status)}`}>
                      {t(`invitations.status${invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}`, invitation.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(invitation.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(invitation.expires_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {invitation.status === 'pending' && (
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => handleDelete(invitation.id)}
                      >
                        {t('common.delete', 'Delete')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InvitationsList; 