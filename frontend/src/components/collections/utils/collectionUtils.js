/**
 * Преобразует плоский массив коллекций в древовидную структуру
 * @param {Array} collections - Плоский массив коллекций
 * @returns {Array} Древовидная структура коллекций
 */
export const buildCollectionTree = (collections) => {
  if (!Array.isArray(collections) || collections.length === 0) {
    return [];
  }

  // Создаем карту для быстрого доступа
  const collectionMap = {};
  collections.forEach(collection => {
    // Копируем коллекцию и добавляем поле children
    collectionMap[collection.id] = {
      ...collection,
      children: []
    };
  });

  // Строим дерево
  const rootCollections = [];
  
  collections.forEach(collection => {
    const collectionWithChildren = collectionMap[collection.id];
    
    if (collection.parent_id === null || !collectionMap[collection.parent_id]) {
      // Корневая коллекция
      rootCollections.push(collectionWithChildren);
    } else {
      // Дочерняя коллекция
      collectionMap[collection.parent_id].children.push(collectionWithChildren);
    }
  });

  return rootCollections;
};

/**
 * Получает полный путь коллекции (включая всех родителей)
 * @param {Array} collections - Массив всех коллекций
 * @param {Object} collection - Коллекция для получения пути
 * @returns {string} Полный путь коллекции
 */
export const getCollectionPath = (collections, collection) => {
  if (!collection) return '';
  if (!collection.parent_id) return collection.name;
  
  const pathParts = [collection.name];
  let currentParentId = collection.parent_id;
  
  // Ограничим количество итераций, чтобы избежать бесконечного цикла
  let iterations = 0;
  const maxIterations = 100;
  
  while (currentParentId && iterations < maxIterations) {
    const parent = collections.find(c => c.id === currentParentId);
    if (!parent) break;
    
    pathParts.unshift(parent.name);
    currentParentId = parent.parent_id;
    iterations++;
  }
  
  return pathParts.join(' / ');
};

/**
 * Фильтрует коллекции, которые могут быть родителями для указанной коллекции
 * @param {Array} collections - Массив всех коллекций
 * @param {Object} targetCollection - Коллекция, для которой ищем родителей
 * @returns {Array} Массив доступных родительских коллекций
 */
export const getValidParentCollections = (collections, targetCollection) => {
  if (!targetCollection) return collections;
  
  // Функция для поиска всех потомков коллекции
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
  
  // Запрещаем выбирать саму коллекцию и всех ее потомков как родителей
  const invalidIds = targetCollection.id ? 
    [targetCollection.id, ...findDescendants(targetCollection.id)] : 
    [];
  
  return collections.filter(c => c && !invalidIds.includes(c.id));
};

/**
 * Фильтрует коллекции по строке поиска
 * @param {Array} collections - Массив коллекций
 * @param {string} searchQuery - Строка поиска
 * @returns {Array} Отфильтрованный массив коллекций
 */
export const filterCollectionsByQuery = (collections, searchQuery) => {
  if (!searchQuery || searchQuery.trim() === '') {
    return collections;
  }
  
  const query = searchQuery.toLowerCase().trim();
  
  return collections.filter(collection => {
    // Поиск по названию
    const nameMatch = collection.name && 
      collection.name.toLowerCase().includes(query);
    
    // Поиск по описанию
    const descriptionMatch = collection.description && 
      collection.description.toLowerCase().includes(query);
    
    // Поиск по типу коллекции
    const typeMatch = collection.collection_type && 
      collection.collection_type.toLowerCase().includes(query);
    
    return nameMatch || descriptionMatch || typeMatch;
  });
}; 