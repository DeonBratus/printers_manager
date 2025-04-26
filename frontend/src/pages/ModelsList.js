import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getModels, getStudios, createModel, deleteModel, getModelFiles, getCollectionTree, getCollectionModels, createCollection, updateCollection, deleteCollection, addModelToCollection, getCollections, getCollection } from '../services/api';
import { useStudio } from '../context/StudioContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { ModelCube } from '../components/models';
import CollectionTree from '../components/CollectionTree';
import CollectionModal from '../components/CollectionModal';
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
  FolderIcon
} from '@heroicons/react/24/outline';
import { formatMinutesToHHMM, parseHHMMToMinutes, formatDuration } from '../utils/timeFormat';
import {
  ChartBarIcon,
  ShareIcon as ShareIconSolid,
  ArrowDownTrayIcon as DownloadIconSolid,
  PlusCircleIcon as PlusCircleSolid
} from '@heroicons/react/24/solid';

// Tab configuration
const ViewIcon = ({ type }) => {
  switch (type) {
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
  
  // Безопасная версия функции hasPermission
  const safeHasPermission = useCallback((permission) => {
    try {
      if (typeof hasPermission === 'function') {
        return hasPermission(permission);
      }
      return false;
    } catch (error) {
      console.error('Error in hasPermission:', error);
      return false;
    }
  }, [hasPermission]);
  
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
  const [viewMode, setViewMode] = useState(localStorage.getItem('modelsViewMode') || 'grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Состояния для коллекций
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionModels, setCollectionModels] = useState([]);
  const [isCollectionLoading, setIsCollectionLoading] = useState(false);
  const [showCollectionSidebar, setShowCollectionSidebar] = useState(
    localStorage.getItem('showCollectionSidebar') !== 'false'
  );
  
  // Состояния для модального окна коллекций
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [parentCollection, setParentCollection] = useState(null);
  const [isCollectionSubmitting, setIsCollectionSubmitting] = useState(false);
  
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
    if (!searchQuery || !searchQuery.trim()) {
      // Если выбрана категория "Без коллекции"
      if (selectedCollection === 'uncategorized') {
        // Фильтруем модели, которые не принадлежат никакой коллекции
        // Это требует дополнительной логики на бэкенде или дополнительного запроса
        return models.filter(model => !model.collection_ids || model.collection_ids.length === 0);
      }
      
      // Если выбрана обычная коллекция, показываем модели из неё
      return selectedCollection ? collectionModels : models;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const modelsToFilter = selectedCollection === 'uncategorized' 
      ? models.filter(model => !model.collection_ids || model.collection_ids.length === 0)
      : (selectedCollection ? collectionModels : models);
    
    return modelsToFilter.filter(model => 
      model && model.name && model.name.toLowerCase().includes(query)
    );
  }, [models, collectionModels, selectedCollection, searchQuery]);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching models...");
      // Pass the selected studio ID
      const selectedStudioId = selectedStudio ? selectedStudio.id : null;
      console.log("Using studio ID:", selectedStudioId);
      
      let response = await getModels(selectedStudioId);
      console.log("Model API response:", response);
      
      // Handle different API response formats
      let modelsData = [];
      
      if (response) {
        if (Array.isArray(response)) {
          modelsData = response;
        } else if (response.data) {
          modelsData = Array.isArray(response.data) ? response.data : [];
        }
      }
      
      console.log("Models data before collection info:", modelsData);
      
      // Получаем информацию о коллекциях для каждой модели, если её нет
      const modelsWithCollectionInfo = await enrichModelsWithCollectionInfo(modelsData);
      
      console.log("Models with collection info:", modelsWithCollectionInfo);
      setModels(modelsWithCollectionInfo);
      
      // For each model, fetch the STL files to display
      if (modelsWithCollectionInfo.length > 0) {
        const filesPromises = modelsWithCollectionInfo.map(model => {
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
      
        // Wait for all file fetch promises to complete
      const filesResults = await Promise.all(filesPromises);
        
        // Build a map of model files
        const newModelFiles = {};
        filesResults.forEach(result => {
          if (result.modelId) {
            newModelFiles[result.modelId] = {
              files: result.files,
              stlFile: result.stlFile
            };
          }
      });
      
        setModelFiles(newModelFiles);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Ошибка загрузки моделей');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка дерева коллекций
  const fetchCollections = async () => {
    try {
      const selectedStudioId = selectedStudio ? selectedStudio.id : null;
      const response = await getCollectionTree(selectedStudioId);
      setCollections(response.data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
      // Не устанавливаем ошибку, чтобы не блокировать основной UI
    }
  };
  
  // Загрузка моделей из выбранной коллекции
  const fetchCollectionModels = async (collectionId) => {
    if (!collectionId) {
      console.error("No collection ID provided to fetchCollectionModels");
      return;
    }
    
    console.log(`Fetching models for collection ${collectionId}`);
    setIsCollectionLoading(true);
    try {
      const response = await getCollectionModels(collectionId);
      console.log("Collection models response:", response);
      const models = response.data || [];
      
      // Получаем информацию о коллекции
      const collectionResponse = await getCollection(collectionId);
      console.log("Collection details response:", collectionResponse);
      const collection = collectionResponse.data;
      
      if (!collection || !collection.id) {
        console.error("Collection not found or invalid response");
        setCollectionModels([]);
        return;
      }
      
      // Добавляем информацию о коллекции к каждой модели
      const modelsWithCollection = models.map(model => ({
        ...model,
        collection_name: collection.name,
        collection_ids: [collection.id],
        collection_names: [collection.name]
      }));
      
      console.log(`Loaded ${modelsWithCollection.length} models for collection ${collectionId}`);
      setCollectionModels(modelsWithCollection);
    } catch (error) {
      console.error('Error fetching collection models:', error);
      setCollectionModels([]);
    } finally {
      setIsCollectionLoading(false);
    }
  };

  const fetchStudios = async () => {
    try {
      const response = await getStudios();
      setStudios(response.data || []);
    } catch (error) {
      console.error('Error fetching studios:', error);
    }
  };

  // Определяем безопасный вариант функции fetchModels, обернутый в useCallback
  const safeFetchModels = useCallback(async () => {
    try {
      return await fetchModels();
    } catch (error) {
      console.error('Error in safeFetchModels:', error);
      setError('Ошибка загрузки моделей');
      return null;
    }
  }, []);

  // Определяем безопасный вариант функции fetchCollections
  const safeFetchCollections = useCallback(async () => {
    try {
      return await fetchCollections();
    } catch (error) {
      console.error('Error in safeFetchCollections:', error);
      return null;
    }
  }, []);

  // Определяем безопасный вариант функции fetchStudios
  const safeFetchStudios = useCallback(async () => {
    try {
      return await fetchStudios();
    } catch (error) {
      console.error('Error in safeFetchStudios:', error);
      return null;
    }
  }, []);

  // При инициализации загружаем данные и информацию о коллекциях для моделей
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        // Загружаем данные последовательно, чтобы избежать проблем с одновременными вызовами
        if (isMounted) await safeFetchModels();
        if (isMounted) await safeFetchCollections();
        if (isMounted) await safeFetchStudios();
      } catch (error) {
        console.error('Error loading initial data:', error);
        if (isMounted) setError('Ошибка загрузки данных');
      }
    };
    
    loadData();
    
    // Очистка при размонтировании компонента
    return () => {
      isMounted = false;
    };
  }, [safeFetchModels, safeFetchCollections, safeFetchStudios]);

  // При изменении студии обновляем данные
  useEffect(() => {
    // Сбрасываем выбранную коллекцию при смене студии
    setSelectedCollection(null);
    setCollectionModels([]);
    
    // Загружаем данные для новой студии
    safeFetchModels();
    safeFetchCollections();
  }, [selectedStudio, safeFetchModels, safeFetchCollections]);
  
  // При выборе коллекции загружаем модели из неё
  useEffect(() => {
    if (selectedCollection && selectedCollection.id) {
      fetchCollectionModels(selectedCollection.id);
    } else {
      setCollectionModels([]);
    }
  }, [selectedCollection]);
  
  // Сохраняем состояние видимости сайдбара
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('showCollectionSidebar', String(showCollectionSidebar));
    }
  }, [showCollectionSidebar]);

  const handleInputChange = (e) => {
    if (!e || typeof e.target === 'undefined') return;
    const { name, value } = e.target;
    setNewModel(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Convert HH:MM to minutes
      const printingTimeMinutes = parseHHMMToMinutes(newModel.printing_time || '01:00');
      
      const modelData = {
        ...newModel,
        printing_time: printingTimeMinutes,
        studio_id: selectedStudio ? selectedStudio.id : null
      };
      
      // Создаем модель
      const createdModel = await createModel(modelData);
      
      // Если была выбрана коллекция, добавляем модель в нее
      if (newModel.collection_id && createdModel && createdModel.id) {
        try {
          // Вызываем API для добавления модели в коллекцию
          await addModelToCollection(createdModel.id, newModel.collection_id);
          
          // Обновляем список моделей в коллекции, если текущая коллекция - та, в которую добавляем
          if (selectedCollection && selectedCollection.id === newModel.collection_id) {
            await fetchCollectionModels(selectedCollection.id);
          }
        } catch (collectionError) {
          console.error('Error adding model to collection:', collectionError);
        }
      }
      
      // Reset form and close modal
      setNewModel({ name: '', printing_time: '01:00', collection_id: '' });
      setIsAddModalOpen(false);
      
      // Refresh models list
      safeFetchModels();
    } catch (error) {
      console.error('Error creating model:', error);
      setError('Ошибка при создании модели');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Обработчики для коллекций
  const handleSelectCollection = (collection) => {
    if (!collection) return;
    setSelectedCollection(collection);
  };
  
  const handleAddCollection = (parentColl = null) => {
    setEditingCollection(null);
    setParentCollection(parentColl);
    setIsCollectionModalOpen(true);
  };
  
  const handleEditCollection = (collection) => {
    if (!collection) return;
    setEditingCollection(collection);
    setParentCollection(null);
    setIsCollectionModalOpen(true);
  };
  
  const handleDeleteCollection = (collection) => {
    if (!collection || !collection.id) return;
    if (window.confirm('Вы уверены, что хотите удалить эту коллекцию?')) {
      deleteCollectionFromDb(collection.id);
    }
  };
  
  const handleSaveCollection = async (collectionData) => {
    if (!collectionData) return;
    setIsCollectionSubmitting(true);
    try {
      // Добавляем studio_id, если не указан
      if (!collectionData.studio_id) {
        collectionData.studio_id = selectedStudio ? selectedStudio.id : null;
      }
      
      if (editingCollection && editingCollection.id) {
        // Обновление существующей коллекции
        await updateCollection(editingCollection.id, collectionData);
      } else {
        // Создание новой коллекции
        await createCollection(collectionData);
      }
      
      // Закрываем модальное окно и обновляем список коллекций
      setIsCollectionModalOpen(false);
      safeFetchCollections();
      
      // Если редактировали текущую коллекцию, обновляем её данные
      if (selectedCollection && editingCollection && 
          selectedCollection.id && editingCollection.id && 
          selectedCollection.id === editingCollection.id) {
        setSelectedCollection(prev => ({ ...prev, ...collectionData }));
      }
    } catch (error) {
      console.error('Error saving collection:', error);
      alert('Ошибка при сохранении коллекции');
    } finally {
      setIsCollectionSubmitting(false);
    }
  };
  
  const deleteCollectionFromDb = async (collectionId) => {
    if (!collectionId) return;
    try {
      await deleteCollection(collectionId);
      
      // Обновляем список коллекций
      safeFetchCollections();
      
      // Если удалили текущую коллекцию, сбрасываем выбор
      if (selectedCollection && selectedCollection.id === collectionId) {
        setSelectedCollection(null);
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Ошибка при удалении коллекции');
    }
  };

  const openDeleteModal = (model) => {
    if (!model) return;
    setModelToDelete(model);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!modelToDelete || !modelToDelete.id) {
      setIsDeleteModalOpen(false);
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await deleteModel(modelToDelete.id);
      
      // Close modal and refresh models
      setIsDeleteModalOpen(false);
      safeFetchModels();
      
      // If we were showing collection models, refresh those too
      if (selectedCollection && selectedCollection.id) {
        fetchCollectionModels(selectedCollection.id);
      }
    } catch (error) {
      console.error('Error deleting model:', error);
      setError('Ошибка при удалении модели');
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeViewMode = (mode) => {
    if (!mode) return;
    setViewMode(mode);
    if (typeof localStorage !== 'undefined') {
    localStorage.setItem('modelsViewMode', mode);
    }
  };
  
  const toggleCollectionSidebar = () => {
    setShowCollectionSidebar(prev => !prev);
  };

  // Обработчик для выбора категории "Без коллекции"
  const handleSelectUncategorized = () => {
    try {
      setSelectedCollection('uncategorized');
      setCollectionModels([]); // Сбрасываем коллекционные модели
    } catch (error) {
      console.error('Error selecting uncategorized collection:', error);
    }
  };

  // Вспомогательная функция для получения информации о коллекциях для моделей
  const enrichModelsWithCollectionInfo = async (models) => {
    try {
      console.log("Starting model enrichment with collection info");
      
      // Handle empty models array
      if (!models || !Array.isArray(models) || models.length === 0) {
        console.log("No models to enrich with collection info");
        return models || [];
      }
      
      // Создаем карту моделей по ID для быстрого доступа
      const modelsMap = models.reduce((map, model) => {
        if (model && model.id) {
          map[model.id] = { ...model, collection_ids: [], collection_names: [] };
        }
        return map;
      }, {});
      
      console.log("Created models map:", Object.keys(modelsMap).length);

      // Получаем все коллекции
      const collsResponse = await getCollections(selectedStudio?.id);
      const collections = collsResponse.data || [];
      console.log("Fetched collections for enrichment:", collections.length);

      // Для каждой коллекции получаем её модели
      for (const collection of collections) {
        try {
          if (!collection || !collection.id) continue;
          
          const collModelsResponse = await getCollectionModels(collection.id);
          const collectionModels = collModelsResponse.data || [];
          console.log(`Fetched ${collectionModels.length} models for collection ${collection.id}`);

          // Добавляем информацию о коллекции к каждой модели
          collectionModels.forEach(model => {
            if (model && model.id && modelsMap[model.id]) {
              modelsMap[model.id].collection_ids = modelsMap[model.id].collection_ids || [];
              modelsMap[model.id].collection_names = modelsMap[model.id].collection_names || [];
              
              // Добавляем ID и название коллекции, если их ещё нет
              if (!modelsMap[model.id].collection_ids.includes(collection.id)) {
                modelsMap[model.id].collection_ids.push(collection.id);
                modelsMap[model.id].collection_names.push(collection.name);
              }
              
              // Устанавливаем основное название коллекции для отображения в карточке
              if (!modelsMap[model.id].collection_name) {
                modelsMap[model.id].collection_name = collection.name;
              }
            }
          });
        } catch (err) {
          console.error(`Error fetching models for collection ${collection.id}:`, err);
        }
      }

      // Возвращаем обогащенные модели
      const result = Object.values(modelsMap);
      console.log(`Returning ${result.length} enriched models`);
      return result;
    } catch (error) {
      console.error('Error enriching models with collection info:', error);
      return models || []; // Возвращаем исходные модели в случае ошибки
    }
  };

  const renderLoadingState = () => (
    <div className="text-center py-12">
      <ArrowPathIcon className="h-10 w-10 mx-auto text-blue-500 animate-spin" />
      <p className="text-gray-600 dark:text-gray-400">Загрузка моделей...</p>
    </div>
  );

  // Отображение карточек моделей в сетке
  const renderGridView = () => {
  return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredModels.map((model) => (
                    <Card key={model.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-200 dark:border-gray-700">
            {/* Отображение коллекции модели */}
                      {model.collection_name && (
                        <div className="absolute top-0 left-0 z-10 m-2 px-2 py-1 bg-blue-500/80 text-white text-xs rounded">
                          <div className="flex items-center">
                            <FolderIcon className="h-3 w-3 mr-1" />
                            <span>{model.collection_name}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="relative group h-52">
                        <div className="absolute inset-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
                {/* 3D-модель или заглушка */}
                          {modelFiles[model.id]?.stlFile ? (
                            <ModelCube 
                              color={getModelColor(model.id)} 
                              stlFile={modelFiles[model.id]?.stlFile}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                              <CubeIcon className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                </div>
              )}
            </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="absolute bottom-0 w-full p-3 flex justify-between items-center">
                            <Link
                              to={`/models/${model.id}`}
                              className="bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-700 px-3 py-1.5 rounded-md shadow-md font-medium text-sm"
                            >
                              Просмотр
                            </Link>
                            {safeHasPermission('manage_models') && (
                              <button 
                                onClick={() => openDeleteModal(model)}
                                className="p-1.5 bg-white/90 dark:bg-gray-800/90 text-red-500 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-md"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col bg-white dark:bg-gray-800">
                        <h3 className="text-lg font-medium dark:text-white line-clamp-1 mb-1">
                          {model.name}
                        </h3>
                        <div className="mt-1 text-gray-500 dark:text-gray-400 flex items-center text-sm">
                          <ClockIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span>{formatMinutesToHHMM(model.printing_time)}</span>
                        </div>
                        <div className="mt-auto pt-3 flex justify-between items-center">
                          <div className="text-gray-400 dark:text-gray-500 text-xs">
                            ID: {model.id}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {new Date(model.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
    );
  };
              
  // Отображение моделей в виде таблицы
  const renderListView = () => {
    return (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Модель
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Коллекция
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Время печати
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Дата добавления
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredModels.map((model) => (
                        <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                              <div className="h-12 w-12 flex-shrink-0 mr-4 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-sm">
                                {modelFiles[model.id]?.stlFile ? (
                                  <ModelCube
                                    color={getModelColor(model.id)}
                                    stlFile={modelFiles[model.id]?.stlFile}
                                    size="small"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <CubeIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                                  </div>
                                )}
                                </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {model.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  ID: {model.id}
                              </div>
                              </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            {model.collection_name ? (
                              <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center">
                                <FolderIcon className="h-4 w-4 text-blue-500 mr-1.5" />
                                {model.collection_name}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                                Без коллекции
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white flex items-center">
                              <ClockIcon className="h-4 w-4 text-gray-400 mr-1.5" />
                              {formatMinutesToHHMM(model.printing_time)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(model.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              to={`/models/${model.id}`}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4 inline-flex items-center"
                            >
                                <span>Просмотр</span>
                                </Link>
                            {safeHasPermission('manage_models') && (
                              <button
                                  onClick={() => openDeleteModal(model)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center"
                              >
                                <span>Удалить</span>
                              </button>
                          )}
                        </td>
                      </tr>
                      ))}
                  </tbody>
                </table>
            </div>
    );
  };

  // Отрендерить список моделей
  const renderModels = () => {
    if (filteredModels.length === 0) {
      return (
        <div className="text-center py-10 px-4">
          <CubeIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Нет доступных моделей</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Ни одна модель не соответствует вашему запросу.' : 'Начните с добавления вашей первой модели.'}
          </p>
          {safeHasPermission('models:create') && (
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 inline-flex items-center"
            >
              <PlusCircleSolid className="h-5 w-5 mr-2" />
              Добавить модель
            </Button>
          )}
        </div>
      );
    }

    // Отображение в виде сетки или списка
    return viewMode === 'grid' ? renderGridView() : renderListView();
  };

  // Модальное окно для создания модели
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold dark:text-white">
          3D-модели
        </h1>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Поиск */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Поиск"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          {/* Переключатель вида */}
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => changeViewMode('grid')}
              className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                viewMode === 'grid'
                  ? 'bg-blue-50 text-blue-700 border-blue-500 z-10'
                  : 'text-gray-700 hover:bg-gray-50'
              } dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => changeViewMode('list')}
              className={`relative -ml-px inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                viewMode === 'list'
                  ? 'bg-blue-50 text-blue-700 border-blue-500 z-10'
                  : 'text-gray-700 hover:bg-gray-50'
              } dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Кнопка для сайдбара коллекций */}
          <button
            type="button"
            onClick={toggleCollectionSidebar}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${
              showCollectionSidebar
                ? 'bg-blue-50 text-blue-700 border-blue-500'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
            title={showCollectionSidebar ? "Скрыть коллекции" : "Показать коллекции"}
          >
            <FolderIcon className="h-5 w-5" />
          </button>
          
          {/* Кнопка добавления новой коллекции */}
          {safeHasPermission('manage_models') && (
            <Button
              onClick={() => handleAddCollection()}
              className="ml-auto shadow-md"
              variant="secondary"
              size="md"
            >
              <FolderIcon className="h-5 w-5 mr-2" />
              Добавить коллекцию
            </Button>
          )}
          
          {/* Кнопка добавления новой модели */}
          {safeHasPermission('models:create') && (
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="shadow-md"
              variant="primary"
              size="md"
            >
              <PlusCircleSolid className="h-5 w-5 mr-2" />
              Добавить модель
            </Button>
          )}
        </div>
      </div>

      {/* Отображение ошибки при её наличии */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          <ExclamationCircleIcon className="h-5 w-5 inline mr-2" />
          {error}
        </div>
      )}

      {/* Основное содержимое с коллекциями и моделями */}
      <div className="flex">
        {/* Сайдбар с коллекциями */}
        {showCollectionSidebar && (
          <div className="w-72 mr-6 border-r border-gray-200 dark:border-gray-700 pr-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-medium dark:text-gray-200">Коллекции</h2>
              {safeHasPermission('manage_models') && (
                <Button 
                  size="sm"
                  variant="primary"
                  onClick={() => handleAddCollection()}
                  className="py-1 px-2"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Создать
                </Button>
              )}
            </div>
            
            {/* Специальный пункт "Без коллекции" */}
            <div 
              className={`mb-3 p-2 rounded-md flex items-center cursor-pointer ${
                selectedCollection === 'uncategorized' 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              onClick={handleSelectUncategorized}
            >
              <FolderIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
              <span>Модели без коллекции</span>
            </div>
            
            <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-1 pb-4">
              <CollectionTree
                collections={collections}
                onSelectCollection={handleSelectCollection}
                selectedCollectionId={typeof selectedCollection === 'object' ? selectedCollection?.id : null}
                onAddCollection={handleAddCollection}
                onEditCollection={handleEditCollection}
                onDeleteCollection={handleDeleteCollection}
                canEdit={safeHasPermission('manage_models')}
              />
            </div>
          </div>
        )}

        {/* Основное содержимое для списка моделей */}
        <div className="flex-1">
          {/* Заголовок для выбранной коллекции */}
          {selectedCollection && selectedCollection !== 'uncategorized' && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg flex justify-between items-center border border-blue-200 dark:border-blue-800">
              <div>
                <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center">
                  <FolderIcon className="h-5 w-5 mr-2 opacity-70" />
                  {selectedCollection.name}
                </span>
                {selectedCollection.description && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    {selectedCollection.description}
                  </p>
                )}
              </div>
              <button 
                onClick={() => setSelectedCollection(null)}
                className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100 p-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Заголовок для выбора "Без коллекции" */}
          {selectedCollection === 'uncategorized' && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center border border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center">
                  <FolderIcon className="h-5 w-5 mr-2 opacity-70" />
                  {t('models.modelsWithoutCollection')}
                </span>
              </div>
              <button
                onClick={() => setSelectedCollection(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
          
          {/* Содержимое для списка моделей */}
          {loading || isCollectionLoading ? (
            renderLoadingState()
          ) : (
            renderModels()
          )}
        </div>
      </div>

      {/* Обновленное модальное окно для загрузки новой модели */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Добавить новую 3D-модель"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название модели
            </label>
            <input
              type="text"
              name="name"
              value={newModel.name}
              onChange={handleInputChange}
              required
              placeholder="Введите название модели"
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Время печати
            </label>
            <div className="flex items-center">
            <input
              type="text"
              name="printing_time"
              value={newModel.printing_time}
              onChange={handleInputChange}
              placeholder="01:00"
              pattern="^([0-9]+:[0-5][0-9]|[0-9]+)$"
              title="Допустимые форматы: ЧЧ:ММ или минуты"
              required
              className="block w-full border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
              <div className="bg-gray-100 dark:bg-gray-600 py-2.5 px-3 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-600 dark:text-gray-300 text-sm">
                ЧЧ:ММ
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Укажите время печати в формате ЧЧ:ММ (например, 01:30) или в минутах (например, 90)
            </p>
          </div>
          
          {collections.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Добавить в коллекцию (необязательно)
              </label>
              <select
                name="collection_id"
                value={newModel.collection_id || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              >
                <option value="">Не добавлять в коллекцию</option>
                {collections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-5">
            <Button 
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Создание..." : "Создать модель"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Оставшиеся модальные окна */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)}
        title="Удалить модель"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Вы уверены, что хотите удалить модель: <strong>{modelToDelete?.name}</strong>?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Это действие нельзя будет отменить.
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button 
              variant="danger"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Удаление..." : "Удалить модель"}
            </Button>
          </div>
        </div>
      </Modal>
      
      <CollectionModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        onSave={handleSaveCollection}
        collection={editingCollection}
        parentCollection={parentCollection}
        collections={collections}
        isSubmitting={isCollectionSubmitting}
      />
    </div>
  );
};

export default ModelsList; 

