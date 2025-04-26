import React, { useState, useContext, useEffect, useRef } from 'react';
import { 
  FolderIcon, 
  ChevronRightIcon, 
  ChevronDownIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { getCollectionModels } from '../services/api';

// Collection item component (individual collection in the tree)
const CollectionTreeItem = ({ 
  collection, 
  onSelect, 
  selectedId, 
  level = 0, 
  onAdd,
  onEdit,
  onDelete,
  onContextMenu,
  onModelContextMenu,
  onDropOver,
  onDrop,
  onDragLeave,
  dragOverCollectionId,
  showModels = false,
  canEdit = true
}) => {
  const [expanded, setExpanded] = useState(false);
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const hasChildren = collection && collection.children && collection.children.length > 0;
  const isSelected = selectedId === collection?.id;
  
  const handleToggle = (e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    
    // If we're expanding and should show models, fetch them
    if (!expanded && showModels && collection.models_count > 0) {
      loadModels();
    }
    
    setExpanded(!expanded);
  };
  
  const loadModels = async () => {
    try {
      setLoadingModels(true);
      const response = await getCollectionModels(collection.id);
      setModels(response.data || []);
    } catch (error) {
      console.error("Error loading models for collection", error);
    } finally {
      setLoadingModels(false);
    }
  };
  
  const handleSelect = () => {
    if (typeof onSelect === 'function') {
      onSelect(collection);
    }
  };
  
  const handleContextMenu = (e) => {
    if (typeof onContextMenu === 'function') {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, collection);
    }
  };
  
  const handleDragOver = (e) => {
    if (typeof onDropOver === 'function') {
      e.preventDefault();
      e.stopPropagation();
      onDropOver(e, collection.id);
    }
  };
  
  const handleDrop = (e) => {
    if (typeof onDrop === 'function') {
      e.preventDefault();
      e.stopPropagation();
      onDrop(e, collection.id);
    }
  };
  
  const handleDragLeave = (e) => {
    if (typeof onDragLeave === 'function') {
      e.preventDefault();
      e.stopPropagation();
      onDragLeave(e);
    }
  };
  
  const getBgColor = () => {
    if (dragOverCollectionId === collection.id) return 'bg-green-100 dark:bg-green-900/30 border-l-2 border-green-500';
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
  
  // Add handler for model context menu
  const handleModelContextMenu = (e, model) => {
    if (typeof onModelContextMenu === 'function') {
      e.preventDefault();
      e.stopPropagation();
      onModelContextMenu(e, model);
    }
  };
  
  if (!collection) {
    return null;
  }
  
  return (
    <div className="select-none">
      <div 
        className={`flex items-center px-2 py-2 rounded-md cursor-pointer ${getBgColor()} group`}
        onClick={handleSelect}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
      >
        {hasChildren || (showModels && collection.models_count > 0) ? (
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
      
      {expanded && (
        <div>
          {/* Show child collections */}
          {hasChildren && collection.children.map(child => (
            <CollectionTreeItem
              key={child.id || Math.random().toString()}
              collection={child}
              onSelect={onSelect}
              selectedId={selectedId}
              level={level + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              onContextMenu={onContextMenu}
              onModelContextMenu={onModelContextMenu}
              onDropOver={onDropOver}
              onDrop={onDrop}
              onDragLeave={onDragLeave}
              dragOverCollectionId={dragOverCollectionId}
              showModels={showModels}
              canEdit={canEdit}
            />
          ))}
          
          {/* Show models if expanded and we have models */}
          {showModels && models.length > 0 && (
            <div className="ml-6 pl-4 border-l border-gray-200 dark:border-gray-700" style={{ marginLeft: `${(level * 12) + 14}px` }}>
              {loadingModels ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-1">Загрузка моделей...</div>
              ) : (
                models.map(model => (
                  <div 
                    key={model.id}
                    className="flex items-center px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => window.location.href = `/models/${model.id}`}
                    onContextMenu={(e) => handleModelContextMenu(e, model)}
                  >
                    <DocumentIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="truncate dark:text-gray-300">{model.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
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
  onCollectionContextMenu,
  onModelContextMenu,
  onDragOver,
  onDrop,
  onDragLeave,
  dragOverCollectionId,
  showModels = false,
  canEdit = true
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCollections, setFilteredCollections] = useState([]);
  const dropdownRef = useRef(null);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);
  
  useEffect(() => {
    // Flatten the collection tree for the dropdown
    const flattenCollections = (collections, depth = 0, prefix = '') => {
      return collections.reduce((acc, collection) => {
        // Add current collection with appropriate indentation
        acc.push({
          ...collection,
          displayName: prefix + collection.name,
          depth
        });
        
        // Add children recursively if they exist
        if (collection.children && collection.children.length > 0) {
          acc.push(...flattenCollections(
            collection.children, 
            depth + 1, 
            prefix + '— '
          ));
        }
        return acc;
      }, []);
    };
    
    // Filter collections based on search term
    const getFilteredCollections = () => {
      const allFlatCollections = flattenCollections(collections);
      if (!searchTerm) return allFlatCollections;
      
      return allFlatCollections.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    };
    
    setFilteredCollections(getFilteredCollections());
  }, [collections, searchTerm]);
  
  const handleAddCollection = () => {
    if (typeof onAddCollection === 'function') {
      onAddCollection();
    }
  };
  
  const handleCollectionSelect = (collection) => {
    if (typeof onSelectCollection === 'function') {
      onSelectCollection(collection);
      setShowDropdown(false);
    }
  };
  
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };
  
  return (
    <div className="overflow-y-auto">
      <div className="flex justify-between items-center mb-2 px-2">
        <h3 className="font-medium text-sm dark:text-gray-300">Коллекции</h3>
        
        <div className="flex space-x-1">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={toggleDropdown}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Быстрый выбор коллекции"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-500" />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-1 z-50 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Поиск коллекций..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredCollections.length > 0 ? (
                    filteredCollections.map(collection => (
                      <div
                        key={collection.id}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          collection.id === selectedCollectionId ? 
                          'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 
                          'text-gray-700 dark:text-gray-300'
                        }`}
                        onClick={() => handleCollectionSelect(collection)}
                        style={{ 
                          paddingLeft: `${collection.depth * 10 + 12}px`
                        }}
                      >
                        <div className="flex items-center">
                          <FolderIcon className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="truncate">{collection.displayName || collection.name}</span>
                          {collection.models_count > 0 && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              ({collection.models_count})
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                      {searchTerm ? 'Коллекции не найдены' : 'Нет доступных коллекций'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
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
              onContextMenu={onCollectionContextMenu}
              onModelContextMenu={onModelContextMenu}
              onDropOver={onDragOver}
              onDrop={onDrop}
              onDragLeave={onDragLeave}
              dragOverCollectionId={dragOverCollectionId}
              showModels={showModels}
              canEdit={canEdit}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CollectionTree; 