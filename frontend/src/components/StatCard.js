import React from 'react';

const StatCard = ({ title, value, icon: Icon, iconColor = 'bg-blue-100', textColor = 'text-blue-800' }) => {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconColor} rounded-md p-3`}>
            <Icon className={`h-6 w-6 ${textColor}`} aria-hidden="true" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard; 