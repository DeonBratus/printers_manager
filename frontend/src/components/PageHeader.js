import React from 'react';

const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <div className="flex justify-between items-start pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex space-x-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader; 