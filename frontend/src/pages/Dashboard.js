import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPrinters, getPrintings, getPrinterStatusReport, createPrinter, createModel, getModels } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import { 
  PrinterIcon, SquaresPlusIcon, RectangleStackIcon, PlusCircleIcon, 
  ClockIcon, CubeIcon, DocumentChartBarIcon, BoltIcon, 
  FireIcon, CurrencyDollarIcon, WrenchScrewdriverIcon, ChartBarIcon,
  ArrowTrendingUpIcon, CalendarIcon, UserGroupIcon, AdjustmentsHorizontalIcon, RocketLaunchIcon, 
  SparklesIcon, BellAlertIcon, ShieldCheckIcon, StarIcon
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon, ExclamationCircleIcon, PauseCircleIcon, 
  ArrowPathIcon, XCircleIcon
} from '@heroicons/react/24/solid';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useStudio } from '../context/StudioContext';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, 
  LinearScale, BarElement, Title, PointElement, LineElement,
  RadialLinearScale, Filler 
} from 'chart.js';

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, 
  BarElement, Title, PointElement, LineElement, RadialLinearScale, Filler
);

const Dashboard = () => {
  const { t } = useTranslation();
  const { selectedStudio } = useStudio();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [printings, setPrintings] = useState([]);
  const [isAddingPrinter, setIsAddingPrinter] = useState(false);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [models, setModels] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [spotlightPrinter, setSpotlightPrinter] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [resources, setResources] = useState({
    filamentUsed: 0,
    printingTime: 0,
    successRate: 0,
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    costSaved: 0
  });
  
  // Modal states
  const [isAddPrinterModalOpen, setIsAddPrinterModalOpen] = useState(false);
  const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
  
  // Form states
  const [newPrinterData, setNewPrinterData] = useState({
    name: '',
    ip_address: '',
    model: '',
    status: 'idle'
  });
  
  const [newModelData, setNewModelData] = useState({
    name: '',
    description: '',
    printing_time: 0,
    filament_type: 'PLA',
    filament_length: 0,
    slicing_settings: ''
  });

  const fetchData = async () => {
    if (!selectedStudio) return;
    
    setLoading(true);
    try {
      // Fetch all data with selected studio ID
      const printersRes = await getPrinters(selectedStudio.id);
      const printersData = Array.isArray(printersRes) ? printersRes : printersRes.data || [];
      setPrinters(printersData);
      
      // Выбираем один принтер для детального отображения
      if (printersData.length > 0) {
        // Предпочитаем активный принтер
        const activePrinter = printersData.find(p => p.status === 'printing');
        setSpotlightPrinter(activePrinter || printersData[0]);
      }

      const modelsRes = await getModels(selectedStudio.id);
      setModels(Array.isArray(modelsRes) ? modelsRes : modelsRes.data || []);

      const printingsRes = await getPrintings(selectedStudio.id);
      const printingsData = Array.isArray(printingsRes) ? printingsRes : printingsRes.data || [];
      setPrintings(printingsData);
      
      // Calculate resources usage
      calculateResourcesUsage(printingsData);
      
      // Try to get status report if available
      try {
        const report = await getPrinterStatusReport(selectedStudio.id);
        setReportData(report.data);
      } catch (e) {
        console.log('Отчет статуса недоступен, используем расчетные данные');
      }
      
      setError(null);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Не удалось загрузить данные. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  };
  
  const calculateResourcesUsage = (printingsData) => {
    const completed = printingsData.filter(p => p.status === 'completed');
    const failed = printingsData.filter(p => p.status === 'error');
    
    // Calculate time usage (in hours)
    const totalTimeInMs = completed.reduce((acc, curr) => {
      if (curr.start_time && curr.real_time_stop) {
        return acc + (new Date(curr.real_time_stop) - new Date(curr.start_time));
      }
      return acc;
    }, 0);
    
    // Calculate filament usage (in meters)
    const totalFilament = completed.reduce((acc, curr) => {
      return acc + (curr.filament_length || 0);
    }, 0);
    
    // Success rate
    const successRate = completed.length > 0 
      ? (completed.length / (completed.length + failed.length)) * 100 
      : 0;
      
    // Примерная стоимость экономии (условно 500 руб за метр филамента)
    const costSaved = totalFilament * 500;
    
    setResources({
      filamentUsed: totalFilament.toFixed(1),
      printingTime: (totalTimeInMs / (1000 * 60 * 60)).toFixed(1),
      successRate: successRate.toFixed(1),
      totalJobs: printingsData.length,
      completedJobs: completed.length,
      failedJobs: failed.length,
      costSaved: costSaved.toFixed(0)
    });
  };

  useEffect(() => {
    fetchData();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(fetchData, 30000);
    return () => clearInterval(refreshInterval);
  }, [selectedStudio]); // Re-fetch when selected studio changes

  const handleAddPrinter = async (e) => {
    e.preventDefault();
    setIsAddingPrinter(true);
    
    try {
      const response = await createPrinter(newPrinterData);
      // Add new printer to the list
      setPrinters([...printers, response.data]);
      // Close modal and reset form
      setIsAddPrinterModalOpen(false);
      setNewPrinterData({
        name: '',
        ip_address: '',
        model: '',
        status: 'idle'
      });
    } catch (error) {
      console.error('Ошибка добавления принтера:', error);
    } finally {
      setIsAddingPrinter(false);
    }
  };
  
  const handleAddModel = async (e) => {
    e.preventDefault();
    setIsAddingModel(true);
    
    try {
      await createModel(newModelData);
      // Close modal and reset form
      setIsAddModelModalOpen(false);
      setNewModelData({
        name: '',
        description: '',
        printing_time: 0,
        filament_type: 'PLA',
        filament_length: 0,
        slicing_settings: ''
      });
    } catch (error) {
      console.error('Ошибка добавления модели:', error);
    } finally {
      setIsAddingModel(false);
    }
  };
  
  // Расчет рейтинга принтера (на основе успешности печати, скорости и т.д.)
  const calculatePrinterRating = (printer) => {
    // Имитация рейтинга (от 1 до 5)
    const printerPrintings = printings.filter(p => p.printer_id === printer.id);
    if (printerPrintings.length === 0) return 3;
    
    const successCount = printerPrintings.filter(p => p.status === 'completed').length;
    const successRate = printerPrintings.length > 0 ? successCount / printerPrintings.length : 0;
    
    // Базовый рейтинг на основе успешности
    let rating = 2 + (successRate * 3);
    
    // Ограничиваем от 1 до 5
    return Math.max(1, Math.min(5, rating)).toFixed(1);
  };

  // Generate chart data based on available data
  const generateStatusData = () => {
    const statusCounts = {
      idle: 0,
      printing: 0,
      paused: 0,
      error: 0,
      waiting: 0
    };
    
    // Count printers by status if status report is not available
    if (!reportData?.status_counts) {
      printers.forEach(printer => {
        if (statusCounts.hasOwnProperty(printer.status)) {
          statusCounts[printer.status]++;
        }
      });
    } else {
      // Use status counts from report
      Object.assign(statusCounts, reportData.status_counts);
    }
    
    const colors = {
      idle: '#22C55E',     // зеленый
      printing: '#3B82F6',  // синий
      paused: '#F59E0B',    // желтый
      error: '#EF4444',     // красный
      waiting: '#A855F7'    // фиолетовый
    };
    
    // Перевод статусов на русский
    const statusTranslations = {
      idle: 'Ожидание',
      printing: 'Печать',
      paused: 'Пауза',
      error: 'Ошибка',
      waiting: 'В очереди'
    };
    
    return {
      labels: Object.keys(statusCounts).map(status => statusTranslations[status] || status),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: Object.keys(statusCounts).map(status => colors[status]),
        borderWidth: 0
      }]
    };
  };

  const generatePrinterEfficiencyData = () => {
    if (!reportData || !reportData.printers || reportData.printers.length === 0) {
      return {
        labels: ['Нет данных'],
        datasets: [{
          label: 'Эффективность (%)',
          data: [0],
          backgroundColor: '#3B82F6',
        }]
      };
    }
    
    return {
      labels: reportData.printers.map(p => p.name),
      datasets: [{
        label: 'Эффективность (%)',
        data: reportData.printers.map(p => p.efficiency),
        backgroundColor: '#3B82F6',
      }]
    };
  };
  
  const generateMonthlyActivityData = () => {
    // Create dummy data for monthly activity if real data not available
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const currentMonth = new Date().getMonth();
    const last6Months = months.slice(Math.max(0, currentMonth - 5), currentMonth + 1);
    
    return {
      labels: last6Months,
      datasets: [
        {
          label: 'Успешных печатей',
          data: [12, 19, 15, 21, 18, resources.completedJobs || 8],
          fill: false,
          borderColor: '#22C55E',
          tension: 0.1
        },
        {
          label: 'Неудачных печатей',
          data: [3, 4, 2, 1, 2, resources.failedJobs || 1],
          fill: false,
          borderColor: '#EF4444',
          tension: 0.1
        }
      ]
    };
  };
  
  // Генерация случайных температурных данных для графика
  const generateTemperatureData = () => {
    const times = [];
    const extruderData = [];
    const bedData = [];
    
    // Получаем текущее время и генерируем данные за последние 30 минут
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000);
      times.push(time.getHours() + ":" + (time.getMinutes() < 10 ? '0' : '') + time.getMinutes());
      
      // Имитация температуры экструдера (190-230°C)
      const baseExtTemp = 210;
      const extVariation = Math.sin(i / 5) * 5 + (Math.random() * 4 - 2);
      extruderData.push(baseExtTemp + extVariation);
      
      // Имитация температуры стола (50-70°C)
      const baseBedTemp = 60;
      const bedVariation = Math.sin(i / 10) * 3 + (Math.random() * 2 - 1);
      bedData.push(baseBedTemp + bedVariation);
    }
    
    return {
      labels: times,
      datasets: [
        {
          label: 'Экструдер (°C)',
          data: extruderData,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Стол (°C)',
          data: bedData,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    };
  };

  // Генерация данных для температурного графика
  const temperatureData = generateTemperatureData();
  
  // Подготовка статуса и основных данных
  const printerStatusData = generateStatusData();
  const printerEfficiencyData = generatePrinterEfficiencyData();
  const monthlyActivityData = generateMonthlyActivityData();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative w-16 h-16">
          <div className="absolute w-16 h-16 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute w-16 h-16 border-t-4 border-blue-600 animate-spin rounded-full"></div>
        </div>
        <span className="ml-4 text-lg font-medium text-gray-700 dark:text-gray-300">Загрузка данных...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/30 rounded-xl mb-6 shadow-md">
        <div className="flex items-center">
          <ExclamationCircleIcon className="h-8 w-8 text-red-500 dark:text-red-400 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">Ошибка загрузки</h3>
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <button 
              className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
              onClick={fetchData}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и основные действия */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-600 to-purple-600 p-5 rounded-xl shadow-lg text-white">
        <div className="flex items-center">
          <div className="mr-3 p-3 bg-white/20 rounded-lg">
            <RocketLaunchIcon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Панель управления</h1>
            <p className="text-blue-100">Ваша студия 3D-печати под контролем</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="light" 
            size="md"
            onClick={() => setIsAddModelModalOpen(true)}
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
          >
            <PlusCircleIcon className="h-5 w-5 mr-1" />
            Новая модель
          </Button>
          <Button 
            variant="light" 
            size="md"
            onClick={() => setIsAddPrinterModalOpen(true)}
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
          >
            <PlusCircleIcon className="h-5 w-5 mr-1" />
            Новый принтер
          </Button>
        </div>
      </div>
      
      {/* Ключевые метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white relative overflow-hidden transform transition-all hover:scale-105">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm">Статус принтеров</p>
              <p className="text-3xl font-bold">{printers.filter(p => p.status === 'printing').length} / {printers.length}</p>
              <p className="text-blue-100 mt-1 text-sm">активных / всего</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <PrinterIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="absolute -right-8 -bottom-12 opacity-10">
            <PrinterIcon className="h-32 w-32" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white relative overflow-hidden transform transition-all hover:scale-105">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm">Активные печати</p>
              <p className="text-3xl font-bold">{printings.filter(p => p.status === 'printing').length}</p>
              <p className="text-green-100 mt-1 text-sm">заданий выполняется</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <RocketLaunchIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="absolute -right-8 -bottom-12 opacity-10">
            <RocketLaunchIcon className="h-32 w-32" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-4 text-white relative overflow-hidden transform transition-all hover:scale-105">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-100 text-sm">Требуют внимания</p>
              <p className="text-3xl font-bold">{printings.filter(p => p.status === 'waiting').length}</p>
              <p className="text-amber-100 mt-1 text-sm">заданий ожидают</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <BellAlertIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="absolute -right-8 -bottom-12 opacity-10">
            <BellAlertIcon className="h-32 w-32" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 text-white relative overflow-hidden transform transition-all hover:scale-105">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-sm">Производительность</p>
              <p className="text-3xl font-bold">{resources.successRate}%</p>
              <p className="text-purple-100 mt-1 text-sm">успешность печати</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="absolute -right-8 -bottom-12 opacity-10">
            <CheckCircleIcon className="h-32 w-32" />
          </div>
        </div>
      </div>
      
      {/* Основной контент панели управления - сетка с принтерами */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Левая колонка - список принтеров */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold dark:text-white flex items-center">
                <PrinterIcon className="h-5 w-5 mr-2 text-blue-500" />
                Принтеры
              </h2>
              <Link to="/printers">
                <button className="px-3 py-1 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/20">
                  Управление принтерами
                </button>
              </Link>
            </div>
            
            <div className="space-y-4">
              {printers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {printers.map(printer => (
                    <Link to={`/printers/${printer.id}`} key={printer.id}>
                      <div className={`p-4 rounded-lg border transition-colors ${
                        printer.status === 'printing' 
                          ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-800/20' 
                          : printer.status === 'error' 
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-800/20'
                            : 'bg-gray-50 dark:bg-gray-700/20 border-gray-200 dark:border-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/30'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200">{printer.name}</h3>
                          <StatusBadge status={printer.status} />
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400">{printer.model || 'Нет модели'}</div>
                        
                        {/* Текущая задача печати */}
                        {printer.status === 'printing' && (
                          <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-800/30">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {printings.find(p => p.printer_id === printer.id && p.status === 'printing')?.model_name || 'Неизвестная модель'}
                            </div>
                            <div className="flex justify-between items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>Прогресс</span>
                              <span>{Math.round(printings.find(p => p.printer_id === printer.id && p.status === 'printing')?.progress || 0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full" 
                                style={{ width: `${printings.find(p => p.printer_id === printer.id && p.status === 'printing')?.progress || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                    <PrinterIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p>Нет доступных принтеров</p>
                  <button 
                    onClick={() => setIsAddPrinterModalOpen(true)}
                    className="mt-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    + Добавить принтер
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Статус принтеров */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h2 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-500" />
              Статистика принтеров
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-48">
                <Doughnut 
                  data={printerStatusData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                      }
                    }
                  }}
                />
              </div>
              <div className="h-48">
                <Bar 
                  data={printerEfficiencyData}
                  options={{
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, max: 100 } }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Правая колонка - активные задачи и требующие внимания */}
        <div className="lg:col-span-5 space-y-6">
          {/* Активные задачи печати */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold dark:text-white flex items-center">
                <RocketLaunchIcon className="h-5 w-5 mr-2 text-blue-500" />
                Активные задачи
              </h2>
              <Link to="/printings">
                <button className="px-3 py-1 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/20">
                  Все задачи
                </button>
              </Link>
            </div>
            
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {printings.filter(p => p.status === 'printing').length > 0 ? (
                printings
                  .filter(p => p.status === 'printing')
                  .sort((a, b) => new Date(a.calculated_time_stop || 0) - new Date(b.calculated_time_stop || 0))
                  .map((printing) => (
                    <Link to={`/printings/${printing.id}`} key={printing.id}>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-800/20 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">{printing.model_name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                              <PrinterIcon className="h-4 w-4 mr-1" /> {printing.printer_name}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {Math.round(printing.progress || 0)}%
                          </div>
                        </div>
                        
                        <div className="w-full bg-blue-200 dark:bg-blue-800/50 rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full" 
                            style={{ width: `${printing.progress || 0}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>Начало: {new Date(printing.start_time).toLocaleTimeString()}</span>
                          <span>
                            Завершение: {printing.calculated_time_stop ? new Date(printing.calculated_time_stop).toLocaleTimeString() : '?'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
              ) : (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                    <PauseCircleIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p>Нет активных задач печати</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Задачи, требующие внимания */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold dark:text-white flex items-center">
                <BellAlertIcon className="h-5 w-5 mr-2 text-amber-500" />
                Требуют внимания
              </h2>
              <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                {printings.filter(p => p.status === 'waiting').length}
              </div>
            </div>
            
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {printings.filter(p => p.status === 'waiting').length > 0 ? (
                printings
                  .filter(p => p.status === 'waiting')
                  .map(printing => (
                    <Link to={`/printings/${printing.id}`} key={printing.id}>
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-800/20 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">{printing.model_name}</div>
                            <div className="flex items-center mt-1">
                              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                <PrinterIcon className="h-4 w-4 mr-1" />
                                {printing.printer_name}
                              </div>
                            </div>
                          </div>
                          <StatusBadge status={printing.status} />
                        </div>
                        
                        <div className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                          {printing.status === 'waiting' ? 'Ожидает запуска' : 'Требуется подтверждение завершения'}
                        </div>
                      </div>
                    </Link>
                  ))
              ) : (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                    <CheckCircleIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p>Нет задач, требующих внимания</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Модальное окно добавления принтера */}
      <Modal
        isOpen={isAddPrinterModalOpen}
        onClose={() => setIsAddPrinterModalOpen(false)}
        title="Добавить новый принтер"
      >
        <form onSubmit={handleAddPrinter} className="space-y-4">
          <div className="form-group">
            <label htmlFor="printer-name" className="form-label">
              Название принтера
            </label>
            <input
              type="text"
              id="printer-name"
              className="form-input"
              value={newPrinterData.name}
              onChange={(e) => setNewPrinterData({ ...newPrinterData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="printer-ip" className="form-label">
              IP-адрес
            </label>
            <input
              type="text"
              id="printer-ip"
              className="form-input"
              value={newPrinterData.ip_address}
              onChange={(e) => setNewPrinterData({ ...newPrinterData, ip_address: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="printer-model" className="form-label">
              Модель принтера
            </label>
            <input
              type="text"
              id="printer-model"
              className="form-input"
              value={newPrinterData.model}
              onChange={(e) => setNewPrinterData({ ...newPrinterData, model: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAddPrinterModalOpen(false)}
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isAddingPrinter}
            >
              {isAddingPrinter ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </Modal>
      
      {/* Модальное окно добавления модели */}
      <Modal
        isOpen={isAddModelModalOpen}
        onClose={() => setIsAddModelModalOpen(false)}
        title="Добавить новую модель"
      >
        <form onSubmit={handleAddModel} className="space-y-4">
          <div className="form-group">
            <label htmlFor="model-name" className="form-label">
              Название модели
            </label>
            <input
              type="text"
              id="model-name"
              className="form-input"
              value={newModelData.name}
              onChange={(e) => setNewModelData({ ...newModelData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="model-description" className="form-label">
              Описание
            </label>
            <textarea
              id="model-description"
              rows={3}
              className="form-input"
              value={newModelData.description}
              onChange={(e) => setNewModelData({ ...newModelData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="model-time" className="form-label">
                Время печати (ч)
              </label>
              <input
                type="text"
                id="model-time"
                min="0"
                step="0.1"
                className="form-input"
                value={newModelData.printing_time}
                onChange={(e) => setNewModelData({ ...newModelData, printing_time: parseFloat(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="model-filament-length" className="form-label">
                Длина филамента (м)
              </label>
              <input
                type="number"
                id="model-filament-length"
                min="0"
                className="form-input"
                value={newModelData.filament_length}
                onChange={(e) => setNewModelData({ ...newModelData, filament_length: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="model-filament-type" className="form-label">
              Тип филамента
            </label>
            <select
              id="model-filament-type"
              className="form-input"
              value={newModelData.filament_type}
              onChange={(e) => setNewModelData({ ...newModelData, filament_type: e.target.value })}
            >
              <option value="PLA">PLA</option>
              <option value="ABS">ABS</option>
              <option value="PETG">PETG</option>
              <option value="TPU">TPU</option>
              <option value="Nylon">Нейлон</option>
              <option value="Other">Другое</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAddModelModalOpen(false)}
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isAddingModel}
            >
              {isAddingModel ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;