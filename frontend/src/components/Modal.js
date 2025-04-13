import React, { Fragment, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  const modalRef = useRef(null);

  // Handle Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = ''; // Re-enable scrolling when modal is closed
    };
  }, [isOpen, onClose]);

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }[size] || 'max-w-lg';

  return (
    <Fragment>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity"></div>
      
      {/* Modal Container */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <div 
            ref={modalRef}
            className={`${sizeClasses} w-full transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all`}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b dark:border-gray-700 px-4 py-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                {title}
              </h3>
              <button
                type="button"
                className="rounded-md bg-white dark:bg-transparent text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            
            {/* Content */}
            <div className="px-6 py-4">
              {children}
            </div>
            
            {/* Footer */}
            {footer && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default Modal; 