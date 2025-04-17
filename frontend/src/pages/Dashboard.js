import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPrinters, getPrintings, getPrinterStatusReport, createPrinter, createModel, getModels } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import { PrinterIcon, SquaresPlusIcon, RectangleStackIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationCircleIcon, PauseCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useStudio } from '../context/StudioContext';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Передаем ID выбранной студии
        const selectedStudioId = selectedStudio ? selectedStudio.id : null;
        const [printersResponse, printingsResponse, modelsResponse, reportsResponse] = await Promise.all([
          getPrinters(selectedStudioId),
          getPrintings(),
          getModels(selectedStudioId),
          getPrinterStatusReport()
        ]);

        const printersData = Array.isArray(printersResponse) ? printersResponse : printersResponse.data || [];
        const printingsData = Array.isArray(printingsResponse) ? printingsResponse : printingsResponse.data || [];
        const modelsData = Array.isArray(modelsResponse) ? modelsResponse : modelsResponse.data || [];
        const reportData = Array.isArray(reportsResponse) ? reportsResponse : reportsResponse.data || {};

        setPrinters(printersData);
        setPrintings(printingsData.filter(p => p.status === 'printing' || p.status === 'paused'));
        setModels(modelsData);
        setReportData(reportData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(t('dashboard.fetchError', 'Failed to load dashboard data. Please try refreshing the page.'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every minute
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [selectedStudio, t]); // Повторно загружаем данные при изменении выбранной студии
  
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
      console.error('Error adding printer:', error);
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
      console.error('Error adding model:', error);
    } finally {
      setIsAddingModel(false);
    }
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
      idle: '#22C55E',     // green
      printing: '#3B82F6',  // blue
      paused: '#F59E0B',    // yellow
      error: '#EF4444',     // red
      waiting: '#A855F7'    // purple
    };
    
    return {
      labels: Object.keys(statusCounts).map(status => t(`printers.status.${status}`)),
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
        labels: [t('common.noData')],
        datasets: [{
          label: t('common.efficiency') + ' (%)',
          data: [0],
          backgroundColor: '#3B82F6',
        }]
      };
    }
    
    return {
      labels: reportData.printers.map(p => p.name),
      datasets: [{
        label: t('common.efficiency') + ' (%)',
        data: reportData.printers.map(p => p.efficiency),
        backgroundColor: '#3B82F6',
      }]
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner-border text-primary" role="status">
          <div className="spinner"></div>
        </div>
        <span className="ml-3">{t('common.loading')}</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900 rounded-md mb-4">
        <div className="flex items-center">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 dark:text-red-300 mr-2" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      </div>
    );
  }

  const printerStatusData = generateStatusData();
  const printerEfficiencyData = generatePrinterEfficiencyData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">{t('navigation.dashboard')}</h1>
        <div className="flex space-x-3">
          <Button 
            variant="primary" 
            size="md"
            onClick={() => setIsAddModelModalOpen(true)}
          >
            <PlusCircleIcon className="h-5 w-5 mr-1" />
            {t('models.addNew')}
          </Button>
          <Button 
            variant="primary" 
            size="md"
            onClick={() => setIsAddPrinterModalOpen(true)}
          >
            <PlusCircleIcon className="h-5 w-5 mr-1" />
            {t('printers.addNew')}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2 dark:text-white">{t('printers.title')}</h2>
          <div className="h-64">
            <Pie data={printerStatusData} options={{ maintainAspectRatio: false }} />
          </div>
        </Card>
        
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2 dark:text-white">{t('dashboard.printerEfficiency')}</h2>
          <div className="h-64">
            <Bar 
              data={printerEfficiencyData} 
              options={{
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, max: 100 } }
              }} 
            />
          </div>
        </Card>
        
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2 dark:text-white">{t('dashboard.pendingConfirmation')}</h2>
          <div className="overflow-y-auto max-h-64">
            {printings.filter(p => p.status === 'waiting' || (p.status === 'completed' && !p.real_time_stop)).length > 0 ? (
              <div className="space-y-2">
                {printings
                  .filter(p => p.status === 'waiting' || (p.status === 'completed' && !p.real_time_stop))
                  .map(printing => (
                    <Link to={`/printings/${printing.id}`} key={printing.id} className="block">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/20 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-blue-700 dark:text-blue-300">
                              {printing.model_name}
                            </div>
                            <div className="text-sm text-blue-600 dark:text-blue-400">
                              {printing.printer_name}
                            </div>
                          </div>
                          <StatusBadge status={printing.status} />
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            ) : (
              <div className="text-center py-5 text-gray-500 dark:text-gray-400">
                {t('dashboard.noPendingConfirmation')}
              </div>
            )}
          </div>
          <div className="mt-4">
            <Link to="/printings">
              <Button variant="outline" size="sm">{t('dashboard.viewAllPrintJobs')}</Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2 dark:text-white">{t('dashboard.upcomingCompletions')}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('printings.printer')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('printings.model')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('printings.startTime')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('printings.estimatedCompletion')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.status')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('printings.progress')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {printings && printings.length > 0 ? (
                // Sort by calculated completion time
                [...printings]
                  .filter(p => p.status === 'printing' || p.status === 'paused')
                  .sort((a, b) => new Date(a.calculated_time_stop || 0) - new Date(b.calculated_time_stop || 0))
                  .map((printing) => (
                    <tr key={printing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 whitespace-nowrap dark:text-gray-300">{printing.printer_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap dark:text-gray-300">{printing.model_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap dark:text-gray-300">
                        {new Date(printing.start_time).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap dark:text-gray-300">
                        {printing.calculated_time_stop ? new Date(printing.calculated_time_stop).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <StatusBadge status={printing.status} />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" 
                            style={{ width: `${printing.progress || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs dark:text-gray-300">{Math.round(printing.progress || 0)}%</span>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                    {t('dashboard.noPrintings')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Link to="/printings">
            <Button variant="outline" size="sm">{t('dashboard.viewAllPrintJobs')}</Button>
          </Link>
        </div>
      </Card>
      
      {/* Add Printer Modal */}
      <Modal
        isOpen={isAddPrinterModalOpen}
        onClose={() => setIsAddPrinterModalOpen(false)}
        title={t('printers.addNew')}
      >
        <form onSubmit={handleAddPrinter} className="space-y-4">
          <div className="form-group">
            <label htmlFor="printer-name" className="form-label">
              {t('printers.name')}
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
              {t('printers.ipAddress')}
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
              {t('printers.model')}
            </label>
            <input
              type="text"
              id="printer-model"
              className="form-input"
              value={newPrinterData.model}
              onChange={(e) => setNewPrinterData({ ...newPrinterData, model: e.target.value })}
            />
          </div>
        </form>
      </Modal>
      
      {/* Add Model Modal */}
      <Modal
        isOpen={isAddModelModalOpen}
        onClose={() => setIsAddModelModalOpen(false)}
        title={t('models.addNew')}
      >
        <form onSubmit={handleAddModel} className="space-y-4">
          <div className="form-group">
            <label htmlFor="model-name" className="form-label">
              {t('models.name')}
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
              {t('common.description')}
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
                {t('models.printingTime')} (HH:MM)
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
                {t('models.filament')} {t('models.length')} (m)
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
              {t('models.filamentType')}
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
              <option value="Nylon">Nylon</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard; 