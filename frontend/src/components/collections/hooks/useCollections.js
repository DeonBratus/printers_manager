import { useState, useEffect, useCallback } from 'react';
import { 
  getCollections, 
  getCollectionTree, 
  createCollection, 
  updateCollection, 
  deleteCollection,
  addModelToCollection,
  removeModelFromCollection 
} from '../../../services/api';
import { useStudio } from '../../../context/StudioContext';

/**
 * Хук для работы с коллекциями моделей
 * @param {Object} options - Опции для инициализации хука
 * @param {boolean} options.autoLoad - Автоматически загружать коллекции при монтировании
 * @param {boolean} options.treeStructure - Загружать коллекции в древовидной структуре
 * @returns {Object} Объект с методами и состоянием для работы с коллекциями
 */
const useCollections = ({ 
  autoLoad = true,
  treeStructure = false 
} = {}) => {
  const { selectedStudio } = useStudio();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Загрузка списка коллекций
   * @param {Object} params - Параметры запроса
   * @param {string} params.studio_id - ID студии
   * @param {string} params.parent_id - ID родительской коллекции
   * @returns {Promise<Array>} Загруженные коллекции
   */
  const loadCollections = useCallback(async ({ 
    studio_id = selectedStudio?.id,
    parent_id = null 
  } = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!studio_id) {
        setCollections([]);
        return [];
      }
      
      const response = treeStructure 
        ? await getCollectionTree(studio_id)
        : await getCollections(studio_id, parent_id);
      
      const collectionsList = response.data || [];
      setCollections(collectionsList);
      return collectionsList;
    } catch (err) {
      console.error('Error loading collections:', err);
      setError(err.message || 'Failed to load collections');
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedStudio?.id, treeStructure]);

  /**
   * Создание новой коллекции
   * @param {Object} collectionData - Данные коллекции
   * @returns {Promise<Object>} Созданная коллекция
   */
  const createNewCollection = useCallback(async (collectionData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Добавляем студию, если не указана
      const dataToSubmit = {
        ...collectionData,
        studio_id: collectionData.studio_id || selectedStudio?.id
      };
      
      const response = await createCollection(dataToSubmit);
      
      // Перезагружаем коллекции
      await loadCollections();
      
      return response.data;
    } catch (err) {
      console.error('Error creating collection:', err);
      setError(err.message || 'Failed to create collection');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedStudio?.id, loadCollections]);

  /**
   * Обновление коллекции
   * @param {string} collectionId - ID коллекции
   * @param {Object} collectionData - Обновляемые данные
   * @returns {Promise<Object>} Обновленная коллекция
   */
  const updateExistingCollection = useCallback(async (collectionId, collectionData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await updateCollection(collectionId, collectionData);
      
      // Перезагружаем коллекции
      await loadCollections();
      
      return response.data;
    } catch (err) {
      console.error('Error updating collection:', err);
      setError(err.message || 'Failed to update collection');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [loadCollections]);

  /**
   * Удаление коллекции
   * @param {string} collectionId - ID коллекции
   * @returns {Promise<boolean>} Результат удаления
   */
  const removeCollection = useCallback(async (collectionId) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await deleteCollection(collectionId);
      
      // Перезагружаем коллекции
      await loadCollections();
      
      return true;
    } catch (err) {
      console.error('Error deleting collection:', err);
      setError(err.message || 'Failed to delete collection');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [loadCollections]);

  /**
   * Добавление модели в коллекцию
   * @param {string} modelId - ID модели
   * @param {string} collectionId - ID коллекции
   * @returns {Promise<boolean>} Результат добавления
   */
  const addModelToCollectionHandler = useCallback(async (modelId, collectionId) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await addModelToCollection(modelId, collectionId);
      
      // Перезагружаем коллекции
      await loadCollections();
      
      return true;
    } catch (err) {
      console.error('Error adding model to collection:', err);
      setError(err.message || 'Failed to add model to collection');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [loadCollections]);

  /**
   * Удаление модели из коллекции
   * @param {string} collectionId - ID коллекции
   * @param {string} modelId - ID модели
   * @returns {Promise<boolean>} Результат удаления
   */
  const removeModelFromCollectionHandler = useCallback(async (collectionId, modelId) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await removeModelFromCollection(collectionId, modelId);
      
      // Перезагружаем коллекции
      await loadCollections();
      
      return true;
    } catch (err) {
      console.error('Error removing model from collection:', err);
      setError(err.message || 'Failed to remove model from collection');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [loadCollections]);

  // Автоматически загружаем коллекции при изменении студии
  useEffect(() => {
    if (autoLoad && selectedStudio?.id) {
      loadCollections();
    }
  }, [selectedStudio?.id, autoLoad, loadCollections]);

  return {
    // Состояние
    collections,
    loading,
    error,
    isSubmitting,
    
    // Методы для работы с коллекциями
    loadCollections,
    createCollection: createNewCollection,
    updateCollection: updateExistingCollection,
    deleteCollection: removeCollection,
    addModelToCollection: addModelToCollectionHandler,
    removeModelFromCollection: removeModelFromCollectionHandler,
    
    // Сброс состояния
    resetError: () => setError(null)
  };
};

export default useCollections; 