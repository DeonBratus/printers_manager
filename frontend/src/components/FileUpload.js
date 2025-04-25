import React, { useState, useRef } from 'react';
import { CloudArrowUpIcon, DocumentArrowUpIcon, ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Button from './Button';

const FileUpload = ({ 
  onUpload, 
  fileTypes = [], 
  maxSize = 100 * 1024 * 1024, // 100MB default
  buttonText = 'Upload File',
  showTypeSelector = true,
  defaultFileType = null,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [fileType, setFileType] = useState(defaultFileType || (fileTypes.length > 0 ? fileTypes[0].value : ''));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    setError('');
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      setError(`Размер файла превышает максимальный лимит ${Math.round(maxSize / (1024 * 1024))}МБ`);
      return;
    }

    // If file types are specified, validate file type
    if (fileTypes.length > 0) {
      const fileExt = file.name.split('.').pop().toLowerCase();
      
      // Check if file extension is allowed with wildcard support
      const isValidType = fileTypes.some(type => {
        const ext = type.ext.toLowerCase();
        return ext === '*' || ext === fileExt;
      });
      
      if (!isValidType) {
        const validExts = fileTypes
          .filter(type => type.ext !== '*')
          .map(type => type.ext.toLowerCase());
        
        setError(`Неверный тип файла. Разрешенные типы: ${validExts.join(', ')}`);
        return;
      }
      
      // Set file type based on extension if not explicitly set
      if (!fileType) {
        const matchingType = fileTypes.find(type => 
          type.ext.toLowerCase() === fileExt || type.ext === '*'
        );
        if (matchingType) {
          setFileType(matchingType.value);
        }
      }
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      await onUpload(selectedFile, fileType);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1000);
    } catch (error) {
      setError(`Ошибка загрузки: ${error.message}`);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Get appropriate accept string for file input
  const getAcceptString = () => {
    if (fileTypes.length === 0) return '';
    
    return fileTypes
      .map(type => {
        if (type.ext === '*') return '';
        return `.${type.ext}`;
      })
      .filter(ext => ext) // Filter out empty strings
      .join(',');
  };

  // Format file size nicely
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`border-2 border-dashed p-6 rounded-lg text-center cursor-pointer transition-all duration-200 ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-500'
        } ${
          error ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        {selectedFile ? (
          <div>
            <DocumentArrowUpIcon className="h-16 w-16 mx-auto text-blue-500 dark:text-blue-400" />
            <p className="mt-2 font-medium text-gray-800 dark:text-white">
              {selectedFile.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
        ) : (
          <div>
            <CloudArrowUpIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500" />
            <p className="mt-2 text-base font-medium text-gray-700 dark:text-gray-300">
              Перетащите файл сюда или нажмите для выбора
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {fileTypes.length > 0 ? (
                <>
                  Поддерживаемые форматы: {fileTypes
                    .map(type => type.ext.toUpperCase())
                    .join(', ')}
                </>
              ) : (
                'Загрузите любой файл'
              )}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Максимальный размер: {Math.round(maxSize / (1024 * 1024))}МБ
            </p>
          </div>
        )}
        
        <input
          type="file"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          accept={getAcceptString()}
        />
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
          <span className="inline-block w-4 h-4 mr-1">⚠️</span> {error}
        </div>
      )}

      {showTypeSelector && fileTypes.length > 0 && (
        <div className="mt-4">
          <label htmlFor="fileType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Тип файла
          </label>
          <select
            id="fileType"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {fileTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedFile && (
        <div className="mt-4">
          {uploadProgress > 0 && uploadProgress < 100 ? (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-3">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          ) : uploadProgress === 100 ? (
            <div className="flex items-center justify-center text-green-500 mb-3">
              <CheckCircleIcon className="h-5 w-5 mr-1" />
              <span>Загрузка завершена!</span>
            </div>
          ) : null}
          
          <Button 
            onClick={handleUpload} 
            isLoading={isUploading}
            disabled={isUploading || !!error || uploadProgress === 100}
            className="w-full"
            size="lg"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            {buttonText}
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 