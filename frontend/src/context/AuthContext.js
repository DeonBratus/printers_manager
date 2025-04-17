import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as apiLogin, getProfile } from '../services/api';

// Create the auth context
const AuthContext = createContext();

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          await fetchUserInfo();
        } catch (error) {
          console.error('Error initializing auth:', error);
          handleLogout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const userData = await getProfile();
      setUser(userData.data || userData);
      setError(null);
    } catch (err) {
      console.error('Error fetching user info:', err);
      setError('Failed to load user information');
      handleLogout();
    }
  };

  const login = async (username, password) => {
    setError(null);
    try {
      const authData = await apiLogin({ username, password });
      const newToken = authData.data?.access_token || authData.access_token;

      if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        await fetchUserInfo();
        return true;
      } else {
        throw new Error('No token received');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Login failed, please check your credentials.');
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('selectedStudio');
    setToken(null);
    setUser(null);
  };

  // Get all studios for the user
  const getUserStudios = () => {
    if (!user || !user.studios) return [];
    return user.studios;
  };

  // Check if user has a specific role in a studio
  const hasRoleInStudio = (studioId, role) => {
    if (!user || !user.studios) return false;
    
    const studio = user.studios.find(s => s.id === studioId);
    if (!studio) return false;
    
    if (Array.isArray(role)) {
      return role.includes(studio.role);
    }
    
    return studio.role === role;
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout: handleLogout,
        loading,
        error,
        getUserStudios,
        hasRoleInStudio
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 