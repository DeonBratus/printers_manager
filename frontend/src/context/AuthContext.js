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
  
  // Add this function to check if a token is expired
  const isTokenExpired = () => {
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    if (!tokenExpiry) return true;
    
    return new Date(tokenExpiry) < new Date();
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          if (!isTokenExpired()) {
            await fetchUserInfo();
          } else {
            // Token exists but expired
            handleLogout();
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          // Only logout on authentication errors, not network errors
          if (error.response && error.response.status === 401) {
            handleLogout();
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const fetchUserInfo = async () => {
    if (!token) return;
    
    try {
      const userData = await getProfile();
      const userInfo = userData.data || userData;
      
      if (!userInfo) {
        throw new Error('Invalid user data received');
      }
      
      setUser(userInfo);
      setError(null);
      
      // Store user settings in localStorage
      const userSettings = {
        name: userInfo.username,
        email: userInfo.email,
        defaultPrinterView: userInfo.default_view || 'grid',
        language: userInfo.language || 'russian',
        avatar: userInfo.avatar || null,
      };
      
      localStorage.setItem('userSettings', JSON.stringify(userSettings));
      
      return userInfo;
    } catch (err) {
      console.error('Error fetching user info:', err);
      setError('Failed to load user information');
      
      // Only logout on authentication errors (401), not on network or server errors
      if (err.response && err.response.status === 401) {
        handleLogout();
      }
      
      throw err;
    }
  };

  const login = async (username, password) => {
    setError(null);
    try {
      const authData = await apiLogin({ username, password });
      const newToken = authData.data?.access_token || authData.access_token;

      if (newToken) {
        // Set token expiry to 30 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        localStorage.setItem('token', newToken);
        localStorage.setItem('tokenExpiry', expiryDate.toISOString());
        
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
    localStorage.removeItem('tokenExpiry');
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

  // Force refresh user data
  const refreshUserInfo = async () => {
    return await fetchUserInfo();
  };

  const isAuthenticated = !!token && !!user && !isTokenExpired();

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
        hasRoleInStudio,
        refreshUserInfo
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