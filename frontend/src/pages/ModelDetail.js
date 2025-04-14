import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getModel, updateModel, getPrintings, getPrinters } from '../services/api';
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
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { formatDuration, formatMinutesToHHMM, parseHHMMToMinutes } from '../utils/timeFormat';
import { useTranslation } from 'react-i18next';

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

  const fetchModelData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [modelRes, printingsRes, printersRes] = await Promise.all([
        getModel(id),
        getPrintings(),
        getPrinters()
      ]);
      
      setModel(modelRes.data);
      // Конвертируем минуты в формат HH:MM для формы редактирования
      setEditForm({ 
        name: modelRes.data.name, 
        printing_time: formatMinutesToHHMM(modelRes.data.printing_time)
      });
      
      // Filter printings for this model
      const modelPrintings = printingsRes.data.filter(
        printing => printing.model_id === parseInt(id)
      );
      setPrintings(modelPrintings);
      setPrinters(printersRes.data);
    } catch (error) {
      console.error('Error fetching model data:', error);
      setError(t('models.fetchError'));
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
      setError(t('models.updateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPrinterName = (printerId) => {
    const printer = printers.find(p => p.id === printerId);
    return printer ? printer.name : `${t('printers.printer')} #${printerId}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('common.unknown');
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
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

  if (loading) {
    return <div className="flex justify-center items-center h-full">{t('common.loading')}</div>;
  }

  if (!model) {
    return <div className="text-center py-8 dark:text-white">{t('models.notFound')}</div>;
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">{model.name}</h1>
        <div className="flex space-x-3">
          <Button onClick={() => navigate(-1)} variant="secondary">
            {t('common.back')}
          </Button>
          <Button onClick={() => setEditing(!editing)}>
            {editing ? t('common.cancel') : t('common.edit')}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{t('common.error')}</h3>
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          </div>
        </div>
      )}

      {editing ? (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">{t('common.edit')} {t('models.title')}</h2>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('models.name')}
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
              <label htmlFor="printing_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('models.printingTime')} (HH:MM)
              </label>
              <input
                type="text"
                id="printing_time"
                name="printing_time"
                value={editForm.printing_time}
                onChange={handleEditChange}
                required
                pattern="[0-9]{1,2}:[0-9]{2}"
                placeholder={t('models.enterHHMM')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={isSubmitting}>{t('common.save')}</Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Model Details Card */}
          <Card className="p-4 lg:col-span-1">
            <div className="flex flex-col h-full">
              {/* Model Icon */}
              <div className="p-4 flex justify-center items-center h-32 mb-4 bg-blue-50 dark:bg-blue-900/20">
                <CubeIcon className="h-16 w-16 text-blue-500 dark:text-blue-400" />
              </div>
              
              <h2 className="text-lg font-semibold mb-3 dark:text-white">{t('models.modelDetails')}</h2>
              <div className="space-y-3 flex-grow">
                <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <ClockIcon className="h-4 w-4 mr-1 text-gray-400" aria-hidden="true" />
                  <span>{t('models.printingTime')}: {formatDuration(model.printing_time)}</span>
                </div>
                
                <div className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
                  <div>
                    <span className="font-medium dark:text-gray-300">{t('models.successRate')}:</span>
                    <span className="ml-2 dark:text-gray-300">{successRate}%</span>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <PrinterIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
                  <div>
                    <span className="font-medium dark:text-gray-300">{t('models.totalPrints')}:</span>
                    <span className="ml-2 dark:text-gray-300">{printings.length}</span>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
                  <div>
                    <span className="font-medium dark:text-gray-300">{t('printers.averagePrintTime')}:</span>
                    <span className="ml-2 dark:text-gray-300">{formatDuration(averagePrintTime)}</span>
                  </div>
                </div>
                
                {successRate > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium dark:text-gray-300 mb-1">{t('models.successRate')}</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          successRate > 75 ? 'bg-green-500' : 
                          successRate > 50 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${successRate}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
          
          {/* Active Prints Card */}
          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">{t('models.activePrints')}</h2>
            
            {activePrintings.length > 0 ? (
              <div className="space-y-4">
                {activePrintings.map(printing => (
                  <div key={printing.id} className="border dark:border-gray-700 rounded-lg p-3">
                    <div className="flex justify-between mb-2">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-sm">
                      <div className="flex items-center dark:text-gray-300">
                        <CalendarIcon className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                        <span>{t('models.started')}: {formatDate(printing.start_time)}</span>
                      </div>
                      
                      {printing.real_time_stop && (
                        <div className="flex items-center dark:text-gray-300">
                          <CalendarIcon className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                          <span>{t('models.completed')}: {formatDate(printing.real_time_stop)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm dark:text-gray-300">
                        <span>{t('models.progress')}</span>
                        <span>{Math.round(printing.progress || 0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${printing.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-right">
                      <Link to={`/printings/${printing.id}`}>
                        <Button variant="outline" size="xs">{t('common.view')} {t('printings.details')}</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 dark:text-gray-400">
                <CubeIcon className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                <p>{t('models.noActivePrints')}</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Print History Table */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">{t('models.printHistory')}</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('printings.printer')}</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.status')}</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('models.started')}</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('models.completed')}</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('printings.duration')}</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions')}</th>
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
                        Math.round((new Date(printing.real_time_stop) - new Date(printing.start_time)) / (1000 * 60 * 60) * 10) / 10 + ' hrs' : 
                        t('common.unknown')
                      }
                    </td>
                    <td className="py-3 px-4">
                      <Link to={`/printings/${printing.id}`}>
                        <Button variant="outline" size="xs">{t('common.view')}</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500 dark:text-gray-400">
                    {t('models.noPrintHistory')}
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