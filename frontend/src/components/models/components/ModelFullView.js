import React from 'react';
import useModelLoader from '../hooks/useModelLoader';
import useThreeScene from '../hooks/useThreeScene';
import useResizeObserver from '../hooks/useResizeObserver';
import { CubeIcon } from '@heroicons/react/24/outline';

/**
 * Компонент для полноэкранного отображения 3D-модели
 * @param {Object} props - Свойства компонента
 * @param {string} props.className - Дополнительные CSS-классы
 * @param {string} props.color - Цвет модели
 * @param {string} props.fileId - ID файла
 * @param {Object} props.file - Объект файла
 * @returns {JSX.Element}
 */
const ModelFullView = ({ 
  className = '',
  color = '#3B82F6', 
  fileId, 
  file 
}) => {
  // Извлекаем ID файла из объекта file если он передан
  const modelFileId = file?.id || fileId;
  const fileType = file?.file_type?.toLowerCase() || 'stl';
  
  // Используем ResizeObserver для отслеживания изменений размера контейнера
  const [dimensions, containerRef] = useResizeObserver({ width: 100, height: 100 });
  
  // Настраиваем 3D-сцену
  const { 
    mountRef, 
    isReady,
    addMeshToScene,
    addObjectToScene,
    updateDimensions 
  } = useThreeScene({
    dimensions,
    enableOrbitControls: true
  });
  
  // Обновляем размеры рендерера при изменении размеров контейнера
  React.useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      updateDimensions(dimensions);
    }
  }, [dimensions, updateDimensions]);
  
  // Загружаем модель
  const { loading, error, model } = useModelLoader({
    fileId: modelFileId,
    fileType,
    color
  });
  
  // Добавляем модель в сцену когда она загружена
  React.useEffect(() => {
    if (isReady && model) {
      if (model.type === 'stl' || model.type === 'placeholder') {
        addMeshToScene(model.mesh);
      } else if (['obj', 'amf', '3mf'].includes(model.type)) {
        addObjectToScene(model.object);
      }
    }
  }, [isReady, model, addMeshToScene, addObjectToScene]);
  
  // Основные классы компонента
  const containerClasses = `relative w-full h-full border rounded-md overflow-hidden ${className}`;
  
  return (
    <div ref={containerRef} className={containerClasses}>
      {/* Отображение ошибки */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-50 z-10">
          <div className="bg-white p-3 rounded-md shadow-md">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      )}
      
      {/* Индикатор загрузки */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Заглушка при отсутствии данных */}
      {!modelFileId && !model && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
          <CubeIcon className="w-16 h-16 text-gray-400 mb-2" />
          <p className="text-gray-500">Нет 3D-модели</p>
        </div>
      )}
      
      {/* Контейнер для Three.js сцены */}
      <div ref={mountRef} className="w-full h-full"></div>
    </div>
  );
};

export default ModelFullView; 