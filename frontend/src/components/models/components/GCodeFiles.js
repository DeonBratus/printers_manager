import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FileUpload from '../../FileUpload';
import FilesList from '../../FilesList';
import Card from '../../Card';
import { 
  getModelGCodeFiles,
  getPrinterGCodeFiles,
  uploadGCodeFile,
  downloadGCodeFile,
  deleteGCodeFile,
  getPrinters
} from '../../../services/api';
import { 
  DocumentPlusIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { formatMinutesToHHMM, parseHHMMToMinutes } from '../../../utils/timeFormat';

// Определяем поддерживаемые типы файлов G-code
const GCODE_FILE_TYPES = [
  { value: 'gcode', label: 'G-code file (.gcode)', ext: 'gcode' }
];

/**
 * Компонент для управления файлами G-code
 * @param {Object} props - Свойства компонента
 * @param {string} props.modelId - ID модели
 * @param {string} props.printerId - ID принтера
 * @returns {JSX.Element}
 */
const GCodeFiles = ({ modelId, printerId }) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadMode, setUploadMode] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(printerId || '');
  const [estimatedTime, setEstimatedTime] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let response;
        if (modelId) {
          response = await getModelGCodeFiles(modelId);
        } else if (printerId) {
          response = await getPrinterGCodeFiles(printerId);
        } else {
          setFiles([]);
          return;
        }
        
        setFiles(response.data);
      } catch (err) {
        console.error('Error fetching G-code files:', err);
        setError(t('models.fetchGCodeError'));
      } finally {
        setLoading(false);
      }
    };

    const fetchPrinters = async () => {
      try {
        const response = await getPrinters();
        setPrinters(response.data);
      } catch (err) {
        console.error('Error fetching printers:', err);
      }
    };

    fetchFiles();
    
    if (!printerId) {
      fetchPrinters();
    }
  }, [modelId, printerId, refreshTrigger, t]);

  const handleUpload = async (file) => {
    try {
      let printTime = null;
      if (estimatedTime) {
        try {
          printTime = parseHHMMToMinutes(estimatedTime);
        } catch (e) {
          throw new Error(t('models.invalidTimeFormat'));
        }
      }
      
      await uploadGCodeFile(
        file, 
        modelId, 
        selectedPrinter || null,
        printTime
      );
      
      setUploadMode(false);
      setEstimatedTime('');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error uploading file:', err);
      throw new Error(t('models.uploadError'));
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await downloadGCodeFile(file.id);
      
      // Create a blob from the response data
      const blob = new Blob([response.data]);
      
      // Create a download link and trigger click
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError(t('models.downloadError'));
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(t('common.confirmDelete', { item: file.filename }))) {
      return;
    }
    
    try {
      await deleteGCodeFile(file.id);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error deleting file:', err);
      setError(t('models.deleteFileError'));
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold dark:text-white">{t('models.gcodeFiles')}</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title={t('common.refresh')}
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setUploadMode(!uploadMode)}
            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full"
            title={uploadMode ? t('common.cancel') : t('models.uploadGCode')}
          >
            <DocumentPlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      {uploadMode ? (
        <div className="mb-4">
          <FileUpload
            onUpload={handleUpload}
            fileTypes={GCODE_FILE_TYPES}
            buttonText={t('models.uploadGCode')}
            showTypeSelector={false}
          />
          
          {!printerId && (
            <div className="mt-4">
              <label htmlFor="printer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('printers.printer')} ({t('common.optional')})
              </label>
              <select
                id="printer"
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t('common.none')}</option>
                {printers.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="mt-4">
            <label htmlFor="estimatedTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('models.estimatedPrintTime')} (HH:MM) ({t('common.optional')})
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ClockIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="estimatedTime"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                placeholder="00:00"
                pattern="[0-9]{1,2}:[0-9]{2}"
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          {t('common.loading')}
        </div>
      ) : (
        <FilesList
          files={files}
          onDownload={handleDownload}
          onDelete={handleDelete}
          emptyMessage={t('models.noGCodeFiles')}
        />
      )}
    </Card>
  );
};

export default GCodeFiles; 