import React, { useState, useEffect, useRef } from 'react';
import useThreeScene from '../hooks/useThreeScene';
import useModelLoader from '../hooks/useModelLoader';
import { ArrowPathIcon, CubeIcon } from '@heroicons/react/24/outline';
import { Spinner, Card, ErrorMessage, LoadingOverlay, EmptyState } from '../../common';
import { downloadModelFile } from '../../../services/api';
import ModelFullView from './ModelFullView';

/**
 * Компонент-заглушка для отображения, когда нет модели
 */
const PlaceholderCube = () => {
  const mesh = React.useRef();
  
  React.useEffect(() => {
    if (mesh.current) {
      const animate = () => {
        mesh.current.rotation.y += 0.005;
        requestAnimationFrame(animate);
      };
      
      const animationId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationId);
    }
  }, []);
  
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3b82f6" />
    </mesh>
  );
};

/**
 * Компонент для отображения 3D-модели с возможностью взаимодействия
 * @param {Object} props - Свойства компонента
 * @param {string} props.className - Дополнительные CSS-классы
 * @param {string} props.modelId - ID модели
 * @param {string} props.fileId - ID файла
 * @param {File} props.stlFile - Файл STL для отображения
 * @param {string} props.fileUrl - URL файла для загрузки
 * @param {string} props.fileType - Тип файла (stl, obj, amf, 3mf)
 * @param {boolean} props.interactive - Разрешить взаимодействие с моделью
 * @param {function} props.onError - Обработчик ошибок
 * @returns {JSX.Element}
 */
const ModelViewer = ({
  className = '',
  modelId,
  fileId,
  stlFile,
  fileUrl,
  fileType,
  interactive = true,
  onError
}) => {
  const [hasError, setHasError] = useState(false);
  const dimensions = { width: '100%', height: '100%' };
  const containerRef = useRef(null);
  
  // Настраиваем 3D-сцену
  const {
    mountRef,
    isReady,
    addMeshToScene,
    addObjectToScene,
    resetCamera,
    resetScene
  } = useThreeScene({
    dimensions,
    enableOrbitControls: interactive,
    enableGrid: interactive,
    enableAxesHelper: interactive,
    enableAutoRotate: !interactive
  });
  
  // Загружаем модель
  const { loading, error, model, reload } = useModelLoader({
    fileId,
    file: stlFile,
    fileUrl,
    fileType,
    color: '#3B82F6'
  });
  
  // Обрабатываем ошибки
  useEffect(() => {
    if (error) {
      setHasError(true);
      if (onError) onError(error);
    } else {
      setHasError(false);
    }
  }, [error, onError]);
  
  // Добавляем модель в сцену когда она загружена
  useEffect(() => {
    if (isReady && model) {
      // Сбрасываем сцену перед добавлением модели
      resetScene();
      
      if (model.type === 'stl' || model.type === 'placeholder') {
        addMeshToScene(model.mesh);
      } else if (['obj', 'amf', '3mf'].includes(model.type)) {
        addObjectToScene(model.object);
      }
      
      // Сбрасываем камеру для правильного отображения модели
      resetCamera();
    }
  }, [isReady, model, addMeshToScene, addObjectToScene, resetScene, resetCamera]);
  
  // Обработчик повторной загрузки модели
  const handleReload = () => {
    setHasError(false);
    reload();
  };
  
  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: '100%', height: '100%', minHeight: '200px' }}
    >
      <LoadingOverlay isLoading={loading} spinnerSize="lg">
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 bg-opacity-90 z-10">
            <ErrorMessage 
              message={error?.message || 'Ошибка загрузки модели'} 
              className="mb-3"
            />
            <button
              onClick={handleReload}
              className="flex items-center space-x-1 bg-white border border-red-300 rounded-md px-3 py-1 text-sm text-red-600 hover:bg-red-50"
            >
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              <span>Повторить</span>
            </button>
          </div>
        ) : (
          <div 
            ref={mountRef}
            className="w-full h-full rounded-md overflow-hidden"
          />
        )}
      </LoadingOverlay>
    </div>
  );
};

/**
 * Компонент для предпросмотра и выбора 3D-моделей из списка файлов
 * @param {Object} props - Свойства компонента
 * @param {string} props.modelId - ID модели
 * @param {Array} props.modelFiles - Массив файлов модели
 * @returns {JSX.Element}
 */
const ModelViewerWrapper = ({ modelId, modelFiles = [] }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileBuffers, setFileBuffers] = useState({});
  const [activeTab, setActiveTab] = useState('preview');
  
  // Выбираем первый файл из списка при загрузке
  useEffect(() => {
    if (modelFiles.length > 0 && !selectedFile) {
      // Ищем STL файл для выбора по умолчанию
      const stlFile = modelFiles.find(file => 
        file.file_type?.toLowerCase() === 'stl'
      );
      
      // Если есть STL файл, выбираем его, иначе первый в списке
      setSelectedFile(stlFile || modelFiles[0]);
    }
  }, [modelFiles, selectedFile]);
  
  // Загружаем файл модели
  const loadModelFile = async (fileId) => {
    // Если файл уже загружен, не загружаем снова
    if (fileBuffers[fileId]) return;
    
    try {
      setLoadingFile(true);
      
      const response = await downloadModelFile(fileId);
      
      // Сохраняем ArrayBuffer для этого файла
      setFileBuffers(prev => ({
        ...prev,
        [fileId]: response.data
      }));
    } catch (err) {
      console.error('Error downloading model file:', err);
    } finally {
      setLoadingFile(false);
    }
  };
  
  // Загружаем выбранный файл
  useEffect(() => {
    if (selectedFile?.id && !fileBuffers[selectedFile.id]) {
      loadModelFile(selectedFile.id);
    }
  }, [selectedFile, fileBuffers]);
  
  // Отображаем заглушку, если нет файлов
  if (modelFiles.length === 0) {
    return (
      <Card className="flex flex-col">
        <EmptyState
          icon={<CubeIcon className="h-12 w-12 text-gray-400" />}
          message="Нет файлов 3D-моделей"
        />
      </Card>
    );
  }
  
  // Получаем тип текущего файла
  const fileType = selectedFile?.file_type?.toLowerCase() || '';
  const isModelFile = ['stl', 'obj', '3mf'].includes(fileType);
  
  return (
    <Card className="flex flex-col">
      <div className="flex border-b">
        <button
          className={`px-4 py-2 ${activeTab === 'preview' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('preview')}
        >
          Предпросмотр
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'files' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('files')}
        >
          Файлы ({modelFiles.length})
        </button>
      </div>
      
      {activeTab === 'preview' && (
        <div className="p-4">
          {/* Блок с 3D-моделью */}
          <div className="border rounded-md overflow-hidden bg-gray-50 h-64 mb-4">
            {isModelFile && selectedFile ? (
              <ModelFullView 
                fileId={selectedFile.id} 
                file={selectedFile}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ModelViewer
                  modelId={modelId}
                  fileId={selectedFile?.id}
                  stlFile={selectedFile}
                  fileUrl={selectedFile?.url}
                  fileType={selectedFile?.file_type}
                  interactive={false}
                  onError={(error) => {
                    console.error('Error loading model:', error);
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Информация о выбранном файле */}
          {selectedFile && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">{selectedFile.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Тип файла:</div>
                <div>{selectedFile.file_type?.toUpperCase() || 'Неизвестно'}</div>
                
                <div className="text-gray-500">Размер:</div>
                <div>{formatFileSize(selectedFile.size)}</div>
                
                <div className="text-gray-500">Дата загрузки:</div>
                <div>{formatDate(selectedFile.created_at)}</div>
              </div>
            </div>
          )}
          
          {/* Кнопки действий */}
          <div className="flex space-x-2">
            <a 
              href={`${process.env.REACT_APP_API_URL}/models/files/${selectedFile?.id}/download`}
              download={selectedFile?.name}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex-1 text-center"
            >
              Скачать
            </a>
          </div>
        </div>
      )}
      
      {activeTab === 'files' && (
        <div className="p-4">
          <h3 className="text-lg font-medium mb-2">Файлы модели</h3>
          
          <div className="border rounded-md overflow-hidden">
            {modelFiles.map((file) => (
              <div 
                key={file.id}
                className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 
                  ${selectedFile?.id === file.id ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedFile(file)}
              >
                <div className="mr-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-500">{file.file_type?.toUpperCase() || '?'}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                  <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

/**
 * Форматирует размер файла в человекочитаемом виде
 * @param {number} bytes - Размер в байтах
 * @returns {string} Форматированный размер
 */
const formatFileSize = (bytes) => {
  if (bytes === 0 || !bytes) return '0 Байт';
  
  const k = 1024;
  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Форматирует дату в локализованный формат
 * @param {string} dateString - Строка даты
 * @returns {string} Форматированная дата
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch (err) {
    return dateString;
  }
};

export default ModelViewerWrapper; 