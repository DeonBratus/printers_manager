import React from 'react';
import {
  DocumentIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  DocumentTextIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const getIconForFile = (fileType) => {
  if (!fileType) return DocumentIcon;

  const type = fileType.toLowerCase();
  
  if (['stl', 'obj', 'amf', '3mf'].includes(type)) {
    return CubeIcon;
  } else if (type === 'gcode') {
    return DocumentTextIcon;
  }
  
  return DocumentIcon;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
};

const FileItem = ({ file, onDownload, onDelete, showActions = true }) => {
  const FileIcon = getIconForFile(file.file_type);
  
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm');
    } catch (e) {
      return 'Unknown date';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div className="flex items-center">
        <FileIcon className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" />
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{file.filename}</p>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex gap-3 mt-1">
            <span>{formatFileSize(file.file_size)}</span>
            <span>•</span>
            <span>{formatDate(file.created_at)}</span>
            {file.file_type && <span>•</span>}
            {file.file_type && <span className="uppercase">{file.file_type}</span>}
          </div>
        </div>
      </div>
      
      {showActions && (
        <div className="flex space-x-2">
          <button
            onClick={() => onDownload(file)}
            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full"
            title="Download"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDelete(file)}
            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full"
            title="Delete"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

const FilesList = ({ files, onDownload, onDelete, emptyMessage = "No files available", showActions = true }) => {
  if (!files || files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      {files.map((file) => (
        <FileItem 
          key={file.id} 
          file={file} 
          onDownload={onDownload} 
          onDelete={onDelete}
          showActions={showActions}
        />
      ))}
    </div>
  );
};

export default FilesList; 