import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getStudios, deleteStudio, getStudioMembers, addStudioMember, updateMemberRole, removeStudioMember } from '../services/api';
import Button from './Button';
import Modal from './Modal';
import StudioForm from './StudioForm';
import InviteUserForm from './InviteUserForm';
import InvitationsList from './InvitationsList';
import { UserIcon, UserPlusIcon, UserMinusIcon, EnvelopeIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const StudiosList = () => {
  const { t } = useTranslation();
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStudio, setCurrentStudio] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [studioToDelete, setStudioToDelete] = useState(null);
  
  // State for managing members
  const [expandedStudio, setExpandedStudio] = useState(null);
  const [studioMembers, setStudioMembers] = useState({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [removeMemberConfirmOpen, setRemoveMemberConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  
  // State for invitations
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);
  const [activeTab, setActiveTab] = useState('members'); // 'members' or 'invitations'

  const fetchStudios = async () => {
    setLoading(true);
    try {
      const response = await getStudios();
      setStudios(Array.isArray(response) ? response : response.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching studios:", err);
      setError(t('studios.fetchError', 'Failed to load studios'));
      setStudios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudios();
  }, []);

  const handleAddStudio = () => {
    setCurrentStudio(null);
    setIsModalOpen(true);
  };

  const handleEditStudio = (studio) => {
    setCurrentStudio(studio);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (studio) => {
    setStudioToDelete(studio);
    setDeleteConfirmOpen(true);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchStudios();
  };

  const handleDeleteConfirm = async () => {
    if (!studioToDelete) return;
    
    try {
      await deleteStudio(studioToDelete.id);
      fetchStudios();
      setDeleteConfirmOpen(false);
      setStudioToDelete(null);
    } catch (err) {
      console.error("Error deleting studio:", err);
      alert(t('studios.deleteError', 'Failed to delete studio') + 
            (err.response?.data?.detail ? `: ${err.response.data.detail}` : ''));
    }
  };

  const toggleStudioExpand = async (studioId) => {
    if (expandedStudio === studioId) {
      setExpandedStudio(null);
      setActiveTab('members');
      return;
    }
    
    setExpandedStudio(studioId);
    setActiveTab('members');
    
    // Fetch members if not already loaded
    if (!studioMembers[studioId]) {
      await fetchStudioMembers(studioId);
    }
  };

  const fetchStudioMembers = async (studioId) => {
    setLoadingMembers(true);
    try {
      const response = await getStudioMembers(studioId);
      const members = Array.isArray(response) ? response : response.data || [];
      setStudioMembers(prev => ({
        ...prev,
        [studioId]: members
      }));
    } catch (err) {
      console.error("Error fetching studio members:", err);
      setStudioMembers(prev => ({
        ...prev,
        [studioId]: []
      }));
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = (studioId) => {
    setInviteModalOpen(true);
  };

  const handleRoleChange = async (studioId, userId, newRole) => {
    try {
      await updateMemberRole(studioId, userId, { role: newRole });
      // Refresh the members list
      await fetchStudioMembers(studioId);
    } catch (err) {
      console.error("Error updating member role:", err);
      alert(t('studios.memberUpdateError', 'Failed to update member role'));
    }
  };

  const handleRemoveMember = (studioId, userId) => {
    setMemberToRemove({ studioId, userId });
    setRemoveMemberConfirmOpen(true);
  };
  
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    
    try {
      await removeStudioMember(memberToRemove.studioId, memberToRemove.userId);
      // Refresh the members list
      await fetchStudioMembers(memberToRemove.studioId);
      setRemoveMemberConfirmOpen(false);
      setMemberToRemove(null);
    } catch (err) {
      console.error("Error removing member:", err);
      alert(t('studios.memberRemoveError', 'Failed to remove member') + 
            (err.response?.data?.detail ? `: ${err.response.data.detail}` : ''));
    }
  };

  const handleInviteSuccess = () => {
    setInviteModalOpen(false);
    setActiveTab('invitations');
  };

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'member':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading && studios.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('studios.title', 'Studios')}</h1>
        <Button
          onClick={handleAddStudio}
          icon="plus"
          variant="primary"
        >
          {t('studios.addNew', 'Add Studio')}
        </Button>
      </div>

      {studios.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">{t('studios.noStudios', 'No studios found')}</p>
          <Button
            onClick={handleAddStudio}
            variant="outline"
            className="mt-4"
          >
            {t('studios.createFirst', 'Create your first studio')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {studios.map(studio => (
            <div key={studio.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{studio.name}</h2>
                    {studio.description && (
                      <p className="mt-1 text-gray-500 dark:text-gray-400">{studio.description}</p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t('studios.createdAt', 'Created')}:{' '}
                      {new Date(studio.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => toggleStudioExpand(studio.id)}
                      variant="outline"
                      size="sm"
                      icon={<UserIcon className="w-4 h-4" />}
                    >
                      {t('studios.members', 'Members')}
                    </Button>
                    <Link to="/studios/manage">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Cog6ToothIcon className="w-4 h-4" />}
                      >
                        {t('studios.manage', 'Manage')}
                      </Button>
                    </Link>
                    <Button
                      onClick={() => handleEditStudio(studio)}
                      variant="outline"
                      size="sm"
                    >
                      {t('common.edit', 'Edit')}
                    </Button>
                    <Button
                      onClick={() => handleDeleteClick(studio)}
                      variant="danger"
                      size="sm"
                    >
                      {t('common.delete', 'Delete')}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Members section */}
              {expandedStudio === studio.id && (
                <div className="p-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700">
                  <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        className={`py-2 px-1 border-b-2 ${
                          activeTab === 'members'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                        onClick={() => setActiveTab('members')}
                      >
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 mr-2" />
                          {t('studios.studioMembers', 'Members')}
                        </div>
                      </button>
                      <button
                        className={`py-2 px-1 border-b-2 ${
                          activeTab === 'invitations'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                        onClick={() => setActiveTab('invitations')}
                      >
                        <div className="flex items-center">
                          <EnvelopeIcon className="w-4 h-4 mr-2" />
                          {t('studios.invitations', 'Invitations')}
                        </div>
                      </button>
                    </nav>
                  </div>
                  
                  {activeTab === 'members' ? (
                    <>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {t('studios.studioMembers', 'Studio Members')}
                        </h3>
                        <Button
                          onClick={() => handleAddMember(studio.id)}
                          variant="outline"
                          size="sm"
                          icon={<UserPlusIcon className="w-4 h-4" />}
                        >
                          {t('studios.inviteMember', 'Invite Member')}
                        </Button>
                      </div>
                      
                      {loadingMembers ? (
                        <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                          {t('common.loading', 'Loading...')}
                        </p>
                      ) : studioMembers[studio.id]?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  {t('studios.user', 'User')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  {t('studios.role', 'Role')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  {t('common.actions', 'Actions')}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {studioMembers[studio.id].map(member => (
                                <tr key={member.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {member.username}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          {member.email}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {member.role === 'owner' ? (
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(member.role)}`}>
                                        {t(`roles.${member.role}`, member.role)}
                                      </span>
                                    ) : (
                                      <select 
                                        value={member.role}
                                        onChange={(e) => handleRoleChange(studio.id, member.id, e.target.value)}
                                        className={`px-2 text-xs bg-white dark:bg-gray-700 border rounded ${getRoleBadgeClass(member.role)}`}
                                      >
                                        <option value="admin">{t('roles.admin', 'Admin')}</option>
                                        <option value="manager">{t('roles.manager', 'Manager')}</option>
                                        <option value="member">{t('roles.member', 'Member')}</option>
                                        <option value="viewer">{t('roles.viewer', 'Viewer')}</option>
                                      </select>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {member.role !== 'owner' && (
                                      <Button
                                        onClick={() => handleRemoveMember(studio.id, member.id)}
                                        variant="danger"
                                        size="xs"
                                        icon={<UserMinusIcon className="w-4 h-4" />}
                                      >
                                        {t('studios.remove', 'Remove')}
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                          {t('studios.noMembers', 'No members found')}
                        </p>
                      )}
                    </>
                  ) : (
                    <InvitationsList onUpdate={() => {}} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Studio form modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentStudio ? t('studios.editStudio', 'Edit Studio') : t('studios.createStudio', 'Create Studio')}
      >
        <StudioForm
          studio={currentStudio}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Invite user modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={t('studios.inviteMember', 'Invite Member')}
      >
        <InviteUserForm
          onSuccess={handleInviteSuccess}
          onCancel={() => setInviteModalOpen(false)}
        />
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title={t('studios.confirmDelete', 'Confirm Deletion')}
      >
        <div className="p-6">
          <p className="mb-4">{t('studios.deleteWarning', 'Are you sure you want to delete this studio? This action cannot be undone.')}</p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
            >
              {t('common.delete', 'Delete')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove member confirmation modal */}
      <Modal
        isOpen={removeMemberConfirmOpen}
        onClose={() => setRemoveMemberConfirmOpen(false)}
        title={t('studios.confirmRemoveMember', 'Confirm Member Removal')}
      >
        <div className="p-6">
          <p className="mb-4">{t('studios.confirmRemoveMemberText', 'Are you sure you want to remove this member from the studio?')}</p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setRemoveMemberConfirmOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={confirmRemoveMember}
            >
              {t('common.remove', 'Remove')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudiosList; 