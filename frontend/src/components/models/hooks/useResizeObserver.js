import { useState, useEffect, useRef } from 'react';

/**
 * Хук для отслеживания изменений размеров DOM-элемента с использованием ResizeObserver
 * @param {Object} initialDimensions - Начальные размеры {width, height}
 * @returns {Array} [dimensions, containerRef, updateDimensions]
 */
const useResizeObserver = (initialDimensions = { width: 0, height: 0 }) => {
  const [dimensions, setDimensions] = useState(initialDimensions);
  const containerRef = useRef(null);

  // Функция обновления размеров
  const updateDimensions = () => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({
        width: clientWidth,
        height: clientHeight
      });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Начальное обновление размеров
    updateDimensions();
    
    // Настраиваем обсервер изменения размеров
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    
    // Обработчик изменения размера окна для надежности
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return [dimensions, containerRef, updateDimensions];
};

export default useResizeObserver; 