import { toast } from 'react-toastify';

// Configuration defaults for toast notifications
const toastConfig = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "colored",
};

/**
 * Display a success toast notification
 * @param {string} message - The message to display
 * @param {object} options - Override default toast configuration
 */
export const toastSuccess = (message, options = {}) => {
  toast.success(message, { ...toastConfig, ...options });
};

/**
 * Display an error toast notification
 * @param {string} message - The message to display
 * @param {object} options - Override default toast configuration
 */
export const toastError = (message, options = {}) => {
  toast.error(message, { ...toastConfig, ...options });
};

/**
 * Display an info toast notification
 * @param {string} message - The message to display
 * @param {object} options - Override default toast configuration
 */
export const toastInfo = (message, options = {}) => {
  toast.info(message, { ...toastConfig, ...options });
};

/**
 * Display a warning toast notification
 * @param {string} message - The message to display
 * @param {object} options - Override default toast configuration
 */
export const toastWarning = (message, options = {}) => {
  toast.warning(message, { ...toastConfig, ...options });
}; 