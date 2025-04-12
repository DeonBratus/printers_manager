import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  getPrintings, 
  getPrinters, 
  getModels, 
  createPrinting, 
  pausePrinter, 
  resumePrinter, 
  stopPrinter,
  updatePrinting
} from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';
import { 
  ClockIcon, 
  PrinterIcon, 
  CubeIcon, 
  CalendarIcon, 
  PlusCircleIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const PrintingsList = () => {
  const [printings, setPrintings] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrinters, setSelectedPrinters] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  
  // Modal states
  const [isStartPrintModalOpen, setIsStartPrintModalOpen] = useState(false);
  const [isStopReasonModalOpen, setIsStopReasonModalOpen] = useState(false);
  const [stoppingPrintingId, setStoppingPrintingId] = useState(null);
  
  // Form loading/error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [printingsRes, printersRes, modelsRes] = await Promise.all([
        getPrintings(),
        getPrinters(),
        getModels()
      ]);
      setPrintings(printingsRes.data);
      setPrinters(printersRes.data);
      setModels(modelsRes.data);
    } catch (error) {
      setError("Failed to fetch data. Please try refreshing the page.");
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };
  
  const getEstimatedEndTime = (printing) => {
    if (!printing.start_time || !printing.progress) return 'Unknown';
    
    const startTime = new Date(printing.start_time);
    const elapsedMs = Date.now() - startTime.getTime();
    const totalEstimatedMs = (elapsedMs / printing.progress) * 100;
    const remainingMs = totalEstimatedMs - elapsedMs;
    
    if (remainingMs <= 0) return 'Finishing soon...';
    
    const endDate = new Date(Date.now() + remainingMs);
    return format(endDate, 'MMM d, HH:mm');
  };
  
  const getActivePrints = () => {
    return printings.filter(p => p.status === 'printing' || p.status === 'paused');
  };
  
  const getHistoricalPrints = () => {
    return printings.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  };
  
  const getIdlePrinters = () => {
    return printers.filter(p => p.status === 'idle');
  };
  
  const getPrinterName = (printerId) => {
    const printer = printers.find(p => p.id === printerId);
    return printer ? printer.name : `Printer #${printerId}`;
  };
  
  const getModelName = (modelId) => {
    const model = models.find(m => m.id === modelId);
    return model ? model.name : `Model #${modelId}`;
  };
  
  const handlePrinterSelect = (printerId) => {
    if (selectedPrinters.includes(printerId)) {
      setSelectedPrinters(selectedPrinters.filter(id => id !== printerId));
    } else {
      setSelectedPrinters([...selectedPrinters, printerId]);
    }
  };
  
  const handleModelSelect = (e) => {
    setSelectedModel(e.target.value);
  };
  
  const handleStartPrint = async () => {
    if (selectedPrinters.length === 0 || !selectedModel) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Start printing on each selected printer
      await Promise.all(selectedPrinters.map(printerId => {
        return createPrinting({
          printer_id: parseInt(printerId),
          model_id: parseInt(selectedModel)
        });
      }));
      
      // Refresh data
      await fetchData();
      
      // Reset form and close modal
      setSelectedPrinters([]);
      setSelectedModel('');
      setIsStartPrintModalOpen(false);
    } catch (error) {
      console.error('Error starting print:', error);
      setError(error.response?.data?.detail || "Failed to start print job. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePausePrint = async (printing) => {
    try {
      await pausePrinter(printing.printer_id);
      await fetchData();
    } catch (error) {
      console.error('Error pausing print:', error);
      alert("Failed to pause print. " + (error.response?.data?.detail || "Please try again."));
    }
  };
  
  const handleResumePrint = async (printing) => {
    try {
      await resumePrinter(printing.printer_id);
      await fetchData();
    } catch (error) {
      console.error('Error resuming print:', error);
      alert("Failed to resume print. " + (error.response?.data?.detail || "Please try again."));
    }
  };
  
  const handleStopPrint = async (printing) => {
    setStoppingPrintingId(printing.id);
    setIsStopReasonModalOpen(true);
  };
  
  const confirmStopPrint = async (reason) => {
    try {
      const printing = printings.find(p => p.id === stoppingPrintingId);
      
      if (!printing) return;
      
      // First, stop the printer
      await stopPrinter(printing.printer_id);
      
      // Then update the printing record with the stop reason
      await updatePrinting(printing.id, {
        status: reason === 'completed' ? 'completed' : 'cancelled',
        stop_reason: reason
      });
      
      // Refresh data
      await fetchData();
      
      // Close modal and reset
      setIsStopReasonModalOpen(false);
      setStoppingPrintingId(null);
    } catch (error) {
      console.error('Error stopping print:', error);
      alert("Failed to stop print. " + (error.response?.data?.detail || "Please try again."));
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }
  
  const activePrints = getActivePrints();
  const allPrints = getHistoricalPrints();
  const idlePrinters = getIdlePrinters();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Print Jobs</h1>
        <Button 
          variant="primary"
          onClick={() => setIsStartPrintModalOpen(true)}
          disabled={idlePrinters.length === 0 || models.length === 0}
        >
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Start New Print
        </Button>
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Printings Section */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold dark:text-white">Active Print Jobs</h2>
          
          {activePrints.length > 0 ? (
            <div className="space-y-4">
              {activePrints.map(printing => (
                <Card key={printing.id} className="overflow-visible">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium dark:text-white">
                        {getModelName(printing.model_id)}
                      </h3>
                      <StatusBadge status={printing.status} />
                    </div>
                    
                    <div className="space-y-3 mb-3">
                      <div className="flex items-center text-sm dark:text-gray-300">
                        <PrinterIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span>Printer: {getPrinterName(printing.printer_id)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm dark:text-gray-300">
                        <ClockIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span>Started: {formatDate(printing.start_time)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm dark:text-gray-300">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span>Est. Completion: {getEstimatedEndTime(printing)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm dark:text-gray-300">
                        <span>Progress</span>
                        <span>{Math.round(printing.progress || 0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" 
                          style={{ width: `${printing.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <Link to={`/printings/${printing.id}`} className="flex-1">
                        <Button variant="outline" size="sm" fullWidth>View Details</Button>
                      </Link>
                      
                      {printing.status === 'printing' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePausePrint(printing)}
                          className="flex items-center justify-center"
                        >
                          <PauseIcon className="h-4 w-4" />
                        </Button>
                      ) : printing.status === 'paused' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResumePrint(printing)}
                          className="flex items-center justify-center"
                        >
                          <PlayIcon className="h-4 w-4" />
                        </Button>
                      ) : null}
                      
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => handleStopPrint(printing)}
                        className="flex items-center justify-center"
                      >
                        <StopIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <CubeIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500" />
              <p className="mt-2 text-gray-500 dark:text-gray-400">No active print jobs</p>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsStartPrintModalOpen(true)}
                  disabled={idlePrinters.length === 0 || models.length === 0}
                >
                  Start New Print
                </Button>
              </div>
            </Card>
          )}
        </div>
        
        {/* Print History Table */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Print History</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Printer</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Model</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Started</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {allPrints.length > 0 ? (
                    allPrints.map(printing => (
                      <tr key={printing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-3 px-4 dark:text-gray-300">{printing.id}</td>
                        <td className="py-3 px-4">
                          <Link to={`/printers/${printing.printer_id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            {getPrinterName(printing.printer_id)}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Link to={`/models/${printing.model_id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            {getModelName(printing.model_id)}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={printing.status} />
                        </td>
                        <td className="py-3 px-4 dark:text-gray-300">{formatDate(printing.start_time)}</td>
                        <td className="py-3 px-4 dark:text-gray-300">{formatDate(printing.real_time_stop)}</td>
                        <td className="py-3 px-4">
                          <Link to={`/printings/${printing.id}`}>
                            <Button variant="outline" size="xs">View</Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No print jobs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Start Print Modal */}
      <Modal
        isOpen={isStartPrintModalOpen}
        onClose={() => {
          setIsStartPrintModalOpen(false);
          setError(null);
        }}
        title="Start New Print"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setIsStartPrintModalOpen(false);
                setError(null);
              }}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStartPrint}
              isLoading={isSubmitting}
              disabled={selectedPrinters.length === 0 || !selectedModel || isSubmitting}
            >
              Start Printing
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
              <div className="flex">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                <div className="ml-3">
                  <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Printer(s)
            </label>
            {idlePrinters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {idlePrinters.map(printer => (
                  <div 
                    key={printer.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                      selectedPrinters.includes(printer.id) 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    onClick={() => handlePrinterSelect(printer.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPrinters.includes(printer.id)}
                      onChange={() => {}}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <span className="block font-medium dark:text-white">{printer.name}</span>
                      <StatusBadge status={printer.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-md">
                No idle printers available. Wait for a printer to become available or stop an existing print.
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Model
            </label>
            <select
              value={selectedModel}
              onChange={handleModelSelect}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={models.length === 0}
            >
              <option value="">-- Select a model --</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({Math.round(model.printing_time / 60 * 10) / 10} hrs)
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
      
      {/* Stop Print Confirmation Modal */}
      <Modal
        isOpen={isStopReasonModalOpen}
        onClose={() => setIsStopReasonModalOpen(false)}
        title="Stop Print"
        size="sm"
      >
        <div className="space-y-4">
          <p className="dark:text-white">Why are you stopping this print?</p>
          
          <div className="flex flex-col space-y-2">
            <Button 
              variant="outline" 
              onClick={() => confirmStopPrint('completed')}
              className="justify-start"
            >
              Print completed successfully
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => confirmStopPrint('print_failure')}
              className="justify-start"
            >
              Print failed (poor quality, detached from bed, etc.)
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => confirmStopPrint('printer_error')}
              className="justify-start"
            >
              Printer error or malfunction
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => confirmStopPrint('cancelled')}
              className="justify-start"
            >
              Cancelled manually
            </Button>
          </div>
          
          <div className="pt-2 flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsStopReasonModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PrintingsList;