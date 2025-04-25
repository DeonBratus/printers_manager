import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FileUpload from './FileUpload';
import FilesList from './FilesList';
import Card from './Card';
import Button from './Button';
import { 
  getModelFiles,
  uploadModelFile,
  downloadModelFile,
  deleteModelFile
} from '../services/api';
import { 
  DocumentPlusIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Define supported model file types
const MODEL_FILE_TYPES = [
  { value: 'stl', label: 'STL file (.stl)', ext: 'stl' },
  { value: 'obj', label: 'OBJ file (.obj)', ext: 'obj' },
  { value: 'amf', label: 'AMF file (.amf)', ext: 'amf' },
  { value: '3mf', label: '3MF file (.3mf)', ext: '3mf' },
  { value: 'other', label: 'Other format', ext: '*' }
];

const ModelFiles = ({ modelId, onFilesUpdated }) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadMode, setUploadMode] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getModelFiles(modelId);
        setFiles(response.data);
      } catch (err) {
        console.error('Error fetching model files:', err);
        setError(t('models.fetchFilesError'));
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [modelId, refreshTrigger, t]);

  const handleUpload = async (file, fileType) => {
    try {
      await uploadModelFile(modelId, file, fileType);
      setUploadMode(false);
      setRefreshTrigger(prev => prev + 1);
      if (onFilesUpdated) onFilesUpdated();
    } catch (err) {
      console.error('Error uploading file:', err);
      throw new Error(t('models.uploadError'));
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await downloadModelFile(file.id);
      
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
      await deleteModelFile(file.id);
      setRefreshTrigger(prev => prev + 1);
      if (onFilesUpdated) onFilesUpdated();
    } catch (err) {
      console.error('Error deleting file:', err);
      setError(t('models.deleteFileError'));
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold dark:text-white">{t('models.files')}</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title={t('common.refresh')}
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <Button
            onClick={() => setUploadMode(!uploadMode)}
            variant={uploadMode ? "danger" : "primary"}
            size="sm"
            className="flex items-center"
          >
            {uploadMode ? (
              <>
                <XMarkIcon className="h-5 w-5 mr-1" />
                {t('common.cancel')}
              </>
            ) : (
              <>
                <DocumentPlusIcon className="h-5 w-5 mr-1" />
                {t('models.uploadFile')}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      {uploadMode ? (
        <Card className="p-5 border-2 border-blue-500 dark:border-blue-700">
          <h3 className="text-lg font-semibold mb-3 dark:text-white">{t('models.addNewFile')}</h3>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Загрузите 3D-модель в формате STL, OBJ или другом поддерживаемом формате.
            После загрузки модель будет автоматически доступна для просмотра и печати.
          </p>
          <FileUpload
            onUpload={handleUpload}
            fileTypes={MODEL_FILE_TYPES}
            buttonText={t('models.uploadFile')}
            className="w-full"
          />
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Поддерживаемые форматы: STL, OBJ, AMF, 3MF и другие
          </div>
        </Card>
      ) : null}

      {loading ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          {t('common.loading')}
        </div>
      ) : (
        <>
          {files.length === 0 && !uploadMode && (
            <Card className="p-5 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">{t('models.noFiles')}</p>
              <Button 
                onClick={() => setUploadMode(true)}
                variant="primary"
                className="flex items-center mx-auto"
              >
                <DocumentPlusIcon className="h-5 w-5 mr-2" />
                {t('models.uploadFile')}
              </Button>
            </Card>
          )}
          
          {files.length > 0 && (
            <FilesList
              files={files}
              onDownload={handleDownload}
              onDelete={handleDelete}
              emptyMessage={t('models.noFiles')}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ModelFiles; 