import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getModel, updateModel, getPrintings, getPrinters, getModelFiles } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';
import { 
  ClockIcon, 
  CubeIcon, 
  PrinterIcon, 
  CalendarIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { formatDuration, formatMinutesToHHMM, parseHHMMToMinutes } from '../utils/timeFormat';
import { useTranslation } from 'react-i18next';
import ModelFiles from '../components/ModelFiles';
import GCodeFiles from '../components/GCodeFiles';
import ModelCollections from '../components/ModelCollections';
import ModelViewer from '../components/ModelViewer';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import ModelCube from '../components/ModelCube';
import ModelFullView from '../components/ModelFullView';

const ModelDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState(null);
  const [printings, setPrintings] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', printing_time: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [modelFiles, setModelFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [modelColors] = useState(['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444']);
  const [activeTab, setActiveTab] = useState('files'); // 'files', 'gcode', 'collections'

  const fetchModelData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [modelRes, printingsRes, printersRes, filesRes] = await Promise.all([
        getModel(id),
        getPrintings(),
        getPrinters(),
        getModelFiles(id)
      ]);
      
      console.log("Model data from API:", modelRes.data);
      
      // Make a copy of the model data to ensure collections are properly preserved
      const modelData = { ...modelRes.data };
      
      // If collections array isn't present or is empty, initialize it
      if (!modelData.collections || !Array.isArray(modelData.collections)) {
        modelData.collections = [];
      }
      
      console.log("Model with collections:", modelData);
      
      setModel(modelData);
      
      // Конвертируем минуты в формат HH:MM для формы редактирования
      setEditForm({ 
        name: modelData.name, 
        description: modelData.description || '',
        printing_time: formatMinutesToHHMM(modelData.printing_time)
      });
      
      // Filter printings for this model
      const modelPrintings = printingsRes.data.filter(
        printing => printing.model_id === parseInt(id)
      );
      setPrintings(modelPrintings);
      setPrinters(printersRes.data);
      
      // Filter only 3D model files (STL, OBJ, etc)
      const supportedModelFiles = (filesRes.data || []).filter(
        file => ['stl', 'obj', '3mf', 'amf'].includes(file.file_type.toLowerCase())
      );
      setModelFiles(supportedModelFiles);
      setCurrentFileIndex(supportedModelFiles.length > 0 ? 0 : -1);
    } catch (error) {
      console.error('Error fetching model data:', error);
      setError('Ошибка при загрузке данных модели');
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchModelData();
  }, [fetchModelData]);

  const handleFilesUpdated = useCallback(() => {
    fetchModelData();
  }, [fetchModelData]);

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Parse HH:MM format to minutes for API
      const modelData = {
        ...editForm,
        printing_time: parseHHMMToMinutes(editForm.printing_time)
      };
      
      await updateModel(id, modelData);
      setEditing(false);
      await fetchModelData();
    } catch (error) {
      console.error('Error updating model:', error);
      setError('Ошибка при обновлении модели');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPrinterName = (printerId) => {
    const printer = printers.find(p => p.id === printerId);
    return printer ? printer.name : `Принтер #${printerId}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Неизвестно';
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
  };

  const calculateSuccessRate = () => {
    if (printings.length === 0) return 0;
    const completedPrints = printings.filter(p => p.status === 'completed').length;
    return Math.round((completedPrints / printings.length) * 100);
  };

  const calculateAveragePrintTime = () => {
    const completedPrints = printings.filter(p => p.status === 'completed' && p.start_time && p.real_time_stop);
    
    if (completedPrints.length === 0) return 0;
    
    const totalDuration = completedPrints.reduce((sum, printing) => {
      const start = new Date(printing.start_time);
      const end = new Date(printing.real_time_stop);
      return sum + (end - start);
    }, 0);
    
    // Convert to hours and round to 1 decimal place
    return Math.round((totalDuration / completedPrints.length) / (1000 * 60 * 60) * 10) / 10;
  };
  
  const nextModelFile = () => {
    if (modelFiles.length > 1) {
      setCurrentFileIndex((prev) => (prev + 1) % modelFiles.length);
    }
  };
  
  const prevModelFile = () => {
    if (modelFiles.length > 1) {
      setCurrentFileIndex((prev) => (prev - 1 + modelFiles.length) % modelFiles.length);
    }
  };
  
  const getCurrentModelFile = () => {
    return currentFileIndex >= 0 && currentFileIndex < modelFiles.length ? 
      modelFiles[currentFileIndex] : null;
  };

  // Обработчик обновления коллекций
  const handleCollectionsChanged = () => {
    fetchModelData();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Загрузка...</div>;
  }

  if (!model) {
    return <div className="text-center py-8 dark:text-white">Модель не найдена</div>;
  }

  // Calculate statistics
  const successRate = calculateSuccessRate();
  const averagePrintTime = calculateAveragePrintTime();
  
  // Sort printings by date (newest first)
  const sortedPrintings = [...printings].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  
  // Get active printings (printing or paused)
  const activePrintings = sortedPrintings.filter(p => p.status === 'printing' || p.status === 'paused');
  
  // Get completed/historical printings
  const completedPrintings = sortedPrintings.filter(p => p.status !== 'printing' && p.status !== 'paused');
  
  // Get current model file
  const currentFile = getCurrentModelFile();
  const hasMultipleFiles = modelFiles.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">{model.name}</h1>
        <div className="flex space-x-3">
          <Button onClick={() => navigate(-1)} variant="secondary">
            Назад
          </Button>
          <Button onClick={() => setEditing(!editing)}>
            {editing ? 'Отмена' : 'Редактировать'}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 p-4 rounded-md text-red-700">
          <ExclamationCircleIcon className="h-5 w-5 inline mr-2" />
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Model Details */}
        <div className="md:col-span-2">
          {editing ? (
            <Card>
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Редактирование модели</h2>
                <form onSubmit={handleEditSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Название</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Описание</label>
                      <textarea
                        name="description"
                        value={editForm.description}
                        onChange={handleEditChange}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Время печати (ЧЧ:ММ)</label>
                      <input
                        type="text"
                        name="printing_time"
                        value={editForm.printing_time}
                        onChange={handleEditChange}
                        pattern="^([0-9]+:[0-5][0-9]|[0-9]+)$"
                        title="Формат: ЧЧ:ММ или минуты"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">Формат: ЧЧ:ММ или общее количество минут</p>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditing(false)}
                        disabled={isSubmitting}
                      >
                        Отмена
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </Card>
          ) : (
            <>
              {/* Model visualization */}
              <Card className="mb-6">
                <div className="relative h-80">
                  {currentFile ? (
                    <ModelFullView file={currentFile} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ModelCube 
                        color={modelColors[0]} 
                        size="large" 
                      />
                    </div>
                  )}
                  
                  {hasMultipleFiles && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                      <button
                        onClick={prevModelFile}
                        className="bg-white dark:bg-gray-800 rounded-full p-2 shadow hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <ArrowLeftIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      </button>
                      <button
                        onClick={nextModelFile}
                        className="bg-white dark:bg-gray-800 rounded-full p-2 shadow hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <ArrowRightIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">ID</div>
                      <div className="mt-1 dark:text-white">{model.id}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Время печати</div>
                      <div className="mt-1 flex items-center dark:text-white">
                        <ClockIcon className="h-5 w-5 text-gray-400 mr-1" />
                        {formatMinutesToHHMM(model.printing_time)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Дата создания</div>
                      <div className="mt-1 dark:text-white">{formatDate(model.created_at)}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Успешность печати</div>
                      <div className="mt-1 dark:text-white">{successRate}%</div>
                    </div>
                  </div>
                  
                  {model.description && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Описание</div>
                      <div className="mt-1 dark:text-white">{model.description}</div>
                    </div>
                  )}
                </div>
              </Card>
              
              {/* Tabs for files, G-code, and collections */}
              <Card>
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="flex -mb-px">
                    <button
                      className={`px-4 py-3 font-medium text-sm border-b-2 ${
                        activeTab === 'files'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      onClick={() => setActiveTab('files')}
                    >
                      <CubeIcon className="h-5 w-5 inline mr-2" />
                      Файлы модели
                    </button>
                    <button
                      className={`px-4 py-3 font-medium text-sm border-b-2 ${
                        activeTab === 'gcode'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      onClick={() => setActiveTab('gcode')}
                    >
                      <PrinterIcon className="h-5 w-5 inline mr-2" />
                      G-Code файлы
                    </button>
                    <button
                      className={`px-4 py-3 font-medium text-sm border-b-2 ${
                        activeTab === 'collections'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      onClick={() => setActiveTab('collections')}
                    >
                      <FolderIcon className="h-5 w-5 inline mr-2" />
                      Коллекции
                    </button>
                  </nav>
                </div>
                
                <div className="p-4">
                  {activeTab === 'files' && (
                    <ModelFiles 
                      modelId={model.id}
                      onFilesUpdated={handleFilesUpdated}
                    />
                  )}
                  
                  {activeTab === 'gcode' && (
                    <GCodeFiles 
                      modelId={model.id}
                      onFilesUpdated={fetchModelData}
                    />
                  )}
                  
                  {activeTab === 'collections' && (
                    <ModelCollections 
                      model={model}
                      onCollectionsChanged={handleCollectionsChanged}
                    />
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
        
        {/* Printings History */}
        <div>
          <Card>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium dark:text-white">История печати</h2>
            </div>
            <div className="p-4">
              {printings.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  Нет истории печати для этой модели
                </div>
              ) : (
                <>
                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        Всего печатей
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-blue-900 dark:text-blue-300">
                        {printings.length}
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-md">
                      <div className="text-sm font-medium text-green-700 dark:text-green-400">
                        Успешность
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-green-900 dark:text-green-300">
                        {successRate}%
                      </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-md">
                      <div className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        Среднее время
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-amber-900 dark:text-amber-300">
                        {averagePrintTime} ч
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-md">
                      <div className="text-sm font-medium text-purple-700 dark:text-purple-400">
                        Активных
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-purple-900 dark:text-purple-300">
                        {activePrintings.length}
                      </div>
                    </div>
                  </div>
                  
                  {/* Active printings */}
                  {activePrintings.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Активные печати
                      </h3>
                      <div className="space-y-3">
                        {activePrintings.slice(0, 3).map(printing => (
                          <div key={printing.id} className="bg-white dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <Link to={`/printings/${printing.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                  Печать #{printing.id}
                                </Link>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  {getPrinterName(printing.printer_id)}
                                </div>
                              </div>
                              <StatusBadge status={printing.status} />
                            </div>
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              Начата: {formatDate(printing.start_time)}
                            </div>
                          </div>
                        ))}
                        {activePrintings.length > 3 && (
                          <div className="text-center">
                            <Link to={`/printings?model_id=${model.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                              Показать все ({activePrintings.length})
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Completed printings */}
                  {completedPrintings.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        История печати
                      </h3>
                      <div className="space-y-3">
                        {completedPrintings.slice(0, 5).map(printing => (
                          <div key={printing.id} className="bg-white dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <Link to={`/printings/${printing.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                  Печать #{printing.id}
                                </Link>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  {getPrinterName(printing.printer_id)}
                                </div>
                              </div>
                              <StatusBadge status={printing.status} />
                            </div>
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(printing.start_time)}
                            </div>
                          </div>
                        ))}
                        {completedPrintings.length > 5 && (
                          <div className="text-center">
                            <Link to={`/printings?model_id=${model.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                              Показать все ({completedPrintings.length})
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModelDetail; 