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
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const PrintersList = () => {
  const [printers, setPrinters] = useState([]);
  const [filteredPrinters, setFilteredPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPrinter, setNewPrinter] = useState({ name: '', model: '' });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Filtering, sorting and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [showFilters, setShowFilters] = useState(false);
  
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

  // Apply filters, sorting and pagination
  useEffect(() => {
    let result = [...printers];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(printer => 
        printer.name.toLowerCase().includes(query) || 
        (printer.model && printer.model.toLowerCase().includes(query))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(printer => printer.status === statusFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle special cases
      if (sortField === 'total_print_time' || sortField === 'total_downtime') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredPrinters(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [printers, searchQuery, statusFilter, sortField, sortDirection]);

  const handleInputChange = (e) => {
    setNewPrinter({ ...newPrinter, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await createPrinter(newPrinter);
      setNewPrinter({ name: '', model: '' });
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

  // Handle sort toggling
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon for table headers
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronLeftIcon className="h-4 w-4 text-blue-500 rotate-90" />
      : <ChevronLeftIcon className="h-4 w-4 text-blue-500 -rotate-90" />;
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredPrinters.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPrinters.slice(indexOfFirstItem, indexOfLastItem);

  // Handle page change
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Function to format time in hours and minutes
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    
    if (hours === 0) {
      return `${minutes}m`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  // Grid view display
  const renderGridItems = () => {
    return currentItems.map(printer => (
      <Card key={printer.id} className="overflow-hidden shadow-md transition-shadow hover:shadow-lg">
        <Link to={`/printers/${printer.id}`} className="block hover:no-underline">
          <div className="p-6 text-center">
            {getStatusIcon(printer.status)}
            <h3 className="mt-4 text-lg font-medium dark:text-white">{printer.name}</h3>
            {printer.model && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Model: {printer.model}
              </p>
            )}
            <StatusBadge status={printer.status} className="mt-3" />
          </div>
        </Link>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Print Time</div>
              <div className="font-medium dark:text-white">{formatTime(printer.total_print_time || 0)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Downtime</div>
              <div className="font-medium dark:text-white">{formatTime(printer.total_downtime || 0)}</div>
            </div>
          </div>
        </div>
      </Card>
    ));
  };

  // List view display 
  const renderListItems = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                <button 
                  onClick={() => handleSort('name')}
                  className="group inline-flex items-center"
                >
                  Printer Name {getSortIcon('name')}
                </button>
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                <button 
                  onClick={() => handleSort('model')}
                  className="group inline-flex items-center"
                >
                  Model {getSortIcon('model')}
                </button>
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                <button 
                  onClick={() => handleSort('status')}
                  className="group inline-flex items-center"
                >
                  Status {getSortIcon('status')}
                </button>
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                <button 
                  onClick={() => handleSort('total_print_time')}
                  className="group inline-flex items-center"
                >
                  Print Time {getSortIcon('total_print_time')}
                </button>
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                <button 
                  onClick={() => handleSort('total_downtime')}
                  className="group inline-flex items-center"
                >
                  Downtime {getSortIcon('total_downtime')}
                </button>
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentItems.map(printer => (
              <tr key={printer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium dark:text-white">
                  <Link to={`/printers/${printer.id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                    {printer.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {printer.model || "N/A"}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <StatusBadge status={printer.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {formatTime(printer.total_print_time || 0)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {formatTime(printer.total_downtime || 0)}
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm">
                  <button 
                    className="text-red-600 hover:text-red-900"
                    onClick={() => openDeleteModal(printer)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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

      {/* Search and filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search printers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="idle">Idle</option>
                <option value="printing">Printing</option>
                <option value="paused">Paused</option>
                <option value="error">Error</option>
              </select>
            </div>
            
            <div className="w-32">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value={8}>8 per page</option>
                <option value={16}>16 per page</option>
                <option value={32}>32 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            
            <Button 
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <FunnelIcon className="h-5 w-5 mr-1" />
              Filters
            </Button>
          </div>
        </div>
        
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
            <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Sort by</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button 
                variant={sortField === 'name' ? 'primary' : 'outline'} 
                size="sm"
                onClick={() => handleSort('name')}
                className="justify-center"
              >
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
              <Button 
                variant={sortField === 'status' ? 'primary' : 'outline'} 
                size="sm"
                onClick={() => handleSort('status')}
                className="justify-center"
              >
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
              <Button 
                variant={sortField === 'total_print_time' ? 'primary' : 'outline'} 
                size="sm"
                onClick={() => handleSort('total_print_time')}
                className="justify-center"
              >
                Print Time {sortField === 'total_print_time' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
              <Button 
                variant={sortField === 'total_downtime' ? 'primary' : 'outline'} 
                size="sm"
                onClick={() => handleSort('total_downtime')}
                className="justify-center"
              >
                Downtime {sortField === 'total_downtime' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* No results message */}
      {currentItems.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No printers found matching your filters.</p>
          <Button onClick={() => {setSearchQuery(''); setStatusFilter('all');}} className="mt-4">
            Clear Filters
          </Button>
        </Card>
      )}

      {viewMode === 'grid' && currentItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {renderGridItems()}
        </div>
      )}

      {viewMode === 'list' && currentItems.length > 0 && (
        <Card>
          {renderListItems()}
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center my-6">
          <nav className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="mr-2"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            
            <div className="flex space-x-1">
              {[...Array(totalPages).keys()].map(number => (
                <Button
                  key={number + 1}
                  variant={currentPage === number + 1 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => paginate(number + 1)}
                  className="px-3"
                >
                  {number + 1}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-2"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </nav>
        </div>
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
              disabled={!newPrinter.name.trim() || !newPrinter.model.trim() || isSubmitting}
            >
              Add Printer
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
          </div>
          
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Printer Model
            </label>
            <input
              type="text"
              id="model"
              name="model"
              value={newPrinter.model}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter printer model (optional)"
            />
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={newPrinter.location || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter printer location (optional)"
            />
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