import React, { createContext, useState, useEffect, useContext } from 'react';
import { login, register, logout, getCurrentUser } from '../services/auth';

// Create the auth context
const AuthContext = createContext(null);

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing token and load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setIsLoading(false);
          return;
        }
        
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.error('Failed to load user:', err);
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login function
  const handleLogin = async (username, password) => {
    try {
      setError(null);
      setIsLoading(true);
      const { access_token, user: userData, expires_at } = await login(username, password);
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('tokenExpiry', expires_at);
      setUser(userData);
      
      return userData;
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при входе');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const handleRegister = async (userData) => {
    try {
      setError(null);
      setIsLoading(true);
      const newUser = await register(userData);
      return newUser;
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при регистрации');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const handleLogout = async () => {
    try {
      setError(null);
      await logout();
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiry');
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Define the value to be provided to consumers
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    setUser,
    studio: user?.studio_id || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook for consuming the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 