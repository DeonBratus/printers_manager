import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPrinter, updatePrinter, getPrintings, getModels, startPrinter, pausePrinter, resumePrinter, stopPrinter } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';
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
  EyeIcon
} from '@heroicons/react/24/outline';

const PrinterDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [printer, setPrinter] = useState(null);
  const [printings, setPrintings] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '' });
  const [startForm, setStartForm] = useState({ model_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Modals
  const [showStartForm, setShowStartForm] = useState(false);
  const [isStopReasonModalOpen, setIsStopReasonModalOpen] = useState(false);
  const [stopReason, setStopReason] = useState('');

  const fetchPrinterData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [printerRes, printingsRes, modelsRes] = await Promise.all([
        getPrinter(id),
        getPrintings(),
        getModels()
      ]);
      
      setPrinter(printerRes.data);
      setEditForm({ name: printerRes.data.name });
      
      // Filter printings for this printer
      const printerPrintings = printingsRes.data.filter(
        printing => printing.printer_id === parseInt(id)
      );
      setPrintings(printerPrintings);
      
      setModels(modelsRes.data);
    } catch (error) {
      console.error('Error fetching printer data:', error);
      setError('Failed to load printer data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPrinterData();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      fetchPrinterData().catch(err => console.error("Error in periodic refresh:", err));
    }, 10000); // refresh every 10 seconds
    
    return () => clearInterval(refreshInterval);
  }, [fetchPrinterData]);

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
      await fetchPrinterData();
    } catch (error) {
      console.error('Error starting print job:', error);
      setError('Failed to start print job. ' + (error.response?.data?.detail || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

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
    setIsStopReasonModalOpen(true);
  };
  
  const confirmStop = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      
      // First stop the printer
      await stopPrinter(id);
      
      setIsStopReasonModalOpen(false);
      await fetchPrinterData();
    } catch (error) {
      console.error('Error stopping printer:', error);
      setError('Failed to stop printer. ' + (error.response?.data?.detail || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (hours) => {
    if (hours === null || hours === undefined) return 'N/A';
    
    const totalHours = Math.floor(hours);
    const minutes = Math.round((hours - totalHours) * 60);
    
    if (totalHours === 0) {
      return `${minutes}m`;
    }
    
    return `${totalHours}h ${minutes}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Find current printing job if exists
  const currentPrinting = printings.find(p => 
    (p.status === 'printing' || p.status === 'paused') && 
    p.printer_id === parseInt(id)
  );

  // Get most recent printings
  const recentPrintings = printings
    .filter(p => p.status === 'completed' || p.status === 'cancelled')
    .sort((a, b) => new Date(b.real_time_stop) - new Date(a.real_time_stop))
    .slice(0, 5);

  // Calculate statistics
  const totalPrintJobs = printings.length;
  const completedPrintJobs = printings.filter(p => p.status === 'completed').length;
  const cancelledPrintJobs = printings.filter(p => p.status === 'cancelled').length;
  
  // Calculate efficiency if there are completed jobs
  const efficiency = completedPrintJobs > 0 
    ? (completedPrintJobs / (completedPrintJobs + cancelledPrintJobs) * 100).toFixed(1)
    : 'N/A';

  if (loading) {
    return <div className="flex justify-center items-center h-full p-10">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      <p className="ml-3 text-gray-700 dark:text-gray-300">Loading...</p>
    </div>;
  }

  if (!printer) {
    return <div className="text-center py-10">
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
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="outline" size="sm" onClick={() => navigate('/printers')} className="mr-4">
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold dark:text-white">
            {editing ? (
              <form onSubmit={handleEditSubmit} className="flex items-center">
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  className="px-2 py-1 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                <span>{printer.name}</span>
                <button 
                  className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setEditing(true)}
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </h1>
          <div className="ml-4">
            <StatusBadge status={printer.status} size="lg" />
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchPrinterData}>
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </Button>
          {printer.status === 'idle' && (
            <Button
              variant="primary"
              onClick={() => setShowStartForm(true)}
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              Start Print
            </Button>
          )}
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
                <Button variant="danger" size="sm" onClick={fetchPrinterData}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Printer Info */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Printer Information</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                <p className="mt-1 text-sm dark:text-white">
                  <StatusBadge status={printer.status} />
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Print Time</h3>
                <p className="mt-1 text-sm dark:text-white">
                  {formatTime(printer.total_print_time)}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Downtime</h3>
                <p className="mt-1 text-sm dark:text-white">
                  {formatTime(printer.total_downtime)}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Statistics</h3>
                <div className="mt-1 text-sm space-y-1 dark:text-white">
                  <p>Total Jobs: {totalPrintJobs}</p>
                  <p>Completed: {completedPrintJobs}</p>
                  <p>Cancelled: {cancelledPrintJobs}</p>
                  <p>Success Rate: {efficiency}%</p>
                </div>
              </div>
            </div>
            
            {printer.status !== 'idle' && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {printer.status === 'printing' && (
                    <Button 
                      size="sm" 
                      variant="warning" 
                      onClick={handlePause}
                    >
                      <PauseIcon className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  
                  {printer.status === 'paused' && (
                    <Button 
                      size="sm" 
                      variant="success" 
                      onClick={handleResume}
                    >
                      <PlayIcon className="h-4 w-4 mr-1" />
                      Resume
                    </Button>
                  )}
                  
                  {(printer.status === 'printing' || printer.status === 'paused') && (
                    <Button 
                      size="sm" 
                      variant="danger" 
                      onClick={handleStop}
                    >
                      <StopIcon className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
        
        {/* Middle Column - Current Printing */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Current Print Job</h2>
            
            {currentPrinting ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Model</h3>
                  <p className="mt-1 text-sm font-medium dark:text-white">
                    <Link to={`/models/${currentPrinting.model_id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                      {currentPrinting.model_name}
                    </Link>
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                  <p className="mt-1 text-sm">
                    <StatusBadge status={currentPrinting.status} />
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Progress</h3>
                  <div className="mt-2">
                    <div className="flex justify-between mb-1 text-xs">
                      <span className="text-gray-600 dark:text-gray-300">Completion</span>
                      <span className="text-gray-900 dark:text-white font-medium">{Math.round(currentPrinting.progress || 0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${currentPrinting.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Started At</h3>
                  <p className="mt-1 text-sm dark:text-white">
                    {formatDate(currentPrinting.start_time)}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Completion</h3>
                  <p className="mt-1 text-sm dark:text-white">
                    {formatDate(currentPrinting.calculated_time_stop)}
                  </p>
                </div>
                
                <div className="pt-4 flex justify-center">
                  <Link to={`/printings/${currentPrinting.id}`}>
                    <Button 
                      size="sm" 
                      variant="outline"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <PrinterIcon className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-300">No active print job</h3>
                {printer.status === 'idle' ? (
                  <>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Printer is ready for a new job
                    </p>
                    <div className="mt-4">
                      <Button 
                        size="sm" 
                        variant="primary"
                        onClick={() => setShowStartForm(true)}
                      >
                        Start Print
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Printer is in {printer.status} state
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
        
        {/* Right Column - Recent Printings History */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Recent Print History</h2>
            
            {recentPrintings.length > 0 ? (
              <div className="space-y-3">
                {recentPrintings.map(printing => (
                  <Link 
                    key={printing.id} 
                    to={`/printings/${printing.id}`}
                    className="block p-3 border rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium dark:text-white">{printing.model_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Completed: {formatDate(printing.real_time_stop)}
                        </p>
                      </div>
                      <StatusBadge status={printing.status} />
                    </div>
                  </Link>
                ))}
                
                {totalPrintJobs > 5 && (
                  <div className="text-center pt-3">
                    <Button 
                      size="xs" 
                      variant="outline"
                      onClick={() => navigate('/printings')}
                    >
                      View All History
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">No print history yet</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal for starting a new print */}
      <Modal 
        isOpen={showStartForm} 
        onClose={() => setShowStartForm(false)}
        title="Start New Print Job"
      >
        <form onSubmit={handleStart} className="space-y-4 p-4">
          <div>
            <label htmlFor="model_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Model
            </label>
            <select
              id="model_id"
              name="model_id"
              value={startForm.model_id}
              onChange={handleStartChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            >
              <option value="">Select a model</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.printing_time.toFixed(1)} hours)
                </option>
              ))}
            </select>
          </div>
          
          {startForm.model_id && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <div className="flex">
                <CubeIcon className="h-5 w-5 text-blue-400 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Print Job Summary
                  </h4>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <p>
                      Printer: {printer.name}
                    </p>
                    <p>
                      Model: {models.find(m => m.id === parseInt(startForm.model_id))?.name}
                    </p>
                    <p>
                      Estimated time: {models.find(m => m.id === parseInt(startForm.model_id))?.printing_time.toFixed(1)} hours
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <Button
              type="submit"
              disabled={isSubmitting || !startForm.model_id}
              className="w-full sm:col-start-2"
            >
              {isSubmitting ? 'Starting...' : 'Start Printing'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowStartForm(false)}
              className="mt-3 sm:mt-0 w-full sm:col-start-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
      
      {/* Modal for stop reason */}
      <Modal
        isOpen={isStopReasonModalOpen}
        onClose={() => setIsStopReasonModalOpen(false)}
        title="Stop Current Print Job"
      >
        <div className="p-4">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to stop the current print job? This action cannot be undone.
          </p>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                name="stopReason"
                value="completed_early"
                checked={stopReason === 'completed_early'}
                onChange={() => setStopReason('completed_early')}
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">Completed earlier than expected</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                name="stopReason"
                value="printer_malfunction"
                checked={stopReason === 'printer_malfunction'}
                onChange={() => setStopReason('printer_malfunction')}
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">Printer malfunction</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                name="stopReason"
                value="print_failure"
                checked={stopReason === 'print_failure'}
                onChange={() => setStopReason('print_failure')}
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">Print quality issues / failure</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                name="stopReason"
                value="user_cancelled"
                checked={stopReason === 'user_cancelled'}
                onChange={() => setStopReason('user_cancelled')}
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">User cancelled</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                name="stopReason"
                value="other"
                checked={stopReason === 'other'}
                onChange={() => setStopReason('other')}
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">Other</span>
            </label>
          </div>
          
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setIsStopReasonModalOpen(false)}
              className="w-full"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!stopReason || isSubmitting}
              onClick={confirmStop}
              className="w-full mt-3 sm:mt-0"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Stop'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PrinterDetail; 