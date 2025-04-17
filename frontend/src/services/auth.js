import api from './api';

// Register a new user
export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    const token = response.data.access_token;

    // Устанавливаем токен
    setAuthToken(token);

    // Сохраняем токен в localStorage
    localStorage.setItem('token', token);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    localStorage.setItem('tokenExpiry', expiryDate.toISOString());

    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Login user
export const login = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    const token = response.data.access_token;

    // Устанавливаем токен
    setAuthToken(token);

    // Сохраняем токен в localStorage
    localStorage.setItem('token', token);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    localStorage.setItem('tokenExpiry', expiryDate.toISOString());

    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Logout user
export const logout = async () => {
  try {
    await api.post('/auth/logout');
    // Clear the token from the axios instance
    delete api.defaults.headers.common['Authorization'];
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// Get current user information
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

// Get studios for current user
export const getStudios = async () => {
  try {
    const response = await api.get('/studios/');
    return response.data;
  } catch (error) {
    console.error('Get studios error:', error);
    throw error;
  }
};

// Create a new studio (for admin users)
export const createStudio = async (studioData) => {
  try {
    const response = await api.post('/studios/', studioData);
    return response.data;
  } catch (error) {
    console.error('Create studio error:', error);
    throw error;
  }
};

// Set authorization token for API requests
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};