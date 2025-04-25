import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { AMFLoader } from 'three/examples/jsm/loaders/AMFLoader';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader';
import { Box3, Vector3 } from 'three';

/**
 * Загружает STL-модель из ArrayBuffer
 * @param {ArrayBuffer} buffer - бинарные данные STL-файла
 * @returns {THREE.BufferGeometry|null} геометрия модели или null при ошибке
 */
export const parseSTLBuffer = (buffer) => {
  console.log("Trying to parse STL buffer of size:", buffer?.byteLength);
  
  // Basic validation
  if (!buffer || buffer.byteLength < 84) {
    console.warn("STL buffer is invalid: too small");
    return null;
  }

  try {
    // Создаем loader и парсим данные
    const loader = new STLLoader();
    const geometry = loader.parse(buffer);
    
    // Проверка на валидность геометрии
    if (!geometry || !geometry.attributes || !geometry.attributes.position) {
      console.warn("STL parsed, but geometry is invalid");
      return null;
    }
    
    return geometry;
  } catch (err) {
    console.error("STL parsing error:", err);
    return null;
  }
};

/**
 * Загружает STL-модель по URL
 * @param {string} url - URL для загрузки модели
 * @returns {Promise<THREE.BufferGeometry|null>} Promise с геометрией или null при ошибке
 */
export const loadSTLFromUrl = (url) => {
  return new Promise((resolve, reject) => {
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        console.log("STL loaded from URL");
        resolve(geometry);
      },
      (progress) => {
        console.log(`Loading STL: ${Math.round(progress.loaded / progress.total * 100)}%`);
      },
      (error) => {
        console.error('Error loading STL from URL:', error);
        reject(error);
      }
    );
  });
};

/**
 * Загружает OBJ-модель по URL
 * @param {string} url - URL для загрузки модели
 * @returns {Promise<THREE.Object3D|null>} Promise с объектом или null при ошибке
 */
export const loadOBJFromUrl = (url) => {
  return new Promise((resolve, reject) => {
    const loader = new OBJLoader();
    loader.load(
      url,
      (object) => {
        console.log("OBJ loaded from URL");
        resolve(object);
      },
      (progress) => {
        console.log(`Loading OBJ: ${Math.round(progress.loaded / progress.total * 100)}%`);
      },
      (error) => {
        console.error('Error loading OBJ from URL:', error);
        reject(error);
      }
    );
  });
};

/**
 * Загружает AMF-модель по URL
 * @param {string} url - URL для загрузки модели
 * @returns {Promise<THREE.Object3D|null>} Promise с объектом или null при ошибке
 */
export const loadAMFFromUrl = (url) => {
  return new Promise((resolve, reject) => {
    const loader = new AMFLoader();
    loader.load(
      url,
      (object) => {
        console.log("AMF loaded from URL");
        resolve(object);
      },
      (progress) => {
        console.log(`Loading AMF: ${Math.round(progress.loaded / progress.total * 100)}%`);
      },
      (error) => {
        console.error('Error loading AMF from URL:', error);
        reject(error);
      }
    );
  });
};

/**
 * Загружает 3MF-модель по URL
 * @param {string} url - URL для загрузки модели
 * @returns {Promise<THREE.Object3D|null>} Promise с объектом или null при ошибке
 */
export const load3MFFromUrl = (url) => {
  return new Promise((resolve, reject) => {
    const loader = new ThreeMFLoader();
    loader.load(
      url,
      (object) => {
        console.log("3MF loaded from URL");
        resolve(object);
      },
      (progress) => {
        console.log(`Loading 3MF: ${Math.round(progress.loaded / progress.total * 100)}%`);
      },
      (error) => {
        console.error('Error loading 3MF from URL:', error);
        reject(error);
      }
    );
  });
};

/**
 * Центрирует и масштабирует геометрию модели
 * @param {THREE.BufferGeometry} geometry - геометрия для обработки
 * @returns {Object} объект с центром и масштабом
 */
export const centerAndScaleGeometry = (geometry) => {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const center = new Vector3();
  box.getCenter(center);
  
  // Get dimensions
  const size = new Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  
  const scale = maxDim > 0 && isFinite(maxDim) ? 1 / maxDim : 1;
  
  return { center, scale };
};

/**
 * Центрирует и масштабирует Object3D (для OBJ моделей)
 * @param {THREE.Object3D} object - объект для обработки
 * @returns {Object} объект с центром и масштабом
 */
export const centerAndScaleObject = (object) => {
  const box = new Box3().setFromObject(object);
  const center = new Vector3();
  box.getCenter(center);
  
  const size = new Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  
  const scale = maxDim > 0 && isFinite(maxDim) ? 1 / maxDim : 1;
  
  return { center, scale };
};

/**
 * Загружает бинарный файл модели с сервера по ID
 * @param {string} fileId - ID файла для загрузки
 * @returns {Promise<ArrayBuffer|null>} Promise с данными или null при ошибке
 */
export const loadModelDirectly = async (fileId) => {
  try {
    console.log("Direct model loading for fileId:", fileId);
    
    // Получаем токен авторизации
    const token = localStorage.getItem('token');
    const baseUrl = process.env.REACT_APP_API_URL || '';
    const url = `${baseUrl}/models/files/${fileId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch model: ${response.status} ${response.statusText}`);
      return null;
    }
    
    // Проверка на тип контента
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error("Server returned HTML instead of binary data");
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`Loaded model file directly: ${arrayBuffer.byteLength} bytes`);
    
    if (arrayBuffer.byteLength < 84) {
      console.error("Invalid STL file size:", arrayBuffer.byteLength);
      return null;
    }
    
    return arrayBuffer;
  } catch (err) {
    console.error("Error loading model directly:", err);
    return null;
  }
}; 