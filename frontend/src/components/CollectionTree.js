import React, { useState } from 'react';
import { 
  FolderIcon, 
  ChevronRightIcon, 
  ChevronDownIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const CollectionTreeItem = ({ 
  collection, 
  onSelect, 
  selectedId, 
  level = 0, 
  onAdd,
  onEdit,
  onDelete,
  canEdit = true
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = collection && collection.children && collection.children.length > 0;
  const isSelected = selectedId === collection?.id;
  
  const handleToggle = (e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    setExpanded(!expanded);
  };
  
  const handleSelect = () => {
    if (typeof onSelect === 'function') {
      onSelect(collection);
    }
  };
  
  const getBgColor = () => {
    if (isSelected) return 'bg-blue-100 dark:bg-blue-900';
    return 'hover:bg-gray-100 dark:hover:bg-gray-700';
  };
  
  const getCollectionTypeIcon = (type) => {
    switch (type) {
      case 'project':
        return 'text-green-500';
      case 'archive':
        return 'text-amber-500';
      case 'custom':
        return 'text-purple-500';
      default:
        return 'text-blue-500';
    }
  };

  // Безопасный обработчик добавления коллекции
  const handleAdd = (e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (typeof onAdd === 'function') {
      onAdd(collection);
    }
  };

  // Безопасный обработчик редактирования коллекции
  const handleEdit = (e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (typeof onEdit === 'function') {
      onEdit(collection);
    }
  };

  // Безопасный обработчик удаления коллекции
  const handleDelete = (e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (typeof onDelete === 'function') {
      onDelete(collection);
    }
  };
  
  if (!collection) {
    return null;
  }
  
  return (
    <div className="select-none">
      <div 
        className={`flex items-center px-2 py-2 rounded-md cursor-pointer ${getBgColor()}`}
        onClick={handleSelect}
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
      >
        {hasChildren ? (
          <button 
            onClick={handleToggle}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 mr-1"
          >
            {expanded ? 
              <ChevronDownIcon className="h-4 w-4 text-gray-500" /> : 
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            }
          </button>
        ) : (
          <div className="w-6"></div>
        )}
        
        <FolderIcon className={`h-5 w-5 mr-2 ${getCollectionTypeIcon(collection.collection_type)}`} />
        
        <div className="flex-1 truncate">
          <span className="dark:text-white">{collection.name}</span>
          {collection.models_count > 0 && (
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              ({collection.models_count})
            </span>
          )}
        </div>
        
        {canEdit && (
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleAdd}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Добавить подколлекцию"
            >
              <PlusIcon className="h-4 w-4 text-gray-500" />
            </button>
            <button 
              onClick={handleEdit}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Редактировать коллекцию"
            >
              <PencilIcon className="h-4 w-4 text-gray-500" />
            </button>
            <button 
              onClick={handleDelete}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Удалить коллекцию"
            >
              <TrashIcon className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>
      
      {expanded && hasChildren && (
        <div>
          {collection.children.map(child => (
            <CollectionTreeItem
              key={child.id || Math.random().toString()}
              collection={child}
              onSelect={onSelect}
              selectedId={selectedId}
              level={level + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CollectionTree = ({ 
  collections = [], 
  onSelectCollection, 
  selectedCollectionId,
  onAddCollection,
  onEditCollection,
  onDeleteCollection,
  canEdit = true  // Разрешено ли редактирование коллекций
}) => {
  
  const handleAddCollection = () => {
    if (typeof onAddCollection === 'function') {
      onAddCollection();
    }
  };
  
  return (
    <div className="overflow-y-auto">
      <div className="flex justify-between items-center mb-2 px-2">
        <h3 className="font-medium text-sm dark:text-gray-300">Коллекции</h3>
        {canEdit && (
          <button 
            onClick={handleAddCollection}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Добавить корневую коллекцию"
          >
            <PlusIcon className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>
      
      <div className="space-y-1">
        {collections.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 px-4 py-2">
            Коллекции не найдены
          </div>
        ) : (
          collections.map(collection => (
            <CollectionTreeItem
              key={collection.id || Math.random().toString()}
              collection={collection}
              onSelect={onSelectCollection}
              selectedId={selectedCollectionId}
              onAdd={onAddCollection}
              onEdit={onEditCollection}
              onDelete={onDeleteCollection}
              canEdit={canEdit}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CollectionTree; 