import React from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card; 