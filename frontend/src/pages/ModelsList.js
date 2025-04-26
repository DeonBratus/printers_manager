import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getModels, getStudios, createModel, deleteModel, getModelFiles, getCollectionTree, getCollectionModels, createCollection, updateCollection, deleteCollection, addModelToCollection, getCollections, getCollection, updateModel, removeModelFromCollection } from '../services/api';
import { useStudio } from '../context/StudioContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import ModelCube from '../components/ModelCube';
import ModelThumbnail from '../components/ModelThumbnail';
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
  FolderIcon,
  PencilIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  EllipsisVerticalIcon
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
  
  // Состояния для модального окна коллекций
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [parentCollection, setParentCollection] = useState(null);
  const [isCollectionSubmitting, setIsCollectionSubmitting] = useState(false);
  const [isDeleteCollectionModalOpen, setIsDeleteCollectionModalOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);
  const [modelToEdit, setModelToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteType, setDeleteType] = useState('complete'); // 'complete' or 'collection'

  // State for context menu
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    model: null
  });
  
  // State for collection context menu
  const [collectionContextMenu, setCollectionContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    collection: null
  });

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
      // Если выбрана коллекция, показываем модели из неё
      if (selectedCollection) {
        return collectionModels;
      } else {
        // В корневой папке показываем только модели верхнего уровня (без коллекции)
        return models.filter(model => !model.collection_ids || model.collection_ids.length === 0);
      }
    }
    
    const query = searchQuery.toLowerCase().trim();
    let modelsToFilter;
    
    if (selectedCollection) {
      modelsToFilter = collectionModels;
    } else {
      // Поиск в корневой папке - только среди моделей верхнего уровня
      modelsToFilter = models.filter(model => !model.collection_ids || model.collection_ids.length === 0);
    }
    
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
      
        // Нормализуем URL файлов перед сохранением в состоянии
        setModelFiles(normalizeModelFileUrls(newModelFiles));
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Ошибка загрузки моделей');
    } finally {
      setLoading(false);
    }
  };

  // Состояние для отслеживания ошибок загрузки моделей
  const [failedModelFiles, setFailedModelFiles] = useState({});

  // Функция для нормализации URL моделей
  const normalizeModelFileUrls = (files) => {
    if (!files) return files;
    
    const normalizedFiles = {...files};
    
    Object.keys(normalizedFiles).forEach(modelId => {
      // Пропускаем модели, которые ранее не удалось загрузить
      if (failedModelFiles[modelId]) {
        console.log(`Skipping previously failed model ${modelId}`);
        return;
      }
    
      if (normalizedFiles[modelId] && normalizedFiles[modelId].stlFile) {
        const stlFile = normalizedFiles[modelId].stlFile;
        
        // Для ID 42, о котором известно, что он вызывает проблемы
        if (stlFile.id === 42 || (stlFile.file_path && stlFile.file_path.includes('/42_'))) {
          console.log(`Marking model ${modelId} with problematic file ID 42 as failed`);
          setFailedModelFiles(prev => ({...prev, [modelId]: true}));
          delete normalizedFiles[modelId].stlFile;
          return;
        }
        
        // Если у нас нет stlFile, но есть массив файлов, пробуем найти STL
        if (!stlFile && normalizedFiles[modelId].files && normalizedFiles[modelId].files.length > 0) {
          const firstStl = normalizedFiles[modelId].files.find(f => 
            f.file_type && f.file_type.toLowerCase() === 'stl'
          );
          
          if (firstStl) {
            normalizedFiles[modelId].stlFile = firstStl;
            return; // Продолжаем со следующей моделью, так как мы только что создали stlFile
          }
        }
        
        // При наличии ID, но отсутствии URL, формируем API URL
        if (stlFile.id && (!stlFile.file_path && !stlFile.url)) {
          console.log(`Setting direct API URL for model ${modelId} file ${stlFile.id}`);
          // Этот URL будет использоваться для прямого API вызова
          // Не устанавливаем полный URL, так как downloadModelFile требует только ID
        }
        
        // Если есть путь файла, но нет базового URL
        if (stlFile.file_path && !stlFile.file_path.startsWith('http') && !stlFile.file_path.startsWith('/')) {
          // Формируем полный URL с учетом базового пути API
          const baseUrl = process.env.REACT_APP_API_URL || '';
          stlFile.file_path = `${baseUrl}/${stlFile.file_path}`;
          console.log(`Normalized file_path for model ${modelId}:`, stlFile.file_path);
        }
        
        // Если нет пути файла, но есть URL
        if (!stlFile.file_path && stlFile.url && !stlFile.url.startsWith('http') && !stlFile.url.startsWith('/')) {
          const baseUrl = process.env.REACT_APP_API_URL || '';
          stlFile.url = `${baseUrl}/${stlFile.url}`;
          console.log(`Normalized URL for model ${modelId}:`, stlFile.url);
        }
      }
    });
    
    return normalizedFiles;
  };

  // Обработчик ошибок загрузки файлов моделей
  const handleModelFileLoadError = (modelId) => {
    console.log(`Marking model ${modelId} as failed to load`);
    setFailedModelFiles(prev => ({...prev, [modelId]: true}));
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
      
      // Prepare model data for creation
      const modelData = {
        name: newModel.name,
        printing_time: printingTimeMinutes,
        studio_id: selectedStudio ? selectedStudio.id : null
      };
      
      console.log("Creating model with data:", modelData);
      
      // Create the model
      const response = await createModel(modelData);
      console.log("Create model response:", response);
      
      let createdModel;
      if (response && response.data) {
        createdModel = response.data;
      } else if (response && response.id) {
        createdModel = response;
      } else {
        throw new Error("Invalid response from createModel API");
      }
      
      console.log("Created model:", createdModel);
      
      // Determine which collection to use
      const collectionId = newModel.collection_id || 
        (selectedCollection && typeof selectedCollection === 'object' ? selectedCollection.id : null);
      
      // If a collection is selected, add the model to it
      if (collectionId && createdModel && createdModel.id) {
        try {
          console.log(`Adding model ${createdModel.id} to collection ${collectionId}`);
          
          // Call API to add model to collection
          const addResult = await addModelToCollection(createdModel.id, collectionId);
          console.log("Add to collection result:", addResult);
          
          // Refresh collection models if we're currently viewing this collection
          if (selectedCollection && selectedCollection.id === collectionId) {
            await fetchCollectionModels(collectionId);
          }
        } catch (collectionError) {
          console.error('Error adding model to collection:', collectionError);
        }
      }
      
      // Reset form and close modal
      setNewModel({ name: '', printing_time: '01:00', collection_id: '' });
      setIsAddModalOpen(false);
      
      // Refresh models list
      await safeFetchModels();
      
      // Show success message
      alert(t('Model created successfully!'));
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
    console.log("Adding collection with parent:", parentColl);
  };
  
  const handleEditCollection = (collection) => {
    if (!collection) return;
    setEditingCollection(collection);
    setParentCollection(null);
    setIsCollectionModalOpen(true);
  };
  
  const handleDeleteCollection = (collection) => {
    if (!collection || !collection.id) return;
    setCollectionToDelete(collection);
    setIsDeleteCollectionModalOpen(true);
  };
  
  const confirmDeleteCollection = async () => {
    if (!collectionToDelete || !collectionToDelete.id) {
      setIsDeleteCollectionModalOpen(false);
      return;
    }
    
    try {
      setIsCollectionSubmitting(true);
      await deleteCollectionFromDb(collectionToDelete.id);
      setIsDeleteCollectionModalOpen(false);
    } catch (error) {
      console.error('Error confirming collection deletion:', error);
      alert('Error deleting collection');
    } finally {
      setIsCollectionSubmitting(false);
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
      
      // Добавляем parent_id из parentCollection если он задан
      if (parentCollection && parentCollection.id && !collectionData.parent_id) {
        collectionData.parent_id = parentCollection.id;
      }
      
      console.log("Saving collection with data:", collectionData);
      
      if (editingCollection && editingCollection.id) {
        // Обновление существующей коллекции
        await updateCollection(editingCollection.id, collectionData);
      } else {
        // Создание новой коллекции
        await createCollection(collectionData);
      }
      
      // Закрываем модальное окно и обновляем список коллекций
      setIsCollectionModalOpen(false);
      
      // Полностью обновляем дерево коллекций после изменений
      await safeFetchCollections();
      
      // Если редактировали текущую коллекцию, обновляем её данные
      if (selectedCollection && editingCollection && 
          selectedCollection.id && editingCollection.id && 
          selectedCollection.id === editingCollection.id) {
        setSelectedCollection(prev => ({ ...prev, ...collectionData }));
      }
      
      // Если мы добавляли подколлекцию к текущей коллекции,
      // обновляем выбранную коллекцию, чтобы показать новую подколлекцию
      if (parentCollection && selectedCollection && 
          parentCollection.id === selectedCollection.id) {
        // Обновляем текущую выбранную коллекцию
        const updatedCollection = await getCollection(selectedCollection.id);
        if (updatedCollection && updatedCollection.data) {
          setSelectedCollection(updatedCollection.data);
        }
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
      throw error; // Re-throw to handle in the calling function
    }
  };

  const openDeleteModal = (model) => {
    if (!model) return;
    setModelToDelete(model);
    // Всегда устанавливаем полное удаление при вызове из UI
    setDeleteType('complete');
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
      
      // Delete model completely
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
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="text-center">
        <ArrowPathIcon className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400">{t('Loading models...')}</p>
      </div>
    </div>
  );

  // Отображение карточек моделей в сетке
  const renderGridView = () => {
    // For root folder (when no collection is selected), show top-level collections
    // For a specific collection, show its subcollections
    const collectionsToShow = selectedCollection 
      ? (selectedCollection.children || [])
      : collections;
    
  return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Отображение коллекций */}
                  {collectionsToShow.map((collection) => (
                    <Card 
                      key={`collection-${collection.id}`} 
                      className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300 border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
                      onContextMenu={(e) => handleCollectionContextMenu(e, collection)}
                    >
                      <div 
                        className="h-52 cursor-pointer"
                        onClick={() => handleSelectCollection(collection)}
                      >
                        <div className="h-full w-full flex flex-col items-center justify-center">
                          <FolderIcon className="h-24 w-24 text-blue-400 dark:text-blue-600" />
                          <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300 text-center mt-3 px-4">
                            {collection.name}
                          </h3>
                          <div className="text-sm text-blue-500 dark:text-blue-400 mt-1">
                            {collection.children && collection.children.length > 0 ? (
                              <span>{collection.children.length} подколлекций</span>
                            ) : (
                              <span className="italic opacity-75">Можно добавлять подколлекции</span>
                            )}
                          </div>
                        </div>
                        {safeHasPermission('manage_models') && (
                          <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="p-1.5 rounded-md bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCollectionContextMenu(e, collection);
                              }}
                              title={t('More options')}
                            >
                              <EllipsisVerticalIcon className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col bg-white dark:bg-gray-800 border-t border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between">
                          <button
                            onClick={() => handleSelectCollection(collection)}
                            className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-md text-sm font-medium"
                          >
                            {t('common.open')}
                          </button>
                          {safeHasPermission('manage_models') && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleAddCollection(collection)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-green-600 dark:text-green-400 rounded-md"
                                title={t('Add Subcollection')}
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEditCollection(collection)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-md"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCollection(collection)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-red-500 dark:text-red-400 rounded-md"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                
                  {/* Отображение моделей */}
                  {filteredModels.map((model) => (
                    <Card 
                      key={model.id} 
                      className={`flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300 border ${
                        // Если мы в корневой папке и у модели нет коллекции, добавляем индикатор
                        !selectedCollection && (!model.collection_ids || model.collection_ids.length === 0) 
                          ? 'border-dashed border-gray-300 dark:border-gray-600' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onContextMenu={(e) => handleModelContextMenu(e, model)}
                    >
            {/* Отображение коллекции модели */}
                      {model.collection_name && (
                        <div className="absolute top-0 left-0 z-10 m-2 px-2 py-1 bg-blue-500/80 text-white text-xs rounded">
                          <div className="flex items-center">
                            <FolderIcon className="h-3 w-3 mr-1" />
                            <span>{model.collection_name}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Индикатор для моделей без коллекции в корневой папке */}
                      {!selectedCollection && (!model.collection_ids || model.collection_ids.length === 0) && (
                        <div className="absolute top-0 right-0 z-10 m-2 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                          <span>Без категории</span>
                        </div>
                      )}
                      
                      <div className="relative group h-52">
                        <div 
                          className="absolute inset-0 overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer"
                          onClick={() => {
                            showModelPreview(model);
                          }}
                        >
                          {/* Заменяем 3D-модель на 2D-превью для оптимизации */}
                          <ModelThumbnail 
                              stlFile={modelFiles[model.id]?.stlFile}
                            color={getModelColor(model.id)}
                            width="100%"
                            height="100%"
                            className="w-full h-full"
                            quality="medium"
                            onError={() => handleModelFileLoadError(model.id)}
                          />
            </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="absolute bottom-0 w-full p-3 flex justify-between items-center">
                            <Link
                              to={`/models/${model.id}`}
                              className="bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-700 px-3 py-1.5 rounded-md shadow-md font-medium text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Просмотр
                            </Link>
                            {safeHasPermission('manage_models') && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteModal(model);
                                }}
                                className="p-1.5 bg-white/90 dark:bg-gray-800/90 text-red-500 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-md"
                                title={selectedCollection && selectedCollection.id ? t('Remove from collection / Delete') : t('Delete model')}
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div 
                        className="p-4 flex-1 flex flex-col bg-white dark:bg-gray-800 cursor-pointer"
                        onClick={() => {
                          window.location.href = `/models/${model.id}`;
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-medium dark:text-white line-clamp-1 mb-1 flex-1">
                          {model.name}
                        </h3>
                          {safeHasPermission('manage_models') && (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 -mt-1 -mr-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleModelContextMenu(e, model);
                                }}
                                title={t('More options')}
                              >
                                <EllipsisVerticalIcon className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </div>
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
    // For root folder (when no collection is selected), show top-level collections
    // For a specific collection, show its subcollections
    const collectionsToShow = selectedCollection 
      ? (selectedCollection.children || [])
      : collections;
    
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
                      {/* Collections */}
                      {collectionsToShow.map((collection) => (
                        <tr 
                          key={`collection-${collection.id}`} 
                          className="hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          onContextMenu={(e) => handleCollectionContextMenu(e, collection)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-12 w-12 flex-shrink-0 mr-4 rounded-md overflow-hidden bg-blue-100 dark:bg-blue-900 shadow-sm">
                                <div className="h-full w-full flex items-center justify-center">
                                  <FolderIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                  {collection.name} <span className="text-blue-500 dark:text-blue-400">(Коллекция)</span>
                                </div>
                                {collection.children && collection.children.length > 0 && (
                                  <div className="text-xs text-blue-500 dark:text-blue-400">
                                    {collection.children.length} {t('subcollections')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {selectedCollection ? (
                              <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center">
                                <FolderIcon className="h-4 w-4 text-blue-500 mr-1.5" />
                                {selectedCollection.name}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                                {t('models.topLevel')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              —
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {collection.created_at ? new Date(collection.created_at).toLocaleDateString() : "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleSelectCollection(collection)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4 inline-flex items-center"
                            >
                              <span>Открыть</span>
                            </button>
                            {safeHasPermission('manage_models') && (
                              <>
                                <button
                                  onClick={() => handleAddCollection(collection)}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-4 inline-flex items-center"
                                >
                                  <span>Добавить подколлекцию</span>
                                </button>
                                <button
                                  onClick={() => handleEditCollection(collection)}
                                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 mr-4 inline-flex items-center"
                                >
                                  <span>Изменить</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteCollection(collection)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center mr-4"
                                >
                                  <span>{t('common.delete')}</span>
                                </button>
                                <button
                                  onClick={(e) => handleCollectionContextMenu(e, collection)}
                                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 inline-flex items-center bg-gray-100 dark:bg-gray-700 p-1.5 rounded-md"
                                  title={t('More options')}
                                >
                                  <EllipsisVerticalIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      
                      {/* Models */}
                      {filteredModels.map((model) => (
                        <tr 
                          key={model.id} 
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            !selectedCollection && (!model.collection_ids || model.collection_ids.length === 0)
                              ? 'bg-gray-50/50 dark:bg-gray-800/50' // Легкий фон для моделей без коллекции
                              : ''
                          } cursor-pointer`}
                          onClick={() => {
                            window.location.href = `/models/${model.id}`;
                          }}
                          onContextMenu={(e) => handleModelContextMenu(e, model)}
                        >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                              <div className="h-12 w-12 flex-shrink-0 mr-4 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-sm">
                                <ModelThumbnail
                                    stlFile={modelFiles[model.id]?.stlFile}
                                  color={getModelColor(model.id)}
                                  width={48}
                                  height={48}
                                  className="w-full h-full"
                                  quality="low"
                                  onError={() => handleModelFileLoadError(model.id)}
                                />
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
                              <div className="text-sm text-gray-500 dark:text-gray-400 italic flex items-center">
                                <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-md text-xs">{t('models.notCategorized')}</span>
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
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>Просмотр</span>
                                </Link>
                            {safeHasPermission('manage_models') && (
                              <>
                              <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(model);
                                  }}
                                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 mr-4 inline-flex items-center"
                                >
                                  <span>Изменить</span>
                              </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteModal(model);
                                  }}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center mr-4"
                                >
                                  <span>
                                    {selectedCollection && selectedCollection.id 
                                      ? t('Remove / Delete')
                                      : t('Delete')}
                                  </span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModelContextMenu(e, model);
                                  }}
                                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 inline-flex items-center bg-gray-100 dark:bg-gray-700 p-1.5 rounded-md"
                                  title="Больше опций"
                                >
                                  <EllipsisVerticalIcon className="h-5 w-5" />
                                </button>
                              </>
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
    // If we're viewing a collection, get its subcollections
    const hasSubcollections = selectedCollection && 
      typeof selectedCollection === 'object' && 
      selectedCollection.children && 
      selectedCollection.children.length > 0;
      
    // Если есть подколлекции, всегда их показываем
    if (hasSubcollections) {
      return viewMode === 'grid' ? renderGridView() : renderListView();
    }
    
    // Если нет ни моделей, ни подколлекций
    if (filteredModels.length === 0) {
      return (
        <div className="text-center py-10 px-4">
          <CubeIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Нет доступных моделей</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Ни одна модель не соответствует вашему запросу.' : 'Начните с добавления вашей первой модели.'}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              onClick={() => handleAddCollection()}
              className="inline-flex items-center"
              variant="secondary"
            >
              <FolderIcon className="h-5 w-5 mr-2" />
              Добавить коллекцию
            </Button>
            <Button
              onClick={() => {
                // Pre-select current collection if inside one
                if (selectedCollection && typeof selectedCollection === 'object' && selectedCollection.id) {
                  setNewModel(prev => ({ ...prev, collection_id: selectedCollection.id }));
                }
                setIsAddModalOpen(true);
              }}
              className="shadow-md"
              variant="primary"
              size="md"
            >
              <PlusCircleSolid className="h-5 w-5 mr-2" />
              Добавить 3D модель
            </Button>
          </div>
        </div>
      );
    }

    // Отображение в виде сетки или списка
    return viewMode === 'grid' ? renderGridView() : renderListView();
  };

  // Функция для поиска пути до коллекции в дереве коллекций
  const findCollectionPath = (collectionId, collectionsList = collections, path = []) => {
    for (const collection of collectionsList) {
      if (collection.id === collectionId) {
        return [...path, collection];
      }
      
      if (collection.children && collection.children.length > 0) {
        const foundPath = findCollectionPath(collectionId, collection.children, [...path, collection]);
        if (foundPath.length > 0) {
          return foundPath;
        }
      }
    }
    
    return [];
  };
  
  // Рендерит хлебные крошки для навигации
  const renderBreadcrumbs = () => {
    if (!selectedCollection || typeof selectedCollection !== 'object' || !selectedCollection.id) {
      return null;
    }
    
    const path = findCollectionPath(selectedCollection.id);
    
    return (
      <div className="mb-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
        <button 
          onClick={() => setSelectedCollection(null)}
          className="hover:text-blue-600 dark:hover:text-blue-400"
        >
          {t('models.rootFolder')}
        </button>
        
        {path.map((coll, index) => (
          <React.Fragment key={coll.id}>
            <span className="mx-1">/</span>
            {index === path.length - 1 ? (
              <span className="font-medium text-blue-600 dark:text-blue-400">{coll.name}</span>
            ) : (
              <button 
                onClick={() => handleSelectCollection(coll)}
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                {coll.name}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Handle right click on model card
  const handleModelContextMenu = (e, model) => {
    e.preventDefault(); // Prevent default browser context menu
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      model: model
    });
  };

  // Handle context menu actions
  const handleContextMenuAction = (action) => {
    const model = contextMenu.model;
    closeContextMenu();
    
    if (!model) return;
    
    switch (action) {
      case 'view':
        window.location.href = `/models/${model.id}`;
        break;
      case 'delete':
        // Вызываем удаление полностью без выбора типа
        setModelToDelete(model);
        setDeleteType('complete');
        setIsDeleteModalOpen(true);
        break;
      case 'edit':
        openEditModal(model);
        break;
      case 'download':
        // Download model or show download options
        if (modelFiles[model.id]?.stlFile) {
          window.open(modelFiles[model.id].stlFile.url, '_blank');
        } else {
          alert(t('No files available for download'));
        }
        break;
      case 'duplicate':
        // Duplicate model logic here
        alert(t('Duplicate feature will be available soon'));
        break;
      case 'remove-from-collection':
        // Показать подтверждение удаления из коллекции
        if (selectedCollection && selectedCollection.id && model.id) {
          if (window.confirm(t('Are you sure you want to remove this model from the current collection?'))) {
            removeModelFromCurrentCollection(model);
          }
        } else {
          alert(t('Model is not in any collection'));
        }
        break;
      default:
        break;
    }
  };

  // Remove model from current collection without deleting it
  const removeModelFromCurrentCollection = async (model) => {
    if (!model || !model.id || !selectedCollection || !selectedCollection.id) return;
    
    try {
      await removeModelFromCollection(model.id, selectedCollection.id);
      
      // Refresh models in current collection
      await fetchCollectionModels(selectedCollection.id);
      
      // Also refresh all models to keep state in sync
      await safeFetchModels();
      
      // Show success message
      alert(t('Model successfully removed from collection. The model still exists in the system and can be found in the root folder.'));
    } catch (error) {
      console.error('Error removing model from collection:', error);
      alert(t('Error removing model from collection'));
    }
  };

  // Listen for clicks outside the context menu to close it
  useEffect(() => {
    const handleClickOutside = () => {
      closeContextMenu();
    };
    
    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible]);

  const openEditModal = (model) => {
    if (!model) return;
    
    // Convert printing time from minutes to HH:MM format
    const formattedTime = formatMinutesToHHMM(model.printing_time || 0);
    
    // Set up model for editing
    setModelToEdit({
      ...model,
      printing_time: formattedTime,
      // Keep collection_id as is if model is already in a collection
      collection_id: model.collection_ids && model.collection_ids.length > 0 
        ? model.collection_ids[0] 
        : ''
    });
    
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    if (!modelToEdit || !modelToEdit.id) {
      setIsEditModalOpen(false);
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Convert HH:MM to minutes
      const printingTimeMinutes = parseHHMMToMinutes(modelToEdit.printing_time || '01:00');
      
      // Prepare model data for update
      const modelData = {
        name: modelToEdit.name,
        printing_time: printingTimeMinutes
      };
      
      console.log("Updating model with data:", modelData);
      
      // Update the model via API
      await updateModel(modelToEdit.id, modelData);
      
      // Handle collection change if needed
      if (modelToEdit.collection_id !== undefined) {
        const originalCollectionIds = modelToEdit.collection_ids || [];
        const newCollectionId = modelToEdit.collection_id || null;
        
        // If collection changed
        if ((originalCollectionIds[0] || null) !== newCollectionId) {
          // If model was in a collection but now isn't, remove it
          if (originalCollectionIds.length > 0 && !newCollectionId) {
            try {
              await removeModelFromCollection(modelToEdit.id, originalCollectionIds[0]);
            } catch (error) {
              console.error('Error removing model from collection:', error);
            }
          }
          
          // If model wasn't in a collection but now is, or if collection changed
          if (newCollectionId) {
            // First remove from old collection if needed
            if (originalCollectionIds.length > 0) {
              try {
                await removeModelFromCollection(modelToEdit.id, originalCollectionIds[0]);
              } catch (error) {
                console.error('Error removing model from previous collection:', error);
              }
            }
            
            // Then add to new collection
            try {
              await addModelToCollection(modelToEdit.id, newCollectionId);
            } catch (error) {
              console.error('Error adding model to new collection:', error);
            }
          }
        }
      }
      
      // Close modal
      setIsEditModalOpen(false);
      
      // Refresh data
      await safeFetchModels();
      
      // If viewing a collection, refresh its models
      if (selectedCollection && selectedCollection.id) {
        await fetchCollectionModels(selectedCollection.id);
      }
      
      // Success message
      alert(t('Model updated successfully!'));
    } catch (error) {
      console.error('Error updating model:', error);
      setError('Error updating model');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close collection context menu
  const closeCollectionContextMenu = () => {
    setCollectionContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Handle right click on collection card
  const handleCollectionContextMenu = (e, collection) => {
    e.preventDefault(); // Prevent default browser context menu
    setCollectionContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      collection: collection
    });
  };

  // Handle collection context menu actions
  const handleCollectionContextMenuAction = (action) => {
    const collection = collectionContextMenu.collection;
    closeCollectionContextMenu();
    
    if (!collection) return;
    
    switch (action) {
      case 'open':
        handleSelectCollection(collection);
        break;
      case 'edit':
        handleEditCollection(collection);
        break;
      case 'add-subcollection':
        handleAddCollection(collection);
        break;
      case 'delete':
        handleDeleteCollection(collection);
        break;
      default:
        break;
    }
  };

  // Listen for clicks outside the collection context menu to close it
  useEffect(() => {
    const handleClickOutside = () => {
      closeCollectionContextMenu();
    };
    
    if (collectionContextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [collectionContextMenu.visible]);

  // Добавить новое состояние в компонент ModelsList
  const [previewModel, setPreviewModel] = useState(null);

  // Добавить обработчик для показа предпросмотра 3D-модели
  const showModelPreview = (model) => {
    if (!model) return;
    setPreviewModel(model);
  };

  // Модальное окно для создания модели
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold dark:text-white">
          Модели 3D печати
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
          
          {/* Кнопки для добавления новой модели и коллекции */}
          <div className="ml-auto flex gap-3">
            {/* Кнопка добавления новой коллекции */}
            <Button
              onClick={() => handleAddCollection()}
              className="shadow-md"
              variant="secondary"
              size="md"
            >
              <FolderIcon className="h-5 w-5 mr-2" />
              Добавить коллекцию
            </Button>
          
          {/* Кнопка добавления новой модели */}
            <Button
              onClick={() => {
                // Pre-select current collection if inside one
                if (selectedCollection && typeof selectedCollection === 'object' && selectedCollection.id) {
                  setNewModel(prev => ({ ...prev, collection_id: selectedCollection.id }));
                }
                setIsAddModalOpen(true);
              }}
              className="shadow-md"
              variant="primary"
              size="md"
            >
              <PlusCircleSolid className="h-5 w-5 mr-2" />
              Добавить 3D модель
            </Button>
          </div>
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
                Новая
                </Button>
              )}
            </div>
            
          {/* Root folder item */}
            <div 
              className={`mb-3 p-2 rounded-md flex items-center cursor-pointer ${
              selectedCollection === null 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            onClick={() => setSelectedCollection(null)}
            >
            <FolderIcon className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
            <span>Корневая папка</span>
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

        {/* Основное содержимое для списка моделей */}
        <div className="flex-1">
          {/* Хлебные крошки для навигации по коллекциям */}
          {renderBreadcrumbs()}
          
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
              <div className="flex items-center gap-2">
                {/* Кнопка добавления 3D модели */}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setNewModel(prev => ({ ...prev, collection_id: selectedCollection.id }));
                    setIsAddModalOpen(true);
                  }}
                  className="py-1 px-2"
                >
                  <PlusCircleSolid className="h-4 w-4 mr-1" />
                  Добавить 3D модель
                </Button>
                
                {/* Кнопка добавления подколлекции */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddCollection(selectedCollection)}
                  className="py-1 px-2"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Добавить подколлекцию
                </Button>
              <button 
                onClick={() => setSelectedCollection(null)}
                className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100 p-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              </div>
            </div>
          )}

          {/* Заголовок для корневой папки */}
          {selectedCollection === null && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg flex justify-between items-center border border-blue-200 dark:border-blue-800">
              <div>
                <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center">
                  <FolderIcon className="h-5 w-5 mr-2 opacity-70" />
                  Корневая папка
                </span>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Здесь хранятся все коллекции и модели верхнего уровня
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Кнопка добавления 3D модели */}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsAddModalOpen(true)}
                  className="py-1 px-2"
                >
                  <PlusCircleSolid className="h-4 w-4 mr-1" />
                  Добавить 3D модель
                </Button>
                
                {/* Кнопка добавления коллекции */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddCollection()}
                  className="py-1 px-2"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Добавить коллекцию
                </Button>
              </div>
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
        title={t('Add New 3D Model')}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('Model Name')}
            </label>
            <input
              type="text"
              name="name"
              value={newModel.name}
              onChange={handleInputChange}
              required
              placeholder={t('Enter model name')}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('Print Time')}
            </label>
            <div className="flex items-center">
            <input
              type="text"
              name="printing_time"
                value={newModel.printing_time}
              onChange={handleInputChange}
              placeholder="01:00"
                pattern="^([0-9]+:[0-5][0-9]|[0-9]+)$"
                title={t('Accepted formats: HH:MM or minutes')}
                required
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
              <div className="bg-gray-100 dark:bg-gray-600 py-2.5 px-3 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-600 dark:text-gray-300 text-sm">
                {t('HH:MM')}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {t('Specify print time in HH:MM format (e.g., 01:30) or in minutes (e.g., 90)')}
            </p>
          </div>
          
          {collections.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('Add to Collection (optional)')}
              </label>
              <select
                name="collection_id"
                value={newModel.collection_id || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              >
                <option value="">{t('Do not add to any collection')}</option>
                {/* If we're inside a collection, add it as first option */}
                {selectedCollection && typeof selectedCollection === 'object' && selectedCollection.id && (
                  <option value={selectedCollection.id} className="font-medium">
                    {selectedCollection.name} (Current collection)
                  </option>
                )}
                {collections.map(collection => {
                  // Render collection and its subcollections recursively
                  const renderCollectionOptions = (coll, depth = 0) => {
                    const indent = "—".repeat(depth);
                    const result = [
                      <option key={coll.id} value={coll.id}>
                        {indent && `${indent} `}{coll.name}
                      </option>
                    ];
                    
                    // Recursively add subcollections if they exist
                    if (coll.children && coll.children.length > 0) {
                      coll.children.forEach(child => {
                        result.push(...renderCollectionOptions(child, depth + 1));
                      });
                    }
                    
                    return result;
                  };
                  
                  return renderCollectionOptions(collection);
                })}
              </select>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-5">
            <Button 
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              {t('Cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('Creating...') : t('Create Model')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Оставшиеся модальные окна */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('Delete Model')}
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            {t('Are you sure you want to completely delete this model')}: 
            <strong>{modelToDelete?.name}</strong>?
          </p>
          
          <p className="text-sm text-red-600 dark:text-red-400">
            {t('This action cannot be undone. The model will be removed from all collections.')}
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSubmitting}
            >
              {t('Cancel')}
            </Button>
            <Button 
              variant="danger"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('Processing...') : t('Delete Model')}
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

      {/* Modal для редактирования модели */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t('Edit 3D Model')}
      >
        {modelToEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('Model Name')}
              </label>
              <input
                type="text"
                name="name"
                value={modelToEdit.name || ''}
                onChange={(e) => setModelToEdit({...modelToEdit, name: e.target.value})}
                required
                placeholder={t('Enter model name')}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('Print Time')}
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  name="printing_time"
                  value={modelToEdit.printing_time || ''}
                  onChange={(e) => setModelToEdit({...modelToEdit, printing_time: e.target.value})}
                  placeholder="01:00"
                  pattern="^([0-9]+:[0-5][0-9]|[0-9]+)$"
                  title={t('Accepted formats: HH:MM or minutes')}
                  required
                  className="block w-full border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
                <div className="bg-gray-100 dark:bg-gray-600 py-2.5 px-3 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-600 dark:text-gray-300 text-sm">
                  {t('HH:MM')}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {t('Specify print time in HH:MM format (e.g., 01:30) or in minutes (e.g., 90)')}
              </p>
            </div>
            
            {collections.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('Collection')}
                </label>
                <select
                  name="collection_id"
                  value={modelToEdit.collection_id || ''}
                  onChange={(e) => setModelToEdit({...modelToEdit, collection_id: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                >
                  <option value="">{t('Do not add to any collection')}</option>
                  {collections.map(collection => {
                    // Render collection and its subcollections recursively
                    const renderCollectionOptions = (coll, depth = 0) => {
                      const indent = "—".repeat(depth);
                      const result = [
                        <option key={coll.id} value={coll.id}>
                          {indent && `${indent} `}{coll.name}
                        </option>
                      ];
                      
                      // Recursively add subcollections if they exist
                      if (coll.children && coll.children.length > 0) {
                        coll.children.forEach(child => {
                          result.push(...renderCollectionOptions(child, depth + 1));
                        });
                      }
                      
                      return result;
                    };
                    
                    return renderCollectionOptions(collection);
                  })}
                </select>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-5">
              <Button 
                variant="secondary"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
              >
                {t('Cancel')}
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('Saving...') : t('Save Changes')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="fixed z-50 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 py-1 w-48"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={() => handleContextMenuAction('view')}
          >
            <EyeIcon className="h-4 w-4 mr-2 text-blue-500" />
            Просмотр
          </button>

          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={() => handleContextMenuAction('edit')}
          >
            <PencilIcon className="h-4 w-4 mr-2 text-gray-500" />
            Изменить
          </button>

          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={() => handleContextMenuAction('download')}
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2 text-green-500" />
            Скачать
          </button>

          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={() => handleContextMenuAction('duplicate')}
          >
            <DocumentDuplicateIcon className="h-4 w-4 mr-2 text-amber-500" />
            Дублировать
          </button>

          {/* Add the remove from collection option when inside a collection */}
          {selectedCollection && selectedCollection.id && (
            <button 
              className="w-full text-left px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              onClick={() => handleContextMenuAction('remove-from-collection')}
            >
              <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
              Убрать только из коллекции
            </button>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

          <button 
            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={() => handleContextMenuAction('delete')}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Удалить полностью из системы
          </button>
        </div>
      )}

      {/* Collection Context Menu */}
      {collectionContextMenu.visible && (
        <div 
          className="fixed z-50 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 py-1 w-48"
          style={{ left: `${collectionContextMenu.x}px`, top: `${collectionContextMenu.y}px` }}
        >
          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={() => handleCollectionContextMenuAction('open')}
          >
            <EyeIcon className="h-4 w-4 mr-2 text-blue-500" />
            {t('View')}
          </button>

          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={() => handleCollectionContextMenuAction('edit')}
          >
            <PencilIcon className="h-4 w-4 mr-2 text-gray-500" />
            {t('Edit')}
          </button>

          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={() => handleCollectionContextMenuAction('add-subcollection')}
          >
            <PlusCircleIcon className="h-4 w-4 mr-2 text-green-500" />
            {t('Add Subcollection')}
          </button>

          <button 
            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={() => handleCollectionContextMenuAction('delete')}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            {t('Delete')}
          </button>
        </div>
      )}

      {/* Modal for collection deletion confirmation */}
      <Modal
        isOpen={isDeleteCollectionModalOpen}
        onClose={() => setIsDeleteCollectionModalOpen(false)}
        title={t('Delete Collection')}
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            {t('Are you sure you want to delete this collection')}: <strong>{collectionToDelete?.name}</strong>?
          </p>
          {collectionToDelete?.children && collectionToDelete.children.length > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-md text-sm">
              <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />
              {t('This collection contains')} <strong>{collectionToDelete.children.length}</strong> {t('subcollections')}. 
              {t('Deleting this collection will also delete all subcollections and remove models from these collections.')}
            </div>
          )}
          <p className="text-sm text-red-600 dark:text-red-400">
            {t('This action cannot be undone.')}
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="secondary"
              onClick={() => setIsDeleteCollectionModalOpen(false)}
              disabled={isCollectionSubmitting}
            >
              {t('Cancel')}
            </Button>
            <Button 
              variant="danger"
              onClick={confirmDeleteCollection}
              disabled={isCollectionSubmitting}
            >
              {isCollectionSubmitting ? t('Deleting...') : t('Delete Collection')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal for 3D model preview */}
      <Modal
        isOpen={!!previewModel}
        onClose={() => setPreviewModel(null)}
        title={previewModel?.name || "Предпросмотр 3D модели"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="h-96 w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-center items-center">
            {previewModel && modelFiles[previewModel.id]?.stlFile ? (
              <ModelCube
                stlFile={modelFiles[previewModel.id]?.stlFile}
                color={getModelColor(previewModel.id)}
                interactive={true}
                size="xl"
                className="w-full h-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <CubeIcon className="h-24 w-24 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Невозможно загрузить 3D-модель</p>
              </div>
            )}
          </div>
          
          {previewModel && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название модели</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{previewModel.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Время печати</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-gray-500" />
                  {formatMinutesToHHMM(previewModel.printing_time)}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="secondary"
              onClick={() => setPreviewModel(null)}
            >
              Закрыть
            </Button>
            {previewModel && (
              <Link
                to={`/models/${previewModel.id}`}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Подробнее
              </Link>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModelsList; 

