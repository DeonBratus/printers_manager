import React, { createContext, useState, useContext, useEffect } from 'react';
import { getStudios, getStudioMembers, removeStudioMember } from '../services/api';
import { useAuth } from './AuthContext';

const StudioContext = createContext(null);

export const StudioProvider = ({ children }) => {
  const { user } = useAuth();
  const [studios, setStudios] = useState([]);
  const [selectedStudio, setSelectedStudio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRoles, setUserRoles] = useState({});
  const [studioMembers, setStudioMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Fetch studios from the API
  const fetchStudios = async () => {
    try {
      setLoading(true);
      const response = await getStudios();
      setStudios(response.data || []);
    } catch (error) {
      console.error('Error fetching studios:', error);
      setError(error.response?.data?.detail || 'Failed to fetch studios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudios();
  }, [user]);

  // Функция для изменения выбранной студии
  const changeStudio = (studioId) => {
    if (!studioId) return;
    
    const studio = studios.find(s => s.id.toString() === studioId.toString());
    if (studio) {
      setSelectedStudio(studio);
      localStorage.setItem('selectedStudio', studio.id.toString());
    }
  };

  // Получить ID текущей студии
  const getCurrentStudioId = () => {
    if (!selectedStudio) {
      console.warn('No studio selected');
      return null;
    }
    return selectedStudio.id;
  };

  // Add validation helper
  const validateStudioSelected = () => {
    if (!selectedStudio) {
      throw new Error('No studio selected');
    }
    return true;
  };

  // Получить роль пользователя в студии
  const getUserRole = (studioId) => {
    return userRoles[studioId] || null;
  };

  // Проверка, является ли пользователь владельцем или администратором студии
  const isStudioAdmin = (studioId) => {
    const role = getUserRole(studioId);
    return role === 'owner' || role === 'admin';
  };

  const refreshStudios = async () => {
    return await fetchStudios();
  };

  // Fetch members of the current studio
  const fetchStudioMembers = async (studioId) => {
    if (!studioId) {
      studioId = getCurrentStudioId();
    }
    
    if (!studioId) {
      console.warn("Cannot fetch members: No studio selected");
      return;
    }
    
    setMembersLoading(true);
    try {
      const response = await getStudioMembers(studioId);
      const membersData = Array.isArray(response.data) ? response.data : [];
      setStudioMembers(membersData);
    } catch (error) {
      console.error("Error fetching studio members:", error);
    } finally {
      setMembersLoading(false);
    }
  };

  // Remove a member from the current studio
  const removeMember = async (studioId, userId) => {
    if (!studioId) {
      studioId = getCurrentStudioId();
    }
    
    if (!studioId) {
      throw new Error("No studio selected");
    }
    
    if (!userId) {
      throw new Error("No user specified for removal");
    }
    
    await removeStudioMember(studioId, userId);
    
    // Refresh members list
    fetchStudioMembers(studioId);
  };

  // Update member data when selected studio changes
  useEffect(() => {
    if (selectedStudio) {
      fetchStudioMembers(selectedStudio.id);
    }
  }, [selectedStudio]);

  return (
    <StudioContext.Provider 
      value={{ 
        studios, 
        selectedStudio, 
        loading, 
        error, 
        changeStudio, 
        getCurrentStudioId,
        refreshStudios,
        fetchStudios,
        getUserRole,
        isStudioAdmin,
        studioMembers,
        membersLoading,
        fetchStudioMembers,
        removeStudioMember: removeMember,
        validateStudioSelected
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

// Custom hook for using the Studio context
export const useStudio = () => {
  const context = useContext(StudioContext);
  if (context === null) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};

export default StudioContext;