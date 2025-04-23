import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import ModelCube from './ModelCube';
import { formatDuration } from '../utils/timeFormat';
import { addModelRelation, removeModelRelation } from '../services/api';
import { 
  CubeIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  PlusCircleIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

// Simplified layout calculation - just arrange models in a circular pattern
const arrangeModelsInCircle = (models, width, height) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.4;
  
  return models.map((model, index) => {
    // Position models in a circle
    const angle = (index / models.length) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    return {
      id: model.id,
      model: model,
      x,
      y,
      angle
    };
  });
};

const ModelNetworkView = ({ 
  models, 
  modelFiles, 
  connectionMap, 
  getModelColor, 
  onDeleteClick,
  containerRef 
}) => {
  const { t } = useTranslation();
  const [networkNodes, setNetworkNodes] = useState([]);
  const [hoveredModel, setHoveredModel] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [containerSize, setContainerSize] = useState({ width: 1000, height: 700 });
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const svgRef = useRef(null);
  const hasModels = models && models.length > 0;
  
  // Clear feedback message after 3 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);
  
  // Update container size when window resizes
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: Math.max(700, rect.width * 0.6) // Make height proportional to width
        });
      }
    };
    
    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    
    return () => window.removeEventListener('resize', updateContainerSize);
  }, [containerRef]);
  
  // Compute layout when models or container size changes
  useEffect(() => {
    if (hasModels && containerSize.width > 0) {
      const positions = arrangeModelsInCircle(
        models, 
        containerSize.width, 
        containerSize.height
      );
      
      setNetworkNodes(positions);
    } else {
      setNetworkNodes([]);
    }
  }, [models, containerSize, hasModels]);
  
  // Handle start dragging a node
  const handleMouseDown = useCallback((e, node) => {
    // Only allow left mouse button
    if (e.button !== 0) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - (rect.left + node.x);
    const offsetY = e.clientY - (rect.top + node.y);
    
    setDraggingNode(node.id);
    setDragOffset({ x: offsetX, y: offsetY });
    e.stopPropagation();
  }, [containerRef]);
  
  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e) => {
    if (!draggingNode) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    
    // Update the position of the dragged node
    setNetworkNodes((nodes) => 
      nodes.map((node) => 
        node.id === draggingNode 
          ? { ...node, x, y } 
          : node
      )
    );
  }, [draggingNode, dragOffset, containerRef]);
  
  // Handle mouse up to end dragging
  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
  }, []);
  
  // Start connection mode
  const startConnecting = (id) => {
    setConnectingFrom(id);
    setFeedback({
      type: 'info',
      message: t('models.connectingStarted', 'Выберите модель для создания связи')
    });
  };
  
  // Complete connection between models
  const completeConnection = async (toId) => {
    if (connectingFrom && connectingFrom !== toId) {
      setIsSubmitting(true);
      
      try {
        // Use the API to create the actual connection
        await addModelRelation(connectingFrom, toId);
        
        // Show success message
        setFeedback({
          type: 'success',
          message: t('models.connectionCreated', 'Связь успешно создана!')
        });
        
        // Add the new connection to the local state (could be handled by refetching instead)
        // This is a temporary visual update until the models are refetched
        
        // Exit connecting mode
        setConnectingFrom(null);
      } catch (error) {
        console.error('Error creating connection:', error);
        setFeedback({
          type: 'error',
          message: t('models.connectionError', 'Ошибка при создании связи')
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  // Remove a connection between models
  const removeConnection = async (sourceId, targetId) => {
    if (!sourceId || !targetId) return;
    
    setIsSubmitting(true);
    
    try {
      // Use the API to remove the connection
      await removeModelRelation(sourceId, targetId);
      
      // Show success message
      setFeedback({
        type: 'success',
        message: t('models.connectionRemoved', 'Связь удалена')
      });
      
      // Local state update will happen when models are refetched
    } catch (error) {
      console.error('Error removing connection:', error);
      setFeedback({
        type: 'error',
        message: t('models.removeConnectionError', 'Ошибка при удалении связи')
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Cancel connection mode
  const cancelConnection = () => {
    setConnectingFrom(null);
    setFeedback({
      type: 'info',
      message: t('models.connectingCanceled', 'Создание связи отменено')
    });
  };
  
  // Install global mouse event handlers for dragging
  useEffect(() => {
    if (draggingNode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingNode, handleMouseMove, handleMouseUp]);
  
  // No models to display - moved after all hooks
  if (!hasModels) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <CubeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-300">
          {t('models.noModels', 'Нет моделей')}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('models.startByAdding', 'Начните с добавления новой 3D модели.')}
        </p>
      </div>
    );
  }
  
  // Render connection lines between models
  const renderConnections = () => {
    if (!networkNodes.length) return null;
    
    const connections = [];
    const addedPairs = new Set();
    
    // Draw connections from model to related models
    networkNodes.forEach(node => {
      const sourceId = node.id;
      const relatedModels = connectionMap[sourceId]?.to || [];
      
      relatedModels.forEach(targetId => {
        // Avoid duplicate connections
        const pairId = `${sourceId}-${targetId}`;
        const reversePairId = `${targetId}-${sourceId}`;
        
        if (addedPairs.has(pairId) || addedPairs.has(reversePairId)) return;
        addedPairs.add(pairId);
        
        const targetNode = networkNodes.find(n => n.id === targetId);
        if (!targetNode) return;
        
        const isHighlighted = 
          hoveredModel === sourceId || 
          hoveredModel === targetId ||
          selectedModel === sourceId ||
          selectedModel === targetId;
        
        // Calculate arrow position
        const dx = targetNode.x - node.x;
        const dy = targetNode.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const unitX = dx / distance;
        const unitY = dy / distance;
        
        // Draw a simple line for the connection
        connections.push(
          <g key={pairId}>
            <line
              x1={node.x}
              y1={node.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke={isHighlighted ? "#3B82F6" : "#CBD5E1"}
              strokeWidth={isHighlighted ? 2 : 1.5}
              strokeDasharray={isHighlighted ? "none" : "5,3"}
              className="transition-all duration-200 dark:stroke-gray-600 dark:stroke-opacity-70"
              markerEnd={`url(#arrowhead-${isHighlighted ? 'highlighted' : 'normal'})`}
            />
            
            {/* Delete connection button on hover */}
            {isHighlighted && (
              <circle
                cx={(node.x + targetNode.x) / 2}
                cy={(node.y + targetNode.y) / 2}
                r={12}
                fill="#ef4444"
                className="cursor-pointer opacity-80 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  removeConnection(sourceId, targetId);
                }}
              >
                <title>{t('models.removeConnection', 'Удалить связь')}</title>
              </circle>
            )}
            {isHighlighted && (
              <XMarkIcon
                x={(node.x + targetNode.x) / 2 - 6}
                y={(node.y + targetNode.y) / 2 - 6}
                width={12}
                height={12}
                className="text-white cursor-pointer pointer-events-none"
              />
            )}
          </g>
        );
      });
    });
    
    // Draw the connecting line when in connecting mode
    if (connectingFrom) {
      const sourceNode = networkNodes.find(n => n.id === connectingFrom);
      if (sourceNode) {
        const targetX = hoveredModel 
          ? networkNodes.find(n => n.id === hoveredModel)?.x ?? sourceNode.x 
          : containerSize.width / 2;
        const targetY = hoveredModel 
          ? networkNodes.find(n => n.id === hoveredModel)?.y ?? sourceNode.y 
          : containerSize.height / 2;
        
        connections.push(
          <line
            key="connecting-line"
            x1={sourceNode.x}
            y1={sourceNode.y}
            x2={targetX}
            y2={targetY}
            stroke="#3B82F6"
            strokeWidth={2}
            strokeDasharray="5,5"
            className="connecting-line"
            markerEnd="url(#arrowhead-highlighted)"
          />
        );
      }
    }
    
    return (
      <svg 
        ref={svgRef}
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
        width={containerSize.width}
        height={containerSize.height}
      >
        <defs>
          <marker
            id="arrowhead-normal"
            markerWidth="8"
            markerHeight="6"
            refX="4"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 4 3, 0 6" fill="#CBD5E1" className="dark:fill-gray-600" />
          </marker>
          <marker
            id="arrowhead-highlighted"
            markerWidth="8"
            markerHeight="6"
            refX="4"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 4 3, 0 6" fill="#3B82F6" />
          </marker>
        </defs>
        
        {connections}
      </svg>
    );
  };
  
  // Handle click on background to cancel connecting mode
  const handleBackgroundClick = () => {
    if (connectingFrom) {
      cancelConnection();
    }
    setSelectedModel(null);
  };
  
  return (
    <div 
      className="relative cursor-grab active:cursor-grabbing" 
      style={{ height: containerSize.height }}
      onClick={handleBackgroundClick}
    >
      {/* User Instructions */}
      <div className="absolute top-4 left-4 right-4 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {connectingFrom 
            ? t('models.connectingInstructions', 'Нажмите на модель, чтобы создать связь, или щелкните в любом месте для отмены.') 
            : t('models.dragInstructions', 'Перетаскивайте модели для изменения расположения. Нажмите на кнопку "+" рядом с моделью, чтобы создать связь.')}
        </p>
      </div>
      
      {/* Feedback message */}
      {feedback && (
        <div 
          className={`absolute top-20 left-4 right-4 p-3 rounded-lg shadow-sm border transition-opacity duration-300 ${
            feedback.type === 'success' ? 'bg-green-50 border-green-100 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200' :
            feedback.type === 'error' ? 'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200' :
            'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200'
          }`}
        >
          <div className="flex items-center">
            {feedback.type === 'success' && <CheckIcon className="h-5 w-5 mr-2" />}
            {feedback.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5 mr-2" />}
            <p className="text-sm">{feedback.message}</p>
          </div>
        </div>
      )}
      
      {/* Loading overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Connection lines */}
      {renderConnections()}
      
      {/* Model nodes */}
      {networkNodes.map(node => {
        const model = node.model;
        const hasConnections = 
          (connectionMap[model.id]?.to.length > 0 || 
           connectionMap[model.id]?.from.length > 0);
        
        const isHighlighted = hoveredModel === model.id || selectedModel === model.id;
        const isConnecting = connectingFrom === model.id;
        const isConnectTarget = connectingFrom && connectingFrom !== model.id;
        
        return (
          <div
            key={model.id}
            className={`absolute transition-all duration-300 ${
              isHighlighted || isConnecting ? 'z-40' : 'z-20'
            } ${isConnectTarget ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
            style={{
              left: node.x + 'px',
              top: node.y + 'px',
              transform: 'translate(-50%, -50%)',
              opacity: connectingFrom && !isConnecting && !isConnectTarget ? 0.4 : 1
            }}
            onMouseDown={(e) => {
              if (!connectingFrom) handleMouseDown(e, node);
            }}
            onMouseEnter={() => setHoveredModel(model.id)}
            onMouseLeave={() => setHoveredModel(null)}
            onClick={(e) => {
              e.stopPropagation();
              
              if (connectingFrom) {
                if (connectingFrom !== model.id) {
                  completeConnection(model.id);
                }
              } else {
                setSelectedModel(selectedModel === model.id ? null : model.id);
              }
            }}
          >
            {/* Model Node */}
            <div 
              className={`
                flex flex-col items-center
                ${isHighlighted || isConnecting 
                  ? 'scale-125' 
                  : isConnectTarget 
                    ? 'scale-110 ring-2 ring-blue-400 dark:ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800' 
                    : 'scale-100'}
                transition-all duration-300
              `}
            >
              {/* Connection Indicator */}
              {hasConnections && (
                <div className="absolute -top-2 -right-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs px-1.5 py-0.5 flex items-center">
                  <ArrowsRightLeftIcon className="h-3 w-3 mr-0.5" />
                  {((connectionMap[model.id]?.to?.length) || 0) + 
                   ((connectionMap[model.id]?.from?.length) || 0)}
                </div>
              )}
              
              {/* Cube Icon */}
              <div className={`
                relative w-12 h-12 rounded-lg p-1
                flex items-center justify-center
                bg-gray-50 dark:bg-gray-800
                border-2 ${isHighlighted || isConnecting 
                  ? 'border-blue-400 dark:border-blue-600' 
                  : 'border-gray-200 dark:border-gray-700'}
                shadow-sm
              `}>
                <CubeIcon 
                  className="h-8 w-8" 
                  style={{ color: getModelColor(model.id) }} 
                />
                
                {/* Model Label */}
                <div className="absolute -bottom-6 whitespace-nowrap text-xs font-medium px-2 py-0.5 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                  {model.name}
                </div>
              </div>
              
              {/* Connect Button */}
              {!connectingFrom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startConnecting(model.id);
                  }}
                  className="absolute -right-2 -bottom-2 bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600 transition-colors shadow-sm"
                  title={t('models.createConnection', 'Создать связь')}
                >
                  <PlusCircleIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
      
      {/* No models or loading state */}
      {networkNodes.length === 0 && hasModels && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-blue-500 mx-auto mb-3"></div>
            <p>{t('common.calculatingLayout', 'Расчет расположения...')}</p>
          </div>
        </div>
      )}
      
      {/* Selected model details panel */}
      {selectedModel && (
        <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex justify-between items-start">
            <div className="flex space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 flex items-center justify-center">
                  <CubeIcon className="h-10 w-10" style={{ color: getModelColor(selectedModel) }} />
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-lg text-gray-900 dark:text-white flex items-center">
                  {models.find(m => m.id === selectedModel)?.name}
                </h3>
                
                <div className="flex mt-1 text-sm text-gray-500 dark:text-gray-400 items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span>
                    {formatDuration(models.find(m => m.id === selectedModel)?.printing_time)}
                  </span>
                </div>
                
                <div className="mt-2 flex space-x-2">
                  <Link to={`/models/${selectedModel}`}>
                    <Button size="xs" variant="primary">
                      {t('common.view', 'Просмотр')}
                    </Button>
                  </Link>
                  <Button 
                    size="xs" 
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20"
                    onClick={() => {
                      onDeleteClick(models.find(m => m.id === selectedModel));
                      setSelectedModel(null);
                    }}
                  >
                    {t('common.delete', 'Удалить')}
                  </Button>
                </div>
              </div>
            </div>
            
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              onClick={() => setSelectedModel(null)}
            >
              <span className="sr-only">{t('common.close', 'Закрыть')}</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Show connections */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Connections To */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center mb-2">
                <ArrowsRightLeftIcon className="h-4 w-4 mr-1 text-blue-500" />
                {t('models.connectsTo', 'Связи на')}
              </h4>
              
              <div className="flex flex-wrap gap-2">
                {connectionMap[selectedModel]?.to?.length > 0 ? (
                  connectionMap[selectedModel].to.map(targetId => {
                    const targetModel = models.find(m => m.id === targetId);
                    if (!targetModel) return null;
                    
                    return (
                      <div 
                        key={targetId}
                        className="flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-2 py-1 text-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
                        {targetModel.name}
                        <button
                          onClick={() => removeConnection(selectedModel, targetId)}
                          className="ml-1 p-0.5 text-blue-500 hover:text-red-500 dark:text-blue-400 dark:hover:text-red-400"
                          title={t('models.removeConnection', 'Удалить связь')}
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('models.noOutgoingConnections', 'Нет исходящих связей')}
                  </div>
                )}
              </div>
            </div>
            
            {/* Connections From */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center mb-2">
                <ArrowsRightLeftIcon className="h-4 w-4 mr-1 text-purple-500" />
                {t('models.connectedFrom', 'Связи от')}
              </h4>
              
              <div className="flex flex-wrap gap-2">
                {connectionMap[selectedModel]?.from?.length > 0 ? (
                  connectionMap[selectedModel].from.map(sourceId => {
                    const sourceModel = models.find(m => m.id === sourceId);
                    if (!sourceModel) return null;
                    
                    return (
                      <div 
                        key={sourceId}
                        className="flex items-center bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full px-2 py-1 text-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5"></span>
                        {sourceModel.name}
                        <button
                          onClick={() => removeConnection(sourceId, selectedModel)}
                          className="ml-1 p-0.5 text-purple-500 hover:text-red-500 dark:text-purple-400 dark:hover:text-red-400"
                          title={t('models.removeConnection', 'Удалить связь')}
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('models.noIncomingConnections', 'Нет входящих связей')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelNetworkView; 