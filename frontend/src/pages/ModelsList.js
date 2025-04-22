import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getModels, getStudios, createModel, deleteModel, getModelFiles } from '../services/api';
import { useStudio } from '../context/StudioContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import ModelCube from '../components/ModelCube';
import { 
  CubeIcon, 
  ClockIcon, 
  PlusCircleIcon,
  TableCellsIcon,
  Squares2X2Icon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatMinutesToHHMM, parseHHMMToMinutes, formatDuration } from '../utils/timeFormat';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const ModelsList = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { selectedStudio, getCurrentStudioId } = useStudio();
  const [models, setModels] = useState([]);
  const [modelFiles, setModelFiles] = useState({});
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newModel, setNewModel] = useState({ 
    name: '', 
    printing_time: '01:00'
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define a set of colors to use for the model cubes
  const modelColors = useMemo(() => [
    '#3B82F6', // blue
    '#10B981', // green
    '#8B5CF6', // purple
    '#F59E0B', // amber
    '#EF4444', // red
    '#6366F1', // indigo
    '#EC4899', // pink
    '#14B8A6', // teal
  ], []);

  // Get a color based on the model id
  const getModelColor = (id) => {
    return modelColors[id % modelColors.length];
  };

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      // Передаем ID выбранной студии
      const selectedStudioId = selectedStudio ? selectedStudio.id : null;
      const response = await getModels(selectedStudioId);
      const modelsData = Array.isArray(response) ? response : response.data || [];
      setModels(modelsData);
      
      // For each model, fetch the STL files to display
      const filesPromises = modelsData.map(model => 
        getModelFiles(model.id)
          .then(result => {
            const files = Array.isArray(result) ? result : result.data || [];
            // Find STL file or first available model file
            const stlFile = files.find(file => 
              file.file_type.toLowerCase() === 'stl'
            );
            return { modelId: model.id, files, stlFile };
          })
          .catch(err => {
            console.error(`Error fetching files for model ${model.id}:`, err);
            return { modelId: model.id, files: [], stlFile: null };
          })
      );
      
      const filesResults = await Promise.all(filesPromises);
      const filesMap = {};
      filesResults.forEach(({ modelId, files, stlFile }) => {
        filesMap[modelId] = { files, stlFile };
      });
      
      setModelFiles(filesMap);
    } catch (err) {
      console.error("Error fetching models:", err);
      setError(t('modelsList.fetchError', 'Не удалось загрузить данные моделей. Пожалуйста, попробуйте снова.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStudios = async () => {
    try {
      const response = await getStudios();
      console.log('Studios API response:', response); // Add logging to inspect the response structure
      // Make sure we access the data property of the response or use an empty array as fallback
      const studiosData = Array.isArray(response) ? response : response.data || [];
      console.log('Processed studios data:', studiosData); // Log the processed data
      setStudios(studiosData);
    } catch (error) {
      console.error('Error fetching studios:', error);
      setStudios([]); // Set to empty array on error
    }
  };

  useEffect(() => {
    fetchModels();
    fetchStudios();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      fetchModels().catch(err => console.error("Error in periodic refresh:", err));
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [selectedStudio]);

  const handleInputChange = (e) => {
    setNewModel({ ...newModel, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!newModel.name.trim() || !newModel.printing_time) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      // Преобразуем время из формата HH:MM в минуты
      const minutes = parseHHMMToMinutes(newModel.printing_time);
      
      const modelData = {
        ...newModel,
        printing_time: minutes,  // время в минутах для API
        studio_id: getCurrentStudioId() // Используем текущую выбранную студию
      };
      
      await createModel(modelData);
      setNewModel({ 
        name: '', 
        printing_time: '01:00'
      });
      setIsAddModalOpen(false);
      fetchModels();
    } catch (error) {
      console.error('Error creating model:', error);
      setError("Не удалось создать модель. Пожалуйста, попробуйте снова.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (model) => {
    setModelToDelete(model);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!modelToDelete) return;
    
    try {
      setIsSubmitting(true);
      await deleteModel(modelToDelete.id);
      fetchModels();
      setIsDeleteModalOpen(false);
      setModelToDelete(null);
    } catch (error) {
      console.error('Error deleting model:', error);
      setError("Не удалось удалить модель. Пожалуйста, попробуйте снова.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full p-10">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      <p className="ml-3 text-gray-700 dark:text-gray-300">Загрузка...</p>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">3D Модели</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={toggleViewMode}
            title={viewMode === 'grid' ? 'Переключиться на список' : 'Переключиться на сетку'}
          >
            {viewMode === 'grid' ? (
              <TableCellsIcon className="h-5 w-5" />
            ) : (
              <Squares2X2Icon className="h-5 w-5" />
            )}
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Добавить новую модель
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Ошибка</h3>
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {models.length > 0 ? (
            models.map((model) => (
              <Card key={model.id} className="overflow-hidden">
                <Link to={`/models/${model.id}`} className="block">
                  <div className="p-4 flex justify-center items-center h-40 bg-gray-100 dark:bg-gray-800 transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-gray-700">
                    {modelFiles[model.id]?.stlFile ? (
                      <ModelCube 
                        size="lg" 
                        color={getModelColor(model.id)} 
                        fileId={modelFiles[model.id].stlFile.id}
                        showPlaceholder={true}
                        interactive={false}
                      />
                    ) : (
                      <ModelCube 
                        size="lg" 
                        color={getModelColor(model.id)}
                        showPlaceholder={true}
                        interactive={false}
                      />
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex justify-between">
                    <h3 className="font-medium dark:text-white">{model.name}</h3>
                    <button 
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation();
                        openDeleteModal(model);
                      }}
                      className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                    >
                      <span className="sr-only">Удалить</span>
                      <ExclamationTriangleIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <ClockIcon className="h-4 w-4 mr-1 text-gray-400" aria-hidden="true" />
                    <span>Время печати: {formatDuration(model.printing_time)}</span>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-10 dark:text-gray-400">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium dark:text-gray-300">Нет моделей</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Начните с добавления новой 3D модели.
              </p>
              <div className="mt-6">
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  Добавить новую модель
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Название</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Время печати</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {models.length > 0 ? (
                models.map((model) => (
                  <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 dark:text-gray-300">{model.id}</td>
                    <td className="py-3 px-4">
                      <Link to={`/models/${model.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        {model.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 dark:text-gray-300">{formatDuration(model.printing_time)}</td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Link to={`/models/${model.id}`}>
                          <Button variant="outline" size="xs">Просмотр</Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="xs" 
                          className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20"
                          onClick={() => openDeleteModal(model)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center dark:text-gray-400">
                    <CubeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-2 text-sm font-medium dark:text-gray-300">Нет моделей</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Начните с добавления новой 3D модели.
                    </p>
                    <div className="mt-6">
                      <Button onClick={() => setIsAddModalOpen(true)}>
                        <PlusCircleIcon className="h-5 w-5 mr-2" />
                        Добавить новую модель
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Model Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Добавить новую модель"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Название модели
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={newModel.name}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Введите название модели"
            />
          </div>
          
          <div>
            <label htmlFor="printing_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Время печати (ЧЧ:ММ)
            </label>
            <input
              type="text"
              name="printing_time"
              id="printing_time"
              value={newModel.printing_time}
              onChange={handleInputChange}
              required
              pattern="[0-9]{1,2}:[0-9]{2}"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="01:00"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Введите расчетное время печати в формате ЧЧ:ММ (например, 01:30 для 1 часа 30 минут)
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button 
              type="submit"
              isLoading={isSubmitting}
            >
              Создать
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Model Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => {
          if (!isSubmitting) {
            setIsDeleteModalOpen(false);
            setModelToDelete(null);
          }
        }}
        title="Удалить модель"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <ExclamationTriangleIcon className="h-6 w-6" />
            <p className="font-medium">Вы уверены, что хотите удалить эту модель?</p>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Это действие нельзя отменить. Файлы модели и все связанные данные будут удалены.
          </p>
          
          {modelToDelete && (
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
              <div><span className="font-medium dark:text-gray-300">Название:</span> <span className="dark:text-gray-300">{modelToDelete.name}</span></div>
              <div><span className="font-medium dark:text-gray-300">ID:</span> <span className="dark:text-gray-300">{modelToDelete.id}</span></div>
              <div><span className="font-medium dark:text-gray-300">Время печати:</span> <span className="dark:text-gray-300">{formatDuration(modelToDelete.printing_time)}</span></div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setModelToDelete(null);
              }}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              isLoading={isSubmitting}
            >
              Удалить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModelsList; 