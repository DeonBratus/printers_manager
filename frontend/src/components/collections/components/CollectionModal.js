import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FolderIcon, 
  BriefcaseIcon, 
  ArchiveBoxIcon, 
  TagIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { Button, Card } from '../../common';
import Modal from '../../Modal';

/**
 * Компонент модального окна для создания/редактирования коллекций
 * @param {Object} props - Свойства компонента
 * @param {boolean} props.isOpen - Флаг открытия модального окна
 * @param {Function} props.onClose - Обработчик закрытия модального окна
 * @param {Function} props.onSave - Обработчик сохранения данных
 * @param {Object} props.collection - Редактируемая коллекция (null для создания)
 * @param {Object} props.parentCollection - Родительская коллекция
 * @param {Array} props.collections - Список всех коллекций
 * @param {boolean} props.isSubmitting - Флаг процесса сохранения
 * @returns {JSX.Element}
 */
const CollectionModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  collection = null, 
  parentCollection = null,
  collections = [],
  isSubmitting = false
}) => {
  const { t } = useTranslation();
  
  const COLLECTION_TYPES = [
    { value: 'default', label: t('Default', 'По умолчанию'), icon: <FolderIcon className="h-5 w-5" /> },
    { value: 'project', label: t('Project', 'Проект'), icon: <BriefcaseIcon className="h-5 w-5" /> },
    { value: 'archive', label: t('Archive', 'Архив'), icon: <ArchiveBoxIcon className="h-5 w-5" /> },
    { value: 'custom', label: t('Custom', 'Произвольный'), icon: <TagIcon className="h-5 w-5" /> }
  ];

  const [form, setForm] = useState({
    name: '',
    description: '',
    collection_type: 'default',
    parent_id: null
  });
  
  const [errors, setErrors] = useState({});
  
  // Инициализируем форму при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      
      if (collection) {
        // Режим редактирования
        setForm({
          name: collection.name || '',
          description: collection.description || '',
          collection_type: collection.collection_type || 'default',
          parent_id: collection.parent_id || null
        });
      } else {
        // Режим создания
        setForm({
          name: '',
          description: '',
          collection_type: 'default',
          parent_id: parentCollection ? parentCollection.id : null
        });
      }
    }
  }, [isOpen, collection, parentCollection]);
  
  const handleChange = (e) => {
    if (!e || !e.target) return;
    
    const { name, value } = e.target;
    
    // Особая обработка для parent_id - преобразуем строку в число или null
    if (name === 'parent_id') {
      const parentId = value === '' ? null : parseInt(value, 10);
      setForm(prev => ({ ...prev, [name]: parentId }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    
    // Сбрасываем ошибки при изменении поля
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const validate = () => {
    const newErrors = {};
    
    if (!form.name || form.name.trim() === '') {
      newErrors.name = t('Name is required', 'Название обязательно');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    if (!validate()) return;
    
    if (typeof onSave === 'function') {
      onSave(form);
    }
  };

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };
  
  // Фильтруем список коллекций, чтобы избежать циклической вложенности
  const getValidParents = () => {
    if (!collection) return collections; // При создании новой коллекции все коллекции доступны как родители
    
    try {
      // Создаем список потомков текущей коллекции рекурсивно
      const findDescendants = (collectionId) => {
        if (!collectionId) return [];
        
        const descendants = [];
        const children = collections.filter(c => c && c.parent_id === collectionId);
        
        children.forEach(child => {
          if (child && child.id) {
            descendants.push(child.id);
            descendants.push(...findDescendants(child.id));
          }
        });
        
        return descendants;
      };
      
      // Исключаем текущую коллекцию и всех ее потомков
      const invalidIds = collection.id ? [collection.id, ...findDescendants(collection.id)] : [];
      return collections.filter(c => c && !invalidIds.includes(c.id));
    } catch (error) {
      console.error('Error in getValidParents:', error);
      return [];
    }
  };
  
  const validParents = getValidParents();
  
  // Находим полный путь для коллекции для отображения в селекте
  const getCollectionPath = (collectionId) => {
    const buildPath = (id, path = []) => {
      const currentCollection = collections.find(c => c.id === id);
      if (!currentCollection) return path;
      
      path.unshift(currentCollection.name);
      
      if (currentCollection.parent_id) {
        return buildPath(currentCollection.parent_id, path);
      }
      
      return path;
    };
    
    return buildPath(collectionId).join(' / ');
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={collection ? t('Edit Collection', 'Редактирование коллекции') : t('Create Collection', 'Создание коллекции')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('Name', 'Название')}
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder={t('Enter collection name', 'Введите название коллекции')}
            className={`mt-1 block w-full border rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm
              ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
            `}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center">
              <ExclamationCircleIcon className="h-4 w-4 mr-1" />
              {errors.name}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('Description', 'Описание')}
          </label>
          <textarea
            name="description"
            value={form.description || ''}
            onChange={handleChange}
            rows={3}
            placeholder={t('Enter optional description', 'Введите описание (необязательно)')}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('Collection Type', 'Тип коллекции')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {COLLECTION_TYPES.map(type => (
              <div 
                key={type.value}
                onClick={() => setForm(prev => ({ ...prev, collection_type: type.value }))}
                className={`
                  flex items-center p-3 border cursor-pointer rounded-md
                  ${form.collection_type === type.value 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600' 
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
                `}
              >
                <div className={`mr-3 ${form.collection_type === type.value ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {type.icon}
                </div>
                <span className={form.collection_type === type.value ? 'text-blue-700 dark:text-blue-300' : 'dark:text-white'}>
                  {type.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('Parent Collection', 'Родительская коллекция')}
          </label>
          <select
            name="parent_id"
            value={form.parent_id === null ? '' : form.parent_id}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
          >
            <option value="">{t('None (Root Collection)', 'Нет (Корневая коллекция)')}</option>
            {validParents.map(col => (
              <option key={col.id || Math.random().toString()} value={col.id}>
                {col.parent_id ? getCollectionPath(col.id) : col.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t('Cancel', 'Отмена')}
          </Button>
          <Button
            type="submit" 
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            {collection ? t('Update', 'Обновить') : t('Create', 'Создать')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CollectionModal; 