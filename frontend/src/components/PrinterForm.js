import React, { useState, useEffect } from 'react';
import Button from './Button';
import { useTranslation } from 'react-i18next';
import { getStudios } from '../services/api';

const PrinterForm = ({ printer, onSubmit }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '',
    model: '',
    location: '',
    serialNumber: '',
    total_print_time: 0,
    studio_id: '',
  });
  
  const [studios, setStudios] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch studios for dropdown
    const fetchStudios = async () => {
      try {
        const response = await getStudios();
        // Make sure we access the data property of the response or use an empty array as fallback
        setStudios(Array.isArray(response) ? response : response.data || []);
      } catch (error) {
        console.error('Error fetching studios:', error);
        setStudios([]); // Set to empty array on error
      }
    };
    
    fetchStudios();
  }, []);

  useEffect(() => {
    // Если передан принтер для редактирования, заполняем форму его данными
    if (printer) {
      setFormData({
        name: printer.name || '',
        ipAddress: printer.ipAddress || '',
        model: printer.model || '',
        location: printer.location || '',
        serialNumber: printer.serialNumber || '',
        total_print_time: printer.total_print_time || 0,
        studio_id: printer.studio_id || '',
      });
    } else {
      // Сброс формы при создании нового принтера
      setFormData({
        name: '',
        ipAddress: '',
        model: '',
        location: '',
        serialNumber: '',
        total_print_time: 0,
        studio_id: '',
      });
    }
    // Сброс ошибок при открытии формы
    setErrors({});
  }, [printer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Очищаем ошибку поля при изменении
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Проверка обязательных полей
    if (!formData.name.trim()) {
      newErrors.name = t('printerForm.nameRequired');
    }
    
    if (!formData.ipAddress.trim()) {
      newErrors.ipAddress = t('printerForm.ipRequired');
    } else {
      // Простая проверка формата IP-адреса
      const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(formData.ipAddress)) {
        newErrors.ipAddress = t('printerForm.invalidIP');
      }
    }
    
    if (!formData.location.trim()) {
      newErrors.location = t('printerForm.locationRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Подготовка данных для API - используем поля, совместимые с бэкендом
      const apiFormData = {
        name: formData.name,
        ip_address: formData.ipAddress, // В бэке ожидается snake_case
        model: formData.model,
        location: formData.location,
        serial_number: formData.serialNumber, // В бэке ожидается snake_case
        status: printer?.status || 'idle',
        total_print_time: parseFloat(formData.total_print_time) || 0,
        studio_id: formData.studio_id ? parseInt(formData.studio_id) : null,
      };
      
      await onSubmit(apiFormData);
    } catch (error) {
      console.error(t('printerForm.submitError'), error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Форматирование времени в часах в формат "XX ч. XX мин."
  const formatPrintTime = (hours) => {
    if (!hours) return `0 ${t('models.hours')} 0 ${t('models.minutes')}`;
    const fullHours = Math.floor(hours);
    const minutes = Math.round((hours - fullHours) * 60);
    return `${fullHours} ${t('models.hours')} ${minutes} ${t('models.minutes')}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('printers.name')} *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            dark:bg-gray-700 dark:text-white dark:border-gray-600
            ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
      </div>
      
      <div>
        <label htmlFor="ipAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('printers.ipAddress')} *
        </label>
        <input
          type="text"
          id="ipAddress"
          name="ipAddress"
          value={formData.ipAddress}
          onChange={handleChange}
          placeholder="192.168.1.100"
          className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            dark:bg-gray-700 dark:text-white dark:border-gray-600
            ${errors.ipAddress ? 'border-red-300' : 'border-gray-300'}`}
        />
        {errors.ipAddress && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.ipAddress}</p>}
      </div>
      
      <div>
        <label htmlFor="studio_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('printers.studio', 'Studio')}
        </label>
        <select
          id="studio_id"
          name="studio_id"
          value={formData.studio_id}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            dark:bg-gray-700 dark:text-white dark:border-gray-600"
        >
          <option value="">{t('printers.selectStudio', 'Select a studio')}</option>
          {studios.map((studio) => (
            <option key={studio.id} value={studio.id}>
              {studio.name}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('printers.model')}
        </label>
        <input
          type="text"
          id="model"
          name="model"
          value={formData.model}
          onChange={handleChange}
          placeholder="HP LaserJet Pro MFP"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
      </div>
      
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('printers.location')} *
        </label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder={t('printerForm.locationPlaceholder')}
          className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            dark:bg-gray-700 dark:text-white dark:border-gray-600
            ${errors.location ? 'border-red-300' : 'border-gray-300'}`}
        />
        {errors.location && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.location}</p>}
      </div>
      
      <div>
        <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('printers.serialNumber')}
        </label>
        <input
          type="text"
          id="serialNumber"
          name="serialNumber"
          value={formData.serialNumber}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
      </div>
      
      {printer && (
        <div>
          <label htmlFor="total_print_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('printers.totalPrintTime')}
          </label>
          <div className="mt-1 flex items-center">
            <input
              type="number"
              id="total_print_time"
              name="total_print_time"
              value={formData.total_print_time}
              onChange={handleChange}
              step="0.1"
              min="0"
              className="block w-32 border border-gray-300 rounded-md shadow-sm py-2 px-3 
                focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
                dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              {t('printerForm.hours')} ({formatPrintTime(formData.total_print_time)})
            </span>
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-3 pt-5 border-t border-gray-200 dark:border-gray-700 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSubmit(null)}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
};

export default PrinterForm; 