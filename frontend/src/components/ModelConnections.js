import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { getModels } from '../services/api';
import { useTranslation } from 'react-i18next';
import { 
  CubeIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const ModelConnections = ({ studioId }) => {
  const { t } = useTranslation();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [connectionMap, setConnectionMap] = useState({});
  const [hoveredModel, setHoveredModel] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [positions, setPositions] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const response = await getModels(studioId);
        const modelsData = Array.isArray(response) ? response : (response.data || []);
        setModels(modelsData);
        
        // Build connection map
        const connections = {};
        
        modelsData.forEach(model => {
          if (!connections[model.id]) {
            connections[model.id] = { to: [], from: [] };
          }
          
          // Add related_to connections
          if (model.related_to && model.related_to.length > 0) {
            connections[model.id].to = model.related_to.map(related => related.id);
            
            // Make sure all target models have connections object
            model.related_to.forEach(related => {
              if (!connections[related.id]) {
                connections[related.id] = { to: [], from: [] };
              }
              // Add reverse connection
              if (!connections[related.id].from.includes(model.id)) {
                connections[related.id].from.push(model.id);
              }
            });
          }
          
          // Add related_from connections
          if (model.related_from && model.related_from.length > 0) {
            connections[model.id].from = model.related_from.map(related => related.id);
            
            // Make sure all source models have connections object
            model.related_from.forEach(related => {
              if (!connections[related.id]) {
                connections[related.id] = { to: [], from: [] };
              }
              // Add reverse connection
              if (!connections[related.id].to.includes(model.id)) {
                connections[related.id].to.push(model.id);
              }
            });
          }
        });
        
        console.log('Connection map:', connections);
        setConnectionMap(connections);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError(t('models.fetchError', 'Failed to load models'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchModels();
  }, [studioId, t]);
  
  // Get models with connections
  const connectedModels = models.filter(
    model => (connectionMap[model.id]?.to.length > 0 || connectionMap[model.id]?.from.length > 0)
  );
  
  const hasConnections = connectedModels.length > 0;
  
  // Count total connections
  const totalConnections = Object.values(connectionMap).reduce(
    (sum, conn) => sum + conn.to.length, 0
  );

  // Setup resize handler and calculate positions when dimensions change
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width,
          height: 250 // Fixed height
        });
      }
    };

    // Initial calculation
    updateDimensions();
    
    // Update on resize
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Calculate positions when dimensions or connected models change
  useEffect(() => {
    if (dimensions.width === 0 || !connectedModels.length) return;
    
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;

    const newPositions = connectedModels.map((model, index) => {
      const angle = (index / connectedModels.length) * Math.PI * 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      return {
        model,
        x,
        y,
        angle
      };
    });
    
    setPositions(newPositions);
  }, [dimensions, connectedModels]);
  
  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-red-500 dark:text-red-400 text-center">
        {error}
      </div>
    );
  }
  
  if (!hasConnections) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 text-center text-gray-500 dark:text-gray-400">
        <ArrowsRightLeftIcon className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
        <p>{t('models.noConnections', 'No connections between models')}</p>
      </div>
    );
  }
  
  // Debug info about connections
  console.log('Connected models:', connectedModels.length);
  console.log('Total connections:', totalConnections);
  console.log('Positions calculated:', positions.length);
  
  // Draw the connection lines
  const renderConnectionLines = () => {
    const connections = [];
    const uniqueIds = new Set(); // Track unique connections to avoid duplicates
    
    positions.forEach((sourcePos) => {
      const sourceModel = sourcePos.model;
      const sourceX = sourcePos.x;
      const sourceY = sourcePos.y;
      
      const outgoingConnections = connectionMap[sourceModel.id]?.to || [];
      
      outgoingConnections.forEach(targetId => {
        const connectionId = `${sourceModel.id}-${targetId}`;
        if (uniqueIds.has(connectionId)) return; // Skip if already added
        uniqueIds.add(connectionId);
        
        const targetPos = positions.find(pos => pos.model.id === targetId);
        if (targetPos) {
          const isHighlighted = 
            (hoveredModel === sourceModel.id) || 
            (hoveredModel === targetId) ||
            (selectedModel === sourceModel.id) ||
            (selectedModel === targetId);
          
          // Calculate curved path
          const targetX = targetPos.x;
          const targetY = targetPos.y;
          
          // Calculate midpoint with offset for curve
          const midX = (sourceX + targetX) / 2;
          const midY = (sourceY + targetY) / 2;
          
          // Add some curvature based on distance
          const dx = targetX - sourceX;
          const dy = targetY - sourceY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Perpendicular offset to create curve
          const perpX = -dy * 0.2;
          const perpY = dx * 0.2;
          
          const controlX = midX + perpX;
          const controlY = midY + perpY;
          
          const pathData = `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;
          
          connections.push(
            <path
              key={connectionId}
              d={pathData}
              fill="none"
              stroke={isHighlighted ? "#3B82F6" : "#94A3B8"}
              strokeWidth={isHighlighted ? 2 : 1.5}
              strokeDasharray={isHighlighted ? "none" : "4,2"}
              markerEnd={`url(#arrowhead-${isHighlighted ? 'highlighted' : 'normal'})`}
              className="transition-all duration-300"
            />
          );
        }
      });
    });
    
    return (
      <svg 
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" 
        width={dimensions.width} 
        height={dimensions.height}
      >
        <defs>
          <marker
            id="arrowhead-normal"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8" />
          </marker>
          <marker
            id="arrowhead-highlighted"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#3B82F6" />
          </marker>
        </defs>
        {connections}
      </svg>
    );
  };
  
  // Render model nodes
  const renderModelNodes = () => {
    return positions.map((pos) => {
      const model = pos.model;
      const isActive = hoveredModel === model.id || selectedModel === model.id;
      
      // Determine connected IDs
      const connectedIds = [
        ...(connectionMap[model.id]?.to || []),
        ...(connectionMap[model.id]?.from || [])
      ];
      
      // Check if this model is connected to hovered model
      const isConnected = hoveredModel && connectedIds.includes(hoveredModel);
      
      return (
        <div
          key={model.id}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-10 ${
            isActive ? "scale-110" : isConnected ? "scale-105" : ""
          }`}
          style={{ 
            left: `${pos.x}px`, 
            top: `${pos.y}px`,
          }}
          onMouseEnter={() => setHoveredModel(model.id)}
          onMouseLeave={() => setHoveredModel(null)}
          onClick={() => setSelectedModel(selectedModel === model.id ? null : model.id)}
        >
          <div className={`
            rounded-full p-2.5
            ${isActive 
              ? "bg-blue-100 ring-4 ring-blue-300 dark:bg-blue-900 dark:ring-blue-700" 
              : isConnected
                ? "bg-blue-50 ring-2 ring-blue-200 dark:bg-blue-900/60 dark:ring-blue-800"
                : "bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"}
            shadow-sm transition-all duration-300
          `}>
            <CubeIcon className={`h-5 w-5 ${
              isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
            }`} />
          </div>
          <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              isActive 
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
                : "bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}>
              {model.name}
            </span>
          </div>
        </div>
      );
    });
  };
  
  // Render details panel for selected model
  const renderSelectedModelDetails = () => {
    if (!selectedModel) return null;
    
    const model = models.find(m => m.id === selectedModel);
    if (!model) return null;
    
          const connections = connectionMap[model.id];
    if (!connections) return null;
          
          // Find related model names for display
          const toModels = connections.to.map(id => 
            models.find(m => m.id === id)
          ).filter(Boolean);
          
          const fromModels = connections.from.map(id => 
            models.find(m => m.id === id)
          ).filter(Boolean);
          
          return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
            <CubeIcon className="h-5 w-5 mr-2 text-blue-500" />
                <Link 
                  to={`/models/${model.id}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {model.name}
                </Link>
          </h4>
          <button 
            onClick={() => setSelectedModel(null)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <span className="sr-only">{t('common.close', 'Close')}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
              </div>
              
        <div className="space-y-3 text-sm mt-3">
                {toModels.length > 0 && (
                  <div>
              <div className="text-gray-600 dark:text-gray-400 mb-1.5">
                {t('models.connectsTo', 'Connects to')}:
              </div>
              <div className="flex flex-wrap gap-1.5">
                      {toModels.map(related => (
                        <Link 
                          key={related.id}
                          to={`/models/${related.id}`} 
                          className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                        >
                          {related.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {fromModels.length > 0 && (
                  <div>
              <div className="text-gray-600 dark:text-gray-400 mb-1.5">
                {t('models.connectedFrom', 'Connected from')}:
              </div>
              <div className="flex flex-wrap gap-1.5">
                      {fromModels.map(related => (
                        <Link 
                          key={related.id}
                          to={`/models/${related.id}`} 
                          className="inline-flex items-center px-2 py-0.5 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full text-xs"
                        >
                          {related.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <ArrowsRightLeftIcon className="h-5 w-5 mr-2 text-blue-500" />
            {t('models.connections', 'Model Connections')} ({totalConnections})
          </h3>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <InformationCircleIcon className="h-4 w-4 mr-1" />
            <span>{t('models.connectionsTip', 'Click on a model to view details')}</span>
          </div>
        </div>
      </div>
      
      <div 
        ref={containerRef} 
        className="relative h-64 px-4"
        style={{ minHeight: '250px' }}
      >
        {positions.length > 0 && renderConnectionLines()}
        {positions.length > 0 && renderModelNodes()}
        
        {positions.length === 0 && connectedModels.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p>{t('common.loading', 'Loading connections...')}</p>
            </div>
          </div>
        )}
      </div>
      
      {renderSelectedModelDetails()}
    </div>
  );
};

export default ModelConnections; 