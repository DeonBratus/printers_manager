import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPrintings, getPrinters, getModels, createPrinting, pauseExistingPrinting, resumeExistingPrinting, cancelExistingPrinting } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { 
  PrinterIcon, 
  ArrowPathIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  ExclamationCircleIcon,
  TableCellsIcon,
  Squares2X2Icon,
  PlusCircleIcon,
  CubeIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const PrintingsList = () => {
  const [printings, setPrintings] = useState([]);
  const [allPrintings, setAllPrintings] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPrinting, setNewPrinting] = useState({
    printer_id: '',
    model_id: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [printingsResponse, printersResponse, modelsResponse] = await Promise.all([
        getPrintings(),
        getPrinters(),
        getModels()
      ]);
      setPrintings(printingsResponse.data);
      setAllPrintings(printingsResponse.data);
      setPrinters(printersResponse.data);
      setModels(modelsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError("Failed to fetch data. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      fetchData().catch(err => console.error("Error in periodic refresh:", err));
    }, 10000); // refresh every 10 seconds
    
    return () => clearInterval(refreshInterval);
  }, []);

  const handlePausePrinting = async (printingId) => {
    try {
      setIsSubmitting(true);
      await pauseExistingPrinting(printingId);
      fetchData();
    } catch (error) {
      console.error('Error pausing printing:', error);
      setError("Failed to pause printing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResumePrinting = async (printingId) => {
    try {
      setIsSubmitting(true);
      await resumeExistingPrinting(printingId);
      fetchData();
    } catch (error) {
      console.error('Error resuming printing:', error);
      setError("Failed to resume printing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPrinting = async (printingId) => {
    try {
      setIsSubmitting(true);
      await cancelExistingPrinting(printingId);
      fetchData();
    } catch (error) {
      console.error('Error canceling printing:', error);
      setError("Failed to cancel printing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    setNewPrinting({
      ...newPrinting,
      [e.target.name]: e.target.value
    });
  };

  const handleCreatePrinting = async (e) => {
    e.preventDefault();

    // Валидация
    if (!newPrinting.printer_id || !newPrinting.model_id) {
      setError("Please select both a printer and a model");
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedModel = models.find(m => m.id === parseInt(newPrinting.model_id));
      
      // Создаем печать
      const data = {
        printer_id: parseInt(newPrinting.printer_id),
        model_id: parseInt(newPrinting.model_id),
        printing_time: selectedModel.printing_time,
        start_time: new Date().toISOString(),
        calculated_time_stop: new Date(Date.now() + selectedModel.printing_time * 3600 * 1000).toISOString()
      };
      
      await createPrinting(data);
      setIsAddModalOpen(false);
      setNewPrinting({ printer_id: '', model_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating printing:', error);
      setError(`Failed to create printing: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  // Calculate remaining time for a printing job
  const getRemainingTime = (printing) => {
    if (!printing.calculated_time_stop) return 'Unknown';
    
    const calculatedStop = new Date(printing.calculated_time_stop);
    const now = new Date();
    
    if (calculatedStop <= now) return 'Completed';
    
    const diffMs = calculatedStop - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}h ${diffMins}m`;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full p-10">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      <p className="ml-3 text-gray-700 dark:text-gray-300">Loading...</p>
    </div>;
  }

  // Filter active printings
  const activePrintings = printings.filter(printing => 
    printing.status === 'printing' || printing.status === 'paused' || printing.status === 'waiting'
  );

  // Filter completed/cancelled printings for history
  const completedPrintings = allPrintings.filter(printing => 
    printing.status === 'completed' || printing.status === 'cancelled'
  ).slice(0, 10); // Limit to 10 latest entries

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Printing Jobs</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={toggleViewMode}
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? (
              <TableCellsIcon className="h-5 w-5" />
            ) : (
              <Squares2X2Icon className="h-5 w-5" />
            )}
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Start New Print
          </Button>
          <Button onClick={fetchData}>
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
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
              <div className="mt-2">
                <Button variant="danger" size="sm" onClick={fetchData}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Active Printings Grid/Cards (Left Side) */}
        <div className="md:w-2/3 space-y-4">
          <h2 className="text-xl font-semibold dark:text-white">Active Print Jobs</h2>
          
          {activePrintings.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <PrinterIcon className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-300">No active print jobs</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                All printers are currently idle.
              </p>
              <div className="mt-4">
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setIsAddModalOpen(true)}
                >
                  Start a new print job
                </Button>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {activePrintings.map((printing) => (
                <Card key={printing.id} className="p-0 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <div className="p-4 border-b dark:border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold dark:text-white">
                          <Link to={`/printings/${printing.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            {printing.model_name}
                          </Link>
                        </h3>
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Printer: <Link to={`/printers/${printing.printer_id}`} className="text-blue-600 hover:underline dark:text-blue-400">{printing.printer_name}</Link>
                        </div>
                      </div>
                      <StatusBadge status={printing.status} />
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="mb-3">
                      <div className="flex justify-between mb-1 text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Progress</span>
                        <span className="text-gray-900 dark:text-white font-medium">{Math.round(printing.progress || 0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" 
                          style={{ width: `${printing.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Started</p>
                        <p className="font-medium dark:text-white">{new Date(printing.start_time).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Remaining</p>
                        <p className="font-medium dark:text-white">{getRemainingTime(printing)}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between mt-2">
                      <Link to={`/printings/${printing.id}`}>
                        <Button 
                          size="sm" 
                          variant="outline"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      {printing.status === 'printing' ? (
                        <Button 
                          size="sm" 
                          variant="warning" 
                          disabled={isSubmitting}
                          onClick={() => handlePausePrinting(printing.id)}
                        >
                          <PauseIcon className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      ) : printing.status === 'paused' ? (
                        <Button 
                          size="sm" 
                          variant="success" 
                          disabled={isSubmitting}
                          onClick={() => handleResumePrinting(printing.id)}
                        >
                          <PlayIcon className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      ) : null}
                      {(printing.status === 'printing' || printing.status === 'paused') && (
                        <Button 
                          size="sm" 
                          variant="danger" 
                          disabled={isSubmitting}
                          onClick={() => handleCancelPrinting(printing.id)}
                        >
                          <StopIcon className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Model
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Printer
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Progress
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time Remaining
                    </th>
                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {activePrintings.map((printing) => (
                    <tr key={printing.id}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium dark:text-white">
                        <Link to={`/printings/${printing.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          {printing.model_name}
                        </Link>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <Link to={`/printers/${printing.printer_id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                          {printing.printer_name}
                        </Link>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 w-24 mr-2">
                            <div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" style={{ width: `${printing.progress || 0}%` }}></div>
                          </div>
                          <span>{Math.round(printing.progress || 0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        <StatusBadge status={printing.status} />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {getRemainingTime(printing)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-center space-x-2">
                          <Link to={`/printings/${printing.id}`}>
                            <Button 
                              size="xs" 
                              variant="outline"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                          {printing.status === 'printing' ? (
                            <Button 
                              size="xs" 
                              variant="warning" 
                              disabled={isSubmitting}
                              onClick={() => handlePausePrinting(printing.id)}
                            >
                              <PauseIcon className="h-4 w-4" />
                            </Button>
                          ) : printing.status === 'paused' ? (
                            <Button 
                              size="xs" 
                              variant="success" 
                              disabled={isSubmitting}
                              onClick={() => handleResumePrinting(printing.id)}
                            >
                              <PlayIcon className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {(printing.status === 'printing' || printing.status === 'paused') && (
                            <Button 
                              size="xs" 
                              variant="danger" 
                              disabled={isSubmitting}
                              onClick={() => handleCancelPrinting(printing.id)}
                            >
                              <StopIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Print Jobs History (Right Side) */}
        <div className="md:w-1/3">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium dark:text-white">Recent Print Jobs</h3>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {completedPrintings.length > 0 ? completedPrintings.map((printing) => (
                <li key={printing.id}>
                  <Link 
                    to={`/printings/${printing.id}`}
                    className="block hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                          {printing.model_name}
                        </p>
                        <StatusBadge status={printing.status} />
                      </div>
                      <div className="mt-2 flex flex-col space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Printer: {printing.printer_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Started: {printing.start_time ? new Date(printing.start_time).toLocaleString() : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Completed: {printing.real_time_stop ? new Date(printing.real_time_stop).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              )) : (
                <li className="px-4 py-5 text-center text-sm text-gray-500 dark:text-gray-400">
                  No completed print jobs yet.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Modal for adding a new printing */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Start New Print Job"
      >
        <form onSubmit={handleCreatePrinting} className="space-y-4">
          <div>
            <label htmlFor="printer_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Printer
            </label>
            <select
              id="printer_id"
              name="printer_id"
              value={newPrinting.printer_id}
              onChange={handleInputChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              <option value="">Select a printer</option>
              {printers
                .filter(printer => printer.status === 'idle') // Only show idle printers
                .map(printer => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name}
                  </option>
                ))}
            </select>
            {printers.filter(printer => printer.status === 'idle').length === 0 && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                No available printers. All printers are currently busy.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="model_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Model
            </label>
            <select
              id="model_id"
              name="model_id"
              value={newPrinting.model_id}
              onChange={handleInputChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              <option value="">Select a model</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.printing_time.toFixed(1)} min)
                </option>
              ))}
            </select>
          </div>
          
          {newPrinting.printer_id && newPrinting.model_id && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <div className="flex">
                <CubeIcon className="h-5 w-5 text-blue-400 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Print Job Summary
                  </h4>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <p>
                      Printer: {printers.find(p => p.id === parseInt(newPrinting.printer_id))?.name}
                    </p>
                    <p>
                      Model: {models.find(m => m.id === parseInt(newPrinting.model_id))?.name}
                    </p>
                    <p>
                      Estimated time: {models.find(m => m.id === parseInt(newPrinting.model_id))?.printing_time.toFixed(1)} hours
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <Button
              type="submit"
              disabled={isSubmitting || !newPrinting.printer_id || !newPrinting.model_id}
              className="w-full sm:col-start-2"
            >
              {isSubmitting ? 'Starting...' : 'Start Printing'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              className="mt-3 sm:mt-0 w-full sm:col-start-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PrintingsList;
