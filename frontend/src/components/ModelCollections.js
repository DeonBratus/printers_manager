import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FolderIcon, 
  PlusIcon, 
  XMarkIcon,
  FolderPlusIcon,
  FolderArrowDownIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { getCollections, addModelToCollection, removeModelFromCollection } from '../services/api';
import Button from './Button';
import { useStudio } from '../context/StudioContext';

const ModelCollections = ({ model, onCollectionsChanged }) => {
  const { t } = useTranslation();
  const { selectedStudio } = useStudio();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [isMovingToCollection, setIsMovingToCollection] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [targetCollectionId, setTargetCollectionId] = useState('');

  // Получаем все коллекции
  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCollections(selectedStudio?.id);
      setCollections(response.data || []);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError(t('Error loading collections'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [selectedStudio?.id]);

  // Определяем текущие коллекции модели
  const modelCollections = collections.filter(
    collection => model.collections && model.collections.some(c => c.id === collection.id)
  );

  // Обработка добавления модели в коллекцию
  const handleAddToCollection = async () => {
    if (!selectedCollectionId) return;
    
    try {
      setLoading(true);
      setError(null);
      await addModelToCollection(model.id, selectedCollectionId);
      
      // Обновляем список коллекций
      fetchCollections();
      
      // Сбрасываем выбор
      setSelectedCollectionId('');
      setIsAddingToCollection(false);
      
      // Уведомляем родителя об изменении коллекций
      if (onCollectionsChanged) onCollectionsChanged();
    } catch (err) {
      console.error('Error adding model to collection:', err);
      setError(t('Error adding to collection'));
    } finally {
      setLoading(false);
    }
  };

  // Обработка удаления модели из коллекции
  const handleRemoveFromCollection = async (collectionId) => {
    try {
      setLoading(true);
      setError(null);
      await removeModelFromCollection(collectionId, model.id);
      
      // Обновляем список коллекций
      fetchCollections();
      
      // Уведомляем родителя об изменении коллекций
      if (onCollectionsChanged) onCollectionsChanged();
    } catch (err) {
      console.error('Error removing model from collection:', err);
      setError(t('Error removing from collection'));
    } finally {
      setLoading(false);
    }
  };
  
  // Обработка перемещения модели между коллекциями
  const handleMoveToCollection = async () => {
    if (!targetCollectionId || !selectedCollectionId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 1. Сначала удаляем из текущей коллекции
      await removeModelFromCollection(selectedCollectionId, model.id);
      
      // 2. Затем добавляем в новую коллекцию
      await addModelToCollection(model.id, targetCollectionId);
      
      // Обновляем список коллекций
      fetchCollections();
      
      // Сбрасываем выбор
      setSelectedCollectionId('');
      setTargetCollectionId('');
      setIsMovingToCollection(false);
      
      // Уведомляем родителя об изменении коллекций
      if (onCollectionsChanged) onCollectionsChanged();
    } catch (err) {
      console.error('Error moving model between collections:', err);
      setError(t('Error moving between collections'));
    } finally {
      setLoading(false);
    }
  };

  // Получаем список коллекций, в которых ещё нет этой модели
  const availableCollections = collections.filter(
    collection => !modelCollections.some(c => c.id === collection.id)
  );

  // Функция для получения вложенного пути коллекции
  const getCollectionPath = (collection) => {
    if (!collection.parent_id) return collection.name;
    
    const getParentPath = (parentId) => {
      const parent = collections.find(c => c.id === parentId);
      if (!parent) return '';
      if (!parent.parent_id) return parent.name;
      return `${getParentPath(parent.parent_id)} / ${parent.name}`;
    };
    
    return `${getParentPath(collection.parent_id)} / ${collection.name}`;
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium dark:text-white">{t('Collections')}</h3>
        <div className="flex space-x-2">
          {modelCollections.length > 0 && (
            <Button 
              size="sm"
              variant={isMovingToCollection ? "secondary" : "primary"}
              onClick={() => {
                setIsMovingToCollection(!isMovingToCollection);
                setIsAddingToCollection(false);
              }}
            >
              {isMovingToCollection ? (
                <XMarkIcon className="h-4 w-4 mr-2" />
              ) : (
                <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
              )}
              {isMovingToCollection ? t('Cancel') : t('Move Collection')}
            </Button>
          )}
          <Button 
            size="sm"
            variant={isAddingToCollection ? "secondary" : "primary"}
            onClick={() => {
              setIsAddingToCollection(!isAddingToCollection);
              setIsMovingToCollection(false);
            }}
          >
            {isAddingToCollection ? (
              <XMarkIcon className="h-4 w-4 mr-2" />
            ) : (
              <FolderPlusIcon className="h-4 w-4 mr-2" />
            )}
            {isAddingToCollection ? t('Cancel') : t('Add to Collection')}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-2">
          {error}
        </div>
      )}
      
      {isAddingToCollection && (
        <div className="flex items-center mb-4 space-x-2">
          <select
            value={selectedCollectionId}
            onChange={(e) => setSelectedCollectionId(e.target.value)}
            className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:text-white sm:text-sm"
          >
            <option value="">{t('Select a collection')}</option>
            {availableCollections.map(collection => (
              <option key={collection.id} value={collection.id}>
                {getCollectionPath(collection)}
              </option>
            ))}
          </select>
          <Button 
            onClick={handleAddToCollection}
            disabled={!selectedCollectionId || loading}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            {t('Add')}
          </Button>
        </div>
      )}
      
      {isMovingToCollection && (
        <div className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
          <div className="text-sm font-medium mb-2 dark:text-white">{t('Move model between collections')}</div>
          <div className="grid grid-cols-1 gap-y-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('From collection')}</label>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:text-white sm:text-sm"
              >
                <option value="">{t('Select source collection')}</option>
                {modelCollections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {getCollectionPath(collection)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('To collection')}</label>
              <select
                value={targetCollectionId}
                onChange={(e) => setTargetCollectionId(e.target.value)}
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:text-white sm:text-sm"
              >
                <option value="">{t('Select target collection')}</option>
                {availableCollections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {getCollectionPath(collection)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end mt-2">
              <Button 
                onClick={handleMoveToCollection}
                disabled={!selectedCollectionId || !targetCollectionId || loading}
              >
                <ArrowsRightLeftIcon className="h-4 w-4 mr-1" />
                {t('Move')}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {modelCollections.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
          {t('This model is not in any collection yet.')}
        </div>
      ) : (
        <div className="space-y-2">
          {modelCollections.map(collection => (
            <div 
              key={collection.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md"
            >
              <div className="flex items-center">
                <FolderIcon className="h-5 w-5 text-blue-500 mr-2" />
                <span className="dark:text-white">{getCollectionPath(collection)}</span>
              </div>
              <button
                onClick={() => handleRemoveFromCollection(collection.id)}
                className="text-gray-400 hover:text-red-500"
                title={t('Remove from collection')}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelCollections; 