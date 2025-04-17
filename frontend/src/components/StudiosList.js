import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getStudios, deleteStudio } from '../services/api';
import Button from './Button';
import Modal from './Modal';
import StudioForm from './StudioForm';

const StudiosList = () => {
  const { t } = useTranslation();
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStudio, setCurrentStudio] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [studioToDelete, setStudioToDelete] = useState(null);

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
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {t('studios.title', 'Studios')}
        </h1>
        <Button 
          variant="primary" 
          onClick={handleAddStudio}
        >
          {t('studios.add', 'Add Studio')}
        </Button>
      </div>

      {studios.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {t('studios.noStudios', 'No studios found. Create your first studio to get started.')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('studios.name', 'Name')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('studios.description', 'Description')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('studios.createdAt', 'Created At')}
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">{t('common.actions', 'Actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {studios.map((studio) => (
                <tr key={studio.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {studio.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                    {studio.description || 
                     <span className="text-gray-400 dark:text-gray-500 italic">
                       {t('common.none', 'None')}
                     </span>
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {new Date(studio.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleEditStudio(studio)}
                      >
                        {t('common.edit', 'Edit')}
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleDeleteClick(studio)}
                      >
                        {t('common.delete', 'Delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Studio form modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentStudio 
          ? t('studios.editStudio', 'Edit Studio') 
          : t('studios.addStudio', 'Add Studio')
        }
      >
        <StudioForm
          studio={currentStudio}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title={t('studios.deleteConfirmTitle', 'Delete Studio')}
      >
        <div className="p-6">
          <p className="mb-6 text-gray-700 dark:text-gray-300">
            {t('studios.deleteConfirmMessage', 'Are you sure you want to delete this studio? This action cannot be undone.')}
          </p>
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
    </div>
  );
};

export default StudiosList; 