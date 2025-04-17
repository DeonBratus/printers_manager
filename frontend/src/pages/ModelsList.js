import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getModels, getStudios, createModel, deleteModel } from '../services/api';
import { useStudio } from '../context/StudioContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import ModelCube from '../components/ModelCube';
import { 
  CubeIcon, 
  ClockIcon, 
  PlusCircleIcon,
  TableCellsIcon,
  Squares2X2Icon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatMinutesToHHMM, parseHHMMToMinutes, formatDuration } from '../utils/timeFormat';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const ModelsList = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { selectedStudio, getCurrentStudioId } = useStudio();
  const [models, setModels] = useState([]);
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newModel, setNewModel] = useState({ 
    name: '', 
    printing_time: '01:00'
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define a set of colors to use for the model cubes
  const modelColors = useMemo(() => [
    '#3B82F6', // blue
    '#10B981', // green
    '#8B5CF6', // purple
    '#F59E0B', // amber
    '#EF4444', // red
    '#6366F1', // indigo
    '#EC4899', // pink
    '#14B8A6', // teal
  ], []);

  // Get a color based on the model id
  const getModelColor = (id) => {
    return modelColors[id % modelColors.length];
  };

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      // Передаем ID выбранной студии
      const selectedStudioId = selectedStudio ? selectedStudio.id : null;
      const response = await getModels(selectedStudioId);
      const modelsData = Array.isArray(response) ? response : response.data || [];
      setModels(modelsData);
    } catch (err) {
      console.error("Error fetching models:", err);
      setError(t('modelsList.fetchError', 'Failed to fetch models data. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStudios = async () => {
    try {
      const response = await getStudios();
      console.log('Studios API response:', response); // Add logging to inspect the response structure
      // Make sure we access the data property of the response or use an empty array as fallback
      const studiosData = Array.isArray(response) ? response : response.data || [];
      console.log('Processed studios data:', studiosData); // Log the processed data
      setStudios(studiosData);
    } catch (error) {
      console.error('Error fetching studios:', error);
      setStudios([]); // Set to empty array on error
    }
  };

  useEffect(() => {
    fetchModels();
    fetchStudios();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      fetchModels().catch(err => console.error("Error in periodic refresh:", err));
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [selectedStudio]);

  const handleInputChange = (e) => {
    setNewModel({ ...newModel, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!newModel.name.trim() || !newModel.printing_time) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      // Преобразуем время из формата HH:MM в минуты
      const minutes = parseHHMMToMinutes(newModel.printing_time);
      
      const modelData = {
        ...newModel,
        printing_time: minutes,  // время в минутах для API
        studio_id: getCurrentStudioId() // Используем текущую выбранную студию
      };
      
      await createModel(modelData);
      setNewModel({ 
        name: '', 
        printing_time: '01:00'
      });
      setIsAddModalOpen(false);
      fetchModels();
    } catch (error) {
      console.error('Error creating model:', error);
      setError("Failed to create model. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (model) => {
    setModelToDelete(model);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!modelToDelete) return;
    
    try {
      setIsSubmitting(true);
      await deleteModel(modelToDelete.id);
      fetchModels();
      setIsDeleteModalOpen(false);
      setModelToDelete(null);
    } catch (error) {
      console.error('Error deleting model:', error);
      setError("Failed to delete model. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full p-10">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      <p className="ml-3 text-gray-700 dark:text-gray-300">Loading...</p>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">3D Models</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={toggleViewMode}
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? (
              <TableCellsIcon className="h-5 w-5" />
            ) : (
              <Squares2X2Icon className="h-5 w-5" />
            )}
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Add New Model
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
              <div className="mt-2">
                <Button variant="danger" size="sm" onClick={fetchModels}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {models.map((model) => {
            const modelColor = getModelColor(model.id);
            
            return (
              <Card 
                key={model.id} 
                className="p-0 overflow-hidden hover:shadow-lg transition-shadow duration-200 group border-none"
              >
                <div className="flex flex-col h-full">
                  {/* Model 3D Cube */}
                  <div 
                    className="flex justify-center items-center h-48 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${modelColor}20 0%, ${modelColor}40 100%)`
                    }}
                  >
                    <div className="absolute inset-0 opacity-30">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#grid-pattern)" />
                      </svg>
                      <defs>
                        <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                    </div>
                    <div className="transform group-hover:scale-110 transition-transform duration-300 z-10">
                      <ModelCube size="lg" color={modelColor} />
                    </div>
                    <div className="absolute top-0 right-0 m-2 bg-white dark:bg-gray-800 rounded-full px-2 py-1 text-xs font-semibold shadow-md">
                      ID: {model.id}
                    </div>
                  </div>
                  
                  {/* Model Info */}
                  <div className="p-5 flex-grow bg-white dark:bg-gray-800">
                    <h3 className="text-xl font-semibold dark:text-white mb-2">
                      <Link 
                        to={`/models/${model.id}`} 
                        className="text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 transition-colors"
                      >
                        {model.name}
                      </Link>
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-4 w-4 mr-2 text-gray-400" aria-hidden="true" />
                        <span>
                          <span className="font-medium">{formatMinutesToHHMM(model.printing_time)}</span>
                          <span className="text-gray-400 ml-1">({formatDuration(model.printing_time)})</span>
                        </span>
                      </div>
                      
                      {model.filament_type && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                          <span>Filament: <span className="font-medium">{model.filament_type}</span></span>
                        </div>
                      )}
                      
                      {model.filament_length > 0 && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                          <span>Length: <span className="font-medium">{model.filament_length}mm</span></span>
                        </div>
                      )}
                      
                      {model.success_rate && (
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500 dark:text-gray-400">Success Rate:</span>
                            <span 
                              className={`font-medium ${
                                model.success_rate > 80 ? 'text-green-600 dark:text-green-400' : 
                                model.success_rate > 50 ? 'text-amber-600 dark:text-amber-400' : 
                                'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {model.success_rate}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                model.success_rate > 80 ? 'bg-green-500' : 
                                model.success_rate > 50 ? 'bg-amber-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${model.success_rate}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="px-5 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-between space-x-3">
                    <Link to={`/models/${model.id}`} className="flex-1">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        fullWidth
                        className="rounded-md shadow-sm"
                      >
                        View Details
                      </Button>
                    </Link>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={() => openDeleteModal(model)}
                      className="flex-1 rounded-md shadow-sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Printing Time</th>
                  {models.some(m => m.filament_type) && (
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filament</th>
                  )}
                  {models.some(m => m.success_rate) && (
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Success Rate</th>
                  )}
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {models.length > 0 ? (
                  models.map(model => (
                    <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4 dark:text-gray-300">{model.id}</td>
                      <td className="py-3 px-4">
                        <Link to={`/models/${model.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          {model.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 dark:text-gray-300">{formatMinutesToHHMM(model.printing_time)} ({formatDuration(model.printing_time)})</td>
                      {models.some(m => m.filament_type) && (
                        <td className="py-3 px-4 dark:text-gray-300">{model.filament_type || '-'}</td>
                      )}
                      {models.some(m => m.success_rate) && (
                        <td className="py-3 px-4">
                          {model.success_rate ? (
                            <div className="flex items-center">
                              <span className="mr-2 dark:text-gray-300">{model.success_rate}%</span>
                              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div 
                                  className="bg-green-500 h-1.5 rounded-full" 
                                  style={{ width: `${model.success_rate}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : '-'}
                        </td>
                      )}
                      <td className="py-3 px-4 space-x-2">
                        <Link to={`/models/${model.id}`}>
                          <Button variant="outline" size="xs">View</Button>
                        </Link>
                        <Button 
                          variant="danger" 
                          size="xs"
                          onClick={() => openDeleteModal(model)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4 + (models.some(m => m.filament_type) ? 1 : 0) + (models.some(m => m.success_rate) ? 1 : 0)} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No models found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {models.length === 0 && !loading && !error && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No models found. Add your first 3D model to get started.</p>
          <Button onClick={() => setIsAddModalOpen(true)} className="mt-4">
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Add Model
          </Button>
        </Card>
      )}

      {/* Add Model Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Model"
        size="md"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={!newModel.name.trim() || !newModel.printing_time || isSubmitting}
            >
              Add Model
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Model Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newModel.name}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter model name"
            />
          </div>
          <div>
            <label htmlFor="printing_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Printing Time (HH:MM)
            </label>
            <input
              type="text"
              id="printing_time"
              name="printing_time"
              value={newModel.printing_time}
              onChange={handleInputChange}
              required
              pattern="[0-9]{1,2}:[0-9]{2}"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g. 01:30"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the estimated time it takes to print this model in format HH:MM
            </p>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setModelToDelete(null);
        }}
        title="Delete Model"
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setModelToDelete(null);
              }}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Delete Model
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-2" />
            <p className="dark:text-white">
              Are you sure you want to delete model "{modelToDelete?.name}"?
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. All print history for this model will remain in the database.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ModelsList; 