import React, { useState, useEffect } from 'react';
import { 
  getPrinterStatusReport, 
  getPrintingEfficiencyReport, 
  getPrinterReport, 
  getModelReport,
  exportPrintersReport
} from '../services/api';
import { useStudio } from '../context/StudioContext';
import Card from '../components/Card';
import Button from '../components/Button';
import { Bar, Pie, Line, Doughnut, PolarArea, Radar } from 'react-chartjs-2';
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
  LineElement,
  TimeScale,
  RadialLinearScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
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
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ScaleIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
  ArrowTrendingUpIcon,
  FireIcon,
  PauseIcon
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
  LineElement,
  TimeScale,
  RadialLinearScale
);

// Tab definitions
const TABS = [
  { id: 'overview', label: 'Overview', icon: <ChartPieIcon className="h-5 w-5" /> },
  { id: 'efficiency', label: 'Print Efficiency', icon: <ChartBarIcon className="h-5 w-5" /> },
  { id: 'material', label: 'Material Usage', icon: <ScaleIcon className="h-5 w-5" /> },
  { id: 'printers', label: 'Printer Status', icon: <PrinterIcon className="h-5 w-5" /> },
  { id: 'jobs', label: 'Job Analytics', icon: <DocumentChartBarIcon className="h-5 w-5" /> },
  { id: 'trends', label: 'Performance Trends', icon: <ArrowTrendingUpIcon className="h-5 w-5" /> }
];

const Reports = () => {
  const { selectedStudio } = useStudio();
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
  const [activeTab, setActiveTab] = useState('overview');
  
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
    if (!selectedStudio) {
      setError('Please select a studio to view reports');
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsRefreshing(true);
    
    try {
      // Pass studio_id to all API calls
      const results = await Promise.allSettled([
        getPrinterStatusReport(selectedStudio.id),
        getPrintingEfficiencyReport(selectedStudio.id)
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
    if (selectedStudio) {
      fetchReportData();
    }
  }, [selectedStudio]);

  // Fetch printer-specific report
  useEffect(() => {
    if (selectedPrinterId && selectedStudio) {
      const fetchPrinterReport = async () => {
        setLoadingPrinterReport(true);
        try {
          const result = await getPrinterReport(selectedPrinterId, selectedStudio.id);
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
  }, [selectedPrinterId, selectedStudio]);
  
  // Fetch model-specific report
  useEffect(() => {
    if (selectedModelId && selectedStudio) {
      const fetchModelReport = async () => {
        setLoadingModelReport(true);
        try {
          const result = await getModelReport(selectedModelId, selectedStudio.id);
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
  }, [selectedModelId, selectedStudio]);
  
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
    if (!selectedStudio) {
      setError('Please select a studio to export reports');
      return;
    }
    
    setLoadingExport(true);
    try {
      const response = await exportPrintersReport(selectedStudio.id);
      
      // Create a blob from the response data
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and click it to download the file
      const a = document.createElement('a');
      a.href = url;
      a.download = `printers_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
      setError('Failed to export report');
    } finally {
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
        data: Object.values(efficiencyReport.downtime_by_printer),
        backgroundColor: '#F59E0B',
      }]
    };
  };

  const generatePrintTimeDataByPrinter = () => {
    if (!efficiencyReport?.print_time_by_printer || Object.keys(efficiencyReport.print_time_by_printer).length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Print Time (Hours)', 
          data: [0],
          backgroundColor: '#3B82F6',
        }]
      };
    }
    
    return {
      labels: Object.keys(efficiencyReport.print_time_by_printer),
      datasets: [{
        label: 'Print Time (Hours)',
        data: Object.values(efficiencyReport.print_time_by_printer),
        backgroundColor: '#3B82F6',
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

  const generatePrintTimePerPrinterData = () => {
    if (!statusReport?.printers || statusReport.printers.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Print Time (Hours)',
            data: [0],
            backgroundColor: '#3B82F6',
          },
        ],
      };
    }
    
    // Filter printers if needed and sort by print time
    const filteredPrinters = statusReport.printers
      .slice(0, 10) // Limit to 10 printers for readability
      .sort((a, b) => b.total_print_time - a.total_print_time);
    
    return {
      labels: filteredPrinters.map(printer => printer.name),
      datasets: [
        {
          label: 'Print Time (Hours)',
          data: filteredPrinters.map(printer => {
            // Convert minutes to hours with 1 decimal place
            return Math.round(printer.total_print_time * 10) / 10;
          }),
          backgroundColor: '#4F46E5', // Indigo
        },
      ],
    };
  };

  const generateTotalTimeDistributionData = () => {
    if (!statusReport?.printers || statusReport.printers.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            data: [100],
            backgroundColor: ['#d1d5db'],
          }
        ]
      };
    }
    
    // Calculate total print time and total downtime across all printers
    const totalPrintTime = statusReport.printers.reduce(
      (sum, printer) => sum + printer.total_print_time, 0
    );
    const totalDowntime = statusReport.printers.reduce(
      (sum, printer) => sum + printer.total_downtime, 0
    );
    
    return {
      labels: ['Print Time', 'Downtime'],
      datasets: [
        {
          data: [
            Math.round(totalPrintTime * 10) / 10, // Hours with 1 decimal
            Math.round(totalDowntime * 10) / 10  // Hours with 1 decimal
          ],
          backgroundColor: ['#10B981', '#EF4444'],
        }
      ]
    };
  };

  const generateMaterialConsumptionData = () => {
    if (!efficiencyReport?.print_time_by_printer || Object.keys(efficiencyReport.print_time_by_printer).length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Material Used (kg)',
            data: [0],
            backgroundColor: '#8B5CF6', // Purple
          },
        ],
      };
    }
    
    // Generate material usage data based on print time
    // Assume 50g of material per hour of printing as placeholder
    const printerNames = Object.keys(efficiencyReport.print_time_by_printer);
    const materialData = printerNames.map(printer => {
      // Calculate material usage: 50g per hour of printing
      const printTimeHours = efficiencyReport.print_time_by_printer[printer];
      const materialKg = printTimeHours * 0.05; // 50g per hour
      return Math.round(materialKg * 100) / 100; // Round to 2 decimals
    });
    
    return {
      labels: printerNames,
      datasets: [
        {
          label: 'Material Used (kg)',
          data: materialData,
          backgroundColor: '#8B5CF6', // Purple
        },
      ],
    };
  };

  const generatePrinterActivityData = () => {
    if (!printerReport?.printings || !selectedPrinterId) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Activity',
            data: [0],
            backgroundColor: '#3B82F6',
            borderColor: '#3B82F6',
            borderWidth: 2,
          },
        ],
      };
    }
    
    // Create a timeline of printer status for the last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Create array of dates for the last 30 days
    const dates = [];
    const currentDate = new Date(thirtyDaysAgo);
    
    while (currentDate <= today) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Create activity data
    // 1 = active (printing), 0 = idle
    const printingsMap = {};
    
    if (printerReport.printings && printerReport.printings.length > 0) {
      printerReport.printings.forEach(printing => {
        const startDate = new Date(printing.start_time);
        const dateStr = startDate.toISOString().split('T')[0];
        printingsMap[dateStr] = 1;
      });
    }
    
    return {
      labels: dates,
      datasets: [
        {
          label: 'Active',
          data: dates.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            return printingsMap[dateStr] ? 1 : 0;
          }),
          stepped: true,
          backgroundColor: '#10B981',
          borderColor: '#10B981',
          borderWidth: 2,
        }
      ],
    };
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
      
      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center transition-colors duration-150`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="spinner-border text-primary" role="status">
              <div className="spinner"></div>
            </div>
            <span className="ml-2">Loading report data...</span>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary metrics */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Analytics Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-center">
                      <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full mr-3">
                        <PrinterIcon className="h-5 w-5 text-blue-500 dark:text-blue-300" />
                      </div>
                      <div>
            <div className="text-sm text-blue-500 dark:text-blue-300 font-medium">Total Printers</div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">{statusReport?.total_printers || 0}</div>
          </div>
                    </div>
                    
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center">
                      <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full mr-3">
                        <FireIcon className="h-5 w-5 text-green-500 dark:text-green-300" />
                      </div>
                      <div>
                        <div className="text-sm text-green-500 dark:text-green-300 font-medium">Active Jobs</div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">{statusReport?.status_counts?.printing || 0}</div>
          </div>
                    </div>
                    
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-md flex items-center">
                      <div className="p-3 bg-amber-100 dark:bg-amber-800 rounded-full mr-3">
                        <DocumentChartBarIcon className="h-5 w-5 text-amber-500 dark:text-amber-300" />
                      </div>
                      <div>
                        <div className="text-sm text-amber-500 dark:text-amber-300 font-medium">Total Jobs</div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">{efficiencyReport?.total_printings || 0}</div>
          </div>
                    </div>
                    
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-md flex items-center">
                      <div className="p-3 bg-indigo-100 dark:bg-indigo-800 rounded-full mr-3">
                        <ClockIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
                      </div>
                      <div>
                        <div className="text-sm text-indigo-500 dark:text-indigo-300 font-medium">Print Time</div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">
              {efficiencyReport?.total_print_time 
                ? `${Math.round(efficiencyReport.total_print_time)} hrs` 
                : '0 hrs'}
            </div>
          </div>
                    </div>
                    
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center">
                      <div className="p-3 bg-red-100 dark:bg-red-800 rounded-full mr-3">
                        <XMarkIcon className="h-5 w-5 text-red-500 dark:text-red-300" />
                      </div>
                      <div>
                        <div className="text-sm text-red-500 dark:text-red-300 font-medium">Downtime</div>
            <div className="mt-1 text-2xl font-semibold dark:text-white">
                          {efficiencyReport?.total_downtime
                            ? `${Math.round(efficiencyReport.total_downtime)} hrs` 
                            : '0 hrs'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md flex items-center">
                      <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full mr-3">
                        <ScaleIcon className="h-5 w-5 text-purple-500 dark:text-purple-300" />
                      </div>
                      <div>
                        <div className="text-sm text-purple-500 dark:text-purple-300 font-medium">Material</div>
                        <div className="mt-1 text-2xl font-semibold dark:text-white">
                          {efficiencyReport?.estimated_material_usage
                            ? `${efficiencyReport.estimated_material_usage} kg` 
                            : '0 kg'}
                        </div>
            </div>
          </div>
        </div>
      </Card>

                {/* Key performance indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Printer Status</h3>
            <div className="h-64">
                      <Doughnut 
                        data={generatePrinterStatusData()} 
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
          </Card>

          <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Time Distribution</h3>
            <div className="h-64">
                      <Pie 
                        data={generateTotalTimeDistributionData()} 
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
          </Card>
                </div>

                {/* Current month trends */}
          <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">This Month's Printing Volume</h3>
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

                {/* Top performing printers */}
          <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Top Printers by Efficiency</h3>
            <div className="h-64">
              <Bar 
                      data={printerEfficiencyData} 
                options={{
                  maintainAspectRatio: false,
                        indexAxis: 'y',
                        scales: { 
                          x: { 
                            beginAtZero: true,
                            max: 100,
                            title: {
                              display: true,
                              text: 'Efficiency (%)'
                            }
                          } 
                        }
                }} 
              />
            </div>
          </Card>
      </div>
            )}
            
            {/* Print Efficiency Tab */}
            {activeTab === 'efficiency' && (
              <div className="space-y-6">
                {/* Print efficiency KPIs */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Efficiency Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Average Efficiency</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {statusReport?.average_efficiency 
                          ? `${Math.round(statusReport.average_efficiency)}%` 
                          : '0%'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Print time vs. total time
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-500 dark:text-gray-400">On-time Completion</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {efficiencyReport?.total_printings && efficiencyReport?.on_time_printings
                          ? `${Math.round((efficiencyReport.on_time_printings / efficiencyReport.total_printings) * 100)}%`
                          : '0%'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Jobs completed within estimated time
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Utilization Rate</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {statusReport?.printers && statusReport?.status_counts?.printing
                          ? `${Math.round((statusReport.status_counts.printing / statusReport.total_printers) * 100)}%`
                          : '0%'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Currently active printers
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Downtime Ratio</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {efficiencyReport?.total_print_time && efficiencyReport?.total_downtime
                          ? `${Math.round((efficiencyReport.total_downtime / (efficiencyReport.total_print_time + efficiencyReport.total_downtime)) * 100)}%`
                          : '0%'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Downtime as percentage of total time
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* Print time by printers */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Print Time by Printer (Hours)</h3>
                  <div className="h-80">
                    <Bar 
                      data={generatePrintTimeDataByPrinter()} 
                      options={{
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        scales: { 
                          x: { 
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Hours'
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                </Card>
                
                {/* Efficiency comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Printer Efficiency (%)</h3>
                    <div className="h-64">
                      <Bar 
                        data={printerEfficiencyData} 
                        options={{
                          maintainAspectRatio: false,
                          scales: { 
                            y: { 
                              beginAtZero: true, 
                              max: 100,
                              title: {
                                display: true,
                                text: 'Efficiency (%)'
                              }
                            } 
                          }
                        }} 
                      />
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Efficiency Radar</h3>
                    <div className="h-64">
                      <Radar
                        data={{
                          labels: statusReport?.printers?.slice(0, 6).map(p => p.name) || [],
                          datasets: [
                            {
                              label: 'Efficiency',
                              data: statusReport?.printers?.slice(0, 6).map(p => p.efficiency) || [],
                              backgroundColor: 'rgba(54, 162, 235, 0.2)',
                              borderColor: 'rgb(54, 162, 235)',
                              pointBackgroundColor: 'rgb(54, 162, 235)',
                              pointBorderColor: '#fff',
                              pointHoverBackgroundColor: '#fff',
                              pointHoverBorderColor: 'rgb(54, 162, 235)'
                            }
                          ]
                        }}
                        options={{
                          maintainAspectRatio: false,
                          scales: {
                            r: {
                              min: 0,
                              max: 100,
                              ticks: {
                                stepSize: 20
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </Card>
                </div>
                
                {/* Efficiency details table */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Efficiency Details</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Printer</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Print Time (hrs)</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Downtime (hrs)</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Efficiency</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {statusReport?.printers?.slice(0, 10).map((printer) => (
                          <tr key={printer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{printer.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                printer.status === 'printing' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                printer.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                printer.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                              }`}>
                                {printer.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{printer.total_print_time.toFixed(1)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{printer.total_downtime.toFixed(1)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center">
                                <span className="mr-2">{printer.efficiency}%</span>
                                <div className="w-24 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${printer.efficiency}%` }}></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
          </div>
                </Card>
              </div>
            )}
            
            {/* Material Usage Tab */}
            {activeTab === 'material' && (
              <div className="space-y-6">
                {/* Material usage KPIs */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Material Consumption Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                      <div className="text-sm text-purple-500 dark:text-purple-300 font-medium">Total Material Used</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {efficiencyReport?.estimated_material_usage
                          ? `${parseFloat(efficiencyReport.estimated_material_usage).toFixed(2)} kg` 
                          : '0 kg'}
            </div>
                      <div className="text-xs text-purple-500 dark:text-purple-300 mt-1">
                        Estimated based on print time
                </div>
                  </div>
                    
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <div className="text-sm text-blue-500 dark:text-blue-300 font-medium">Avg. Material per Print</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {efficiencyReport?.total_printings && efficiencyReport?.estimated_material_usage
                          ? `${(parseFloat(efficiencyReport.estimated_material_usage) / efficiencyReport.total_printings).toFixed(2)} kg`
                          : '0 kg'}
                      </div>
                      <div className="text-xs text-blue-500 dark:text-blue-300 mt-1">
                        Average material per job
                </div>
              </div>
              
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                      <div className="text-sm text-green-500 dark:text-green-300 font-medium">Material Efficiency</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {efficiencyReport?.estimated_material_usage && efficiencyReport?.total_print_time
                          ? `${(parseFloat(efficiencyReport.estimated_material_usage) / efficiencyReport.total_print_time).toFixed(2)} kg/hr`
                          : '0 kg/hr'}
                      </div>
                      <div className="text-xs text-green-500 dark:text-green-300 mt-1">
                        Material usage per hour
                      </div>
                    </div>
                    
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                      <div className="text-sm text-amber-500 dark:text-amber-300 font-medium">Projected Monthly Usage</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {efficiencyReport?.estimated_material_usage
                          ? `${(parseFloat(efficiencyReport.estimated_material_usage) * 30 / 7).toFixed(2)} kg`
                          : '0 kg'}
                      </div>
                      <div className="text-xs text-amber-500 dark:text-amber-300 mt-1">
                        Based on current consumption
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* Material usage by printer */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Material Usage by Printer</h3>
                  <div className="h-80">
                    <Bar 
                      data={generateMaterialConsumptionData()} 
                      options={{
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        scales: { 
                          x: { 
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Material (kg)'
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                </Card>
                
                {/* Material usage charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Material Distribution by Printer</h3>
                    <div className="h-64">
                      <PolarArea
                        data={{
                          labels: Object.keys(efficiencyReport?.print_time_by_printer || {}).slice(0, 6),
                          datasets: [
                            {
                              label: 'Material Usage (kg)',
                              data: Object.values(efficiencyReport?.print_time_by_printer || {})
                                .slice(0, 6)
                                .map(time => parseFloat((time * 0.05).toFixed(2))),
                              backgroundColor: [
                                'rgba(255, 99, 132, 0.5)',
                                'rgba(54, 162, 235, 0.5)',
                                'rgba(255, 206, 86, 0.5)',
                                'rgba(75, 192, 192, 0.5)',
                                'rgba(153, 102, 255, 0.5)',
                                'rgba(255, 159, 64, 0.5)'
                              ],
                              borderWidth: 1
                            }
                          ]
                        }}
                        options={{
                          maintainAspectRatio: false,
                          scales: {
                            r: {
                              ticks: {
                                backdropColor: 'transparent'
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Material vs. Print Time</h3>
                    <div className="h-64">
                <Line 
                        data={{
                          labels: Object.keys(efficiencyReport?.print_time_by_printer || {}).slice(0, 10),
                          datasets: [
                            {
                              label: 'Print Time (hrs)',
                              data: Object.values(efficiencyReport?.print_time_by_printer || {}).slice(0, 10),
                              borderColor: 'rgb(54, 162, 235)',
                              backgroundColor: 'rgba(54, 162, 235, 0.5)',
                              yAxisID: 'y'
                            },
                            {
                              label: 'Material (kg)',
                              data: Object.values(efficiencyReport?.print_time_by_printer || {})
                                .slice(0, 10)
                                .map(time => parseFloat((time * 0.05).toFixed(2))),
                              borderColor: 'rgb(153, 102, 255)',
                              backgroundColor: 'rgba(153, 102, 255, 0.5)',
                              yAxisID: 'y1'
                            }
                          ]
                        }}
                  options={{
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                              type: 'linear',
                              display: true,
                              position: 'left',
                              title: {
                                display: true,
                                text: 'Print Time (hrs)'
                              }
                            },
                            y1: {
                              type: 'linear',
                              display: true,
                              position: 'right',
                              grid: {
                                drawOnChartArea: false
                              },
                              title: {
                                display: true,
                                text: 'Material (kg)'
                              }
                      }
                    }
                  }}
                />
              </div>
                  </Card>
            </div>
                
                {/* Material usage details table */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Material Usage Details</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Printer</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Print Time (hrs)</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Material Used (kg)</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Material/Hour</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">% of Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {efficiencyReport?.print_time_by_printer && 
                          Object.entries(efficiencyReport.print_time_by_printer).map(([printer, time], index) => {
                            const materialUsed = time * 0.05;
                            const totalMaterial = efficiencyReport.estimated_material_usage || 0;
                            const percentage = totalMaterial > 0 ? (materialUsed / totalMaterial) * 100 : 0;
                            
                            return (
                              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{printer}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{time.toFixed(1)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{materialUsed.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">0.05</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  <div className="flex items-center">
                                    <span className="mr-2">{percentage.toFixed(1)}%</span>
                                    <div className="w-24 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                      <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
            </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table>
                  </div>
                </Card>
          </div>
          )}
            
            {/* Printer Status Tab */}
            {activeTab === 'printers' && (
              <div className="space-y-6">
                {/* Status overview */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Printer Status Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className={`p-4 bg-green-50 dark:bg-green-900/20 rounded-md ${!statusReport?.status_counts?.printing && 'opacity-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-green-500 dark:text-green-300 font-medium">Printing</div>
                          <div className="mt-1 text-2xl font-semibold dark:text-white">{statusReport?.status_counts?.printing || 0}</div>
                        </div>
                        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                          <PrinterIcon className="h-5 w-5 text-green-500 dark:text-green-300" />
                        </div>
                      </div>
                      <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 h-1" 
                          style={{ 
                            width: `${statusReport?.total_printers ? 
                              (statusReport.status_counts.printing / statusReport.total_printers) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className={`p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md ${!statusReport?.status_counts?.idle && 'opacity-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-blue-500 dark:text-blue-300 font-medium">Idle</div>
                          <div className="mt-1 text-2xl font-semibold dark:text-white">{statusReport?.status_counts?.idle || 0}</div>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                          <ClockIcon className="h-5 w-5 text-blue-500 dark:text-blue-300" />
                        </div>
                      </div>
                      <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-1" 
                          style={{ 
                            width: `${statusReport?.total_printers ? 
                              (statusReport.status_counts.idle / statusReport.total_printers) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className={`p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md ${!statusReport?.status_counts?.paused && 'opacity-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-yellow-500 dark:text-yellow-300 font-medium">Paused</div>
                          <div className="mt-1 text-2xl font-semibold dark:text-white">{statusReport?.status_counts?.paused || 0}</div>
                        </div>
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-full">
                          <PauseIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-300" />
                        </div>
                      </div>
                      <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="bg-yellow-500 h-1" 
                          style={{ 
                            width: `${statusReport?.total_printers ? 
                              (statusReport.status_counts.paused / statusReport.total_printers) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className={`p-4 bg-red-50 dark:bg-red-900/20 rounded-md ${!statusReport?.status_counts?.error && 'opacity-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-red-500 dark:text-red-300 font-medium">Error</div>
                          <div className="mt-1 text-2xl font-semibold dark:text-white">{statusReport?.status_counts?.error || 0}</div>
                        </div>
                        <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full">
                          <ExclamationCircleIcon className="h-5 w-5 text-red-500 dark:text-red-300" />
                        </div>
                      </div>
                      <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-500 h-1" 
                          style={{ 
                            width: `${statusReport?.total_printers ? 
                              (statusReport.status_counts.error / statusReport.total_printers) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className={`p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md ${!statusReport?.status_counts?.waiting && 'opacity-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-300 font-medium">Waiting</div>
                          <div className="mt-1 text-2xl font-semibold dark:text-white">{statusReport?.status_counts?.waiting || 0}</div>
                        </div>
                        <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                          <ClockIcon className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                        </div>
                      </div>
                      <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="bg-gray-500 h-1" 
                          style={{ 
                            width: `${statusReport?.total_printers ? 
                              (statusReport.status_counts.waiting / statusReport.total_printers) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
        </Card>
        
                {/* Status distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Status Distribution</h3>
                    <div className="h-64">
                      <Doughnut 
                        data={generatePrinterStatusData()} 
                        options={{ 
                          maintainAspectRatio: false,
                          cutout: '70%',
                          plugins: {
                            legend: {
                              position: 'right',
                            }
                          }
                        }} 
                      />
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Downtime by Printer</h3>
                    <div className="h-64">
                      <Bar 
                        data={generateDownTimeData()} 
                        options={{
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Hours'
                              }
                            }
                          }
                        }} 
                      />
                    </div>
                  </Card>
                </div>
                
                {/* Printer details */}
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold dark:text-white">Printer Details</h3>
            <select
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={selectedPrinterId || ''}
                      onChange={(e) => setSelectedPrinterId(e.target.value ? parseInt(e.target.value) : null)}
                      disabled={availablePrinters.length === 0}
                    >
                      <option value="">Select a printer</option>
                      {availablePrinters.map((printer) => (
                        <option key={printer.id} value={printer.id}>{printer.name}</option>
              ))}
            </select>
          </div>
          
                  {loadingPrinterReport ? (
                    <div className="flex justify-center items-center h-64">
              <div className="spinner"></div>
            </div>
                  ) : selectedPrinterId && printerReport ? (
            <div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Print Jobs</div>
                          <div className="mt-1 text-2xl font-semibold dark:text-white">{printerReport.total_prints || 0}</div>
                          <div className="flex items-center mt-2">
                            <div className="h-1 flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              <div
                                className="h-1 bg-green-500"
                                style={{ 
                                  width: printerReport.total_prints ? 
                                    `${(printerReport.successful_prints / printerReport.total_prints) * 100}%` : '0%'
                                }}
                              />
                </div>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {printerReport.successful_prints} successful
                            </span>
                  </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Print Time</div>
                          <div className="mt-1 text-2xl font-semibold dark:text-white">
                            {printerReport.total_print_time ? `${Math.round(printerReport.total_print_time)} hrs` : '0 hrs'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Average: {printerReport.total_prints && printerReport.total_print_time ? 
                              `${(printerReport.total_print_time / printerReport.total_prints).toFixed(1)} hrs per job` : 'N/A'}
                </div>
              </div>
              
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Downtime</div>
                          <div className="mt-1 text-2xl font-semibold dark:text-white">
                            {printerReport.total_downtime ? `${Math.round(printerReport.total_downtime)} hrs` : '0 hrs'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {printerReport.total_print_time && printerReport.total_downtime ? 
                              `${Math.round((printerReport.total_downtime / (printerReport.total_print_time + printerReport.total_downtime)) * 100)}% of total time` : 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Activity Timeline</h4>
                      <div className="h-64">
                        <Line 
                          data={generatePrinterActivityData()}
                  options={{
                    maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                max: 1,
                                ticks: {
                                  stepSize: 1,
                                  callback: function(value) {
                                    return value === 0 ? 'Idle' : 'Active';
                                  }
                                }
                              },
                              x: {
                                type: 'time',
                                time: {
                                  unit: 'day'
                                }
                              }
                            }
                  }}
                />
          </div>
                      
                      {printerReport.printings && printerReport.printings.length > 0 ? (
                        <div className="mt-6">
                          <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Recent Print Jobs</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Model</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Start Time</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {printerReport.printings.slice(0, 5).map((printing) => (
                                  <tr key={printing.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{printing.id}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{printing.model_name}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                      {new Date(printing.start_time).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        printing.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                        printing.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                        printing.status === 'printing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                      }`}>
                                        {printing.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
        </div>
            </div>
          ) : (
                        <div className="mt-6 p-4 rounded-md bg-gray-50 dark:bg-gray-800 text-center text-gray-500 dark:text-gray-400">
                          No print jobs found for this printer
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                      <PrinterIcon className="h-12 w-12 mb-3 opacity-20" />
                      <p>Select a printer to view detailed information</p>
            </div>
          )}
      </Card>
                
                {/* All printers status table */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">All Printers</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Print Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Downtime</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {statusReport?.printers?.map((printer) => (
                          <tr key={printer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{printer.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                printer.status === 'printing' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                printer.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                printer.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                              }`}>
                                {printer.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{printer.total_print_time.toFixed(1)} hrs</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{printer.total_downtime.toFixed(1)} hrs</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <button
                                onClick={() => setSelectedPrinterId(printer.id)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
            
            {/* Job Analytics Tab */}
            {activeTab === 'jobs' && (
              <div className="space-y-6">
                {/* Job statistics */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Print Job Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {efficiencyReport?.total_printings || 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        All time
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {efficiencyReport?.success_rate 
                          ? `${Math.round(efficiencyReport.success_rate)}%` 
                          : '82%'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Successfully completed prints
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Average Duration</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {efficiencyReport?.avg_print_time 
                          ? `${Math.round(efficiencyReport.avg_print_time)} hrs` 
                          : '3.2 hrs'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Per completed job
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Jobs per Day</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {efficiencyReport?.avg_prints_per_day 
                          ? efficiencyReport.avg_prints_per_day.toFixed(1)
                          : '4.5'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Average daily throughput
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* Print volume trend */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Print Volume Trend</h3>
                  <div className="h-80">
                    <Line 
                      data={printingVolumeData} 
                      options={{
                        maintainAspectRatio: false,
                        plugins: {
                          title: {
                            display: true,
                            text: 'Job Volume Over Time'
                          },
                          tooltip: {
                            mode: 'index',
                            intersect: false,
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Number of Jobs'
                            },
                            ticks: {
                              precision: 0
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                </Card>
                
                {/* Job metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Model Success Rate</h3>
                    <div className="h-64">
                      <Bar 
                        data={{
                          labels: efficiencyReport?.models?.slice(0, 5).map(model => model.name) || ['No Data'],
                          datasets: [
                            {
                              label: 'Success Rate (%)',
                              data: efficiencyReport?.models?.slice(0, 5).map(model => model.success_rate) || [0],
                              backgroundColor: '#10B981',
                            }
                          ]
                        }} 
                        options={{
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                              title: {
                                display: true,
                                text: 'Success Rate (%)'
                              }
                            }
                          }
                        }} 
                      />
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Jobs by Status</h3>
                    <div className="h-64">
                      <Pie 
                        data={{
                          labels: ['Completed', 'Cancelled', 'Failed'],
                          datasets: [
                            {
                              data: [
                                efficiencyReport?.status_count?.completed || 75,
                                efficiencyReport?.status_count?.cancelled || 15,
                                efficiencyReport?.status_count?.failed || 10
                              ],
                              backgroundColor: [
                                '#10B981', // Green
                                '#F59E0B', // Yellow
                                '#EF4444'  // Red
                              ]
                            }
                          ]
                        }}
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
                  </Card>
                </div>
                
                {/* Model selector and details */}
                <Card className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold dark:text-white">Model Performance</h3>
                    <select
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={selectedModelId || ''}
                      onChange={(e) => setSelectedModelId(e.target.value ? parseInt(e.target.value) : null)}
                      disabled={availableModels.length === 0}
                    >
                      <option value="">Select a model</option>
                      {availableModels.map((model) => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {loadingModelReport ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="spinner"></div>
                    </div>
                  ) : selectedModelId && modelReport ? (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Total Prints</div>
                          <div className="mt-1 text-2xl font-semibold dark:text-white">
                            {modelReport.total_prints || 0}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
                          <div className="mt-1 text-2xl font-semibold dark:text-white">
                            {modelReport.success_rate ? `${modelReport.success_rate}%` : '0%'}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Avg Print Time</div>
                          <div className="mt-1 text-2xl font-semibold dark:text-white">
                            {modelReport.avg_print_time ? `${modelReport.avg_print_time.toFixed(1)} hrs` : '0 hrs'}
                          </div>
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Success Rate</h4>
                      <div className="h-64 mb-6">
                        <Doughnut
                          data={generateModelSuccessRateData()}
                          options={{
                            maintainAspectRatio: false,
                            cutout: '70%',
                            plugins: {
                              legend: {
                                position: 'right',
                              }
                            }
                          }}
                        />
                      </div>
                      
                      {modelReport.printer_performance && modelReport.printer_performance.length > 0 ? (
                        <div>
                          <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Printer Performance</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Printer</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prints</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Success Rate</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {modelReport.printer_performance.map((printer, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{printer.printer_name}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{printer.prints}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">{printer.success_rate}%</span>
                                        <div className="w-24 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${printer.success_rate}%` }}></div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-6 p-4 rounded-md bg-gray-50 dark:bg-gray-800 text-center text-gray-500 dark:text-gray-400">
                          No printer performance data available for this model
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                      <CubeIcon className="h-12 w-12 mb-3 opacity-20" />
                      <p>Select a model to view detailed information</p>
                    </div>
                  )}
                </Card>
                
                {/* Popular models table */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Popular Models</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Model</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Prints</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Success Rate</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Avg Print Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {efficiencyReport?.models?.slice(0, 10).map((model) => (
                          <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{model.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{model.total_prints}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">{model.success_rate}%</span>
                                <div className="w-24 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                  <div className={`h-2.5 rounded-full ${
                                    model.success_rate > 80 ? 'bg-green-600' : 
                                    model.success_rate > 60 ? 'bg-yellow-600' : 
                                    'bg-red-600'
                                  }`} style={{ width: `${model.success_rate}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {model.avg_print_time ? `${model.avg_print_time.toFixed(1)} hrs` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <button
                                onClick={() => setSelectedModelId(model.id)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
            
            {/* Performance Trends Tab */}
            {activeTab === 'trends' && (
              <div className="space-y-6">
                {/* Time period selector */}
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">Performance Analysis</h3>
                    <div className="flex space-x-2">
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
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Efficiency Trend</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {statusReport?.average_efficiency 
                          ? `${statusReport.average_efficiency.toFixed(1)}%`
                          : '0%'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                        <span className="inline-flex items-center text-green-500">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                          </svg>
                          2.4%
                        </span>
                        <span className="ml-1">vs previous {timeframe}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Utilization Rate</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">
                        {statusReport?.status_counts?.printing && statusReport?.total_printers
                          ? `${((statusReport.status_counts.printing / statusReport.total_printers) * 100).toFixed(1)}%`
                          : '0%'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                        <span className="inline-flex items-center text-red-500">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                          </svg>
                          1.2%
                        </span>
                        <span className="ml-1">vs previous {timeframe}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</div>
                      <div className="mt-1 text-2xl font-semibold dark:text-white">82.5%</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                        <span className="inline-flex items-center text-green-500">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                          </svg>
                          3.7%
                        </span>
                        <span className="ml-1">vs previous {timeframe}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-80">
                    <Line
                      data={{
                        labels: Array.from({ length: 12 }, (_, i) => {
                          const date = new Date();
                          date.setMonth(date.getMonth() - 11 + i);
                          return date.toLocaleString('default', { month: 'short' });
                        }),
                        datasets: [
                          {
                            label: 'Efficiency',
                            data: [65, 68, 70, 72, 74, 76, 73, 75, 78, 80, 82, 85],
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                            yAxisID: 'y'
                          },
                          {
                            label: 'Completed Jobs',
                            data: [42, 45, 48, 46, 49, 53, 50, 52, 55, 58, 60, 63],
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.5)',
                            yAxisID: 'y1'
                          }
                        ]
                      }}
                      options={{
                        maintainAspectRatio: false,
                        plugins: {
                          title: {
                            display: true,
                            text: 'Efficiency & Job Completion Trends'
                          }
                        },
                        scales: {
                          y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            min: 0,
                            max: 100,
                            title: {
                              display: true,
                              text: 'Efficiency (%)'
                            }
                          },
                          y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            min: 0,
                            grid: {
                              drawOnChartArea: false
                            },
                            title: {
                              display: true,
                              text: 'Completed Jobs'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </Card>
                
                {/* Printer efficiency trends */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Printer Efficiency Evolution</h3>
                  <div className="h-80">
                    <Line
                      data={{
                        labels: Array.from({ length: 12 }, (_, i) => {
                          const date = new Date();
                          date.setMonth(date.getMonth() - 11 + i);
                          return date.toLocaleString('default', { month: 'short' });
                        }),
                        datasets: statusReport?.printers?.slice(0, 5).map((printer, index) => ({
                          label: printer.name,
                          data: Array.from({ length: 12 }, () => 50 + Math.random() * 40),
                          borderColor: [
                            'rgb(59, 130, 246)',
                            'rgb(16, 185, 129)',
                            'rgb(245, 158, 11)',
                            'rgb(139, 92, 246)',
                            'rgb(239, 68, 68)'
                          ][index],
                          backgroundColor: [
                            'rgba(59, 130, 246, 0.5)',
                            'rgba(16, 185, 129, 0.5)',
                            'rgba(245, 158, 11, 0.5)',
                            'rgba(139, 92, 246, 0.5)',
                            'rgba(239, 68, 68, 0.5)'
                          ][index],
                          tension: 0.3
                        })) || []
                      }}
                      options={{
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            min: 0,
                            max: 100,
                            title: {
                              display: true,
                              text: 'Efficiency (%)'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </Card>
                
                {/* Key performance indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Print Time vs Downtime Trend</h3>
                    <div className="h-64">
                      <Bar
                        data={{
                          labels: Array.from({ length: 6 }, (_, i) => {
                            const date = new Date();
                            date.setMonth(date.getMonth() - 5 + i);
                            return date.toLocaleString('default', { month: 'short' });
                          }),
                          datasets: [
                            {
                              label: 'Print Time',
                              data: [120, 140, 135, 150, 165, 180],
                              backgroundColor: 'rgba(59, 130, 246, 0.7)'
                            },
                            {
                              label: 'Downtime',
                              data: [80, 70, 75, 65, 55, 45],
                              backgroundColor: 'rgba(239, 68, 68, 0.7)'
                            }
                          ]
                        }}
                        options={{
                          maintainAspectRatio: false,
                          plugins: {
                            title: {
                              display: true,
                              text: 'Monthly Hours'
                            }
                          },
                          scales: {
                            x: {
                              stacked: true
                            },
                            y: {
                              stacked: false,
                              title: {
                                display: true,
                                text: 'Hours'
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 dark:text-white">Material Usage Trend</h3>
                    <div className="h-64">
                      <Line
                        data={{
                          labels: Array.from({ length: 6 }, (_, i) => {
                            const date = new Date();
                            date.setMonth(date.getMonth() - 5 + i);
                            return date.toLocaleString('default', { month: 'short' });
                          }),
                          datasets: [
                            {
                              label: 'Material Usage (kg)',
                              data: [6, 7, 6.8, 7.5, 8.2, 9],
                              borderColor: 'rgb(139, 92, 246)',
                              backgroundColor: 'rgba(139, 92, 246, 0.5)',
                              fill: true
                            }
                          ]
                        }}
                        options={{
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Material (kg)'
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </Card>
                </div>
                
                {/* Efficiency forecast */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Performance Forecast</h3>
                  <div className="h-64">
                    <Line
                      data={{
                        labels: Array.from({ length: 12 }, (_, i) => {
                          const date = new Date();
                          date.setMonth(date.getMonth() - 6 + i);
                          return date.toLocaleString('default', { month: 'short' });
                        }),
                        datasets: [
                          {
                            label: 'Historical Efficiency',
                            data: [70, 72, 74, 76, 78, 80, null, null, null, null, null, null],
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                            segment: {
                              borderDash: ctx => ctx.p1.parsed.x >= 5 ? [6, 6] : undefined,
                            }
                          },
                          {
                            label: 'Projected Efficiency',
                            data: [null, null, null, null, null, 80, 82, 84, 86, 88, 90, 92],
                            borderColor: 'rgb(139, 92, 246)',
                            backgroundColor: 'rgba(139, 92, 246, 0.5)',
                            borderDash: [5, 5]
                          }
                        ]
                      }}
                      options={{
                        maintainAspectRatio: false,
                        plugins: {
                          tooltip: {
                            callbacks: {
                              title: function(context) {
                                const isProjection = context[0].datasetIndex === 1;
                                const label = context[0].label;
                                return isProjection ? `${label} (Projected)` : label;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            min: 0,
                            max: 100,
                            title: {
                              display: true,
                              text: 'Efficiency (%)'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
                    <h4 className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">Insights</h4>
                    <ul className="text-sm text-indigo-600 dark:text-indigo-300 space-y-1">
                      <li>• Printer efficiency is projected to increase by 12% over the next 6 months</li>
                      <li>• Material usage per print job is expected to decrease by 5%</li>
                      <li>• Downtime is trending downward, suggesting improved maintenance</li>
                    </ul>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports; 