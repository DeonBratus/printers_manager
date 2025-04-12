import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPrinters, createPrinter, deletePrinter } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { 
  PrinterIcon, 
  ExclamationTriangleIcon,
  PlusCircleIcon,
  TableCellsIcon,
  Squares2X2Icon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const PrintersList = () => {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPrinter, setNewPrinter] = useState({ name: '' });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [printerToDelete, setPrinterToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPrinters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPrinters();
      setPrinters(response.data);
    } catch (error) {
      console.error('Error fetching printers:', error);
      setError("Failed to fetch printers. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      fetchPrinters().catch(err => console.error("Error in periodic refresh:", err));
    }, 30000); // refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, []);

  const handleInputChange = (e) => {
    setNewPrinter({ ...newPrinter, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await createPrinter(newPrinter);
      setNewPrinter({ name: '' });
      setIsAddModalOpen(false);
      fetchPrinters();
    } catch (error) {
      console.error('Error creating printer:', error);
      setError("Failed to create printer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (printer) => {
    setPrinterToDelete(printer);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!printerToDelete) return;
    
    try {
      setIsSubmitting(true);
      await deletePrinter(printerToDelete.id);
      fetchPrinters();
      setIsDeleteModalOpen(false);
      setPrinterToDelete(null);
    } catch (error) {
      console.error('Error deleting printer:', error);
      setError("Failed to delete printer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  // Get the status icon based on printer status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'printing':
        return <PrinterIcon className="h-16 w-16 text-blue-500 animate-pulse" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />;
      case 'paused':
        return <PrinterIcon className="h-16 w-16 text-yellow-500" />;
      default:
        return <PrinterIcon className="h-16 w-16 text-green-500" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full p-10">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      <p className="ml-3 text-gray-700 dark:text-gray-300">Loading...</p>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Printers</h1>
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
            Add New Printer
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
                <Button variant="danger" size="sm" onClick={fetchPrinters}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {printers.map((printer) => (
            <Card key={printer.id} className="p-0 overflow-hidden hover:shadow-lg transition-shadow duration-200">
              <div className="flex flex-col h-full">
                {/* Status Icon and Color Band */}
                <div className={`p-4 flex justify-center items-center h-40 
                  ${printer.status === 'idle' ? 'bg-green-50 dark:bg-green-900/20' : 
                    printer.status === 'printing' ? 'bg-blue-50 dark:bg-blue-900/20' : 
                    printer.status === 'paused' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 
                    'bg-red-50 dark:bg-red-900/20'}`}>
                  {getStatusIcon(printer.status)}
                  
                  {/* Only show progress bar for printing status */}
                  {printer.status === 'printing' && printer.current_printing && (
                    <div className="w-full mt-4">
                      <div className="text-center mb-1 text-sm text-gray-600 dark:text-gray-300">
                        {Math.round(printer.current_printing.progress || 0)}%
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" 
                          style={{ width: `${printer.current_printing.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Printer Info */}
                <div className="p-4 flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold dark:text-white">
                        <Link to={`/printers/${printer.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          {printer.name}
                        </Link>
                      </h3>
                      <div className="mt-2">
                        <StatusBadge status={printer.status} />
                      </div>
                      <div className="mt-4 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <p>Total Print Time: {Math.round(printer.total_print_time / 60)} hours</p>
                        <p>Total Downtime: {Math.round(printer.total_downtime / 60)} hours</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="px-4 pb-4 flex justify-between space-x-2">
                  <Link to={`/printers/${printer.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" fullWidth>
                      View
                    </Button>
                  </Link>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => openDeleteModal(printer)}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Print Time</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Downtime</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {printers.length > 0 ? (
                  printers.map(printer => (
                    <tr key={printer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4 dark:text-gray-300">{printer.id}</td>
                      <td className="py-3 px-4">
                        <Link to={`/printers/${printer.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          {printer.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={printer.status} />
                      </td>
                      <td className="py-3 px-4 dark:text-gray-300">{Math.round(printer.total_print_time / 60)} hours</td>
                      <td className="py-3 px-4 dark:text-gray-300">{Math.round(printer.total_downtime / 60)} hours</td>
                      <td className="py-3 px-4 space-x-2">
                        <Link to={`/printers/${printer.id}`}>
                          <Button variant="outline" size="xs">View</Button>
                        </Link>
                        <Button 
                          variant="danger" 
                          size="xs"
                          onClick={() => openDeleteModal(printer)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No printers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {printers.length === 0 && !loading && !error && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No printers found. Add your first printer to get started.</p>
          <Button onClick={() => setIsAddModalOpen(true)} className="mt-4">
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Add Printer
          </Button>
        </Card>
      )}

      {/* Add Printer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Printer"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={!newPrinter.name.trim() || isSubmitting}
            >
              Add Printer
            </Button>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Printer Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newPrinter.name}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter printer name"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Give your printer a descriptive name to easily identify it.
            </p>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPrinterToDelete(null);
        }}
        title="Delete Printer"
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setPrinterToDelete(null);
              }}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Delete Printer
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-2" />
            <p className="dark:text-white">
              Are you sure you want to delete printer "{printerToDelete?.name}"?
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. All print history for this printer will remain in the database.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default PrintersList; 