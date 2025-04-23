import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getModels, getStudios, createModel, deleteModel, getModelFiles } from '../services/api';
import { useStudio } from '../context/StudioContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import ModelCube from '../components/ModelCube';
import ModelConnections from '../components/ModelConnections';
import ModelNetworkView from '../components/ModelNetworkView';
import { 
  CubeIcon, 
  ClockIcon, 
  PlusCircleIcon,
  TableCellsIcon,
  Squares2X2Icon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ShareIcon,
  PlusIcon,
  Bars3Icon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon as SearchIcon,
  ArrowDownTrayIcon as DownloadIcon
} from '@heroicons/react/24/outline';
import { formatMinutesToHHMM, parseHHMMToMinutes, formatDuration } from '../utils/timeFormat';
import {
  ChartBarIcon,
  ShareIcon as ShareIconSolid,
  ArrowDownTrayIcon as DownloadIconSolid
} from '@heroicons/react/24/solid';

// Tab configuration
const ViewIcon = ({ type }) => {
  switch (type) {
    case 'network':
      return <ChartBarIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />;
    case 'grid':
      return <Squares2X2Icon className="h-5 w-5 text-blue-500" aria-hidden="true" />;
    case 'list':
      return <Bars3Icon className="h-5 w-5 text-blue-500" aria-hidden="true" />;
    default:
      return null;
  }
};

const ModelsList = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { selectedStudio, getCurrentStudioId } = useStudio();
  
  // State management
  const [models, setModels] = useState([]);
  const [modelFiles, setModelFiles] = useState({});
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newModel, setNewModel] = useState({ 
    name: '', 
    printing_time: '01:00'
  });
  const [viewMode, setViewMode] = useState(localStorage.getItem('modelsViewMode') || 'grid'); // 'grid', 'list', or 'network'
  const [searchQuery, setSearchQuery] = useState('');
  const networkContainerRef = useRef(null);
  
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

  // Get a color based on the model id (using safe number conversion)
  const getModelColor = (id) => {
    const idNumber = parseInt(id, 10) || 0;
    return modelColors[idNumber % modelColors.length];
  };

  // Filtered models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return models;
    
    const query = searchQuery.toLowerCase().trim();
    return models.filter(model => 
      model && model.name && model.name.toLowerCase().includes(query)
    );
  }, [models, searchQuery]);

  // Build connection map for use in network view
  const connectionMap = useMemo(() => {
    const connections = {};
    
    models.forEach(model => {
      if (!model || !model.id) return;
      
      if (!connections[model.id]) {
        connections[model.id] = { to: [], from: [] };
      }
      
      // Add related_to connections
      if (model.related_to && model.related_to.length > 0) {
        connections[model.id].to = model.related_to.map(related => related.id);
        
        // Make sure all target models have connections object
        model.related_to.forEach(related => {
          if (!connections[related.id]) {
            connections[related.id] = { to: [], from: [] };
          }
          // Add reverse connection
          if (!connections[related.id].from.includes(model.id)) {
            connections[related.id].from.push(model.id);
          }
        });
      }
      
      // Add related_from connections
      if (model.related_from && model.related_from.length > 0) {
        connections[model.id].from = model.related_from.map(related => related.id);
        
        // Make sure all source models have connections object
        model.related_from.forEach(related => {
          if (!connections[related.id]) {
            connections[related.id] = { to: [], from: [] };
          }
          // Add reverse connection
          if (!connections[related.id].to.includes(model.id)) {
            connections[related.id].to.push(model.id);
          }
        });
      }
    });
    
    return connections;
  }, [models]);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass the selected studio ID
      const selectedStudioId = selectedStudio ? selectedStudio.id : null;
      let response = await getModels(selectedStudioId);
      
      // Handle different API response formats
      let modelsData = [];
      
      if (response) {
        if (Array.isArray(response)) {
          modelsData = response;
        } else if (response.data) {
          modelsData = Array.isArray(response.data) ? response.data : [];
        }
      }
      
      setModels(modelsData);
      
      // For each model, fetch the STL files to display
      if (modelsData.length > 0) {
        const filesPromises = modelsData.map(model => {
          if (!model || !model.id) return Promise.resolve({ modelId: null, files: [], stlFile: null });
          
          return getModelFiles(model.id)
          .then(result => {
              // Handle different API response formats
              let files = [];
              
              if (result) {
                if (Array.isArray(result)) {
                  files = result;
                } else if (result.data) {
                  files = Array.isArray(result.data) ? result.data : [];
                }
              }
              
            // Find STL file or first available model file
            const stlFile = files.find(file => 
                file && file.file_type && file.file_type.toLowerCase() === 'stl'
            );
              
            return { modelId: model.id, files, stlFile };
          })
          .catch(err => {
            console.error(`Error fetching files for model ${model.id}:`, err);
            return { modelId: model.id, files: [], stlFile: null };
            });
        });
      
      const filesResults = await Promise.all(filesPromises);
      const filesMap = {};
        
        filesResults.forEach(result => {
          if (result && result.modelId) {
            filesMap[result.modelId] = { 
              files: result.files || [], 
              stlFile: result.stlFile || null 
            };
          }
      });
      
      setModelFiles(filesMap);
      }
    } catch (err) {
      console.error("Error fetching models:", err);
      setError(t('models.fetchError', 'Failed to load models. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStudios = async () => {
    try {
      let response = await getStudios();
      // Handle different API response formats
      let studiosData = [];
      
      if (response) {
        if (Array.isArray(response)) {
          studiosData = response;
        } else if (response.data) {
          studiosData = Array.isArray(response.data) ? response.data : [];
        }
      }
      
      setStudios(studiosData);
    } catch (error) {
      console.error('Error fetching studios:', error);
      setStudios([]); // Set to empty array on error
    }
  };

  // Fetch data when dependencies change
  useEffect(() => {
    // Create a flag to prevent state updates if component unmounts
    let isMounted = true;
    
    const loadData = async () => {
      try {
        await fetchModels();
        await fetchStudios();
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    
    loadData();
    
    // Set up periodic refresh with proper cleanup
    const refreshInterval = setInterval(() => {
      if (isMounted) {
      fetchModels().catch(err => console.error("Error in periodic refresh:", err));
      }
    }, 30000); // refresh every 30 seconds
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, [selectedStudio]); // Only re-run when selected studio changes

  const handleInputChange = (e) => {
    if (e && e.target && typeof e.target.name === 'string') {
      setNewModel(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    if (!newModel.name || !newModel.name.trim() || !newModel.printing_time) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      // Convert time from HH:MM to minutes
      const minutes = parseHHMMToMinutes(newModel.printing_time);
      
      const modelData = {
        ...newModel,
        printing_time: minutes, // time in minutes for API
        studio_id: getCurrentStudioId() // Use the currently selected studio
      };
      
      await createModel(modelData);
      setNewModel({ 
        name: '', 
        printing_time: '01:00'
      });
      setIsAddModalOpen(false);
      await fetchModels();
    } catch (error) {
      console.error('Error creating model:', error);
      setError(t('models.createError', 'Failed to create model. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (model) => {
    if (model) {
    setModelToDelete(model);
    setIsDeleteModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!modelToDelete || !modelToDelete.id) return;
    
    try {
      setIsSubmitting(true);
      await deleteModel(modelToDelete.id);
      await fetchModels();
      setIsDeleteModalOpen(false);
      setModelToDelete(null);
    } catch (error) {
      console.error('Error deleting model:', error);
      setError(t('models.deleteError', 'Failed to delete model. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('modelsViewMode', mode);
  };

  const renderLoadingState = () => (
    <div className="h-full flex flex-col items-center justify-center p-10 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-blue-500"></div>
      <p className="text-gray-600 dark:text-gray-300">{t('common.loading', 'Loading...')}</p>
    </div>
  );

  // Early loading return
  if (loading) {
    return renderLoadingState();
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <CubeIcon className="h-7 w-7 mr-2 text-blue-500" />
              {t('models.title', 'Модели')}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredModels.length} {filteredModels.length === 1 ? 
                t('models.modelSingular', 'модель') : 
                t('models.modelPlural', 'моделей')}
            </p>
          </div>
          
          {/* Navigation Controls */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            {/* View Title Section */}
            <div className="flex items-center">
              <h2 className="text-xl font-semibold flex items-center">
                <ViewIcon type={viewMode} />
                <span className="ml-2">
                  {viewMode === 'network' ? t('Models Network', 'Сеть моделей') : 
                   viewMode === 'grid' ? t('Models Grid', 'Сетка моделей') : 
                   t('Models List', 'Список моделей')}
                </span>
              </h2>
              {error && (
                <div className="ml-4 flex items-center text-red-500">
                  <ExclamationCircleIcon className="h-5 w-5 mr-1" />
                  <span>{error}</span>
                </div>
              )}
            </div>
            
            {/* Actions Section */}
            <div className="flex items-center space-x-2">
              {/* Search Input */}
              <div className="relative flex-grow max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder={t('Search models...', 'Поиск моделей...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Refresh Button */}
              <button
                type="button"
                className="bg-white dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
                onClick={fetchModels}
              >
                <ArrowPathIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
              
              {/* View Mode Toggles */}
              <div className="flex rounded-md shadow-sm">
                {/* List/Grid Toggle */}
                <div className="inline-flex rounded-md shadow-sm">
                  <button
                    type="button"
                    className={`relative inline-flex items-center px-3 py-2 rounded-l-md border ${
                      viewMode === 'list' ? 'bg-blue-50 border-blue-500 z-10 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-white border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                    onClick={() => setViewMode('list')}
                  >
                    <Bars3Icon className="h-5 w-5" />
                    <span className="sr-only">{t('List View', 'Список')}</span>
                  </button>
                  <button
                    type="button"
                    className={`relative inline-flex items-center px-3 py-2 rounded-r-md border ${
                      viewMode === 'grid' ? 'bg-blue-50 border-blue-500 z-10 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-white border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                    onClick={() => setViewMode('grid')}
                  >
                    <Squares2X2Icon className="h-5 w-5" />
                    <span className="sr-only">{t('Grid View', 'Сетка')}</span>
                  </button>
                </div>
                
                {/* Network View Button */}
                <button
                  type="button"
                  className={`ml-2 inline-flex items-center px-3 py-2 border rounded-md ${
                    viewMode === 'network' ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-white border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                  }`}
                  onClick={() => setViewMode('network')}
                >
                  <ChartBarIcon className="h-5 w-5" />
                  <span className="sr-only">{t('Network View', 'Сеть')}</span>
                </button>
              </div>
              
              {/* Add Model Button */}
              <Button 
                onClick={() => setIsAddModalOpen(true)} 
                icon={<PlusCircleIcon className="h-5 w-5 mr-1" />}
              >
                {t('models.addNew', 'Добавить модель')}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* View Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4">
          {/* Network View */}
          {viewMode === 'network' ? (
            <div 
              ref={networkContainerRef} 
              className="min-h-[600px]"
            >
              <ModelNetworkView 
                models={filteredModels}
                modelFiles={modelFiles}
                connectionMap={connectionMap}
                getModelColor={getModelColor}
                onDeleteClick={openDeleteModal}
                containerRef={networkContainerRef}
              />
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredModels.length > 0 ? (
                filteredModels.map((model) => {
                  return model && model.id ? (
                    <Card key={model.id} className="overflow-hidden group hover:shadow-md transition-shadow duration-300 dark:border dark:border-gray-700">
                      <Link to={`/models/${model.id}`} className="block">
                        <div className="p-4 flex justify-center items-center h-44 bg-gray-100 dark:bg-gray-800 transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-gray-700 relative">
                          {modelFiles[model.id]?.stlFile ? (
                            <ModelCube 
                              size="lg" 
                              color={getModelColor(model.id)} 
                              fileId={modelFiles[model.id].stlFile.id}
                              showPlaceholder={true}
                              interactive={false}
                            />
                          ) : (
                            <ModelCube 
                              size="lg" 
                              color={getModelColor(model.id)}
                              showPlaceholder={true}
                              interactive={false}
                            />
                          )}
                          
                          {/* Quick Action Overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <Button 
                              variant="primary" 
                              size="sm"
                              className="transform transition-transform duration-300 scale-90 group-hover:scale-100"
                            >
                              {t('common.view', 'Просмотр')}
                            </Button>
                          </div>
                        </div>
                      </Link>
                      <div className="p-4">
                        <div className="flex justify-between">
                          <h3 className="font-medium text-gray-900 dark:text-white">{model.name}</h3>
                          <button 
                            type="button"
                            onClick={(e) => { 
                              if (e && e.preventDefault && typeof e.preventDefault === 'function') {
                                e.preventDefault();
                              }
                              if (e && e.stopPropagation && typeof e.stopPropagation === 'function') {
                                e.stopPropagation();
                              }
                              openDeleteModal(model);
                            }}
                            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
                            title={t('models.deleteModel', 'Удалить модель')}
                          >
                            <span className="sr-only">{t('common.delete', 'Удалить')}</span>
                            <ExclamationTriangleIcon className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <ClockIcon className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                          <span>{t('models.printingTime', 'Время печати')}: {formatDuration(model.printing_time)}</span>
                        </div>
                        
                        {/* Connections Indicator */}
                        {(model.related_to?.length > 0 || model.related_from?.length > 0) && (
                          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                              <ArrowsRightLeftIcon className="h-3.5 w-3.5 mr-1" />
                              <span>
                                {((model.related_to && model.related_to.length) || 0) + 
                                 ((model.related_from && model.related_from.length) || 0)} {t('models.connections', 'связей')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : null;
                })
              ) : (
                <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                  <CubeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  {searchQuery ? (
                    <>
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                        {t('models.noSearchResults', 'Модели не найдены')}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('models.tryDifferentSearch', 'Попробуйте изменить параметры поиска.')}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                        {t('models.noModels', 'Нет моделей')}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('models.startByAdding', 'Начните с добавления новой 3D модели.')}
                      </p>
                      <div className="mt-6">
                        <Button onClick={() => setIsAddModalOpen(true)}>
                          <PlusCircleIcon className="h-5 w-5 mr-2" />
                          {t('models.addNew', 'Добавить модель')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common.name', 'Название')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('models.printingTime', 'Время печати')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('models.connections', 'Связи')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common.actions', 'Действия')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredModels.length > 0 ? (
                      filteredModels.map((model) => {
                        return model && model.id ? (
                          <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                                  <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getModelColor(model.id)}20` }}>
                                    <CubeIcon className="h-5 w-5" style={{ color: getModelColor(model.id) }} />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <Link to={`/models/${model.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                    {model.name}
                                  </Link>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('models.id', 'ID')}: {model.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <ClockIcon className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                                {formatDuration(model.printing_time)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm">
                                {(model.related_to?.length > 0 || model.related_from?.length > 0) ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                                    <ArrowsRightLeftIcon className="h-3.5 w-3.5 mr-1" />
                                    {((model.related_to && model.related_to.length) || 0) + 
                                     ((model.related_from && model.related_from.length) || 0)}
                                  </span>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                                    {t('models.noConnections', 'Нет связей')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <Link to={`/models/${model.id}`}>
                                  <Button variant="outline" size="xs">{t('common.view', 'Просмотр')}</Button>
                                </Link>
                                <Button 
                                  variant="outline" 
                                  size="xs" 
                                  className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20"
                                  onClick={() => openDeleteModal(model)}
                                >
                                  {t('common.delete', 'Удалить')}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ) : null;
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                          <CubeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                          {searchQuery ? (
                            <>
                              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                                {t('models.noSearchResults', 'Модели не найдены')}
                              </h3>
                              <p className="mt-1 text-sm">
                                {t('models.tryDifferentSearch', 'Попробуйте изменить параметры поиска.')}
                              </p>
                            </>
                          ) : (
                            <>
                              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                                {t('models.noModels', 'Нет моделей')}
                              </h3>
                              <p className="mt-1 text-sm">
                                {t('models.startByAdding', 'Начните с добавления новой 3D модели.')}
                              </p>
                              <div className="mt-6 flex justify-center">
                                <Button onClick={() => setIsAddModalOpen(true)}>
                                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                                  {t('models.addNew', 'Добавить модель')}
                                </Button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Model Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title={t('models.addNew', 'Добавить модель')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('models.name', 'Название модели')} *
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={newModel.name || ''}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('models.enterName', 'Введите название модели')}
            />
          </div>
          
          <div>
            <label htmlFor="printing_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('models.printingTime', 'Время печати')} (ЧЧ:ММ) *
            </label>
            <input
              type="text"
              name="printing_time"
              id="printing_time"
              value={newModel.printing_time || '01:00'}
              onChange={handleInputChange}
              required
              pattern="[0-9]{1,2}:[0-9]{2}"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="01:00"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('models.enterHHMM', 'Введите примерное время печати в формате ЧЧ:ММ (например, 01:30 для 1 часа 30 минут)')}
            </p>
          </div>
          
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button 
              type="submit"
              isLoading={isSubmitting}
            >
              {t('common.create', 'Создать')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Model Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => {
          if (!isSubmitting) {
            setIsDeleteModalOpen(false);
            setModelToDelete(null);
          }
        }}
        title={t('models.deleteModel', 'Удалить модель')}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <ExclamationTriangleIcon className="h-6 w-6" />
            <p className="font-medium">{t('models.deleteConfirmation', 'Вы уверены, что хотите удалить эту модель?')}</p>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('models.deleteWarning', 'Это действие невозможно отменить. Все файлы и данные для этой модели будут безвозвратно удалены.')}
          </p>
          
          {modelToDelete && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md text-sm">
              <div className="grid grid-cols-2 gap-y-2">
                <div className="font-medium dark:text-gray-300">{t('common.name', 'Название')}:</div>
                <div className="dark:text-gray-300">{modelToDelete.name}</div>
                
                <div className="font-medium dark:text-gray-300">{t('common.id', 'ID')}:</div>
                <div className="dark:text-gray-300">{modelToDelete.id}</div>
                
                <div className="font-medium dark:text-gray-300">{t('models.printingTime', 'Время печати')}:</div>
                <div className="dark:text-gray-300">{formatDuration(modelToDelete.printing_time)}</div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setModelToDelete(null);
              }}
              disabled={isSubmitting}
            >
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button 
              type="button"
              variant="danger"
              onClick={handleDelete}
              isLoading={isSubmitting}
            >
              {t('common.delete', 'Удалить')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModelsList; 

