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
      const studiosData = Array.isArray(response) ? response : response.data || [];
      setStudios(studiosData);
      
      // Выбираем студию на основе данных пользователя
      if (user && user.studios && user.studios.length > 0) {
        // Получаем роли пользователя в каждой студии
        const roles = {};
        user.studios.forEach(studio => {
          roles[studio.id] = studio.role;
        });
        setUserRoles(roles);
        
        // Проверяем, есть ли сохраненная студия в localStorage
        const savedStudioId = localStorage.getItem('selectedStudio');
        if (savedStudioId) {
          // Проверяем, имеет ли пользователь доступ к этой студии
          const userHasAccess = user.studios.some(s => s.id.toString() === savedStudioId);
          
          if (userHasAccess) {
            const studio = studiosData.find(s => s.id.toString() === savedStudioId);
            if (studio) {
              setSelectedStudio(studio);
            } else if (studiosData.length > 0) {
              // Если сохраненная студия не найдена в списке доступных, выбираем первую
              setSelectedStudio(studiosData[0]);
              localStorage.setItem('selectedStudio', studiosData[0].id.toString());
            }
          } else if (user.studios.length > 0) {
            // Если у пользователя нет доступа к сохраненной студии, выбираем первую из его доступных
            const firstUserStudio = studiosData.find(s => s.id === user.studios[0].id);
            if (firstUserStudio) {
              setSelectedStudio(firstUserStudio);
              localStorage.setItem('selectedStudio', firstUserStudio.id.toString());
            }
          }
        } else if (studiosData.length > 0) {
          // Если нет сохраненной студии, используем первую доступную
          setSelectedStudio(studiosData[0]);
          localStorage.setItem('selectedStudio', studiosData[0].id.toString());
        }
      } else if (studiosData.length > 0) {
        // Если нет данных о пользователе или его студиях, но есть доступные студии
        setSelectedStudio(studiosData[0]);
        localStorage.setItem('selectedStudio', studiosData[0].id.toString());
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching studios:", err);
      setError("Failed to load studios");
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
    return selectedStudio ? selectedStudio.id : null;
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
        removeStudioMember: removeMember
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