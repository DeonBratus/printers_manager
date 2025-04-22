import React, { useState, useRef } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import Button from './Button';

const FileUpload = ({ 
  onUpload, 
  fileTypes = [], 
  maxSize = 100 * 1024 * 1024, // 100MB default
  buttonText = 'Upload File',
  showTypeSelector = true,
  defaultFileType = null,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [fileType, setFileType] = useState(defaultFileType || (fileTypes.length > 0 ? fileTypes[0].value : ''));
  const [isUploading, setIsUploading] = useState(false);
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
      setError(`File size exceeds the maximum limit of ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    // If file types are specified, validate file type
    if (fileTypes.length > 0) {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const validExts = fileTypes.map(type => type.ext.toLowerCase());
      
      if (!validExts.includes(fileExt)) {
        setError(`Invalid file type. Allowed types: ${validExts.join(', ')}`);
        return;
      }
      
      // Set file type based on extension if not explicitly set
      if (!fileType) {
        const matchingType = fileTypes.find(type => type.ext.toLowerCase() === fileExt);
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
      await onUpload(selectedFile, fileType);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed p-4 rounded-lg text-center cursor-pointer ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600'
        } ${
          error ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {selectedFile ? selectedFile.name : 'Drag and drop or click to select a file'}
        </p>
        {selectedFile && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        )}
        <input
          type="file"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          accept={fileTypes.map(type => `.${type.ext}`).join(',')}
        />
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {showTypeSelector && fileTypes.length > 0 && (
        <div className="mt-4">
          <label htmlFor="fileType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            File Type
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
          <Button 
            onClick={handleUpload} 
            isLoading={isUploading}
            disabled={isUploading || !!error}
            className="w-full"
          >
            {buttonText}
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 