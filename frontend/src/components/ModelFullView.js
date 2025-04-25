import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { downloadModelFile } from '../services/api';

const ModelFullView = ({ color = '#3B82F6', fileId, file }) => {
  // Если передан объект file, извлекаем из него id
  const modelFileId = file?.id || fileId;
  
  const containerRef = useRef(null);
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const frameIdRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Функция обновления размеров
  const updateDimensions = () => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({
        width: clientWidth,
        height: clientHeight
      });
      
      // Обновление размера рендерера
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.setSize(clientWidth, clientHeight);
        cameraRef.current.aspect = clientWidth / clientHeight;
        cameraRef.current.updateProjectionMatrix();
      }
    }
  };

  // Функция загрузки STL модели
  const loadModel = async () => {
    if (!modelFileId) return;
    
    // Проверяем тип файла, если доступна информация о файле
    if (file && file.file_type) {
      const fileType = file.file_type.toLowerCase();
      const supportedTypes = ['stl', 'obj', '3mf', 'amf'];
      
      if (!supportedTypes.includes(fileType)) {
        setError(`Неподдерживаемый тип файла: ${file.file_type}`);
        return;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await downloadModelFile(modelFileId);
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      
      const loader = new STLLoader();
      loader.load(
        url,
        (geometry) => {
          if (sceneRef.current && modelRef.current) {
            // Удаляем существующую модель, если она есть
            if (modelRef.current.children.length > 0) {
              const oldModel = modelRef.current.children[0];
              modelRef.current.remove(oldModel);
              if (oldModel.geometry) oldModel.geometry.dispose();
              if (oldModel.material) oldModel.material.dispose();
            }
            
            // Центрируем геометрию
            geometry.computeBoundingBox();
            const boundingBox = geometry.boundingBox;
            const center = new THREE.Vector3();
            boundingBox.getCenter(center);
            geometry.translate(-center.x, -center.y, -center.z);
            
            // Масштабируем геометрию, чтобы она помещалась в наше окно просмотра
            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 1.8 / maxDim; // Немного меньше, чтобы она точно поместилась
            
            // Создаем новый меш с геометрией
            const material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(color),
              metalness: 0.2,
              roughness: 0.6,
              flatShading: true,
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.scale.set(scale, scale, scale);
            
            // Лучшая начальная ориентация для большинства моделей
            mesh.rotation.x = -Math.PI / 2;
            
            // Центрируем в сцене
            modelRef.current.position.set(0, 0, 0);
            modelRef.current.add(mesh);
            
            // Сбрасываем камеру и элементы управления для лучшего обзора
            if (cameraRef.current) {
              cameraRef.current.position.set(0, 0, 3);
              cameraRef.current.lookAt(0, 0, 0);
              
              if (controlsRef.current) {
                controlsRef.current.update();
              }
            }
          }
          URL.revokeObjectURL(url);
          setLoading(false);
        },
        undefined,
        (error) => {
          console.error('Ошибка загрузки STL модели:', error);
          setError('Ошибка загрузки модели');
          setLoading(false);
          URL.revokeObjectURL(url);
        }
      );
    } catch (err) {
      console.error('Ошибка загрузки файла модели:', err);
      setError('Ошибка загрузки модели');
      setLoading(false);
    }
  };

  // Инициализация сцены Three.js
  useEffect(() => {
    if (!mountRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    // Настройка сцены
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Настройка камеры
    const camera = new THREE.PerspectiveCamera(35, dimensions.width / dimensions.height, 0.1, 1000);
    camera.position.z = 3;
    cameraRef.current = camera;

    // Настройка рендерера
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(dimensions.width, dimensions.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Создаем группу для модели
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelRef.current = modelGroup;

    // Добавляем элементы управления орбитой
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.enablePan = false;
    controlsRef.current = controls;

    // Цикл анимации
    const animate = () => {
      if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
      
      frameIdRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    
    animate();

    // Очистка
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      // Освобождаем ресурсы геометрии и материалов
      if (modelRef.current) {
        while (modelRef.current.children.length > 0) {
          const child = modelRef.current.children[0];
          modelRef.current.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [color, dimensions]);

  // Настраиваем обсервер изменения размеров при изменении размера контейнера
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

  // Перезагружаем модель при изменении fileId
  useEffect(() => {
    if (modelFileId) {
      loadModel();
    }
  }, [modelFileId]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full"
    >
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70 dark:bg-gray-800 dark:bg-opacity-70 rounded">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70 dark:bg-gray-800 dark:bg-opacity-70 rounded">
          <p className="text-sm text-red-500 text-center px-2">Ошибка загрузки</p>
        </div>
      )}
    </div>
  );
};

export default ModelFullView; 