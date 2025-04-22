import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FileUpload from './FileUpload';
import FilesList from './FilesList';
import Card from './Card';
import { 
  getModelFiles,
  uploadModelFile,
  downloadModelFile,
  deleteModelFile
} from '../services/api';
import { 
  DocumentPlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Define supported model file types
const MODEL_FILE_TYPES = [
  { value: 'stl', label: 'STL file (.stl)', ext: 'stl' },
  { value: 'obj', label: 'OBJ file (.obj)', ext: 'obj' },
  { value: 'amf', label: 'AMF file (.amf)', ext: 'amf' },
  { value: '3mf', label: '3MF file (.3mf)', ext: '3mf' },
  { value: 'other', label: 'Other format', ext: '*' }
];

const ModelFiles = ({ modelId }) => {
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
        <h3 className="text-lg font-semibold dark:text-white">{t('models.files')}</h3>
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
            title={uploadMode ? t('common.cancel') : t('models.uploadFile')}
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
            fileTypes={MODEL_FILE_TYPES}
            buttonText={t('models.uploadFile')}
          />
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
          emptyMessage={t('models.noFiles')}
        />
      )}
    </Card>
  );
};

export default ModelFiles; 