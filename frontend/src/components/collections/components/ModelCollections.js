import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FolderIcon, 
  PlusIcon, 
  XMarkIcon,
  FolderPlusIcon,
  FolderArrowDownIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { getCollections, addModelToCollection, removeModelFromCollection } from '../../../services/api';
import { Button, EmptyState, Card, Badge, LoadingOverlay, ErrorMessage } from '../../common';
import { useStudio } from '../../../context/StudioContext';

/**
 * Компонент для управления коллекциями модели
 * @param {Object} props - Свойства компонента
 * @param {Object} props.model - Модель
 * @param {Function} props.onCollectionsChanged - Обработчик изменения коллекций
 * @returns {JSX.Element}
 */
const ModelCollections = ({ model, onCollectionsChanged }) => {
  const { t } = useTranslation();
  const { selectedStudio } = useStudio();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Получаем все коллекции
  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCollections(selectedStudio?.id);
      setCollections(response.data || []);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError(t('Error loading collections', 'Ошибка загрузки коллекций'));
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
      setIsSubmitting(true);
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
      setError(t('Error adding to collection', 'Ошибка добавления в коллекцию'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработка удаления модели из коллекции
  const handleRemoveFromCollection = async (collectionId) => {
    try {
      setIsSubmitting(true);
      setError(null);
      await removeModelFromCollection(collectionId, model.id);
      
      // Обновляем список коллекций
      fetchCollections();
      
      // Уведомляем родителя об изменении коллекций
      if (onCollectionsChanged) onCollectionsChanged();
    } catch (err) {
      console.error('Error removing model from collection:', err);
      setError(t('Error removing from collection', 'Ошибка удаления из коллекции'));
    } finally {
      setIsSubmitting(false);
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

  // Получаем иконку для типа коллекции
  const getCollectionTypeIcon = (collectionType) => {
    switch (collectionType) {
      case 'project':
        return <TagIcon className="h-5 w-5 text-green-500" />;
      case 'archive':
        return <TagIcon className="h-5 w-5 text-amber-500" />;
      case 'custom':
        return <TagIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <FolderIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Card className="p-4">
      <LoadingOverlay isLoading={loading}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium dark:text-white">
            {t('Collections', 'Коллекции')}
          </h3>
          <Button 
            size="sm"
            variant={isAddingToCollection ? "secondary" : "primary"}
            onClick={() => setIsAddingToCollection(!isAddingToCollection)}
            icon={isAddingToCollection ? <XMarkIcon className="h-4 w-4" /> : <FolderPlusIcon className="h-4 w-4" />}
          >
            {isAddingToCollection ? t('Cancel', 'Отмена') : t('Add to Collection', 'Добавить в коллекцию')}
          </Button>
        </div>
        
        {error && (
          <ErrorMessage 
            message={error} 
            className="mb-4"
            dismissible
            onDismiss={() => setError(null)}
          />
        )}
        
        {isAddingToCollection && (
          <div className="flex items-center mb-6 space-x-2">
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:text-white sm:text-sm"
              disabled={isSubmitting}
            >
              <option value="">{t('Select a collection', 'Выберите коллекцию')}</option>
              {availableCollections.map(collection => (
                <option key={collection.id} value={collection.id}>
                  {getCollectionPath(collection)}
                </option>
              ))}
            </select>
            <Button 
              onClick={handleAddToCollection}
              disabled={!selectedCollectionId || isSubmitting}
              isLoading={isSubmitting}
              icon={<PlusIcon className="h-4 w-4" />}
            >
              {t('Add', 'Добавить')}
            </Button>
          </div>
        )}
        
        {modelCollections.length === 0 ? (
          <EmptyState 
            message={t('This model is not in any collection yet.', 'Эта модель ещё не добавлена ни в одну коллекцию.')}
            icon={<FolderIcon className="h-12 w-12 text-gray-400" />}
            action={
              <Button 
                onClick={() => setIsAddingToCollection(true)}
                variant="outline"
                icon={<FolderPlusIcon className="h-4 w-4" />}
              >
                {t('Add to Collection', 'Добавить в коллекцию')}
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {modelCollections.map(collection => (
              <div 
                key={collection.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md group"
              >
                <div className="flex items-center">
                  {getCollectionTypeIcon(collection.collection_type)}
                  <span className="ml-2 dark:text-white">{getCollectionPath(collection)}</span>
                </div>
                <div className="flex items-center">
                  <Badge 
                    variant={collection.collection_type === 'project' ? 'success' : 
                             collection.collection_type === 'archive' ? 'warning' : 
                             collection.collection_type === 'custom' ? 'info' : 'primary'}
                    size="sm"
                    className="mr-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {collection.collection_type}
                  </Badge>
                  <button
                    onClick={() => handleRemoveFromCollection(collection.id)}
                    className="text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('Remove from collection', 'Удалить из коллекции')}
                    disabled={isSubmitting}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </LoadingOverlay>
    </Card>
  );
};

export default ModelCollections; 