import axios from 'axios';
import { API_CONFIG } from '../config/api';

// Create axios instance with interceptors for error handling
const api = axios.create(API_CONFIG);

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
    }
    
    // Add token to request if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    // Transform empty responses to empty objects
    if (response.status === 204) {
      response.data = {};
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error('API Error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      error: error.message
    });

    // Handle 401 (Unauthorized) errors
    if (error.response && error.response.status === 401) {
      // Remove token if it's expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiry');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
    
    // Don't retry if we've already retried or certain status codes
    if (
      originalRequest?._retry || 
      (error.response && (error.response.status === 403 || 
      error.response.status === 404))
    ) {
      return Promise.reject(error);
    }
    
    // Handle network errors or 500 errors with a retry
    if (!error.response || error.response.status >= 500) {
      // Если originalRequest может быть undefined после предыдущих проверок
      if (!originalRequest) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Retrying request:', originalRequest.url);
      try {
        return await api(originalRequest);
      } catch (retryError) {
        console.error('Retry failed:', retryError.message);
        return Promise.reject(retryError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Authentication API
export const register = (userData) => api.post('/auth/register', userData);
export const login = (credentials) => api.post('/auth/login', credentials);
export const logout = () => api.post('/auth/logout');
export const getProfile = () => api.get('/auth/me');
export const getStudios = () => api.get('/auth/studios');
export const createStudio = (studioData) => api.post('/auth/studios', studioData);
export const updateStudio = (studioId, studioData) => api.put(`/auth/studios/${studioId}`, studioData);
export const deleteStudio = (studioId) => api.delete(`/auth/studios/${studioId}`);

// Printers API
export const getPrinters = () => api.get('/printers/');
export const getPrinter = (id) => api.get(`/printers/${id}`);
export const createPrinter = (printerData) => api.post('/printers/', printerData);
export const updatePrinter = (id, printerData) => api.put(`/printers/${id}`, printerData);
export const deletePrinter = (id) => api.delete(`/printers/${id}`);
export const startPrinter = (id, printingData) => api.post(`/printers/${id}/start`, printingData);
export const pausePrinter = (id) => api.post(`/printers/${id}/pause`);
export const resumePrinter = (id) => api.post(`/printers/${id}/resume`);
export const stopPrinter = (id, data = {}) => api.post(`/printers/${id}/stop`, data);
export const confirmPrinting = (id) => api.post(`/printers/${id}/confirm`);

// Printer Parameters API
export const getPrinterParameters = (printerId) => api.get(`/printers/${printerId}/parameters`);
export const addPrinterParameter = (printerId, paramData) => api.post(`/printers/${printerId}/parameters`, paramData);
export const deletePrinterParameter = (printerId, paramId) => api.delete(`/printers/${printerId}/parameters/${paramId}`);

// Models API
export const getModels = () => api.get('/models/');
export const getModel = (id) => api.get(`/models/${id}`);
export const createModel = (modelData) => api.post('/models/', modelData);
export const updateModel = (id, modelData) => api.put(`/models/${id}`, modelData);
export const deleteModel = (id) => api.delete(`/models/${id}`);

// Printings API
export const getPrintings = () => api.get('/printings/');
export const getPrinting = (id) => api.get(`/printings/${id}`);
export const createPrinting = (printingData) => api.post('/printings/', printingData);
export const updatePrinting = (id, printingData) => api.put(`/printings/${id}`, printingData);
export const deletePrinting = (id) => api.delete(`/printings/${id}`);
export const pauseExistingPrinting = (id) => api.post(`/printings/${id}/pause`);
export const resumeExistingPrinting = (id) => api.post(`/printings/${id}/resume`);
export const cancelExistingPrinting = (id) => api.post(`/printings/${id}/cancel`);
export const completeExistingPrinting = (id) => api.post(`/printings/${id}/complete`);

// Reports API
export const getReports = () => api.get('/reports/');
export const getPrinterStatusReport = () => api.get('/reports/printer-status');
export const getPrintingEfficiencyReport = () => api.get('/reports/printing-efficiency');
export const getDailyReport = (date) => api.get('/reports/daily/', { params: { date } });
export const getPrinterReport = (printerId) => api.get(`/reports/printers/${printerId}`);
export const getModelReport = (modelId) => api.get(`/reports/models/${modelId}`);
export const exportPrintersReport = () => api.get('/reports/printers/export/', { 
  responseType: 'blob',
  headers: {
    'Accept': 'text/csv'
  }
});

export default api; 