import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * Хук для создания и управления 3D-сценой с Three.js
 * @param {Object} options - Опции для настройки сцены
 * @param {Object} options.dimensions - Размеры контейнера {width, height}
 * @param {string} options.backgroundColor - Цвет фона (hex или rgba)
 * @param {boolean} options.transparentBackground - Прозрачный фон
 * @param {boolean} options.enableOrbitControls - Включить OrbitControls
 * @returns {Object} Объект с ссылками на элементы сцены и функциями управления
 */
const useThreeScene = ({
  dimensions = { width: 0, height: 0 },
  backgroundColor = '#000000',
  transparentBackground = true,
  enableOrbitControls = true,
} = {}) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  const modelGroupRef = useRef(null);
  
  const [isReady, setIsReady] = useState(false);

  // Инициализация сцены
  useEffect(() => {
    if (!mountRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    // Создаем сцену
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Добавляем группу для моделей
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Настройка камеры
    const camera = new THREE.PerspectiveCamera(35, dimensions.width / dimensions.height, 0.1, 1000);
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Настройка рендерера
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: transparentBackground,
      powerPreference: 'high-performance',
    });
    renderer.setSize(dimensions.width, dimensions.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    if (transparentBackground) {
      renderer.setClearColor(0x000000, 0);
    } else {
      renderer.setClearColor(new THREE.Color(backgroundColor));
    }
    
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Добавляем освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Добавляем OrbitControls если нужно
    if (enableOrbitControls) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.enableZoom = true;
      controls.enablePan = false;
      controlsRef.current = controls;
    }

    // Функция анимации
    const animate = () => {
      if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
      
      frameIdRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    
    animate();
    setIsReady(true);

    // Очистка ресурсов при размонтировании
    return () => {
      setIsReady(false);
      cancelAnimationFrame(frameIdRef.current);
      
      if (mountRef.current && rendererRef.current) {
        try {
          mountRef.current.removeChild(rendererRef.current.domElement);
        } catch (err) {
          console.error('Error removing renderer:', err);
        }
      }
      
      // Освобождаем ресурсы моделей
      if (modelGroupRef.current) {
        while (modelGroupRef.current.children.length > 0) {
          const child = modelGroupRef.current.children[0];
          modelGroupRef.current.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [dimensions, backgroundColor, transparentBackground, enableOrbitControls]);

  // Функция для обновления размеров при изменении контейнера
  const updateDimensions = (newDimensions) => {
    if (!rendererRef.current || !cameraRef.current) return;
    
    rendererRef.current.setSize(newDimensions.width, newDimensions.height);
    cameraRef.current.aspect = newDimensions.width / newDimensions.height;
    cameraRef.current.updateProjectionMatrix();
  };

  // Функция для очистки всех моделей из сцены
  const clearModels = () => {
    if (!modelGroupRef.current) return;
    
    while (modelGroupRef.current.children.length > 0) {
      const child = modelGroupRef.current.children[0];
      modelGroupRef.current.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  };

  // Функция для добавления меша в сцену
  const addMeshToScene = (mesh) => {
    if (!modelGroupRef.current) return;
    
    // Очищаем предыдущие модели
    clearModels();
    
    // Добавляем новый меш
    modelGroupRef.current.add(mesh);
    
    // Обновляем камеру для лучшего обзора
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 3);
      cameraRef.current.lookAt(0, 0, 0);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
    }
  };
  
  // Функция для добавления объекта в сцену (например, OBJ модели)
  const addObjectToScene = (object) => {
    if (!modelGroupRef.current) return;
    
    // Очищаем предыдущие модели
    clearModels();
    
    // Добавляем новый объект
    modelGroupRef.current.add(object);
    
    // Обновляем камеру для лучшего обзора
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 3);
      cameraRef.current.lookAt(0, 0, 0);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
    }
  };

  return {
    mountRef,
    sceneRef,
    cameraRef,
    rendererRef,
    controlsRef,
    modelGroupRef,
    isReady,
    updateDimensions,
    clearModels,
    addMeshToScene,
    addObjectToScene
  };
};

export default useThreeScene; 