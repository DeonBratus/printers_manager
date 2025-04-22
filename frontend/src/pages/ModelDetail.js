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
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { formatDuration, formatMinutesToHHMM, parseHHMMToMinutes } from '../utils/timeFormat';
import { useTranslation } from 'react-i18next';
import ModelFiles from '../components/ModelFiles';
import GCodeFiles from '../components/GCodeFiles';
import ModelRelations from '../components/ModelRelations';
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
      
      setModel(modelRes.data);
      // Конвертируем минуты в формат HH:MM для формы редактирования
      setEditForm({ 
        name: modelRes.data.name, 
        description: modelRes.data.description || '',
        printing_time: formatMinutesToHHMM(modelRes.data.printing_time)
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

      {editing ? (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Редактирование модели</h2>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Название
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={editForm.name}
                onChange={handleEditChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Описание
              </label>
              <textarea
                id="description"
                name="description"
                value={editForm.description || ''}
                onChange={handleEditChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="printing_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Время печати (ЧЧ:ММ)
              </label>
              <input
                type="text"
                id="printing_time"
                name="printing_time"
                value={editForm.printing_time}
                onChange={handleEditChange}
                required
                pattern="[0-9]{1,2}:[0-9]{2}"
                placeholder="Введите время в формате ЧЧ:ММ"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={isSubmitting}>Сохранить</Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          {/* Файлы моделей и G-код (перемещено выше) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <ModelFiles modelId={id} />
            <GCodeFiles modelId={id} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Область 3D Модели */}
            <Card className="p-4 lg:col-span-8">
              <div className="flex flex-col h-full">
                {/* Просмотр 3D модели */}
                <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-4" style={{ height: "600px" }}>
                  {modelFiles.length > 0 ? (
                    <>
                      <div className="h-full w-full">
                        {currentFile && (
                          <ModelFullView 
                            color={modelColors[currentFileIndex % modelColors.length]}
                            fileId={currentFile.id}
                          />
                        )}
                      </div>
                      
                      {/* Кнопки навигации */}
                      {hasMultipleFiles && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                          <button 
                            onClick={prevModelFile}
                            className="p-2 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            title="Предыдущая модель"
                          >
                            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                          </button>
                          <div className="px-3 py-2 bg-white dark:bg-gray-700 rounded-full text-sm shadow text-gray-700 dark:text-gray-300">
                            {currentFileIndex + 1} / {modelFiles.length}
                          </div>
                          <button 
                            onClick={nextModelFile}
                            className="p-2 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            title="Следующая модель"
                          >
                            <ArrowRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <CubeIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Нет файлов 3D-моделей</p>
                    </div>
                  )}
                </div>
                
                {/* Информация о файле */}
                {currentFile && (
                  <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2 dark:text-white">Информация о файле:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-medium dark:text-gray-300">Имя файла:</span> <span className="dark:text-gray-300 ml-1">{currentFile.filename}</span></div>
                      <div><span className="font-medium dark:text-gray-300">Тип файла:</span> <span className="dark:text-gray-300 ml-1">{currentFile.file_type.toUpperCase()}</span></div>
                      <div><span className="font-medium dark:text-gray-300">Размер файла:</span> <span className="dark:text-gray-300 ml-1">{Math.round(currentFile.file_size / 1024)} КБ</span></div>
                      <div><span className="font-medium dark:text-gray-300">Дата загрузки:</span> <span className="dark:text-gray-300 ml-1">{formatDate(currentFile.created_at)}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Детали и статистика модели */}
            <Card className="p-4 lg:col-span-4">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Детали модели</h2>
              <div className="space-y-4">
                {model.description && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-medium mb-2 dark:text-white">Описание:</h3>
                    <p className="text-gray-700 dark:text-gray-300">{model.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
                      <h3 className="font-medium dark:text-white">Время печати</h3>
                    </div>
                    <p className="text-xl font-semibold dark:text-gray-300">{formatDuration(model.printing_time)}</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <ChartBarIcon className="h-5 w-5 mr-2 text-green-500" />
                      <h3 className="font-medium dark:text-white">Успешность печати</h3>
                    </div>
                    <p className="text-xl font-semibold dark:text-gray-300">{successRate}%</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <PrinterIcon className="h-5 w-5 mr-2 text-purple-500" />
                      <h3 className="font-medium dark:text-white">Всего печатей</h3>
                    </div>
                    <p className="text-xl font-semibold dark:text-gray-300">{printings.length}</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <ClockIcon className="h-5 w-5 mr-2 text-amber-500" />
                      <h3 className="font-medium dark:text-white">Среднее время печати</h3>
                    </div>
                    <p className="text-xl font-semibold dark:text-gray-300">{averagePrintTime} ч.</p>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Активные печати */}
            <Card className="p-4 lg:col-span-12">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Активные печати</h2>
              
              {activePrintings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activePrintings.map(printing => (
                    <div key={printing.id} className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between mb-3">
                        <div className="flex items-center">
                          <PrinterIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
                          <Link 
                            to={`/printers/${printing.printer_id}`} 
                            className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {getPrinterName(printing.printer_id)}
                          </Link>
                        </div>
                        <StatusBadge status={printing.status} />
                      </div>
                      
                      <div className="space-y-2 mb-3 text-sm">
                        <div className="flex items-center dark:text-gray-300">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                          <span>Начало: {formatDate(printing.start_time)}</span>
                        </div>
                        
                        {printing.real_time_stop && (
                          <div className="flex items-center dark:text-gray-300">
                            <CalendarIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                            <span>Завершение: {formatDate(printing.real_time_stop)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm dark:text-gray-300">
                          <span>Прогресс печати</span>
                          <span>{Math.round(printing.progress || 0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" 
                            style={{ width: `${printing.progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="mt-4 text-right">
                        <Link to={`/printings/${printing.id}`}>
                          <Button variant="outline" size="sm">Подробнее</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 dark:text-gray-400">
                  <CubeIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                  <p>Нет активных печатей</p>
                </div>
              )}
            </Card>
          </div>
          
          {/* Связанные модели */}
          <ModelRelations modelId={id} studioId={model.studio_id} />
        </>
      )}

      {/* История печатей */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">История печатей</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Принтер</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Начало печати</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Завершение печати</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Длительность</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {completedPrintings.length > 0 ? (
                completedPrintings.map(printing => (
                  <tr key={printing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 dark:text-gray-300">{printing.id}</td>
                    <td className="py-3 px-4">
                      <Link to={`/printers/${printing.printer_id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        {getPrinterName(printing.printer_id)}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={printing.status} />
                    </td>
                    <td className="py-3 px-4 dark:text-gray-300">{formatDate(printing.start_time)}</td>
                    <td className="py-3 px-4 dark:text-gray-300">{formatDate(printing.real_time_stop)}</td>
                    <td className="py-3 px-4 dark:text-gray-300">
                      {printing.real_time_stop ? 
                        Math.round((new Date(printing.real_time_stop) - new Date(printing.start_time)) / (1000 * 60 * 60) * 10) / 10 + ' ч.' : 
                        'Не завершена'
                      }
                    </td>
                    <td className="py-3 px-4">
                      <Link to={`/printings/${printing.id}`}>
                        <Button variant="outline" size="xs">Просмотр</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500 dark:text-gray-400">
                    Нет истории печатей
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ModelDetail; 