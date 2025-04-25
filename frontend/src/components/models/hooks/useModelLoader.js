import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { 
  loadModelDirectly, 
  parseSTLBuffer, 
  loadSTLFromUrl, 
  loadOBJFromUrl,
  loadAMFFromUrl,
  load3MFFromUrl,
  centerAndScaleGeometry,
  centerAndScaleObject
} from '../utils/loaders';

/**
 * Хук для загрузки 3D-моделей различных форматов
 * @param {Object} options - Опции для загрузки модели
 * @param {string} options.fileId - ID файла для загрузки с сервера
 * @param {string} options.url - URL для загрузки модели
 * @param {string} options.fileType - Тип файла (stl, obj, amf, 3mf)
 * @param {ArrayBuffer} options.buffer - Бинарные данные модели
 * @param {File} options.file - Объект File с моделью
 * @param {string} options.color - Цвет модели
 * @returns {Object} Объект с состоянием загрузки и моделью
 */
const useModelLoader = ({ 
  fileId, 
  url, 
  fileType,
  buffer,
  file,
  color = '#3B82F6'
} = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState(null);
  
  // Функция для создания простой заглушки
  const createPlaceholder = () => {
    console.log("Creating placeholder model");
    
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(color)
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    return { type: 'placeholder', mesh };
  };
  
  // Загрузка модели из ArrayBuffer
  const loadFromBuffer = async (buffer, type) => {
    try {
      if (!buffer || buffer.byteLength === 0) {
        throw new Error('Empty buffer');
      }
      
      if (type?.toLowerCase() === 'stl') {
        const geometry = parseSTLBuffer(buffer);
        
        if (!geometry) {
          throw new Error('Failed to parse STL');
        }
        
        // Центрируем и масштабируем геометрию
        const { center, scale } = centerAndScaleGeometry(geometry);
        
        // Создаем материал и меш
        const material = new THREE.MeshStandardMaterial({ 
          color: new THREE.Color(color),
          flatShading: true
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        if (scale > 0 && isFinite(scale)) {
          mesh.scale.set(scale, scale, scale);
        }
        
        mesh.position.set(-center.x, -center.y, -center.z);
        mesh.rotation.x = -Math.PI / 2; // Лучшая ориентация для STL
        
        return { type: 'stl', mesh };
      } else {
        throw new Error(`Unsupported buffer type: ${type}`);
      }
    } catch (err) {
      console.error('Error creating model from buffer:', err);
      throw err;
    }
  };
  
  // Загрузка модели из файла
  const loadFromFile = async (file) => {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      
      // Определяем тип файла
      const fileName = file.name.toLowerCase();
      let detectedType = '';
      
      if (fileName.endsWith('.stl')) {
        detectedType = 'stl';
      } else if (fileName.endsWith('.obj')) {
        detectedType = 'obj';
      } else if (fileName.endsWith('.amf')) {
        detectedType = 'amf';
      } else if (fileName.endsWith('.3mf')) {
        detectedType = '3mf';
      } else {
        throw new Error(`Unsupported file type: ${fileName}`);
      }
      
      // Создаем URL для файла
      const url = URL.createObjectURL(file);
      
      let result;
      
      if (detectedType === 'stl') {
        // Для STL читаем как ArrayBuffer для надежности
        const arrayBuffer = await file.arrayBuffer();
        result = await loadFromBuffer(arrayBuffer, 'stl');
      } else if (detectedType === 'obj') {
        // Для OBJ используем URL
        const object = await loadOBJFromUrl(url);
        
        // Центрируем и масштабируем
        const { center, scale } = centerAndScaleObject(object);
        
        object.position.set(-center.x, -center.y, -center.z);
        
        if (scale > 0 && isFinite(scale)) {
          object.scale.set(scale, scale, scale);
        }
        
        result = { type: 'obj', object };
      } else if (detectedType === 'amf') {
        // Для AMF используем URL
        const object = await loadAMFFromUrl(url);
        
        // Центрируем и масштабируем
        const { center, scale } = centerAndScaleObject(object);
        
        object.position.set(-center.x, -center.y, -center.z);
        
        if (scale > 0 && isFinite(scale)) {
          object.scale.set(scale, scale, scale);
        }
        
        result = { type: 'amf', object };
      } else if (detectedType === '3mf') {
        // Для 3MF используем URL
        const object = await load3MFFromUrl(url);
        
        // Центрируем и масштабируем
        const { center, scale } = centerAndScaleObject(object);
        
        object.position.set(-center.x, -center.y, -center.z);
        
        if (scale > 0 && isFinite(scale)) {
          object.scale.set(scale, scale, scale);
        }
        
        result = { type: '3mf', object };
      }
      
      // Очищаем URL
      URL.revokeObjectURL(url);
      
      return result;
    } catch (err) {
      console.error('Error loading from file:', err);
      throw err;
    }
  };
  
  // Загрузка модели с сервера по ID
  const loadFromFileId = async (fileId, fileType) => {
    try {
      const arrayBuffer = await loadModelDirectly(fileId);
      
      if (!arrayBuffer) {
        throw new Error('Failed to load model data');
      }
      
      return await loadFromBuffer(arrayBuffer, fileType || 'stl');
    } catch (err) {
      console.error('Error loading from fileId:', err);
      throw err;
    }
  };
  
  // Загрузка модели по URL
  const loadFromUrl = async (url, fileType) => {
    try {
      let result;
      
      if (fileType?.toLowerCase() === 'stl') {
        const geometry = await loadSTLFromUrl(url);
        
        // Центрируем и масштабируем геометрию
        const { center, scale } = centerAndScaleGeometry(geometry);
        
        // Создаем материал и меш
        const material = new THREE.MeshStandardMaterial({ 
          color: new THREE.Color(color),
          flatShading: true
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        if (scale > 0 && isFinite(scale)) {
          mesh.scale.set(scale, scale, scale);
        }
        
        mesh.position.set(-center.x, -center.y, -center.z);
        mesh.rotation.x = -Math.PI / 2; // Лучшая ориентация для STL
        
        result = { type: 'stl', mesh };
      } else if (fileType?.toLowerCase() === 'obj') {
        const object = await loadOBJFromUrl(url);
        
        // Центрируем и масштабируем
        const { center, scale } = centerAndScaleObject(object);
        
        object.position.set(-center.x, -center.y, -center.z);
        
        if (scale > 0 && isFinite(scale)) {
          object.scale.set(scale, scale, scale);
        }
        
        result = { type: 'obj', object };
      } else if (fileType?.toLowerCase() === 'amf') {
        const object = await loadAMFFromUrl(url);
        
        // Центрируем и масштабируем
        const { center, scale } = centerAndScaleObject(object);
        
        object.position.set(-center.x, -center.y, -center.z);
        
        if (scale > 0 && isFinite(scale)) {
          object.scale.set(scale, scale, scale);
        }
        
        result = { type: 'amf', object };
      } else if (fileType?.toLowerCase() === '3mf') {
        const object = await load3MFFromUrl(url);
        
        // Центрируем и масштабируем
        const { center, scale } = centerAndScaleObject(object);
        
        object.position.set(-center.x, -center.y, -center.z);
        
        if (scale > 0 && isFinite(scale)) {
          object.scale.set(scale, scale, scale);
        }
        
        result = { type: '3mf', object };
      } else {
        throw new Error(`Unsupported URL file type: ${fileType}`);
      }
      
      return result;
    } catch (err) {
      console.error('Error loading from URL:', err);
      throw err;
    }
  };
  
  // Основная функция загрузки модели
  useEffect(() => {
    const loadModel = async () => {
      // Очищаем предыдущие ошибки
      setError(null);
      
      if (!fileId && !url && !buffer && !file) {
        // Создаем заглушку, если нет данных
        setModel(createPlaceholder());
        return;
      }
      
      try {
        setLoading(true);
        
        let result;
        
        // Определяем источник данных и загружаем модель
        if (buffer) {
          result = await loadFromBuffer(buffer, fileType);
        } else if (file) {
          result = await loadFromFile(file);
        } else if (fileId) {
          result = await loadFromFileId(fileId, fileType);
        } else if (url) {
          result = await loadFromUrl(url, fileType);
        }
        
        if (result) {
          setModel(result);
        } else {
          // Если не удалось загрузить, используем заглушку
          setModel(createPlaceholder());
        }
      } catch (err) {
        console.error('Error loading model:', err);
        setError(err.message || 'Error loading model');
        setModel(createPlaceholder());
      } finally {
        setLoading(false);
      }
    };
    
    loadModel();
  }, [fileId, url, fileType, buffer, file, color]);
  
  return { loading, error, model };
};

export default useModelLoader; 