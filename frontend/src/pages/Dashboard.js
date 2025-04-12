import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPrinters, getPrintings, getPrinterStatusReport, createPrinter, createModel } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { Bar, Pie } from 'react-chartjs-2';
import { PlusCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const [printers, setPrinters] = useState([]);
  const [printings, setPrintings] = useState([]);
  const [statusReport, setStatusReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
  
  // Form loading states
  const [isAddingPrinter, setIsAddingPrinter] = useState(false);
  const [isAddingModel, setIsAddingModel] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use Promise.allSettled to get all data even if some requests fail
        const results = await Promise.allSettled([
          getPrinters(),
          getPrintings(),
          getPrinterStatusReport()
        ]);
        
        // Handle each result
        const [printersResult, printingsResult, statusReportResult] = results;
        
        if (printersResult.status === 'fulfilled') {
          setPrinters(printersResult.value.data);
        } else {
          console.error('Error fetching printers:', printersResult.reason);
        }
        
        if (printingsResult.status === 'fulfilled') {
          setPrintings(printingsResult.value.data.slice(0, 5)); // Get only 5 most recent printings
        } else {
          console.error('Error fetching printings:', printingsResult.reason);
        }
        
        if (statusReportResult.status === 'fulfilled') {
          setStatusReport(statusReportResult.value.data);
        } else {
          console.error('Error fetching status report:', statusReportResult.reason);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);
  
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
  const generatePrinterStatusData = () => {
    const statusCounts = {
      idle: 0,
      printing: 0,
      paused: 0,
      error: 0
    };
    
    // Count printers by status if status report is not available
    if (!statusReport?.status_counts) {
      printers.forEach(printer => {
        if (statusCounts.hasOwnProperty(printer.status)) {
          statusCounts[printer.status]++;
        }
      });
    } else {
      // Use status counts from report
      Object.assign(statusCounts, statusReport.status_counts);
    }
    
    return {
      labels: ['Idle', 'Printing', 'Paused', 'Error'],
      datasets: [
        {
          data: [
            statusCounts.idle,
            statusCounts.printing,
            statusCounts.paused,
            statusCounts.error,
          ],
          backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
        },
      ],
    };
  };

  const generatePrinterEfficiencyData = () => {
    if (!statusReport || !statusReport.printers || statusReport.printers.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Efficiency (%)',
          data: [0],
          backgroundColor: '#3B82F6',
        }]
      };
    }
    
    return {
      labels: statusReport.printers.map(p => p.name),
      datasets: [{
        label: 'Efficiency (%)',
        data: statusReport.printers.map(p => p.efficiency),
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
        <span className="ml-2">Loading dashboard data...</span>
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

  const printerStatusData = generatePrinterStatusData();
  const printerEfficiencyData = generatePrinterEfficiencyData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Dashboard</h1>
        <div className="flex space-x-3">
          <Button 
            variant="primary" 
            size="md"
            onClick={() => setIsAddModelModalOpen(true)}
          >
            <PlusCircleIcon className="h-5 w-5 mr-1" />
            Add Model
          </Button>
          <Button 
            variant="primary" 
            size="md"
            onClick={() => setIsAddPrinterModalOpen(true)}
          >
            <PlusCircleIcon className="h-5 w-5 mr-1" />
            Add Printer
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2 dark:text-white">Printers Status</h2>
          <div className="h-64">
            <Pie data={printerStatusData} options={{ maintainAspectRatio: false }} />
          </div>
        </Card>
        
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2 dark:text-white">Printer Efficiency</h2>
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
          <h2 className="text-lg font-semibold mb-2 dark:text-white">Printers Overview</h2>
          <div className="space-y-2 dark:text-gray-300">
            <p>Total Printers: {printers.length}</p>
            <p>Active Printers: {printers.filter(p => p.status === 'printing').length}</p>
            <p>Total Print Jobs: {printings.length}</p>
          </div>
          <div className="mt-4">
            <Link to="/printers">
              <Button variant="outline" size="sm">View All Printers</Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2 dark:text-white">Recent Print Jobs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Printer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Model</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {printings && printings.length > 0 ? (
                printings.map((printing) => (
                  <tr key={printing.id}>
                    <td className="px-4 py-2 whitespace-nowrap dark:text-gray-300">{printing.printer_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap dark:text-gray-300">{printing.model_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap dark:text-gray-300">
                      {new Date(printing.start_time).toLocaleString()}
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
                  <td colSpan="5" className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                    No print jobs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Link to="/printings">
            <Button variant="outline" size="sm">View All Print Jobs</Button>
          </Link>
        </div>
      </Card>
      
      {/* Add Printer Modal */}
      <Modal
        isOpen={isAddPrinterModalOpen}
        onClose={() => setIsAddPrinterModalOpen(false)}
        title="Add New Printer"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsAddPrinterModalOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddPrinter}
              isLoading={isAddingPrinter}
              disabled={!newPrinterData.name || !newPrinterData.ip_address}
            >
              Add Printer
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddPrinter} className="space-y-4">
          <div className="form-group">
            <label htmlFor="printer-name" className="form-label">
              Printer Name
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
              IP Address
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
              Printer Model
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
        title="Add New 3D Model"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsAddModelModalOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddModel}
              isLoading={isAddingModel}
              disabled={!newModelData.name}
            >
              Add Model
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddModel} className="space-y-4">
          <div className="form-group">
            <label htmlFor="model-name" className="form-label">
              Model Name
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
              Description
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
                Printing Time (hours)
              </label>
              <input
                type="number"
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
                Filament Length (mm)
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
              Filament Type
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