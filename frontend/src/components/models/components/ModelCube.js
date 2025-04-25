import React, { useEffect } from 'react';
import useThreeScene from '../hooks/useThreeScene';
import useModelLoader from '../hooks/useModelLoader';
import { CubeIcon } from '@heroicons/react/24/outline';

/**
 * Компонент для отображения небольшой 3D-модели
 * @param {Object} props - Свойства компонента
 * @param {string} props.className - Дополнительные CSS-классы
 * @param {string} props.size - Размер компонента (sm, md, lg, xl)
 * @param {string} props.color - Цвет модели
 * @param {string} props.modelId - ID модели
 * @param {string} props.fileId - ID файла
 * @param {File} props.stlFile - Файл STL
 * @param {boolean} props.showPlaceholder - Показывать заглушку при отсутствии модели
 * @param {boolean} props.interactive - Разрешить взаимодействие с моделью
 * @returns {JSX.Element}
 */
const ModelCube = ({ 
  className = '', 
  size = 'md', 
  color = '#3B82F6', 
  modelId, 
  fileId, 
  stlFile,
  showPlaceholder = true, 
  interactive = false 
}) => {
  // Определяем размеры на основе переданного size
  const getDimensions = () => {
    switch (size) {
      case 'small': 
      case 'sm': return { height: 70, width: 70 };
      case 'lg': return { height: 140, width: 140 };
      case 'xl': return { height: 170, width: 170 };
      case 'md':
      default: return { height: 100, width: 100 };
    }
  };

  const dimensions = getDimensions();
  
  // Настраиваем 3D-сцену
  const { 
    mountRef, 
    isReady,
    addMeshToScene,
    addObjectToScene
  } = useThreeScene({
    dimensions,
    enableOrbitControls: interactive
  });
  
  // Загружаем модель
  const { loading, error, model } = useModelLoader({
    fileId,
    file: stlFile,
    color
  });
  
  // Добавляем модель в сцену когда она загружена
  useEffect(() => {
    if (isReady && model) {
      if (model.type === 'stl' || model.type === 'placeholder') {
        addMeshToScene(model.mesh);
      } else if (['obj', 'amf', '3mf'].includes(model.type)) {
        addObjectToScene(model.object);
      }
    }
  }, [isReady, model, addMeshToScene, addObjectToScene]);
  
  // Классы для стилизации компонента
  const containerClasses = `relative rounded-md bg-gray-100 overflow-hidden ${className}`;
  
  // Отображение ошибки если есть
  if (error && !showPlaceholder) {
    return (
      <div 
        className={`${containerClasses} flex items-center justify-center bg-red-100`}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <div className="text-red-500 text-xs p-1 text-center">
          {error.message || 'Ошибка загрузки модели'}
        </div>
      </div>
    );
  }
  
  // Отображение индикатора загрузки
  if (loading && !model) {
    return (
      <div 
        className={`${containerClasses} flex items-center justify-center`}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Отображение заглушки если нет модели и данных для загрузки
  if (!fileId && !stlFile && !model && showPlaceholder) {
    return (
      <div 
        className={`${containerClasses} flex items-center justify-center bg-gray-50`}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <CubeIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }
  
  // Основное отображение 3D-модели
  return (
    <div 
      className={containerClasses}
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <div ref={mountRef} className="w-full h-full"></div>
    </div>
  );
};

export default ModelCube; 