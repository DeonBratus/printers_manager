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

// Users API
export const getUsers = () => api.get('/users/');
export const getUser = (id) => api.get(`/users/${id}`);
export const updateUser = (id, userData) => api.put(`/users/${id}`, userData);

// Studios API
export const getStudios = () => api.get('/studios/');
export const getStudio = (id) => api.get(`/studios/${id}`);
export const createStudio = (studioData) => api.post('/studios/', studioData);
export const updateStudio = (studioId, studioData) => api.put(`/studios/${studioId}`, studioData);
export const deleteStudio = (studioId) => api.delete(`/studios/${studioId}`);

// Studio Members API
export const getStudioMembers = (studioId) => api.get(`/studios/${studioId}/members`);
export const addStudioMember = (studioId, memberData) => api.post(`/studios/${studioId}/members`, memberData);
export const updateMemberRole = (studioId, userId, roleData) => api.put(`/studios/${studioId}/members/${userId}`, roleData);
export const removeStudioMember = (studioId, userId) => api.delete(`/studios/${studioId}/members/${userId}`);

// Studio Invitations API
export const searchUsers = (query) => api.get(`/studios/users/search?query=${encodeURIComponent(query)}`);
export const createStudioInvitation = (studioId, invitationData) => api.post(`/studios/${studioId}/invitations`, invitationData);
export const getStudioInvitations = (studioId, status) => {
  const url = `/studios/${studioId}/invitations`;
  return status ? api.get(`${url}?status=${status}`) : api.get(url);
};
export const getUserInvitations = () => api.get('/studios/invitations/user');
export const updateInvitationStatus = (invitationId, statusData) => api.put(`/studios/invitations/${invitationId}`, statusData);
export const deleteInvitation = (invitationId) => api.delete(`/studios/invitations/${invitationId}`);

// Printers API 
export const getPrinters = (studio_id) => {
  const params = new URLSearchParams();
  if (studio_id) params.append('studio_id', studio_id);
  return api.get(`/printers/?${params}`);
};

export const getPrinter = (id) => api.get(`/printers/${id}`);
export const createPrinter = (data) => api.post('/printers/', data);
export const updatePrinter = (id, data) => api.put(`/printers/${id}`, data);
export const deletePrinter = (id) => api.delete(`/printers/${id}`);
export const startPrinter = (id, printingData) => api.post(`/printers/${id}/start`, printingData);
export const pausePrinter = (id) => api.post(`/printers/${id}/pause`);
export const resumePrinter = (id) => api.post(`/printers/${id}/resume`);
export const stopPrinter = (id, data = {}) => {
  const payload = {
    stop_reason: data.reason || null // Format reason as expected by backend
  };
  return api.post(`/printers/${id}/stop`, payload);
};
export const confirmPrinting = (id) => api.post(`/printers/${id}/confirm`);

// Printer Parameters API
export const getPrinterParameters = (printerId) => api.get(`/printers/${printerId}/parameters`);
export const addPrinterParameter = (printerId, paramData) => api.post(`/printers/${printerId}/parameters`, paramData);
export const deletePrinterParameter = (printerId, paramId) => api.delete(`/printers/${printerId}/parameters/${paramId}`);

// Models API
export const getModels = (studio_id) => {
  const params = new URLSearchParams();
  if (studio_id) params.append('studio_id', studio_id);
  return api.get(`/models/?${params.toString()}`);
};

export const getModel = (id, studio_id) => {
  const url = `/models/${id}`;
  return studio_id ? api.get(`${url}?studio_id=${studio_id}`) : api.get(url);
};
export const createModel = (modelData) => api.post('/models/', modelData);
export const updateModel = (id, modelData) => api.put(`/models/${id}`, modelData);
export const deleteModel = (id) => api.delete(`/models/${id}`);

// Printings API
export const getPrintings = (studio_id) => {
  const params = new URLSearchParams();
  if (studio_id) params.append('studio_id', studio_id);
  return api.get(`/printings/?${params}`);
};

export const getPrinting = (id) => api.get(`/printings/${id}`);
export const createPrinting = (printingData) => api.post('/printings/', printingData);
export const updatePrinting = (id, printingData) => api.put(`/printings/${id}`, printingData);
export const deletePrinting = (id) => api.delete(`/printings/${id}`);
export const pauseExistingPrinting = (id) => api.post(`/printings/${id}/pause`);
export const resumeExistingPrinting = (id) => api.post(`/printings/${id}/resume`);
export const cancelExistingPrinting = (id) => api.post(`/printings/${id}/cancel`);
export const completeExistingPrinting = (id) => api.post(`/printings/${id}/complete`);

// Reports API
export const getReports = (studio_id) => {
  return api.get('/reports/', { params: { studio_id } });
};
export const getPrinterStatusReport = (studio_id) => {
  return api.get('/reports/printer-status', { params: { studio_id } });
};
export const getPrintingEfficiencyReport = (studio_id) => {
  return api.get('/reports/printing-efficiency', { params: { studio_id } });
};
export const getDailyReport = (date, studio_id) => {
  return api.get('/reports/daily/', { params: { date, studio_id } });
};
export const getPrinterReport = (printerId, studio_id) => {
  return api.get(`/reports/printers/${printerId}`, { params: { studio_id } });
};
export const getModelReport = (modelId, studio_id) => {
  return api.get(`/reports/models/${modelId}`, { params: { studio_id } });
};
export const exportPrintersReport = (studio_id) => {
  return api.get('/reports/printers/export/', { 
    params: { studio_id },
    responseType: 'blob',
    headers: {
      'Accept': 'text/csv'
    }
  });
};

export default api;