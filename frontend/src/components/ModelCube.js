import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { downloadModelFile } from '../services/api';

const ModelCube = ({ 
  className = '', 
  size = 'md', 
  color = '#3B82F6', 
  modelId, 
  fileId, 
  stlFile, // Add stlFile prop for direct file object usage
  showPlaceholder = true, 
  interactive = false 
}) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const frameIdRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set dimensions based on size prop
  const getDimensions = () => {
    switch (size) {
      case 'small': 
      case 'sm': return { height: 70, width: 70 };
      case 'lg': return { height: 140, width: 140 };
      case 'xl': return { height: 170, width: 170 };
      case 'md':
      default: return { height: 100, width: 100 };
    }
  };

  const dimensions = getDimensions();

  // Прямая загрузка модели с сервера через fetch
  const loadModelDirectly = async (fileId) => {
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

  // Function to safely parse and load the STL model
  const loadModelFromArrayBuffer = (buffer) => {
    try {
      if (!buffer || buffer.byteLength === 0) {
        console.error('Empty model data');
        createPlaceholderCube();
        return;
      }

      // Базовая проверка на корректность STL данных
      if (buffer.byteLength < 84) {
        console.error('Invalid STL file format: file too small');
        createPlaceholderCube();
        return;
      }
      
      // Проверка типа STL файла (бинарный или ASCII)
      const header = new Uint8Array(buffer, 0, 5);
      const decoder = new TextDecoder();
      const headerStr = decoder.decode(header);
      
      // ASCII STL файлы начинаются с "solid"
      const isASCII = headerStr.trim().toLowerCase() === 'solid';
      
      if (isASCII) {
        console.log("Processing ASCII STL");
        try {
          // ASCII STL парсинг через STLLoader
          const loader = new STLLoader();
          const geometry = loader.parse(buffer);
          
          if (!geometry || !geometry.attributes || !geometry.attributes.position) {
            console.error('Invalid geometry from ASCII STL data');
            createPlaceholderCube();
            return;
          }
          
          createModelFromGeometry(geometry);
        } catch (parseErr) {
          console.error('Error parsing ASCII STL data:', parseErr);
          createPlaceholderCube();
        }
      } else {
        console.log("Processing binary STL");
        // Бинарный STL формат
        try {
          // Проверка размера файла на корректность
          const dataView = new DataView(buffer);
          const triangleCount = dataView.getUint32(80, true);
          
          console.log(`Binary STL: ${triangleCount} triangles declared, file size: ${buffer.byteLength} bytes`);
          
          // Валидация файла на разумные значения
          if (triangleCount === 0 || triangleCount > 5000000) {
            console.error(`Invalid triangle count in STL: ${triangleCount}`);
            createPlaceholderCube();
            return;
          }
          
          const expectedSize = 84 + (triangleCount * 50);
          if (buffer.byteLength < expectedSize) {
            console.error(`STL data size mismatch. Expected at least ${expectedSize} bytes, got ${buffer.byteLength}`);
            createPlaceholderCube();
            return;
          }
          
          // Парсинг через STLLoader с обработкой ошибок
          const loader = new STLLoader();
          
          // Метод STLLoader.parse может выбросить исключение при некорректном файле
          const geometry = loader.parse(buffer);
          
          if (!geometry || !geometry.attributes || !geometry.attributes.position) {
            console.error('Invalid geometry from binary STL data');
            createPlaceholderCube();
            return;
          }
          
          createModelFromGeometry(geometry);
        } catch (parseErr) {
          console.error('Error in STL parser:', parseErr);
          createPlaceholderCube();
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error parsing STL data:', err);
      setError('Ошибка обработки модели');
      setLoading(false);
      // Создаем заглушку вместо модели
      createPlaceholderCube();
    }
  };

  // Function to load the STL model from a URL
  const loadModelFromUrl = async (url) => {
    try {
      console.log("Loading model from URL:", url);
      setLoading(true);
      
      // Для прямой обработки URL через STLLoader
      if (typeof url === 'string' && (url.startsWith('http') || url.startsWith('blob:'))) {
        try {
          // Загружаем через fetch для лучшего контроля
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          loadModelFromArrayBuffer(arrayBuffer);
          
          // Очищаем blob URL если нужно
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        } catch (loadErr) {
          console.error("Error loading from URL:", loadErr);
          createPlaceholderCube();
          setLoading(false);
        }
      } 
      // Для загрузки через fetch и обработки бинарных данных
      else {
        console.error("Invalid URL format:", url);
        createPlaceholderCube();
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading STL model:', err);
      setError('Ошибка загрузки модели');
      setLoading(false);
      
      // Создаем заглушку вместо модели
      createPlaceholderCube();
    }
  };

  // Function to load the STL model from file ID via API
  const loadModelFromFileId = async () => {
    if (!fileId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Используем прямую загрузку через fetch вместо API
      const arrayBuffer = await loadModelDirectly(fileId);
      
      if (!arrayBuffer) {
        console.error("Failed to load model data");
        setError('Не удалось загрузить данные модели');
        setLoading(false);
        createPlaceholderCube();
        return;
      }
      
      // Обрабатываем полученные данные
      loadModelFromArrayBuffer(arrayBuffer);
    } catch (err) {
      console.error('Error downloading model file:', err);
      setError('Ошибка загрузки модели');
      setLoading(false);
      createPlaceholderCube();
    }
  };

  // Function to load the STL model from direct file object
  const loadModelFromStlFile = async () => {
    if (!stlFile) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Если stlFile содержит blob данные
      if (stlFile.blob) {
        try {
          const arrayBuffer = await stlFile.blob.arrayBuffer();
          loadModelFromArrayBuffer(arrayBuffer);
        } catch (blobErr) {
          console.error("Error processing blob:", blobErr);
          createPlaceholderCube();
          setLoading(false);
        }
      }
      // Если stlFile содержит путь к файлу
      else if (stlFile.file_path) {
        await loadModelFromUrl(stlFile.file_path);
      }
      // Если stlFile содержит id
      else if (stlFile.id) {
        // Используем прямую загрузку
        const arrayBuffer = await loadModelDirectly(stlFile.id);
        
        if (arrayBuffer) {
          loadModelFromArrayBuffer(arrayBuffer);
        } else {
          console.error("Failed to load model data by ID");
          createPlaceholderCube();
          setLoading(false);
        }
      }
      else {
        console.error('Invalid stlFile object:', stlFile);
        setError('Некорректный объект модели');
        setLoading(false);
        createPlaceholderCube();
      }
    } catch (err) {
      console.error('Error loading stlFile:', err);
      setError('Ошибка загрузки модели');
      setLoading(false);
      createPlaceholderCube();
    }
  };

  // Create a placeholder cube when model fails to load
  const createPlaceholderCube = () => {
    if (!sceneRef.current || !modelRef.current) return;
    
    // Remove existing model if there is one
    if (modelRef.current.children.length > 0) {
      const oldModel = modelRef.current.children[0];
      modelRef.current.remove(oldModel);
      if (oldModel.geometry) oldModel.geometry.dispose();
      if (oldModel.material) oldModel.material.dispose();
    }
    
    // Create a simple cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.8
    });
    const cube = new THREE.Mesh(geometry, material);
    
    // Add subtle rotation for better visual
    cube.rotation.y = Math.PI / 6;
    cube.rotation.x = Math.PI / 6;
    
    modelRef.current.add(cube);
  };

  // Create a mesh from geometry and add it to the scene
  const createModelFromGeometry = (geometry) => {
    if (!sceneRef.current || !modelRef.current) return;
    
    try {
      // Remove existing model if there is one
      if (modelRef.current.children.length > 0) {
        const oldModel = modelRef.current.children[0];
        modelRef.current.remove(oldModel);
        if (oldModel.geometry) oldModel.geometry.dispose();
        if (oldModel.material) oldModel.material.dispose();
      }
      
      // Center the geometry
      geometry.computeBoundingBox();
      const boundingBox = geometry.boundingBox;
      
      if (!boundingBox) {
        throw new Error('Cannot compute bounding box');
      }
      
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
      
      // Scale the geometry to fit in our viewport
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      
      if (maxDim <= 0 || !isFinite(maxDim)) {
        throw new Error('Invalid model dimensions');
      }
      
      const scale = 1.8 / maxDim; // Slightly smaller to ensure it fits well
      
      // Create a new mesh with the geometry - optimize material settings
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.2,
        roughness: 0.6,
        flatShading: true, // Optimize performance for complex models
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(scale, scale, scale);
      
      // Better initial orientation for most models
      mesh.rotation.x = -Math.PI / 2;
      
      // Center in scene
      modelRef.current.position.set(0, 0, 0);
      modelRef.current.add(mesh);
      
      // Reset camera and controls for best view
      if (cameraRef.current) {
        cameraRef.current.position.set(0, 0, 3);
        cameraRef.current.lookAt(0, 0, 0);
        
        if (controlsRef.current) {
          controlsRef.current.update();
        }
      }
    } catch (err) {
      console.error('Error creating model from geometry:', err);
      createPlaceholderCube();
    }
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup - use a lower memory impact approach
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(35, dimensions.width / dimensions.height, 0.1, 1000);
    camera.position.z = 3;
    cameraRef.current = camera;

    // Renderer setup - optimize for performance
    const renderer = new THREE.WebGLRenderer({ 
      antialias: interactive, // Only use antialiasing for interactive models
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(dimensions.width, dimensions.height);
    // Only use device pixel ratio if the model is interactive
    renderer.setPixelRatio(interactive ? window.devicePixelRatio : 1);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting - simplified lighting for better performance
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Brighter ambient to reduce need for other lights
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create a group for the model
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelRef.current = modelGroup;

    // Add orbit controls if interactive
    if (interactive) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.enableZoom = true;
      controls.enablePan = false;
      controlsRef.current = controls;
    }

    // Create placeholder cube if needed
    if (showPlaceholder && !fileId && !stlFile) {
      createPlaceholderCube();
    }

    // Animation loop - with optimizations
    const animate = () => {
      if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
      
      frameIdRef.current = requestAnimationFrame(animate);
      
      // Update controls if interactive
      if (interactive && controlsRef.current) {
        controlsRef.current.update();
      }
      
      // Rotate the model slightly if it's just a placeholder
      if (modelRef.current && modelRef.current.children.length > 0 && !interactive && !fileId && !stlFile) {
        modelRef.current.rotation.y += 0.005;
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    
    animate();

    // Try to load the model if file ID or stlFile is provided
    if (fileId) {
      loadModelFromFileId();
    } else if (stlFile) {
      loadModelFromStlFile();
    }

    // Clean up
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }

      if (rendererRef.current && rendererRef.current.domElement && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      if (sceneRef.current) {
        // Dispose all geometries and materials
        sceneRef.current.traverse((object) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }

      // Clear references
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      rendererRef.current = null;
      modelRef.current = null;
    };
  }, [dimensions.height, dimensions.width, interactive, showPlaceholder, color, fileId]);

  return (
    <div 
      ref={mountRef} 
      className={`model-cube ${className}`} 
      style={{ 
        width: dimensions.width, 
        height: dimensions.height,
        position: 'relative'
      }}
    >
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '4px'
        }}>
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent" />
        </div>
      )}
      {error && !loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#ef4444',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '4px'
        }}>
          !
        </div>
      )}
    </div>
  );
};

export default ModelCube; 