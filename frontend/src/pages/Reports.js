import React, { useState, useEffect } from 'react';
import { 
  getPrinterStatusReport, 
  getPrintingEfficiencyReport, 
  getPrinterReport, 
  getModelReport 
} from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title,
  PointElement,
  LineElement
} from 'chart.js';
import { 
  CloudArrowDownIcon, 
  CalendarIcon, 
  ChartBarIcon, 
  PrinterIcon, 
  CubeIcon,
  ExclamationCircleIcon,
  FunnelIcon,
  ArrowPathIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  PointElement,
  LineElement
);

const Reports = () => {
  const [statusReport, setStatusReport] = useState(null);
  const [efficiencyReport, setEfficiencyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('week'); // 'day', 'week', 'month', 'custom'
  const [selectedPrinterId, setSelectedPrinterId] = useState(null);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [printerReport, setPrinterReport] = useState(null);
  const [modelReport, setModelReport] = useState(null);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingPrinterReport, setLoadingPrinterReport] = useState(false);
  const [loadingModelReport, setLoadingModelReport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Date range filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  
  // Status filter
  const [statusFilter, setStatusFilter] = useState({
    idle: true,
    printing: true,
    paused: true,
    error: true,
    completed: true,
    cancelled: true
  });
  
  // Efficiency filter
  const [efficiencyFilter, setEfficiencyFilter] = useState({
    min: 0,
    max: 100
  });

    const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);
    
      try {
      // In a real application, we would pass the filters to the API
      // For now, we'll just simulate a delay and use the same data
      const results = await Promise.allSettled([
          getPrinterStatusReport(),
        getPrintingEfficiencyReport(dateRange.startDate, dateRange.endDate)
      ]);
      
      const [statusReportResult, efficiencyReportResult] = results;
      
      if (statusReportResult.status === 'fulfilled') {
        setStatusReport(statusReportResult.value.data);
        
        // Extract available printers
        if (statusReportResult.value.data && statusReportResult.value.data.printers) {
          setAvailablePrinters(statusReportResult.value.data.printers);
        }
      } else {
        console.error('Error loading status report:', statusReportResult.reason);
        // Create dummy data for status report
        setStatusReport({
          total_printers: 0,
          status_counts: { idle: 0, printing: 0, paused: 0, error: 0 },
          printers: [],
          average_efficiency: 0
        });
      }
      
      if (efficiencyReportResult.status === 'fulfilled') {
        setEfficiencyReport(efficiencyReportResult.value.data);
        
        // Extract available models
        if (efficiencyReportResult.value.data && efficiencyReportResult.value.data.models) {
          setAvailableModels(efficiencyReportResult.value.data.models);
        }
      } else {
        console.error('Error loading efficiency report:', efficiencyReportResult.reason);
        // Create dummy data for efficiency report
        setEfficiencyReport({
          total_printings: 0,
          daily_printings: {},
          downtime_by_printer: {},
          models: []
        });
      }
      } catch (error) {
        console.error('Error loading report data:', error);
      setError('Failed to load report data. Please try again later.');
    } finally {
        setLoading(false);
      setIsRefreshing(false);
      }
    };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Fetch printer-specific report
  useEffect(() => {
    if (selectedPrinterId) {
      const fetchPrinterReport = async () => {
        setLoadingPrinterReport(true);
        try {
          // In a real app, we would pass the date range
          const result = await getPrinterReport(selectedPrinterId);
          setPrinterReport(result.data);
        } catch (error) {
          console.error('Error loading printer report:', error);
          setPrinterReport(null);
        } finally {
          setLoadingPrinterReport(false);
        }
      };
      
      fetchPrinterReport();
    } else {
      setPrinterReport(null);
    }
  }, [selectedPrinterId]);
  
  // Fetch model-specific report
  useEffect(() => {
    if (selectedModelId) {
      const fetchModelReport = async () => {
        setLoadingModelReport(true);
        try {
          // In a real app, we would pass the date range
          const result = await getModelReport(selectedModelId);
          setModelReport(result.data);
        } catch (error) {
          console.error('Error loading model report:', error);
          setModelReport(null);
        } finally {
          setLoadingModelReport(false);
        }
      };
      
      fetchModelReport();
    } else {
      setModelReport(null);
    }
  }, [selectedModelId]);
  
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    
    // Update date range based on timeframe
    const today = new Date();
    let startDate = new Date();
    
    switch (newTimeframe) {
      case 'day':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        break;
      case 'year':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        break;
      default:
        // For custom, keep existing dates
        return;
    }
    
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
    
    // Refresh data with new timeframe
    fetchReportData();
  };
  
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange({
      ...dateRange,
      [name]: value
    });
    
    // Switch to custom timeframe when dates are manually changed
    if (timeframe !== 'custom') {
      setTimeframe('custom');
    }
  };
  
  const applyFilters = () => {
    fetchReportData();
    setShowFilters(false);
  };
  
  const resetFilters = () => {
    setTimeframe('week');
    setDateRange({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setStatusFilter({
      idle: true,
      printing: true,
      paused: true,
      error: true,
      completed: true,
      cancelled: true
    });
    setEfficiencyFilter({
      min: 0,
      max: 100
    });
    setSelectedPrinterId(null);
    setSelectedModelId(null);
    
    fetchReportData();
    setShowFilters(false);
  };
  
  const exportReportCSV = async () => {
    setLoadingExport(true);
    try {
      // Directly download the file using the browser
      window.location.href = `http://localhost:8000/reports/printers/export/`;
      setTimeout(() => setLoadingExport(false), 1000);
    } catch (error) {
      console.error('Error exporting report:', error);
      setLoadingExport(false);
    }
  };

  const generatePrinterStatusData = () => {
    const statusCounts = statusReport?.status_counts || { idle: 0, printing: 0, paused: 0, error: 0 };
    
    // Filter by selected statuses
    const labels = [];
    const data = [];
    const colors = [];
    
    if (statusFilter.idle) {
      labels.push('Idle');
      data.push(statusCounts.idle || 0);
      colors.push('#10B981'); // Green
    }
    
    if (statusFilter.printing) {
      labels.push('Printing');
      data.push(statusCounts.printing || 0);
      colors.push('#3B82F6'); // Blue
    }
    
    if (statusFilter.paused) {
      labels.push('Paused');
      data.push(statusCounts.paused || 0);
      colors.push('#F59E0B'); // Yellow
    }
    
    if (statusFilter.error) {
      labels.push('Error');
      data.push(statusCounts.error || 0);
      colors.push('#EF4444'); // Red
    }
    
    return {
      labels,
    datasets: [
      {
        label: 'Printer Status',
          data,
          backgroundColor: colors,
        },
      ],
    };
  };

  const generatePrinterEfficiencyData = () => {
    if (!statusReport?.printers || statusReport.printers.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Efficiency (%)',
            data: [0],
            backgroundColor: '#3B82F6',
          },
        ],
      };
    }
    
    // Filter printers by efficiency
    const filteredPrinters = statusReport.printers.filter(printer => 
      printer.efficiency >= efficiencyFilter.min && 
      printer.efficiency <= efficiencyFilter.max
    );
    
    return {
      labels: filteredPrinters.map(printer => printer.name),
      datasets: [
        {
          label: 'Efficiency (%)',
          data: filteredPrinters.map(printer => printer.efficiency),
          backgroundColor: '#3B82F6',
        },
      ],
    };
  };

  const generatePrintingVolumeData = () => {
    if (!efficiencyReport?.daily_printings || Object.keys(efficiencyReport.daily_printings).length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Print Volume',
            data: [0],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
          },
        ],
      };
    }
    
    // Filter by date range
    const dates = Object.keys(efficiencyReport.daily_printings)
      .filter(date => date >= dateRange.startDate && date <= dateRange.endDate)
      .sort();
    
    return {
      labels: dates,
      datasets: [
        {
          label: 'Print Volume',
          data: dates.map(date => efficiencyReport.daily_printings[date]),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      tension: 0.1
        },
      ],
    };
  };

  const generateDownTimeData = () => {
    if (!efficiencyReport?.downtime_by_printer || Object.keys(efficiencyReport.downtime_by_printer).length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Downtime (Hours)',
          data: [0],
          backgroundColor: '#F59E0B',
        }]
      };
    }
    
    return {
    labels: Object.keys(efficiencyReport.downtime_by_printer),
    datasets: [{
      label: 'Downtime (Hours)',
      data: Object.values(efficiencyReport.downtime_by_printer).map(val => Math.round(val / 60 * 10) / 10),
      backgroundColor: '#F59E0B',
    }]
    };
  };
  
  // Specific printer report data
  const generatePrinterHistoryData = () => {
    if (!printerReport?.history || printerReport.history.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Prints',
            data: [0],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
          },
          {
            label: 'Failures',
            data: [0],
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.5)',
          }
        ]
      };
    }
    
    return {
      labels: printerReport.history.map(h => h.date),
      datasets: [
        {
          label: 'Prints',
          data: printerReport.history.map(h => h.prints),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
        },
        {
          label: 'Failures',
          data: printerReport.history.map(h => h.failures),
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
        }
      ]
    };
  };
  
  // Specific model report data
  const generateModelSuccessRateData = () => {
    if (!modelReport) {
      return {
        labels: ['No Data', ''],
        datasets: [
          {
            data: [100, 0],
            backgroundColor: ['#d1d5db', '#d1d5db'],
          }
        ]
      };
    }
    
    return {
      labels: ['Success', 'Failure'],
      datasets: [
        {
          data: [modelReport.success_rate || 0, 100 - (modelReport.success_rate || 0)],
          backgroundColor: ['#10B981', '#EF4444'],
        }
      ]
    };
  };

  const getTimeframeTitle = () => {
    switch(timeframe) {
      case 'day': return 'Daily Report';
      case 'week': return 'Weekly Report';
      case 'month': return 'Monthly Report';
      default: return 'Report';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner-border text-primary" role="status">
          <div className="spinner"></div>
        </div>
        <span className="ml-2">Loading report data...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-red-800 dark:text-red-200">
        <div className="flex items-center">
          <ExclamationCircleIcon className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // Generate chart data
  const printerStatusData = generatePrinterStatusData();
  const printerEfficiencyData = generatePrinterEfficiencyData();
  const printingVolumeData = generatePrintingVolumeData();
  const downTimeData = generateDownTimeData();
  const printerHistoryData = generatePrinterHistoryData();
  const modelSuccessRateData = generateModelSuccessRateData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Reports</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className="h-5 w-5 mr-1" /> 
            Filters
          </Button>
          <Button 
            variant="outline"
            onClick={fetchReportData}
            isLoading={isRefreshing}
          >
            <ArrowPathIcon className="h-5 w-5 mr-1" /> 
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={exportReportCSV}
            isLoading={loadingExport}
          >
            <CloudArrowDownIcon className="h-5 w-5 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold dark:text-white flex items-center">
              <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
              Report Filters
            </h2>
            <button 
              onClick={() => setShowFilters(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Timeframe Filter */}
            <div>
              <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Timeframe</h3>
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant={timeframe === 'day' ? 'primary' : 'outline'}
                  onClick={() => handleTimeframeChange('day')}
                >
                  Day
                </Button>
                <Button 
                  size="sm" 
                  variant={timeframe === 'week' ? 'primary' : 'outline'}
                  onClick={() => handleTimeframeChange('week')}
                >
                  Week
                </Button>
                <Button 
                  size="sm" 
                  variant={timeframe === 'month' ? 'primary' : 'outline'}
                  onClick={() => handleTimeframeChange('month')}
                >
                  Month
                </Button>
                <Button 
                  size="sm" 
                  variant={timeframe === 'year' ? 'primary' : 'outline'}
                  onClick={() => handleTimeframeChange('year')}
                >
                  Year
                </Button>
                <Button 
                  size="sm" 
                  variant={timeframe === 'custom' ? 'primary' : 'outline'}
                  onClick={() => setTimeframe('custom')}
                >
                  Custom
                </Button>
              </div>
              
              {/* Date Range Pickers */}
              {timeframe === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <label htmlFor="startDate" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={dateRange.startDate}
                      onChange={handleDateRangeChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={dateRange.endDate}
                      onChange={handleDateRangeChange}
                      min={dateRange.startDate}
                      max={new Date().toISOString().split('T')[0]}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Status Filter */}
            <div>
              <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Status Filter</h3>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={statusFilter.idle}
                    onChange={() => setStatusFilter({...statusFilter, idle: !statusFilter.idle})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Idle</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={statusFilter.printing}
                    onChange={() => setStatusFilter({...statusFilter, printing: !statusFilter.printing})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Printing</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={statusFilter.paused}
                    onChange={() => setStatusFilter({...statusFilter, paused: !statusFilter.paused})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Paused</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={statusFilter.error}
                    onChange={() => setStatusFilter({...statusFilter, error: !statusFilter.error})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Error</span>
                </label>
              </div>
            </div>
            
            {/* Printers & Models Filter */}
            <div>
              <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Printer & Model</h3>
              <div className="space-y-2">
                <select
                  value={selectedPrinterId || ''}
                  onChange={(e) => setSelectedPrinterId(e.target.value ? parseInt(e.target.value) : null)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Printers</option>
                  {availablePrinters.map(printer => (
                    <option key={printer.id} value={printer.id}>{printer.name}</option>
                  ))}
                </select>
                
                <select
                  value={selectedModelId || ''}
                  onChange={(e) => setSelectedModelId(e.target.value ? parseInt(e.target.value) : null)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Models</option>
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6 space-x-3">
            <Button variant="secondary" onClick={resetFilters}>
              Reset Filters
            </Button>
            <Button variant="primary" onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </Card>
      )}
      
      {/* Active Filters Display */}
      {(selectedPrinterId || selectedModelId || timeframe !== 'week') && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-gray-700 dark:text-gray-300">Active Filters:</span>
          
          {timeframe !== 'week' && (
            <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-300">
              {timeframe === 'custom' 
                ? `${dateRange.startDate} to ${dateRange.endDate}`
                : timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              <button 
                onClick={() => handleTimeframeChange('week')}
                className="ml-1 text-blue-400 hover:text-blue-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {selectedPrinterId && (
            <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
              Printer: {availablePrinters.find(p => p.id === parseInt(selectedPrinterId))?.name || selectedPrinterId}
              <button 
                onClick={() => setSelectedPrinterId(null)}
                className="ml-1 text-green-400 hover:text-green-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {selectedModelId && (
            <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-300">
              Model: {availableModels.find(m => m.id === parseInt(selectedModelId))?.name || selectedModelId}
              <button 
                onClick={() => setSelectedModelId(null)}
                className="ml-1 text-purple-400 hover:text-purple-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{getTimeframeTitle()}</h2>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Analytics Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <div className="text-sm text-blue-500 dark:text-blue-300 font-medium">Total Printers</div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">{statusReport?.total_printers || 0}</div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
            <div className="text-sm text-green-500 dark:text-green-300 font-medium">Active Print Jobs</div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">{statusReport?.status_counts?.printing || 0}</div>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-md">
            <div className="text-sm text-amber-500 dark:text-amber-300 font-medium">Total Print Jobs</div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">{efficiencyReport?.total_printings || 0}</div>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
            <div className="text-sm text-indigo-500 dark:text-indigo-300 font-medium">Total Print Time</div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">
              {efficiencyReport?.total_print_time 
                ? `${Math.round(efficiencyReport.total_print_time)} hrs` 
                : '0 hrs'}
            </div>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md">
            <div className="text-sm text-purple-500 dark:text-purple-300 font-medium">Avg. Efficiency</div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">
              {statusReport?.average_efficiency 
                ? `${Math.round(statusReport.average_efficiency)}%` 
                : '0%'}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Printer Status Distribution</h3>
            <div className="h-64">
              <Pie data={printerStatusData} options={{ maintainAspectRatio: false }} />
            </div>
          </Card>

          <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Printer Efficiency</h3>
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
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Printing Volume</h3>
            <div className="h-64">
              <Line 
                data={printingVolumeData} 
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0
                      }
                    }
                  }
                }} 
              />
            </div>
          </Card>

          <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Printer Downtime</h3>
            <div className="h-64">
              <Bar 
                data={downTimeData} 
                options={{
                  maintainAspectRatio: false,
                }} 
              />
            </div>
          </Card>
      </div>

      {/* Detailed Reports Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
            <PrinterIcon className="h-5 w-5 mr-2" /> Printer-Specific Report
          </h3>
          
          <div className="mb-4">
            <label htmlFor="printer-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Printer
            </label>
            <select
              id="printer-select"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={selectedPrinterId || ''}
              onChange={(e) => setSelectedPrinterId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={availablePrinters.length === 0}
            >
              <option value="">-- Select a printer --</option>
              {availablePrinters.map((printer) => (
                <option key={printer.id} value={printer.id}>{printer.name}</option>
              ))}
            </select>
          </div>
          
          {loadingPrinterReport ? (
            <div className="flex justify-center items-center h-40">
              <div className="spinner"></div>
            </div>
          ) : selectedPrinterId && printerReport ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Prints</div>
                  <div className="text-xl font-semibold dark:text-white">{printerReport.total_prints || 0}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
                  <div className="text-xl font-semibold dark:text-white">
                    {printerReport.success_rate ? `${Math.round(printerReport.success_rate)}%` : '0%'}
                  </div>
                </div>
              </div>
              
              <div className="h-64 mt-4">
                <Line 
                  data={printerHistoryData}
                  options={{
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                      }
                    }
                  }}
                />
              </div>
            </div>
          ) : selectedPrinterId ? (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              No data available for this printer
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              Select a printer to view detailed statistics
          </div>
          )}
        </Card>
        
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
            <CubeIcon className="h-5 w-5 mr-2" /> Model-Specific Report
          </h3>
          
          <div className="mb-4">
            <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Model
            </label>
            <select
              id="model-select"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={selectedModelId || ''}
              onChange={(e) => setSelectedModelId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={availableModels.length === 0}
            >
              <option value="">-- Select a model --</option>
              {availableModels && availableModels.map((model) => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>
          
          {loadingModelReport ? (
            <div className="flex justify-center items-center h-40">
              <div className="spinner"></div>
            </div>
          ) : selectedModelId && modelReport ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Prints</div>
                  <div className="text-xl font-semibold dark:text-white">{modelReport.total_prints || 0}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Avg. Print Time</div>
                  <div className="text-xl font-semibold dark:text-white">
                    {modelReport.average_print_time ? `${modelReport.average_print_time.toFixed(1)} hrs` : 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="h-64 mt-4">
                <Pie 
                  data={modelSuccessRateData}
                  options={{
                    maintainAspectRatio: false,
                  }}
                />
          </div>
        </div>
          ) : selectedModelId ? (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              No data available for this model
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              Select a model to view detailed statistics
            </div>
          )}
      </Card>
      </div>
    </div>
  );
};

export default Reports; 