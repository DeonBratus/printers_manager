import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls, PerspectiveCamera, useTexture } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import Card from './Card';
import { CubeIcon } from '@heroicons/react/24/outline';
import { downloadModelFile } from '../services/api';

// Placeholder component when no model is available
const PlaceholderCube = () => {
  const mesh = useRef();
  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.y += 0.005;
    }
  });
  
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3b82f6" />
    </mesh>
  );
};

// Model component to display STL or OBJ
const ModelComponent = ({ url, fileType, buffer }) => {
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);
  const group = useRef();
  const { camera, scene } = useThree();
  
  // Функция для очистки модели и создания заглушки
  const createSimplePlaceholder = () => {
    console.log("Creating placeholder instead of model");
    
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: "#3b82f6" });
    const mesh = new THREE.Mesh(geometry, material);
    
    return { type: 'placeholder', mesh };
  };
  
  // Проверка и парсинг STL данных
  const parseSTLBuffer = (buffer) => {
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
  
  // Load model from binary buffer directly
  useEffect(() => {
    if (buffer && buffer.byteLength > 0) {
      try {
        console.log(`Attempting to load model from buffer, type: ${fileType?.toLowerCase()}, size: ${buffer.byteLength} bytes`);
        
        if (fileType?.toLowerCase() === 'stl') {
          const geometry = parseSTLBuffer(buffer);
          
          if (!geometry) {
            console.warn("Using placeholder after STL parse failure");
            setModel(createSimplePlaceholder());
            return;
          }
          
          // Создаем материал и меш
          const material = new THREE.MeshStandardMaterial({ 
            color: "#3b82f6",
            flatShading: true
          });
          
          const mesh = new THREE.Mesh(geometry, material);
          
          // Center and scale model
          geometry.computeBoundingBox();
          if (geometry.boundingBox) {
            const box = geometry.boundingBox;
            const center = new Vector3();
            box.getCenter(center);
            
            // Get dimensions
            const size = new Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            
            if (maxDim > 0 && isFinite(maxDim)) {
              const scale = 1 / maxDim;
              mesh.scale.set(scale, scale, scale);
            }
            
            mesh.position.set(-center.x, -center.y, -center.z);
          }
          
          // Set model rotation (most STL models look better rotated)
          mesh.rotation.x = -Math.PI / 2;
          
          setModel({ type: 'stl', mesh });
          console.log("STL model loaded successfully");
        } else if (fileType?.toLowerCase() === 'obj') {
          console.log("OBJ files need URL to load, not buffer");
          // Objects должны загружаться через URL
        }
      } catch (err) {
        console.error('Error creating model from buffer:', err);
        setModel(createSimplePlaceholder());
      }
    }
  }, [buffer, fileType]);
  
  // Load model from URL (for OBJ or as fallback for STL)
  useEffect(() => {
    if (!url || (model && model.type !== 'placeholder') || buffer) return;
    
    const loadModel = async () => {
      try {
        console.log(`Attempting to load model from URL: ${fileType?.toLowerCase()}`);
        
        if (fileType?.toLowerCase() === 'stl') {
          const loader = new STLLoader();
          loader.load(
            url,
            (geometry) => {
              console.log("STL loaded from URL");
              
              // Создаем материал и меш
              const material = new THREE.MeshStandardMaterial({ 
                color: "#3b82f6",
                flatShading: true
              });
              
              const mesh = new THREE.Mesh(geometry, material);
              
              // Center and scale model
              geometry.computeBoundingBox();
              if (geometry.boundingBox) {
                const box = geometry.boundingBox;
                const center = new Vector3();
                box.getCenter(center);
                
                // Get dimensions
                const size = new Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                
                if (maxDim > 0 && isFinite(maxDim)) {
                  const scale = 1 / maxDim;
                  mesh.scale.set(scale, scale, scale);
                }
                
                mesh.position.set(-center.x, -center.y, -center.z);
              }
              
              // Set model rotation (most STL models look better rotated)
              mesh.rotation.x = -Math.PI / 2;
              
              setModel({ type: 'stl', mesh });
            },
            (progress) => {
              console.log(`Loading STL: ${Math.round(progress.loaded / progress.total * 100)}%`);
            },
            (error) => {
              console.error('Error loading STL from URL:', error);
              setModel(createSimplePlaceholder());
            }
          );
        } else if (fileType?.toLowerCase() === 'obj') {
          const loader = new OBJLoader();
          loader.load(
            url,
            (object) => {
              console.log("OBJ loaded from URL");
              
              // Center and scale object
              const box = new Box3().setFromObject(object);
              const center = new Vector3();
              box.getCenter(center);
              object.position.sub(center);
              
              const size = new Vector3();
              box.getSize(size);
              const maxDim = Math.max(size.x, size.y, size.z);
              
              if (maxDim > 0 && isFinite(maxDim)) {
                const scale = 1 / maxDim;
                object.scale.set(scale, scale, scale);
              }
              
              setModel({ type: 'obj', object });
            },
            (progress) => {
              console.log(`Loading OBJ: ${Math.round(progress.loaded / progress.total * 100)}%`);
            },
            (error) => {
              console.error('Error loading OBJ from URL:', error);
              setModel(createSimplePlaceholder());
            }
          );
        }
      } catch (err) {
        console.error('Error initiating model load:', err);
        setModel(createSimplePlaceholder());
      }
    };
    
    loadModel();
  }, [url, fileType, model, buffer]);
  
  // Position camera when model is ready
  useEffect(() => {
    if (group.current && model) {
      camera.position.set(2, 2, 2);
      camera.lookAt(0, 0, 0);
    }
  }, [model, camera]);
  
  // Debug rendering
  useFrame(() => {
    if (group.current && !model) {
      if (group.current.children.length === 0) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: "#ff0000" });
        const mesh = new THREE.Mesh(geometry, material);
        group.current.add(mesh);
      }
    }
  });
  
  if (error) {
    console.warn('Model error, showing placeholder:', error);
    return <PlaceholderCube />;
  }
  
  return (
    <group ref={group}>
      {model?.type === 'stl' && model.mesh && (
        <primitive object={model.mesh} />
      )}
      
      {model?.type === 'obj' && model.object && (
        <primitive object={model.object} />
      )}
      
      {model?.type === 'placeholder' && model.mesh && (
        <primitive object={model.mesh} />
      )}
      
      {!model && <PlaceholderCube />}
    </group>
  );
};

const ModelViewer = ({ modelId, modelFiles = [] }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Отладочная информация о файлах
  useEffect(() => {
    if (modelFiles && modelFiles.length > 0) {
      console.log("Available model files:", modelFiles.map(f => ({ 
        id: f.id, 
        name: f.filename, 
        type: f.file_type,
        size: f.file_size
      })));
    } else {
      console.log("No model files available");
    }
  }, [modelFiles]);
  
  // Select the first appropriate file by default
  useEffect(() => {
    if (modelFiles && modelFiles.length > 0) {
      const stlFile = modelFiles.find(f => 
        typeof f.file_type === 'string' && f.file_type.toLowerCase() === 'stl'
      );
      
      const objFile = modelFiles.find(f => 
        typeof f.file_type === 'string' && f.file_type.toLowerCase() === 'obj'
      );
      
      const selectedF = stlFile || objFile || modelFiles[0];
      console.log("Selected file:", selectedF);
      setSelectedFile(selectedF);
    } else {
      setSelectedFile(null);
    }
  }, [modelFiles]);
  
  // Прямая загрузка с использованием fetch для лучшего контроля
  const loadModelFile = async (fileId) => {
    console.log("Loading model file ID:", fileId);
    try {
      // Получаем токен авторизации
      const token = localStorage.getItem('token');
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const url = `${baseUrl}/models/files/${fileId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`);
      }
      
      // Проверяем тип содержимого
      const contentType = response.headers.get('content-type');
      console.log("Response content type:", contentType);
      
      // Если не бинарные данные, пробуем прочитать текст для отладки
      if (contentType && contentType.includes('text/html')) {
        const text = await response.text();
        console.error("Received HTML instead of model:", text.substring(0, 200));
        throw new Error("Server returned HTML instead of model data");
      }
      
      // Получаем бинарные данные
      const arrayBuffer = await response.arrayBuffer();
      console.log(`Loaded model file: ${arrayBuffer.byteLength} bytes`);
      
      return { buffer: arrayBuffer, url: URL.createObjectURL(new Blob([arrayBuffer])) };
    } catch (err) {
      console.error("Error loading model file:", err);
      throw err;
    }
  };
  
  // Load the selected file
  useEffect(() => {
    if (!selectedFile || !selectedFile.id) {
      setFileUrl(null);
      setFileBuffer(null);
      return;
    }
    
    const loadFile = async () => {
      try {
        setLoading(true);
        setError(null);
        setFileBuffer(null);
        setFileUrl(null);
        
        // Используем прямую загрузку вместо API
        const result = await loadModelFile(selectedFile.id);
        
        setFileBuffer(result.buffer);
        setFileUrl(result.url);
      } catch (err) {
        console.error('Error loading model file:', err);
        setError(`Ошибка загрузки: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadFile();
    
    // Cleanup
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [selectedFile]);
  
  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold dark:text-white">3D Модель</h3>
        {modelFiles.length > 1 && (
          <select 
            value={selectedFile ? selectedFile.id : ''} 
            onChange={(e) => {
              const fileId = parseInt(e.target.value);
              const file = modelFiles.find(f => f.id === fileId);
              setSelectedFile(file);
            }}
            className="ml-2 block text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {modelFiles.map(file => (
              <option key={file.id} value={file.id}>
                {file.filename} ({file.file_type})
              </option>
            ))}
          </select>
        )}
      </div>
      
      <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
        {/* Отладочная информация */}
        <div className="absolute top-2 right-2 z-10 bg-black/50 text-white text-xs p-1 rounded">
          {selectedFile ? `${selectedFile.file_type || 'Unknown'}` : 'No file'} 
          {fileBuffer ? ` (${fileBuffer.byteLength} bytes)` : ''}
        </div>
        
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <CubeIcon className="h-12 w-12 mb-2" />
            <p className="text-center px-4">{error || 'Ошибка загрузки модели'}</p>
          </div>
        ) : fileUrl || fileBuffer ? (
          <Canvas 
            camera={{ position: [2, 2, 2], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
            shadows
          >
            <ambientLight intensity={0.7} />
            <pointLight position={[10, 10, 10]} intensity={1} castShadow />
            <directionalLight 
              position={[2, 5, 3]} 
              intensity={0.8} 
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <OrbitControls enableZoom={true} enablePan={true} />
            <ModelComponent 
              url={fileUrl} 
              buffer={fileBuffer} 
              fileType={selectedFile?.file_type} 
            />
            <gridHelper args={[10, 10]} />
          </Canvas>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <CubeIcon className="h-12 w-12 mb-2" />
            <p>Выберите модель для загрузки</p>
          </div>
        )}
      </div>
      
      {!selectedFile && modelFiles.length === 0 && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          Нет доступных файлов модели. Загрузите STL или OBJ файл для просмотра 3D модели.
        </div>
      )}
    </Card>
  );
};

export default ModelViewer; 