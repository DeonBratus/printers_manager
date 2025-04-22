import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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

// Model component to display STL
const ModelComponent = ({ url, fileType }) => {
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);
  const group = useRef();
  const { camera } = useThree();
  
  useEffect(() => {
    if (!url) return;
    
    const loadModel = async () => {
      try {
        if (fileType === 'STL' || fileType === 'stl') {
          const loader = new STLLoader();
          const geometry = await loader.loadAsync(url);
          
          // Center and normalize the model
          geometry.computeBoundingBox();
          const box = new Box3().setFromObject({ geometry });
          const center = new Vector3();
          box.getCenter(center);
          geometry.translate(-center.x, -center.y, -center.z);
          
          const size = new Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1 / maxDim;
          
          setModel({ geometry, scale });
        } else if (fileType === 'OBJ' || fileType === 'obj') {
          const loader = new OBJLoader();
          const object = await loader.loadAsync(url);
          
          // Center and normalize the model
          const box = new Box3().setFromObject(object);
          const center = new Vector3();
          box.getCenter(center);
          object.position.sub(center);
          
          const size = new Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1 / maxDim;
          
          object.scale.set(scale, scale, scale);
          
          setModel({ object });
        }
      } catch (err) {
        console.error('Error loading model:', err);
        setError('Failed to load 3D model');
      }
    };
    
    loadModel();
  }, [url, fileType]);
  
  useEffect(() => {
    if (group.current) {
      // Set camera position
      camera.position.set(2, 2, 2);
      camera.lookAt(0, 0, 0);
    }
  }, [model, camera]);
  
  if (error) {
    return (
      <PlaceholderCube />
    );
  }
  
  return (
    <group ref={group}>
      {model && fileType === 'STL' && (
        <mesh>
          <primitive object={model.geometry} attach="geometry" />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
      )}
      
      {model && fileType === 'OBJ' && (
        <primitive object={model.object} />
      )}
      
      {!model && <PlaceholderCube />}
    </group>
  );
};

const ModelViewer = ({ modelId, modelFiles = [] }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Select the first STL or OBJ file by default
  useEffect(() => {
    if (modelFiles && modelFiles.length > 0) {
      const stlFile = modelFiles.find(f => 
        f.file_type === 'STL' || f.file_type === 'stl'
      );
      
      const objFile = modelFiles.find(f => 
        f.file_type === 'OBJ' || f.file_type === 'obj'
      );
      
      setSelectedFile(stlFile || objFile || modelFiles[0]);
    } else {
      setSelectedFile(null);
    }
  }, [modelFiles]);
  
  // Load the selected file
  useEffect(() => {
    if (!selectedFile) {
      setFileUrl(null);
      return;
    }
    
    const loadFile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await downloadModelFile(selectedFile.id);
        const blob = new Blob([response.data]);
        const url = URL.createObjectURL(blob);
        
        setFileUrl(url);
      } catch (err) {
        console.error('Error loading model file:', err);
        setError('Failed to load model file');
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
                {file.filename}
              </option>
            ))}
          </select>
        )}
      </div>
      
      <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <CubeIcon className="h-12 w-12 mb-2" />
            <p>Ошибка загрузки модели</p>
          </div>
        ) : (
          <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <PerspectiveCamera makeDefault position={[0, 0, 5]} />
            <OrbitControls enableZoom={true} enablePan={true} />
            <ModelComponent url={fileUrl} fileType={selectedFile?.file_type} />
          </Canvas>
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