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
  StopIcon
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
  
  const confirmStop = async (reason) => {
    try {
      setError(null);
      
      // First stop the printer
      await stopPrinter(id);
      
      // Next update the printing with the reason
      const currentPrinting = printings.find(p => 
        (p.status === 'printing' || p.status === 'paused') && 
        p.printer_id === parseInt(id)
      );
      
      if (currentPrinting) {
        // You would need an API endpoint to update the printing with the reason
        // await updatePrinting(currentPrinting.id, {
        //   status: reason === 'completed' ? 'completed' : 'cancelled',
        //   stop_reason: reason
        // });
      }
      
      await fetchPrinterData();
      setIsStopReasonModalOpen(false);
    } catch (error) {
      console.error('Error stopping printer:', error);
      setError('Failed to stop printer. ' + (error.response?.data?.detail || 'Please try again.'));
    }
  };

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

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!printer) {
    return <div className="text-center py-8 dark:text-white">Printer not found</div>;
  }

  // Find current printing job if exists
  const currentPrinting = printings.find(p => 
    (p.status === 'printing' || p.status === 'paused') && 
    p.printer_id === parseInt(id)
  );
  
  // Get historical printings
  const historicalPrintings = printings
    .filter(p => p.status !== 'printing' && p.status !== 'paused')
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">{printer.name}</h1>
        <div className="flex space-x-3">
          <Button onClick={() => navigate(-1)} variant="secondary">
            Back
          </Button>
          <Button onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit'}
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

      {editing ? (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Edit Printer</h2>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Printer Name
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
            <div className="flex justify-end">
              <Button type="submit" isLoading={isSubmitting}>Save Changes</Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Printer Details Card */}
          <Card className="p-4 lg:col-span-1">
            <div className="flex flex-col h-full">
              {/* Status Icon */}
              <div className={`p-4 flex justify-center items-center h-32 mb-4
                ${printer.status === 'idle' ? 'bg-green-50 dark:bg-green-900/20' : 
                  printer.status === 'printing' ? 'bg-blue-50 dark:bg-blue-900/20' : 
                  printer.status === 'paused' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 
                  'bg-red-50 dark:bg-red-900/20'}`}>
                <PrinterIcon className={`h-16 w-16 
                  ${printer.status === 'idle' ? 'text-green-500' : 
                    printer.status === 'printing' ? 'text-blue-500 animate-pulse' : 
                    printer.status === 'paused' ? 'text-yellow-500' : 
                    'text-red-500'}`} />
              </div>
              
              <h2 className="text-lg font-semibold mb-2 dark:text-white">Printer Details</h2>
              <div className="space-y-3 flex-grow">
                <div className="flex justify-between">
                  <span className="font-medium dark:text-gray-300">Status:</span>
                  <StatusBadge status={printer.status} />
                </div>
                <div className="flex justify-between">
                  <span className="font-medium dark:text-gray-300">Total Print Time:</span>
                  <span className="dark:text-gray-300">{Math.round(printer.total_print_time / 60)} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium dark:text-gray-300">Total Downtime:</span>
                  <span className="dark:text-gray-300">{Math.round(printer.total_downtime / 60)} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium dark:text-gray-300">Efficiency:</span>
                  <span className="dark:text-gray-300">
                    {Math.round(printer.total_print_time / (printer.total_print_time + printer.total_downtime) * 100) || 0}%
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium mb-2 dark:text-white">Printer Control</h3>
                <div className="flex flex-wrap gap-2">
                  {printer.status === 'idle' && (
                    <Button onClick={() => setShowStartForm(!showStartForm)} fullWidth>
                      Start New Print
                    </Button>
                  )}
                  {printer.status === 'printing' && (
                    <div className="flex gap-2 w-full">
                      <Button onClick={handlePause} variant="warning" className="flex-1">
                        <PauseIcon className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                      <Button onClick={handleStop} variant="danger" className="flex-1">
                        <StopIcon className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </div>
                  )}
                  {printer.status === 'paused' && (
                    <div className="flex gap-2 w-full">
                      <Button onClick={handleResume} variant="primary" className="flex-1">
                        <PlayIcon className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                      <Button onClick={handleStop} variant="danger" className="flex-1">
                        <StopIcon className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
          
          {/* Active Print Job / Start Form */}
          <Card className="p-4 lg:col-span-2">
            {showStartForm ? (
              <div>
                <h2 className="text-lg font-semibold mb-4 dark:text-white">Start New Print</h2>
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
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      disabled={isSubmitting}
                    >
                      <option value="">-- Select a Model --</option>
                      {models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({Math.round(model.printing_time / 60 * 10) / 10} hours)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setShowStartForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting} disabled={!startForm.model_id || isSubmitting}>
                      Start Print
                    </Button>
                  </div>
                </form>
              </div>
            ) : currentPrinting ? (
              <div>
                <h2 className="text-lg font-semibold mb-4 dark:text-white">Current Print Job</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CubeIcon className="h-5 w-5 text-blue-500" />
                    <h3 className="text-md font-medium dark:text-white">
                      {models.find(m => m.id === currentPrinting.model_id)?.name || `Model #${currentPrinting.model_id}`}
                    </h3>
                    <StatusBadge status={currentPrinting.status} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm dark:text-gray-300">
                        <ClockIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span>Started: {formatDate(currentPrinting.start_time)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm dark:text-gray-300">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span>Est. Completion: {getEstimatedEndTime(currentPrinting)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm dark:text-gray-300">
                        <span>Progress</span>
                        <span>{Math.round(currentPrinting.progress || 0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" 
                          style={{ width: `${currentPrinting.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                    <Link to={`/printings/${currentPrinting.id}`}>
                      <Button variant="outline" size="sm">View Print Job Details</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <CubeIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                <p className="mb-4 text-gray-500 dark:text-gray-400">No active print job</p>
                {printer.status === 'idle' && (
                  <Button onClick={() => setShowStartForm(true)} variant="primary">
                    Start New Print
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Print History */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Print History</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Model</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Started</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {historicalPrintings.length > 0 ? (
                historicalPrintings.map(printing => (
                  <tr key={printing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 dark:text-gray-300">{printing.id}</td>
                    <td className="py-3 px-4">
                      <Link to={`/models/${printing.model_id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        {models.find(m => m.id === printing.model_id)?.name || `Model #${printing.model_id}`}
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
                        'N/A'
                      }
                    </td>
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
                    No print history found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
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
              onClick={() => confirmStop('completed')}
              className="justify-start"
            >
              Print completed successfully
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => confirmStop('print_failure')}
              className="justify-start"
            >
              Print failed (poor quality, detached from bed, etc.)
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => confirmStop('printer_error')}
              className="justify-start"
            >
              Printer error or malfunction
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => confirmStop('cancelled')}
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

export default PrinterDetail; 