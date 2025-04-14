import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPrinter, updatePrinter, getPrintings, getModels, startPrinter, pausePrinter, resumePrinter, stopPrinter, confirmPrinting } from '../services/api';
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
  ExclamationTriangleIcon
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
  const [editForm, setEditForm] = useState({ name: '' });
  const [startForm, setStartForm] = useState({ model_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Modals
  const [showStartForm, setShowStartForm] = useState(false);
  const [isStopReasonModalOpen, setIsStopReasonModalOpen] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchPrinterData = useCallback(async () => {
    try {
      if (loading) {
        // Full loading state
        setError(null);
      } else {
        // Just refreshing data
        setRefreshing(true);
      }
      
      const [printerRes, printingsRes, modelsRes] = await Promise.all([
        getPrinter(id),
        getPrintings(),
        getModels()
      ]);
      
      // Smart update of printer to prevent jumping
      setPrinter(prevPrinter => {
        // If first load or significant change, replace completely
        if (!prevPrinter || prevPrinter.status !== printerRes.data.status) {
          return printerRes.data;
        }
        
        // Otherwise just update specific fields without causing re-renders
        return {
          ...prevPrinter,
          status: printerRes.data.status,
          total_print_time: printerRes.data.total_print_time,
          total_downtime: printerRes.data.total_downtime
        };
      });
      
      if (!editing) {
        setEditForm({ name: printerRes.data.name });
      }
      
      // Smart update of printings to prevent unnecessary re-renders
      setPrintings(prevPrintings => {
        const printerPrintings = printingsRes.data.filter(
          printing => printing.printer_id === parseInt(id)
        );
        
        // If counts are different or first load, replace completely
        if (!prevPrintings.length || prevPrintings.length !== printerPrintings.length) {
          return printerPrintings;
        }
        
        // Otherwise just update statuses and progress
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
    } catch (error) {
      console.error('Error fetching printer data:', error);
      setError('Failed to load printer data. Please try refreshing the page.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, loading, editing]);

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
      setStartForm({ model_id: '' });
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
    setStopReason('');
    setIsStopReasonModalOpen(true);
  };
  
  const confirmStop = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      
      // First stop the printer with the reason
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

  const formatTime = (minutes) => {
    if (minutes === null || minutes === undefined) return 'N/A';
    return formatDuration(minutes);
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

  // Find completed but unconfirmed printing
  const unconfirmedPrinting = printings.find(p => 
    p.progress === 100 && !p.real_time_stop && 
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
          <Button onClick={fetchPrinterData} disabled={refreshing}>
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
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
          {printer.status === 'waiting' && (
            <Button
              variant="success"
              onClick={() => setShowConfirmModal(true)}
            >
              <CheckIcon className="h-5 w-5 mr-2" />
              Confirm Print Complete
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
          <Card className="p-6 h-full">
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
            
            {(printer.status === 'printing' || printer.status === 'paused') && (
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
          <Card className="p-6 h-full">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Current Print Job</h2>
            
            {currentPrinting ? (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CubeIcon className="h-5 w-5 text-blue-500 mr-2" />
                    <h3 className="text-blue-800 dark:text-blue-300 font-medium">{currentPrinting.model_name}</h3>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex justify-between mb-1 text-xs text-blue-800 dark:text-blue-300">
                      <span>Progress</span>
                      <span>{Math.round(currentPrinting.progress || 0)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" 
                        style={{ width: `${currentPrinting.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                  <p className="mt-1 text-sm dark:text-white">
                    <StatusBadge status={currentPrinting.status} />
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Printing Time</h3>
                  <p className="mt-1 text-sm dark:text-white">
                    {formatTime(currentPrinting.printing_time / 3600)}
                  </p>
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

                {currentPrinting.progress >= 100 && (
                  <div className="pt-2 flex justify-center">
                    <Button 
                      size="sm" 
                      variant="success"
                      onClick={() => setShowConfirmModal(true)}
                    >
                      <CheckIcon className="h-4 w-4 mr-1" />
                      Confirm Completion
                    </Button>
                  </div>
                )}
              </div>
            ) : unconfirmedPrinting ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CubeIcon className="h-5 w-5 text-green-500 mr-2" />
                    <h3 className="text-green-800 dark:text-green-300 font-medium">{unconfirmedPrinting.model_name}</h3>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex justify-between mb-1 text-xs text-green-800 dark:text-green-300">
                      <span>Progress</span>
                      <span>100%</span>
                    </div>
                    <div className="w-full bg-green-200 dark:bg-green-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 dark:bg-green-400 h-2 rounded-full w-full"
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                  <p className="mt-1 text-sm dark:text-white">
                    <StatusBadge status="completed" />
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Printing Time</h3>
                  <p className="mt-1 text-sm dark:text-white">
                    {formatTime(unconfirmedPrinting.printing_time / 3600)}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Started At</h3>
                  <p className="mt-1 text-sm dark:text-white">
                    {formatDate(unconfirmedPrinting.start_time)}
                  </p>
                </div>
                
                <div className="pt-4 flex justify-center">
                  <Button 
                    size="sm" 
                    variant="success"
                    onClick={() => setShowConfirmModal(true)}
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Confirm Completion
                  </Button>
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
          <Card className="p-6 h-full">
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
        title="Start New Print"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowStartForm(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStart}
              isLoading={isSubmitting}
              disabled={!startForm.model_id || isSubmitting}
            >
              Start Print
            </Button>
          </div>
        }
      >
        <form onSubmit={handleStart} className="space-y-4">
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
                  {model.name} ({formatMinutesToHHMM(model.printing_time)})
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
                      Estimated time: {models.find(m => m.id === parseInt(startForm.model_id))?.printing_time ? 
                        `${formatMinutesToHHMM(models.find(m => m.id === parseInt(startForm.model_id))?.printing_time)} (${formatDuration(models.find(m => m.id === parseInt(startForm.model_id))?.printing_time)})` : 
                        'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Modal for confirming print completion */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Print Completion"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleConfirmPrinting}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Confirm Complete
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure the print job is complete and you want to mark it as successful?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This will set the printer status to idle and record the print job as completed successfully.
          </p>
        </div>
      </Modal>

      {/* Stop Reason Modal */}
      <Modal
        isOpen={isStopReasonModalOpen}
        onClose={() => setIsStopReasonModalOpen(false)}
        title="Why are you stopping the print?"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsStopReasonModalOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!stopReason || isSubmitting}
              onClick={confirmStop}
            >
              {isSubmitting ? 'Processing...' : 'Confirm Stop'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mt-1" />
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                Please select a reason for stopping this print job:
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="success-early"
                name="stop-reason"
                type="radio"
                checked={stopReason === 'finished-early'}
                onChange={() => setStopReason('finished-early')}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
              />
              <label htmlFor="success-early" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Print finished early (success)
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="emergency"
                name="stop-reason"
                type="radio"
                checked={stopReason === 'emergency'}
                onChange={() => setStopReason('emergency')}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
              />
              <label htmlFor="emergency" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Emergency stop (failure)
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="changed-mind"
                name="stop-reason"
                type="radio"
                checked={stopReason === 'changed-mind'}
                onChange={() => setStopReason('changed-mind')}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300"
              />
              <label htmlFor="changed-mind" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Changed mind (cancelled)
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="other"
                name="stop-reason"
                type="radio"
                checked={stopReason === 'other'}
                onChange={() => setStopReason('other')}
                className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300"
              />
              <label htmlFor="other" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Other reason (cancelled)
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PrinterDetail; 