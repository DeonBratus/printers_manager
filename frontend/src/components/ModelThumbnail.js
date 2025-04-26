import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { CubeIcon } from '@heroicons/react/24/outline';
import { downloadModelFile } from '../services/api';

// Компонент для создания и отображения 2D-превью 3D-модели
const ModelThumbnail = ({ 
  modelId, 
  fileId,
  stlFile, 
  color = '#3B82F6', 
  width = 200, 
  height = 200,
  className = '',
  showPlaceholder = true,
  quality = 'medium', // 'low', 'medium', 'high'
  onError = null // Callback для уведомления родителя об ошибке
}) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const rendererRef = useRef(null);
  const meshRef = useRef(null);

  // Функции для кэширования превью
  const getCachedThumbnail = (id) => {
    try {
      if (!id) return null;
      const key = `model_thumbnail_${id}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        // Проверяем, не устарел ли кэш (7 дней)
        const cacheData = JSON.parse(cached);
        const cacheTime = new Date(cacheData.timestamp);
        const now = new Date();
        const cacheDuration = 7 * 24 * 60 * 60 * 1000; // 7 дней в миллисекундах
        
        if (now - cacheTime < cacheDuration) {
          return cacheData.image;
        } else {
          // Кэш устарел, удаляем его
          localStorage.removeItem(key);
        }
      }
      return null;
    } catch (e) {
      console.error('Error getting cached thumbnail:', e);
      return null;
    }
  };
  
  const cacheThumbnail = (id, imageData) => {
    try {
      if (!id || !imageData) return;
      const key = `model_thumbnail_${id}`;
      const data = {
        image: imageData,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error caching thumbnail:', e);
    }
  };

  // Загрузка модели напрямую по ID файла
  const loadModelDirectly = async (fileId) => {
    try {
      // Сразу пропускаем известные проблемные ID
      if (fileId === '42' || fileId === 42) {
        console.warn('Skipping known problematic file ID 42');
        if (onError) onError(fileId);
        return null;
      }
    
      console.log(`Direct loading of model with fileId: ${fileId}`);
      
      try {
        const response = await downloadModelFile(fileId);
        // Проверка, получили ли мы данные 
        if (!response || !response.data) {
          console.error('Пустой ответ от API при загрузке модели');
          if (onError) onError(fileId);
          return null;
        }
        
        // Преобразуем blob в arrayBuffer
        const arrayBuffer = await response.data.arrayBuffer();
        console.log(`Downloaded model by ID: ${arrayBuffer.byteLength} bytes`);
        
        if (arrayBuffer.byteLength < 84) {
          console.error("Invalid STL file size:", arrayBuffer.byteLength);
          if (onError) onError(fileId);
          return null;
        }
        
        return arrayBuffer;
      } catch (error) {
        console.error(`Failed to download model file with ID ${fileId}:`, error);
        if (onError) onError(fileId);
        return null;
      }
    } catch (err) {
      console.error("Error loading model directly:", err);
      if (onError) onError(fileId);
      return null;
    }
  };

  // Загрузка модели из stlFile объекта
  const loadModelFromStlFile = async () => {
    if (!stlFile) return null;
    
    try {
      // Если stlFile связан с известным проблемным ID
      if (stlFile.id === 42 || stlFile.id === '42' || 
          (stlFile.file_path && stlFile.file_path.includes('/42_')) ||
          (stlFile.url && stlFile.url.includes('/42_'))) {
        console.warn('Skipping known problematic file (ID 42)');
        if (onError && modelId) onError(modelId);
        return null;
      }
      
      // Если stlFile содержит blob данные
      if (stlFile.blob) {
        return await stlFile.blob.arrayBuffer();
      }
      // Если stlFile содержит id, используем API
      else if (stlFile.id) {
        return await loadModelDirectly(stlFile.id);
      }
      // Если stlFile содержит путь к файлу или URL
      else if (stlFile.file_path || stlFile.url || stlFile.api_url) {
        const url = stlFile.api_url || stlFile.file_path || stlFile.url;
        
        // Если URL содержит идентификатор файла, попробуем загрузить через API
        if (url.includes('/models/files/')) {
          const parts = url.split('/');
          const fileIdIndex = parts.indexOf('files') + 1;
          if (fileIdIndex > 0 && fileIdIndex < parts.length) {
            const fileId = parts[fileIdIndex];
            if (fileId && !isNaN(parseInt(fileId))) {
              console.log(`Found file ID in URL: ${fileId}, using API`);
              return await loadModelDirectly(fileId);
            }
          }
        }
        
        // Проверяем и корректируем URL если необходимо
        let fetchUrl = url;
        
        // Если URL не начинается с http/https и не абсолютный путь,
        // предполагаем, что это относительный путь к API
        if (!url.startsWith('http') && !url.startsWith('blob:') && !url.startsWith('/')) {
          const baseUrl = process.env.REACT_APP_API_URL || '';
          fetchUrl = `${baseUrl}/${url}`;
        }
        
        // Для API-запросов добавляем токен авторизации
        const headers = {};
        if (fetchUrl.includes(process.env.REACT_APP_API_URL || '') || 
            fetchUrl.includes('api/') || 
            fetchUrl.includes('/models/files/')) {
          const token = localStorage.getItem('token');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }
        
        try {
          console.log(`Fetching STL from URL: ${fetchUrl}`);
          const response = await fetch(fetchUrl, { headers });
          if (!response.ok) {
            console.error(`Failed to fetch model: ${response.status} ${response.statusText}`);
            
            // Если получили 404, пробуем распарсить URL для извлечения ID
            if (response.status === 404) {
              // Проверяем, есть ли в URL идентификатор модели
              let fileId = null;
              
              // Попробуем извлечь ID из URL
              if (url.includes('/')) {
                const parts = url.split('/');
                const filename = parts[parts.length - 1];
                
                // Проверяем разные форматы: id.stl, id_name.stl
                if (filename.includes('.')) {
                  const filenameWithoutExt = filename.split('.')[0];
                  // Если есть подчеркивание, берем первую часть (42_name.stl -> 42)
                  if (filenameWithoutExt.includes('_')) {
                    fileId = filenameWithoutExt.split('_')[0];
                  } 
                  // Иначе проверяем, может быть это числовой ID
                  else if (!isNaN(parseInt(filenameWithoutExt))) {
                    fileId = filenameWithoutExt;
                  }
                }
              }
              
              if (fileId && !isNaN(parseInt(fileId))) {
                console.log(`Extracted file ID: ${fileId}, trying API`);
                return await loadModelDirectly(fileId);
              }
            }
            if (onError) onError(fileId);
            return null;
          }
          return await response.arrayBuffer();
        } catch (err) {
          console.error(`Fetch error for ${fetchUrl}:`, err);
          if (onError) onError(fileId);
          return null;
        }
      }
      
      console.warn('No valid model source found in stlFile object');
      if (onError) onError(fileId);
      return null;
    } catch (err) {
      console.error('Error loading stlFile:', err);
      if (onError) onError(fileId);
      return null;
    }
  };

  // Создать превью из загруженных данных модели
  const createThumbnailFromBuffer = (buffer) => {
    try {
      if (!buffer || buffer.byteLength === 0) {
        console.error('Empty model data');
        return null;
      }

      // Определяем размеры и качество в зависимости от параметра качества
      let renderWidth, renderHeight, pixelRatio, imageQuality;
      
      switch (quality) {
        case 'low':
          renderWidth = Math.min(width, 100);
          renderHeight = Math.min(height, 100);
          pixelRatio = 1;
          imageQuality = 0.6;
          break;
        case 'high':
          renderWidth = typeof width === 'number' ? width : 300;
          renderHeight = typeof height === 'number' ? height : 300;
          pixelRatio = 2;
          imageQuality = 0.9;
          break;
        case 'medium':
        default:
          renderWidth = typeof width === 'number' ? width : 200;
          renderHeight = typeof height === 'number' ? height : 200;
          pixelRatio = 1;
          imageQuality = 0.8;
      }
      
      // Если размеры были указаны в процентах, используем разумные значения по умолчанию
      if (typeof renderWidth !== 'number') renderWidth = 200;
      if (typeof renderHeight !== 'number') renderHeight = 200;

      // Создаем сцену, камеру и рендерер
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff);
      
      // Используем перспективную камеру с подходящим FOV
      const camera = new THREE.PerspectiveCamera(30, renderWidth / renderHeight, 0.1, 1000);
      // Позиционируем камеру в точке хорошего обзора
      camera.position.set(5, 3, 5);
      camera.lookAt(0, 0, 0);
      
      // Оптимизированный рендерер с тенями
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,  // Всегда используем сглаживание для лучшего качества
        alpha: true,
        preserveDrawingBuffer: true // Важно для получения изображения
      });
      renderer.setSize(renderWidth, renderHeight);
      renderer.setPixelRatio(pixelRatio * 1.5); // Увеличиваем плотность пикселей для лучшего качества
      renderer.shadowMap.enabled = true; // Включаем тени
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Мягкие тени
      
      // Сохраняем renderer в ref для последующей очистки
      rendererRef.current = renderer;
      
      // Добавляем более качественное освещение
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      // Главный источник света с тенями
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 10, 7);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 30;
      directionalLight.shadow.camera.left = -10;
      directionalLight.shadow.camera.right = 10;
      directionalLight.shadow.camera.top = 10;
      directionalLight.shadow.camera.bottom = -10;
      scene.add(directionalLight);
      
      // Добавляем дополнительный заполняющий свет
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(-5, 2, -5);
      scene.add(fillLight);
      
      // Добавляем подсветку снизу для лучшего объемного эффекта
      const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
      backLight.position.set(0, -5, 0);
      scene.add(backLight);
      
      // Добавляем вспомогательную сетку (с шагом 1 см) под моделью
      const gridSize = 12; // Оптимальный размер сетки
      const gridDivisions = 12;
      const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0xcccccc);
      gridHelper.position.y = -0.01; // Сетка чуть ниже центра
      gridHelper.material.opacity = 0.5;
      gridHelper.material.transparent = true;
      scene.add(gridHelper);
      
      // Добавляем оси координат
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
      
      // Создаем плоскость для отбрасывания теней
      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(gridSize, gridSize),
        new THREE.ShadowMaterial({ opacity: 0.2 })
      );
      shadowPlane.rotation.x = -Math.PI / 2; // Поворачиваем горизонтально
      shadowPlane.position.y = 0; // На уровне нижней части сетки
      shadowPlane.receiveShadow = true;
      scene.add(shadowPlane);
      
      // Загружаем модель с помощью STLLoader
      const loader = new STLLoader();
      const geometry = loader.parse(buffer);
      
      if (!geometry || !geometry.attributes || !geometry.attributes.position) {
        console.error('Invalid geometry from STL data');
        return null;
      }
      
      // Центрируем и масштабируем геометрию
      geometry.computeBoundingBox();
      const boundingBox = geometry.boundingBox;
      
      if (!boundingBox) {
        throw new Error('Cannot compute bounding box');
      }
      
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      
      // Масштабируем модель
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      
      if (maxDim <= 0 || !isFinite(maxDim)) {
        throw new Error('Invalid model dimensions');
      }
      
      // Настраиваем масштаб так, чтобы модель хорошо помещалась в обзор
      const scale = 4 / maxDim;
      
      // Создаем материал и меш с улучшенным внешним видом
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        metalness: 0.3,
        roughness: 0.4,
        flatShading: false,  // Всегда используем качественное затенение
        clearcoat: 0.1,      // Слегка глянцевое покрытие
        clearcoatRoughness: 0.4,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Центрируем модель относительно сцены, но сохраняем нижнюю точку на сетке
      geometry.translate(-center.x, -center.y, -center.z);
      
      // Масштабируем модель и поднимаем её, чтобы нижняя точка была на сетке
      mesh.scale.set(scale, scale, scale);
      mesh.position.y = Math.abs(boundingBox.min.y * scale);
      
      // Включаем отбрасывание и получение теней
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // Сохраняем меш для очистки
      meshRef.current = mesh;
      
      scene.add(mesh);
      
      // Настраиваем орбитальную камеру для лучшего обзора модели
      const modelHeight = Math.max(size.y, size.z) * scale;
      const distance = Math.max(size.x, size.z) * scale * 2.5;
      
      // Автоматически выбираем хорошую позицию камеры в зависимости от размеров модели
      camera.position.set(distance, modelHeight + 1, distance);
      camera.lookAt(0, modelHeight / 2, 0);
      
      // Рендерим сцену
      renderer.render(scene, camera);
      
      // Получаем изображение с канваса рендерера с повышенным качеством
      const imageDataUrl = renderer.domElement.toDataURL('image/webp', 0.95);
      
      // Очищаем ресурсы
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      
      return imageDataUrl;
    } catch (err) {
      console.error('Error creating thumbnail:', err);
      return null;
    }
  };

  // Генерация превью модели
  useEffect(() => {
    let isMounted = true;
    
    const generateThumbnail = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Проверяем кэш
        const cacheId = fileId || (stlFile && (stlFile.id || 
          (stlFile.file_path && stlFile.file_path.split('/').pop().split('.')[0]) || 
          (stlFile.url && stlFile.url.split('/').pop().split('.')[0]) ||
          (stlFile.api_url && stlFile.api_url.includes('/models/files/') ? stlFile.api_url.split('/').pop() : null)
        ));
        
        if (cacheId) {
          const cachedImage = getCachedThumbnail(cacheId);
          if (cachedImage && isMounted) {
            console.log(`Using cached thumbnail for ${cacheId}`);
            setThumbnail(cachedImage);
            setLoading(false);
            return;
          }
        }
        
        let buffer = null;
        
        // Пробуем загрузить данные модели
        if (fileId) {
          console.log(`Loading model from fileId: ${fileId}`);
          buffer = await loadModelDirectly(fileId);
        } else if (stlFile) {
          console.log(`Loading model from stlFile:`, 
            stlFile.id ? `id: ${stlFile.id}` : 
            stlFile.file_path ? `path: ${stlFile.file_path}` : 
            stlFile.url ? `url: ${stlFile.url}` : 
            stlFile.api_url ? `api_url: ${stlFile.api_url}` : 'unknown format');
          
          buffer = await loadModelFromStlFile();
        }
        
        // Если не смогли загрузить модель, показываем заглушку
        if (!buffer) {
          console.warn('Failed to load model data, showing placeholder');
          if (isMounted) {
            setError('Failed to load model data');
            setLoading(false);
          }
          return;
        }
        
        // Дополнительная проверка на валидность буфера
        if (buffer.byteLength < 84) {
          console.error(`Invalid STL buffer size: ${buffer.byteLength} bytes`);
          if (isMounted) {
            setError('Invalid model data');
            setLoading(false);
          }
          return;
        }
        
        console.log(`Successfully loaded STL buffer: ${buffer.byteLength} bytes`);
        
        // Создаем превью из загруженных данных
        const thumbnailData = createThumbnailFromBuffer(buffer);
        
        if (isMounted) {
          if (thumbnailData) {
            console.log(`Thumbnail generated successfully for ${cacheId || 'model'}`);
            setThumbnail(thumbnailData);
            // Сохраняем в кэш
            if (cacheId) {
              cacheThumbnail(cacheId, thumbnailData);
            }
          } else {
            console.error('Failed to generate thumbnail from buffer');
            setError('Failed to generate thumbnail');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error generating thumbnail:', err);
        if (isMounted) {
          setError(err.message || 'Error');
          setLoading(false);
        }
      }
    };
    
    if (fileId || stlFile) {
      generateThumbnail();
    }
    
    return () => {
      isMounted = false;
      
      // Очищаем ресурсы Three.js
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      
      if (meshRef.current) {
        if (meshRef.current.geometry) meshRef.current.geometry.dispose();
        if (meshRef.current.material) {
          if (Array.isArray(meshRef.current.material)) {
            meshRef.current.material.forEach(m => m.dispose());
          } else {
            meshRef.current.material.dispose();
          }
        }
        meshRef.current = null;
      }
    };
  }, [fileId, stlFile, color, width, height, quality]);

  // Если нет данных для превью или произошла ошибка, показать заглушку
  if ((!fileId && !stlFile) || error) {
    if (!showPlaceholder) return null;
    
    return (
      <div 
        className={`bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center ${className}`}
        style={{ width, height }}
        title={error ? `Ошибка: ${error}` : 'Превью модели недоступно'}
      >
        <CubeIcon className={`${error ? "text-red-300 dark:text-red-800" : "text-gray-300 dark:text-gray-600"} h-12 w-12 mb-1`} />
        {error && (
          <div className="text-xs text-red-500 dark:text-red-400 text-center px-2 truncate max-w-full">
            {error === 'Failed to load model data' ? 'Не удалось загрузить модель' : 
             error === 'Invalid model data' ? 'Некорректная модель' : 
             'Ошибка загрузки'}
          </div>
        )}
      </div>
    );
  }

  // Показываем индикатор загрузки
  if (loading && !thumbnail) {
    return (
      <div 
        className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent" />
      </div>
    );
  }

  // Показываем превью изображение
  return (
    <div 
      className={`overflow-hidden ${className}`} 
      style={{ width, height }}
    >
      {thumbnail ? (
        <img 
          src={thumbnail} 
          alt="3D Model Preview" 
          className="object-cover w-full h-full"
          loading="lazy"
        />
      ) : (
        <div className="bg-gray-100 dark:bg-gray-800 flex items-center justify-center w-full h-full">
          <CubeIcon className="h-16 w-16 text-gray-300 dark:text-gray-600" />
        </div>
      )}
    </div>
  );
};

export default ModelThumbnail;