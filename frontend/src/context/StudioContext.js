import React, { createContext, useState, useContext, useEffect } from 'react';
import { getStudios } from '../services/api';

const StudioContext = createContext(null);

export const StudioProvider = ({ children }) => {
  const [studios, setStudios] = useState([]);
  const [selectedStudio, setSelectedStudio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // При инициализации загружаем список студий
    const fetchStudios = async () => {
      try {
        setLoading(true);
        const response = await getStudios();
        const studiosData = Array.isArray(response) ? response : response.data || [];
        setStudios(studiosData);
        
        // Проверяем, есть ли сохраненная студия в localStorage
        const savedStudioId = localStorage.getItem('selectedStudio');
        if (savedStudioId && studiosData.length > 0) {
          const studio = studiosData.find(s => s.id.toString() === savedStudioId);
          if (studio) {
            setSelectedStudio(studio);
          } else {
            // Если сохраненная студия не найдена, используем первую доступную
            setSelectedStudio(studiosData[0]);
            localStorage.setItem('selectedStudio', studiosData[0].id.toString());
          }
        } else if (studiosData.length > 0) {
          // Если нет сохраненной студии, но есть доступные, выбираем первую
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

    fetchStudios();
  }, []);

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

  const refreshStudios = async () => {
    try {
      const response = await getStudios();
      const studiosData = Array.isArray(response) ? response : response.data || [];
      setStudios(studiosData);
      
      // Если текущая студия была удалена, выбираем новую
      if (selectedStudio && !studiosData.find(s => s.id === selectedStudio.id)) {
        if (studiosData.length > 0) {
          setSelectedStudio(studiosData[0]);
          localStorage.setItem('selectedStudio', studiosData[0].id.toString());
        } else {
          setSelectedStudio(null);
          localStorage.removeItem('selectedStudio');
        }
      }
    } catch (err) {
      console.error("Error refreshing studios:", err);
    }
  };

  return (
    <StudioContext.Provider 
      value={{ 
        studios, 
        selectedStudio, 
        loading, 
        error, 
        changeStudio, 
        getCurrentStudioId,
        refreshStudios
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

// Хук для использования контекста студий
export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};

export default StudioContext; 