import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getModels, createModel, deleteModel } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { 
  CubeIcon, 
  ClockIcon, 
  PlusCircleIcon,
  TableCellsIcon,
  Squares2X2Icon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const ModelsList = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newModel, setNewModel] = useState({ name: '', printing_time: '' });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getModels();
      setModels(response.data);
    } catch (error) {
      console.error('Error fetching models:', error);
      setError("Failed to fetch models. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      fetchModels().catch(err => console.error("Error in periodic refresh:", err));
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, []);

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
      // Convert printing_time to minutes for API
      const modelData = {
        ...newModel,
        printing_time: parseFloat(newModel.printing_time) * 60 // Convert hours to minutes
      };
      
      await createModel(modelData);
      setNewModel({ name: '', printing_time: '' });
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
          {models.map((model) => (
            <Card key={model.id} className="p-0 overflow-hidden hover:shadow-lg transition-shadow duration-200">
              <div className="flex flex-col h-full">
                {/* Model Icon */}
                <div className="p-4 flex justify-center items-center h-40 bg-blue-50 dark:bg-blue-900/20">
                  <CubeIcon className="h-16 w-16 text-blue-500 dark:text-blue-400" />
                </div>
                
                {/* Model Info */}
                <div className="p-4 flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold dark:text-white">
                        <Link to={`/models/${model.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          {model.name}
                        </Link>
                      </h3>
                      <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-4 w-4 mr-1 text-gray-400" aria-hidden="true" />
                        <span>Printing Time: {Math.round(model.printing_time / 60 * 10) / 10} hours</span>
                      </div>
                      {model.filament_type && (
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Filament: {model.filament_type}
                        </div>
                      )}
                      {model.filament_length > 0 && (
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Length: {model.filament_length}mm
                        </div>
                      )}
                      {model.success_rate && (
                        <div className="mt-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Success Rate:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{model.success_rate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-green-500 h-1.5 rounded-full" 
                              style={{ width: `${model.success_rate}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="px-4 pb-4 flex justify-between space-x-2">
                  <Link to={`/models/${model.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" fullWidth>
                      View
                    </Button>
                  </Link>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => openDeleteModal(model)}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
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
                      <td className="py-3 px-4 dark:text-gray-300">{Math.round(model.printing_time / 60 * 10) / 10} hours</td>
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
        title="Add New 3D Model"
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
              Printing Time (hours)
            </label>
            <input
              type="number"
              id="printing_time"
              name="printing_time"
              value={newModel.printing_time}
              onChange={handleInputChange}
              required
              min="0.1"
              step="0.1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g. 2.5"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the estimated time it takes to print this model in hours
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