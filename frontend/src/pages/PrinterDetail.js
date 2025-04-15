import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  getPrinter, 
  updatePrinter, 
  getPrintings, 
  getModels, 
  startPrinter, 
  pausePrinter, 
  resumePrinter, 
  stopPrinter, 
  confirmPrinting,
  getPrinterParameters,
  addPrinterParameter,
  deletePrinterParameter
} from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { formatDuration, formatMinutesToHHMM } from '../utils/timeFormat';
import { 
  ClockIcon, 
  CalendarIcon, 
  ExclamationCircleIcon,
  PrinterIcon,
  CubeIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  PencilIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  TagIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const PrinterDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [printer, setPrinter] = useState(null);
  const [printings, setPrintings] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', model: '' });
  const [startForm, setStartForm] = useState({ model_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Parameters state
  const [parameters, setParameters] = useState([]);
  const [newParameter, setNewParameter] = useState({ name: '', value: '' });
  const [showParamForm, setShowParamForm] = useState(false);
  
  // Modals
  const [showStartForm, setShowStartForm] = useState(false);
  const [isStopReasonModalOpen, setIsStopReasonModalOpen] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Активная вкладка для навигации в секции истории печати
  const [activeHistoryTab, setActiveHistoryTab] = useState('recent');

  const fetchPrinterData = useCallback(async () => {
    try {
      if (loading) {
        setError(null);
      } else {
        setRefreshing(true);
      }
      
      // Сначала загрузим основные данные принтера, printings и models
      try {
        const [printerRes, printingsRes, modelsRes] = await Promise.all([
          getPrinter(id),
          getPrintings(),
          getModels()
        ]);
        
        // Обновление данных принтера
        setPrinter(prevPrinter => {
          if (!prevPrinter || prevPrinter.status !== printerRes.data.status) {
            return printerRes.data;
          }
          return {
            ...prevPrinter,
            status: printerRes.data.status,
            total_print_time: printerRes.data.total_print_time,
            total_downtime: printerRes.data.total_downtime
          };
        });
        
        if (!editing) {
          setEditForm({ 
            name: printerRes.data.name,
            model: printerRes.data.model || ''
          });
        }
        
        // Обновление истории печати
        setPrintings(prevPrintings => {
          const printerPrintings = printingsRes.data.filter(
            printing => printing.printer_id === parseInt(id)
          );
          
          if (!prevPrintings.length || prevPrintings.length !== printerPrintings.length) {
            return printerPrintings;
          }
          
          return printerPrintings.map(newPrinting => {
            const oldPrinting = prevPrintings.find(p => p.id === newPrinting.id);
            if (!oldPrinting) return newPrinting;
            
            return {
              ...oldPrinting,
              status: newPrinting.status,
              progress: newPrinting.progress,
              real_time_stop: newPrinting.real_time_stop
            };
          });
        });
        
        setModels(modelsRes.data);
        
        // Отдельный запрос для параметров
        try {
          const paramsRes = await getPrinterParameters(id);
          setParameters(paramsRes.data || []);
        } catch (paramsError) {
          console.error("Error fetching printer parameters:", paramsError);
          // Ошибка получения параметров не блокирует отображение страницы
          setParameters([]);
        }
        
      } catch (error) {
        console.error('Error fetching printer data:', error);
        setError('Failed to load printer data. Please try refreshing the page.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, loading, editing]);

  useEffect(() => {
    fetchPrinterData();
    
    // Периодическое обновление данных
    const refreshInterval = setInterval(() => {
      fetchPrinterData().catch(err => console.error("Error in periodic refresh:", err));
    }, 10000); // каждые 10 секунд
    
    return () => clearInterval(refreshInterval);
  }, [fetchPrinterData]);

  // Обработчики для редактирования имени принтера
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await updatePrinter(id, editForm);
      setEditing(false);
      await fetchPrinterData();
    } catch (error) {
      console.error('Error updating printer:', error);
      setError('Failed to update printer. ' + (error.response?.data?.detail || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчики для запуска печати
  const handleStartChange = (e) => {
    setStartForm({ ...startForm, [e.target.name]: e.target.value });
  };

  const handleStart = async (e) => {
    e.preventDefault();
    
    if (!startForm.model_id) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await startPrinter(id, {
        model_id: parseInt(startForm.model_id)
      });
      setShowStartForm(false);
      setStartForm({ model_id: '' });
      await fetchPrinterData();
    } catch (error) {
      console.error('Error starting print job:', error);
      setError('Failed to start print job. ' + (error.response?.data?.detail || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчики для управления печатью
  const handlePause = async () => {
    try {
      setError(null);
      await pausePrinter(id);
      await fetchPrinterData();
    } catch (error) {
      console.error('Error pausing printer:', error);
      setError('Failed to pause printer. ' + (error.response?.data?.detail || 'Please try again.'));
    }
  };

  const handleResume = async () => {
    try {
      setError(null);
      await resumePrinter(id);
      await fetchPrinterData();
    } catch (error) {
      console.error('Error resuming printer:', error);
      setError('Failed to resume printer. ' + (error.response?.data?.detail || 'Please try again.'));
    }
  };

  const handleStop = async () => {
    setStopReason('');
    setIsStopReasonModalOpen(true);
  };
  
  const confirmStop = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      
      await stopPrinter(id, { reason: stopReason });
      
      setIsStopReasonModalOpen(false);
      await fetchPrinterData();
    } catch (error) {
      console.error('Error stopping printer:', error);
      setError('Failed to stop printer. ' + (error.response?.data?.detail || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPrinting = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await confirmPrinting(id);
      setShowConfirmModal(false);
      await fetchPrinterData();
    } catch (error) {
      console.error('Error confirming print job completion:', error);
      setError('Failed to confirm print job. ' + (error.response?.data?.detail || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчики для параметров принтера
  const handleParameterChange = (e) => {
    setNewParameter({ ...newParameter, [e.target.name]: e.target.value });
  };

  const handleAddParameter = async (e) => {
    e.preventDefault();
    
    if (!newParameter.name.trim()) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await addPrinterParameter(id, newParameter);
      setNewParameter({ name: '', value: '' });
      setShowParamForm(false);
      await fetchPrinterData();
    } catch (error) {
      console.error('Error adding parameter:', error);
      setError('Failed to add parameter. ' + (error.response?.data?.detail || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteParameter = async (paramId) => {
    try {
      setError(null);
      await deletePrinterParameter(id, paramId);
      await fetchPrinterData();
    } catch (error) {
      console.error('Error deleting parameter:', error);
      setError('Failed to delete parameter. ' + (error.response?.data?.detail || 'Please try again.'));
    }
  };

  // Вспомогательные функции форматирования
  const formatTime = (minutes) => {
    if (minutes === null || minutes === undefined) return 'N/A';
    return formatDuration(minutes);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Расчет данных для отображения
  const currentPrinting = printings.find(p => 
    (p.status === 'printing' || p.status === 'paused') && 
    p.printer_id === parseInt(id)
  );

  // Найти завершенную но не подтвержденную печать
  const unconfirmedPrinting = printings.find(p => 
    p.progress === 100 && !p.real_time_stop && 
    p.printer_id === parseInt(id)
  );

  // Получить последние печати для истории
  const recentPrintings = printings
    .filter(p => p.status === 'completed' || p.status === 'cancelled')
    .sort((a, b) => new Date(b.real_time_stop) - new Date(a.real_time_stop))
    .slice(0, 5);

  // Все печати для полной истории
  const allPrintings = printings
    .filter(p => p.real_time_stop) // только завершенные
    .sort((a, b) => new Date(b.real_time_stop) - new Date(a.real_time_stop));

  // Расчет статистики
  const totalPrintJobs = printings.length;
  const completedPrintJobs = printings.filter(p => p.status === 'completed').length;
  const cancelledPrintJobs = printings.filter(p => p.status === 'cancelled').length;
  
  // Расчет эффективности
  const efficiency = completedPrintJobs > 0 
    ? (completedPrintJobs / (completedPrintJobs + cancelledPrintJobs) * 100).toFixed(1)
    : 'N/A';

  // Экраны загрузки и ошибок
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  if (!printer) {
    return (
      <div className="text-center py-10">
        <ExclamationCircleIcon className="h-12 w-12 mx-auto text-red-500" />
        <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">Printer not found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The printer you are looking for does not exist or has been deleted.
        </p>
        <div className="mt-6">
          <Button onClick={() => navigate('/printers')}>
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Printers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Верхняя панель с информацией о принтере */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="hidden md:block p-3 rounded-full bg-white/10">
                <PrinterIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <div className="flex items-center">
                  <Button 
                    variant="light" 
                    size="sm" 
                    onClick={() => navigate('/printers')}
                    className="mr-3"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </Button>
                  <h1 className="text-2xl font-bold text-white">
                    {editing ? (
                      <form onSubmit={handleEditSubmit} className="flex items-center">
                        <input
                          type="text"
                          name="name"
                          value={editForm.name}
                          onChange={handleEditChange}
                          className="px-2 py-1 rounded-md bg-white/20 border-white/30 text-white placeholder-white/60 focus:ring-blue-300 focus:border-blue-300"
                          required
                        />
                        <div className="ml-2 space-x-2">
                          <Button type="submit" variant="success" size="xs" disabled={isSubmitting}>
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="danger" size="xs" onClick={() => setEditing(false)}>
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center">
                        <span className="text-white">{printer.name}</span>
                        <button 
                          className="ml-2 text-white/70 hover:text-white"
                          onClick={() => setEditing(true)}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </h1>
                </div>
                <div className="mt-1 flex items-center">
                  <StatusBadge status={printer.status} variant="light" size="md" />
                  {printer.model && (
                    <span className="ml-3 text-sm text-white/80">
                      Model: {printer.model}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="light" 
                onClick={fetchPrinterData} 
                disabled={refreshing}
              >
                <ArrowPathIcon className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              
              {printer.status === 'idle' && (
                <Button
                  variant="success"
                  onClick={() => setShowStartForm(true)}
                >
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Start Print
                </Button>
              )}
              
              {printer.status === 'waiting' && (
                <Button
                  variant="success"
                  onClick={() => setShowConfirmModal(true)}
                >
                  <CheckIcon className="h-5 w-5 mr-2" />
                  Confirm Complete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Сообщение об ошибке */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
              <div className="mt-2">
                <Button variant="danger" size="sm" onClick={fetchPrinterData}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Основные карточки с информацией */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Техническая информация */}
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
          <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
            <WrenchScrewdriverIcon className="w-full h-full text-gray-800 dark:text-gray-300" />
          </div>
          <div className="p-6 relative">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
              <WrenchScrewdriverIcon className="h-5 w-5 mr-2 text-blue-500" />
              Технические данные
            </h2>
            
            <div className="space-y-4">
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Модель</h3>
                <div className="mt-1 flex items-center">
                  {editing ? (
                    <input
                      type="text"
                      name="model"
                      value={editForm.model}
                      onChange={handleEditChange}
                      className="px-2 py-1 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white w-full"
                      placeholder="Введите модель принтера"
                    />
                  ) : (
                    <p className="text-base font-medium dark:text-white">
                      {printer.model ? printer.model : 
                        <span className="text-gray-400 dark:text-gray-500 italic">Не указана</span>}
                    </p>
                  )}
                  {!editing && (
                    <button 
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      onClick={() => setEditing(true)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Статус</h3>
                <p className="mt-1 text-base font-medium flex items-center dark:text-white">
                  <StatusBadge status={printer.status} size="md" />
                  {currentPrinting && printer.status === 'printing' && (
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      Работает {formatMinutesToHHMM(Math.floor((new Date() - new Date(currentPrinting.start_time)) / 60000))}
                    </span>
                  )}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Общее время печати</h3>
                  <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatTime(printer.total_print_time)}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Время простоя</h3>
                  <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
                    {formatTime(printer.total_downtime)}
                  </p>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Статистика заданий</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Всего</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalPrintJobs}</p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Успешно</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{completedPrintJobs}</p>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Отменено</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">{cancelledPrintJobs}</p>
                  </div>
                </div>
                
                <div className="mt-3 text-center">
                  <div className="inline-block bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1">
                    <span className="text-sm">Эффективность: </span>
                    <span className={`text-sm font-semibold ${
                      parseFloat(efficiency) > 80 ? 'text-green-600 dark:text-green-400' : 
                      parseFloat(efficiency) > 50 ? 'text-amber-600 dark:text-amber-400' : 
                      'text-red-600 dark:text-red-400'
                    }`}>{efficiency === 'N/A' ? 'N/A' : `${efficiency}%`}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Пользовательские параметры */}
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
          <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
            <TagIcon className="w-full h-full text-gray-800 dark:text-gray-300" />
          </div>
          <div className="p-6 relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center text-gray-900 dark:text-white">
                <TagIcon className="h-5 w-5 mr-2 text-green-500" />
                Параметры принтера
              </h2>
              <Button 
                size="xs" 
                variant={showParamForm ? "danger" : "success"}
                onClick={() => setShowParamForm(!showParamForm)}
              >
                {showParamForm ? 'Отмена' : 'Добавить'}
              </Button>
            </div>
            
            {showParamForm && (
              <form onSubmit={handleAddParameter} className="mb-4 p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm space-y-3">
                <div>
                  <label htmlFor="param-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Название параметра
                  </label>
                  <input
                    id="param-name"
                    type="text"
                    name="name"
                    value={newParameter.name}
                    onChange={handleParameterChange}
                    className="px-3 py-2 border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white w-full"
                    placeholder="Например: Диаметр сопла"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="param-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Значение
                  </label>
                  <input
                    id="param-value"
                    type="text"
                    name="value"
                    value={newParameter.value}
                    onChange={handleParameterChange}
                    className="px-3 py-2 border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white w-full"
                    placeholder="Например: 0.4 мм"
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="success" 
                  fullWidth 
                  disabled={isSubmitting || !newParameter.name.trim()}
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить параметр'}
                </Button>
              </form>
            )}
            
            {parameters.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {parameters.map(param => (
                  <div 
                    key={param.id} 
                    className="flex justify-between items-center p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{param.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{param.value || '-'}</p>
                    </div>
                    <button 
                      className="ml-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                      onClick={() => handleDeleteParameter(param.id)}
                      title="Удалить параметр"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <TagIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 mb-3">Для этого принтера еще не добавлены параметры</p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowParamForm(true)}
                >
                  Добавить первый параметр
                </Button>
              </div>
            )}
          </div>
        </Card>
        
        {/* Текущее задание печати */}
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
          <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
            <CubeIcon className="w-full h-full text-gray-800 dark:text-gray-300" />
          </div>
          <div className="p-6 relative">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
              <CubeIcon className="h-5 w-5 mr-2 text-purple-500" />
              Текущее задание
            </h2>
            
            {currentPrinting ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  printer.status === 'printing' ? 'bg-blue-50 dark:bg-blue-900/20' : 
                  printer.status === 'paused' ? 'bg-amber-50 dark:bg-amber-900/20' : 
                  'bg-gray-50 dark:bg-gray-700/30'
                }`}>
                  <div className="flex items-center">
                    <CubeIcon className={`h-6 w-6 mr-2 ${
                      printer.status === 'printing' ? 'text-blue-500' : 
                      printer.status === 'paused' ? 'text-amber-500' : 
                      'text-gray-500'
                    }`} />
                    <h3 className="text-lg font-medium">
                      {currentPrinting.model_name}
                    </h3>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between mb-1 text-xs font-medium">
                      <span>Прогресс</span>
                      <span>{Math.round(currentPrinting.progress || 0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full ${
                          printer.status === 'printing' ? 'bg-blue-600 dark:bg-blue-500' : 
                          printer.status === 'paused' ? 'bg-amber-600 dark:bg-amber-500' : 
                          'bg-gray-600 dark:bg-gray-500'
                        }`}
                        style={{ width: `${currentPrinting.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Начало:</p>
                      <p className="font-medium">{formatDate(currentPrinting.start_time)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Окончание:</p>
                      <p className="font-medium">{formatDate(currentPrinting.calculated_time_stop)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-2">
                  {printer.status === 'printing' && (
                    <Button 
                      variant="warning" 
                      onClick={handlePause}
                    >
                      <PauseIcon className="h-5 w-5 mr-1" />
                      Пауза
                    </Button>
                  )}
                  
                  {printer.status === 'paused' && (
                    <Button 
                      variant="success" 
                      onClick={handleResume}
                    >
                      <PlayIcon className="h-5 w-5 mr-1" />
                      Продолжить
                    </Button>
                  )}
                  
                  {(printer.status === 'printing' || printer.status === 'paused') && (
                    <Button 
                      variant="danger" 
                      onClick={handleStop}
                    >
                      <StopIcon className="h-5 w-5 mr-1" />
                      Остановить
                    </Button>
                  )}
                  
                  <Link to={`/printings/${currentPrinting.id}`}>
                    <Button variant="outline">
                      <EyeIcon className="h-5 w-5 mr-1" />
                      Детали
                    </Button>
                  </Link>
                </div>
                
                {currentPrinting.progress >= 100 && (
                  <div className="mt-2 flex justify-center">
                    <Button 
                      variant="success"
                      onClick={() => setShowConfirmModal(true)}
                      size="lg"
                      fullWidth
                    >
                      <CheckIcon className="h-5 w-5 mr-2" />
                      Подтвердить завершение
                    </Button>
                  </div>
                )}
              </div>
            ) : unconfirmedPrinting ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center">
                    <CheckIcon className="h-6 w-6 mr-2 text-green-500" />
                    <h3 className="text-lg font-medium">
                      {unconfirmedPrinting.model_name}
                    </h3>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between mb-1 text-xs font-medium">
                      <span>Прогресс</span>
                      <span>100%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="h-2.5 rounded-full bg-green-600 dark:bg-green-500 w-full"
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-center">
                    <p className="text-green-700 dark:text-green-400 font-medium">
                      Задание печати завершено!
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Button 
                    variant="success"
                    onClick={() => setShowConfirmModal(true)}
                    size="lg"
                    fullWidth
                  >
                    <CheckIcon className="h-5 w-5 mr-2" />
                    Подтвердить завершение
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-6 mb-4">
                  <PrinterIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-1">Принтер простаивает</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {printer.status === 'idle' 
                    ? 'Принтер готов к новому заданию печати'
                    : `Принтер в статусе "${printer.status}"`}
                </p>
                
                {printer.status === 'idle' && (
                  <Button 
                    variant="primary"
                    size="lg"
                    onClick={() => setShowStartForm(true)}
                  >
                    <PlayIcon className="h-5 w-5 mr-2" />
                    Начать печать
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* История печати */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center text-gray-900 dark:text-white">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-orange-500" />
              История печати
            </h2>
            <div className="flex space-x-2">
              <button 
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeHistoryTab === 'recent' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                onClick={() => setActiveHistoryTab('recent')}
              >
                Последние
              </button>
              <button 
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeHistoryTab === 'all' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                onClick={() => setActiveHistoryTab('all')}
              >
                Все задания
              </button>
            </div>
          </div>
          
          {(activeHistoryTab === 'recent' ? recentPrintings : allPrintings).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Модель
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Статус
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Начало
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Завершение
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Длительность
                    </th>
                    <th scope="col" className="relative px-4 py-3">
                      <span className="sr-only">Действия</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(activeHistoryTab === 'recent' ? recentPrintings : allPrintings).map(printing => (
                    <tr key={printing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {printing.model_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <StatusBadge status={printing.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatDate(printing.start_time)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatDate(printing.real_time_stop)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {printing.real_time_stop ? 
                          formatMinutesToHHMM(Math.floor((new Date(printing.real_time_stop) - new Date(printing.start_time)) / 60000)) : 
                          '-'
                        }
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <Link 
                          to={`/printings/${printing.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Подробнее
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 mb-3">Для этого принтера еще нет истории печати</p>
              <Button 
                size="sm" 
                variant="primary"
                onClick={() => setShowStartForm(true)}
                disabled={printer.status !== 'idle'}
              >
                Начать первую печать
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Модальное окно для запуска новой печати */}
      <Modal
        isOpen={showStartForm}
        onClose={() => setShowStartForm(false)}
        title="Начать новую печать"
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowStartForm(false)}
              className="mr-2"
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleStart}
              isLoading={isSubmitting}
              disabled={!startForm.model_id || isSubmitting}
            >
              Начать печать
            </Button>
          </div>
        }
      >
        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label htmlFor="model_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Выберите модель для печати
            </label>
            <select
              id="model_id"
              name="model_id"
              value={startForm.model_id}
              onChange={handleStartChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              <option value="">Выберите модель</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({formatMinutesToHHMM(model.printing_time)})
                </option>
              ))}
            </select>
          </div>
          
          {startForm.model_id && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex">
                <CubeIcon className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <h4 className="text-lg font-medium text-blue-800 dark:text-blue-300">
                    Информация о задании
                  </h4>
                  <div className="mt-2 text-sm space-y-2">
                    <div className="flex items-center">
                      <PrinterIcon className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-blue-700 dark:text-blue-300">
                        Принтер: <span className="font-medium">{printer.name}</span>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <CubeIcon className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-blue-700 dark:text-blue-300">
                        Модель: <span className="font-medium">{models.find(m => m.id === parseInt(startForm.model_id))?.name}</span>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-blue-700 dark:text-blue-300">
                        Расчетное время: <span className="font-medium">
                          {models.find(m => m.id === parseInt(startForm.model_id))?.printing_time ? 
                            formatMinutesToHHMM(models.find(m => m.id === parseInt(startForm.model_id))?.printing_time) : 
                            'Неизвестно'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Модальное окно для подтверждения завершения печати */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Подтвердить завершение печати"
        size="md"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
              className="mr-2"
            >
              Отмена
            </Button>
            <Button
              variant="success"
              onClick={handleConfirmPrinting}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Подтвердить завершение
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex-shrink-0">
              <CheckIcon className="h-6 w-6 text-green-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-green-800 dark:text-green-300">
                Задание печати завершено
              </h3>
              <p className="mt-2 text-green-700 dark:text-green-400">
                Вы уверены, что задание печати успешно завершено?
              </p>
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            При подтверждении статус принтера будет изменен на "idle" (простаивает),
            а задание печати будет отмечено как успешно завершенное.
          </p>
        </div>
      </Modal>

      {/* Модальное окно для выбора причины остановки */}
      <Modal
        isOpen={isStopReasonModalOpen}
        onClose={() => setIsStopReasonModalOpen(false)}
        title="Почему вы останавливаете печать?"
        size="md"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsStopReasonModalOpen(false)}
              className="mr-2"
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              disabled={!stopReason || isSubmitting}
              onClick={confirmStop}
              isLoading={isSubmitting}
            >
              Остановить печать
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
            <div>
              <p className="text-gray-700 dark:text-gray-200">
                Пожалуйста, выберите причину остановки задания печати:
              </p>
            </div>
          </div>

          <div className="space-y-3 pl-2">
            <div className="flex items-center rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                id="success-early"
                name="stop-reason"
                type="radio"
                checked={stopReason === 'finished-early'}
                onChange={() => setStopReason('finished-early')}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
              />
              <label htmlFor="success-early" className="ml-3 flex flex-col cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Печать завершилась раньше (успех)
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Задание будет отмечено как успешное
                </span>
              </label>
            </div>
            <div className="flex items-center rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                id="emergency"
                name="stop-reason"
                type="radio"
                checked={stopReason === 'emergency'}
                onChange={() => setStopReason('emergency')}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
              />
              <label htmlFor="emergency" className="ml-3 flex flex-col cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Экстренная остановка (ошибка)
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Задание будет отмечено как неудачное
                </span>
              </label>
            </div>
            <div className="flex items-center rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                id="changed-mind"
                name="stop-reason"
                type="radio"
                checked={stopReason === 'changed-mind'}
                onChange={() => setStopReason('changed-mind')}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300"
              />
              <label htmlFor="changed-mind" className="ml-3 flex flex-col cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Передумал (отменено)
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Задание будет отмечено как отмененное
                </span>
              </label>
            </div>
            <div className="flex items-center rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                id="other"
                name="stop-reason"
                type="radio"
                checked={stopReason === 'other'}
                onChange={() => setStopReason('other')}
                className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300"
              />
              <label htmlFor="other" className="ml-3 flex flex-col cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Другая причина (отменено)
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Задание будет отмечено как отмененное
                </span>
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PrinterDetail; 