import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PrinterModal from './PrinterModal';
import Button from './Button';
import StatusBadge from './StatusBadge';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaPrint, FaSort, FaSortUp, FaSortDown, FaFilter } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const PrintersList = () => {
  const { t } = useTranslation();
  const [printers, setPrinters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPrinter, setCurrentPrinter] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Сортировка и фильтрация
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('all');
  
  useEffect(() => {
    fetchPrinters();
  }, []);

  const fetchPrinters = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/printers');
      if (!response.ok) {
        throw new Error('Не удалось загрузить список принтеров');
      }
      const data = await response.json();
      
      // Преобразование данных с бэкенда (snake_case → camelCase)
      const formattedData = data.map(printer => ({
        id: printer.id,
        name: printer.name,
        ipAddress: printer.ip_address,
        model: printer.model,
        location: printer.location,
        serialNumber: printer.serial_number,
        status: printer.status,
        total_print_time: printer.total_print_time,
        total_downtime: printer.total_downtime
      }));
      
      setPrinters(formattedData);
    } catch (err) {
      setError(err.message);
      console.error('Ошибка загрузки принтеров:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPrinter = () => {
    setCurrentPrinter(null);
    setIsModalOpen(true);
  };

  const handleEditPrinter = (printer) => {
    setCurrentPrinter(printer);
    setIsModalOpen(true);
  };

  const handleDeletePrinter = async (id) => {
    if (window.confirm(t('printersList.confirmDelete'))) {
      try {
        const response = await fetch(`/api/printers/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Не удалось удалить принтер');
        }
        
        setPrinters(printers.filter(printer => printer.id !== id));
      } catch (err) {
        setError(err.message);
        console.error('Ошибка удаления принтера:', err);
      }
    }
  };

  const handleSubmit = async (printerData) => {
    try {
      let response;
      
      if (currentPrinter) {
        // Редактирование существующего принтера
        response = await fetch(`/api/printers/${currentPrinter.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(printerData),
        });
      } else {
        // Добавление нового принтера
        response = await fetch('/api/printers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(printerData),
        });
      }
      
      if (!response.ok) {
        throw new Error('Не удалось сохранить данные принтера');
      }
      
      // Перезагрузка списка принтеров после изменений
      fetchPrinters();
      
    } catch (error) {
      console.error(error);
      setError(error.message || t('printersList.saveError'));
      throw new Error(t('printersList.saveError'));
    }
  };

  // Функция фильтрации по статусу
  const filterByStatus = (printers) => {
    if (statusFilter === 'all') return printers;
    return printers.filter(printer => printer.status === statusFilter);
  };

  // Функция поиска по разным полям
  const searchPrinters = (printers) => {
    if (!searchTerm) return printers;
    
    return printers.filter(printer => 
      printer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      printer.ipAddress?.includes(searchTerm) ||
      printer.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      printer.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      printer.model?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Функция сортировки
  const sortPrinters = (printers) => {
    return [...printers].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Проверка на null/undefined значения
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // Сравнение строк или чисел
      if (typeof aValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? result : -result;
      } else {
        const result = aValue - bValue;
        return sortDirection === 'asc' ? result : -result;
      }
    });
  };

  // Применение фильтрации, поиска и сортировки
  const filteredPrinters = sortPrinters(searchPrinters(filterByStatus(printers)));
  
  // Пагинация
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPrinters.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPrinters.length / itemsPerPage);

  // Обработчик сортировки
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Получение иконки сортировки
  const getSortIcon = (field) => {
    if (field !== sortField) return <FaSort className="text-gray-300" />;
    return sortDirection === 'asc' ? <FaSortUp className="text-blue-500" /> : <FaSortDown className="text-blue-500" />;
  };

  // Форматирование времени
  const formatTime = (hours) => {
    if (!hours) return '0 ' + t('models.hours');
    const fullHours = Math.floor(hours);
    return `${fullHours} ${t('models.hours')}`;
  };

  const openWebInterface = (ipAddress) => {
    window.open(`http://${ipAddress}`, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">{t('printersList.title')}</h2>
        <Button
          onClick={handleAddPrinter}
          variant="primary"
        >
          <FaPlus className="mr-2" />
          {t('printers.addNew')}
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Поиск */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder={t('printersList.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Фильтр по статусу */}
        <div className="flex items-center">
          <FaFilter className="mr-2 text-gray-400" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
            {t('common.status')}:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">{t('printersList.allStatuses')}</option>
            <option value="idle">{t('printers.status.idle')}</option>
            <option value="printing">{t('printers.status.printing')}</option>
            <option value="paused">{t('printers.status.paused')}</option>
            <option value="error">{t('printers.status.error')}</option>
            <option value="waiting">{t('printers.status.waiting')}</option>
          </select>
        </div>

        {/* Количество элементов на странице */}
        <div className="flex items-center justify-end">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
            {t('printersList.itemsPerPage')}:
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1); // Сброс на первую страницу при изменении
            }}
            className="block w-20 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600 dark:text-gray-400">{t('printersList.loading')}</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">{t('common.error')}!</strong>
          <span className="block sm:inline"> {error}</span>
          <Button variant="danger" size="sm" className="mt-2" onClick={fetchPrinters}>
            {t('common.retry')}
          </Button>
        </div>
      ) : filteredPrinters.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || statusFilter !== 'all' ? t('printersList.noResults') : t('printersList.noPrinters')}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{t('common.name')}</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('ipAddress')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{t('printers.ipAddress')}</span>
                      {getSortIcon('ipAddress')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('model')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{t('printers.model')}</span>
                      {getSortIcon('model')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{t('common.status')}</span>
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('total_print_time')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{t('printers.totalPrintTime')}</span>
                      {getSortIcon('total_print_time')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('location')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{t('printers.location')}</span>
                      {getSortIcon('location')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentItems.map((printer) => (
                  <tr key={printer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <Link to={`/printers/${printer.id}`} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 hover:underline">
                        {printer.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{printer.ipAddress}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{printer.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <StatusBadge status={printer.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatTime(printer.total_print_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{printer.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                      <button
                        onClick={() => openWebInterface(printer.ipAddress)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 p-1"
                        title={t('printersList.openWebInterface')}
                      >
                        <FaPrint />
                      </button>
                      <button
                        onClick={() => handleEditPrinter(printer)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 p-1"
                        title={t('common.edit')}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeletePrinter(printer.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 p-1"
                        title={t('common.delete')}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center my-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {t('printersList.showing')} <span className="font-medium">{indexOfFirstItem + 1}</span>-
                <span className="font-medium">{Math.min(indexOfLastItem, filteredPrinters.length)}</span> {t('common.of')}{" "}
                <span className="font-medium">{filteredPrinters.length}</span> {t('printersList.printersCount')}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  &laquo;
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  &lsaquo;
                </Button>
                {/* Номера страниц */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Определение диапазона отображаемых страниц
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  &rsaquo;
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  &raquo;
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <PrinterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        printer={currentPrinter}
        onSubmit={handleSubmit}
        title={currentPrinter ? t('printersList.editPrinter', { name: currentPrinter.name }) : t('printersList.addNewPrinter')}
      />
    </div>
  );
};

export default PrintersList; 