import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPrinting, pauseExistingPrinting, resumeExistingPrinting, cancelExistingPrinting, completeExistingPrinting } from '../services/api';
import Button from '../components/Button';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { 
  ArrowLeftIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  ClockIcon,
  CalendarIcon,
  PrinterIcon,
  CubeIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { formatDuration, formatMinutesToHHMM } from '../utils/timeFormat';

const PrintingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [printing, setPrinting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Модальные окна
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  const fetchPrinting = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPrinting(id);
      setPrinting(response.data);
    } catch (error) {
      console.error('Error fetching printing:', error);
      setError("Failed to fetch printing details. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinting();
    
    // Set up periodic refresh for active printings
    const refreshInterval = setInterval(() => {
      fetchPrinting().catch(err => console.error("Error in periodic refresh:", err));
    }, 5000); // refresh every 5 seconds
    
    return () => clearInterval(refreshInterval);
  }, [id]);

  const handlePausePrinting = async () => {
    try {
      setIsSubmitting(true);
      await pauseExistingPrinting(id);
      fetchPrinting();
    } catch (error) {
      console.error('Error pausing printing:', error);
      setError("Failed to pause printing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResumePrinting = async () => {
    try {
      setIsSubmitting(true);
      await resumeExistingPrinting(id);
      fetchPrinting();
    } catch (error) {
      console.error('Error resuming printing:', error);
      setError("Failed to resume printing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsStopModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!stopReason) {
      setError("Please select a reason for cancellation");
      return;
    }

    try {
      setIsSubmitting(true);
      await cancelExistingPrinting(id);
      setIsStopModalOpen(false);
      fetchPrinting();
      
      // В будущем можно сохранить причину отмены
      // await updatePrinting(id, { cancel_reason: stopReason });
    } catch (error) {
      console.error('Error canceling printing:', error);
      setError("Failed to cancel printing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      await completeExistingPrinting(id);
      fetchPrinting();
    } catch (error) {
      console.error('Error completing printing:', error);
      setError("Failed to complete printing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate remaining time for a printing job
  const getRemainingTime = (printing) => {
    if (!printing.calculated_time_stop) return 'Unknown';
    
    const calculatedStop = new Date(printing.calculated_time_stop);
    const now = new Date();
    
    if (calculatedStop <= now) return 'Completed';
    
    // Разница в минутах
    const diffMs = calculatedStop - now;
    const diffMinutes = diffMs / (1000 * 60);
    return formatDuration(diffMinutes);
  };

  const getCompletionPercentage = (printing) => {
    if (printing.real_time_stop) return 100;
    if (!printing.start_time || !printing.calculated_time_stop) return 0;
    
    const startTime = new Date(printing.start_time).getTime();
    const endTime = new Date(printing.calculated_time_stop).getTime();
    const currentTime = new Date().getTime();
    
    // Если печать на паузе, не показываем прогресс выше текущего
    if (printing.status === 'paused' && printing.progress) {
      return printing.progress;
    }
    
    // Вычисляем процент от общего времени
    let percent = ((currentTime - startTime) / (endTime - startTime)) * 100;
    return Math.min(Math.max(percent, 0), 100); // Ограничиваем значения от 0 до 100
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full p-10">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      <p className="ml-3 text-gray-700 dark:text-gray-300">Loading...</p>
    </div>;
  }

  if (!printing) {
    return <div className="text-center py-10">
      <ExclamationCircleIcon className="h-12 w-12 mx-auto text-red-500" />
      <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">Printing not found</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        The printing job you are looking for does not exist or has been deleted.
      </p>
      <div className="mt-6">
        <Button onClick={() => navigate('/printings')}>
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Printings
        </Button>
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="outline" size="sm" onClick={() => navigate('/printings')} className="mr-4">
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold dark:text-white">Printing Details: {printing.model_name}</h1>
        </div>
        <Button onClick={fetchPrinting}>
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
              <div className="mt-2">
                <Button variant="danger" size="sm" onClick={fetchPrinting}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium dark:text-white">Print Job Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Details about the current printing job.
            </p>
          </div>
          <StatusBadge status={printing.status} size="lg" />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
          <div className="mt-4">
            <div className="flex justify-between mb-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300">Progress</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {Math.round(printing.progress !== undefined ? printing.progress : getCompletionPercentage(printing))}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all" 
                style={{ width: `${printing.progress !== undefined ? printing.progress : getCompletionPercentage(printing)}%` }}
              ></div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mt-6">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <CubeIcon className="h-5 w-5 mr-2 text-gray-400" />
                Model
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                <Link to={`/models/${printing.model_id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  {printing.model_name}
                </Link>
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <PrinterIcon className="h-5 w-5 mr-2 text-gray-400" />
                Printer
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                <Link to={`/printers/${printing.printer_id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  {printing.printer_name}
                </Link>
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                Start Time
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {printing.start_time ? new Date(printing.start_time).toLocaleString() : 'Not started'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                Expected Completion
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {printing.calculated_time_stop ? new Date(printing.calculated_time_stop).toLocaleString() : 'Unknown'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
                Printing Time
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {printing.printing_time ? 
                  `${formatMinutesToHHMM(printing.printing_time)} (${formatDuration(printing.printing_time)})` 
                  : 'Unknown'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
                Time Remaining
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {getRemainingTime(printing)}
              </dd>
            </div>
            {printing.pause_time && (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  <PauseIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Paused Since
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(printing.pause_time).toLocaleString()}
                </dd>
              </div>
            )}
            {printing.downtime > 0 && (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Total Downtime
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {`${printing.downtime.toFixed(2)} hours`}
                </dd>
              </div>
            )}
            {printing.real_time_stop && (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Actual Completion
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(printing.real_time_stop).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
        
        {/* Действия в зависимости от статуса печати */}
        {(printing.status === 'printing' || printing.status === 'paused') && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
            <div className="flex space-x-3 justify-end">
              {printing.status === 'printing' ? (
                <Button 
                  size="md" 
                  variant="warning" 
                  disabled={isSubmitting}
                  onClick={handlePausePrinting}
                >
                  <PauseIcon className="h-5 w-5 mr-2" />
                  Pause Printing
                </Button>
              ) : (
                <Button 
                  size="md" 
                  variant="success" 
                  disabled={isSubmitting}
                  onClick={handleResumePrinting}
                >
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Resume Printing
                </Button>
              )}
              <Button 
                size="md" 
                variant="danger" 
                disabled={isSubmitting}
                onClick={handleCancel}
              >
                <StopIcon className="h-5 w-5 mr-2" />
                Cancel Printing
              </Button>
            </div>
          </div>
        )}
        
        {/* Кнопка завершения для печатей в статусе waiting (ожидающих подтверждения) */}
        {printing.status === 'waiting' && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
            <div className="text-center">
              <div className="mb-4 text-yellow-600 dark:text-yellow-500">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12" />
                <p className="mt-2 text-sm">
                  The print appears to be complete. Please confirm to finalize the job.
                </p>
              </div>
              <Button 
                size="lg" 
                variant="success" 
                disabled={isSubmitting}
                onClick={handleComplete}
                className="px-8"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Confirm Completion
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно для выбора причины завершения печати */}
      <Modal
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        title="Cancel Print Job"
      >
        <div className="p-4">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            Please select a reason for canceling this print job:
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
              onClick={() => setIsStopModalOpen(false)}
              className="w-full"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!stopReason || isSubmitting}
              onClick={handleConfirmCancel}
              className="w-full mt-3 sm:mt-0"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PrintingDetail;
