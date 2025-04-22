import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from './Card';
import Button from './Button';
import { getModels, getModel, updateModel } from '../services/api';
import { CubeIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const ModelRelations = ({ modelId, studioId }) => {
  const { t } = useTranslation();
  const [parentModel, setParentModel] = useState(null);
  const [childModels, setChildModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [addMode, setAddMode] = useState(false);
  
  // Fetch model data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current model
        const modelRes = await getModel(modelId);
        const currentModel = modelRes.data;
        
        // Get parent model if exists
        if (currentModel.parent_id) {
          try {
            const parentRes = await getModel(currentModel.parent_id);
            setParentModel(parentRes.data);
          } catch (err) {
            console.error('Failed to fetch parent model:', err);
          }
        }
        
        // Get child models
        const childrenRes = await getModels(studioId, modelId);
        setChildModels(childrenRes.data);
        
        // Get all available models for the studio (for adding new children)
        const allModelsRes = await getModels(studioId);
        
        // Filter out the current model and its children to prevent circular relationships
        const filtered = allModelsRes.data.filter(model => 
          model.id !== parseInt(modelId) && 
          !childModels.some(child => child.id === model.id)
        );
        
        setAvailableModels(filtered);
      } catch (err) {
        console.error('Error fetching model relations:', err);
        setError(t('models.fetchRelationsError'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [modelId, studioId, t]);
  
  const handleAddChild = async () => {
    if (!selectedModelId) return;
    
    try {
      // Update the selected model to set this model as its parent
      await updateModel(selectedModelId, {
        parent_id: parseInt(modelId),
        name: availableModels.find(m => m.id === parseInt(selectedModelId))?.name || '',
        printing_time: availableModels.find(m => m.id === parseInt(selectedModelId))?.printing_time || 0,
        studio_id: studioId
      });
      
      // Refresh the child models list
      const childrenRes = await getModels(studioId, modelId);
      setChildModels(childrenRes.data);
      
      // Update available models list
      const allModelsRes = await getModels(studioId);
      const filtered = allModelsRes.data.filter(model => 
        model.id !== parseInt(modelId) && 
        !childrenRes.data.some(child => child.id === model.id)
      );
      setAvailableModels(filtered);
      
      // Reset form
      setSelectedModelId('');
      setAddMode(false);
    } catch (err) {
      console.error('Error adding child model:', err);
      setError(t('models.addChildError'));
    }
  };
  
  const handleRemoveChild = async (childId) => {
    try {
      // Find the child model data
      const childModel = childModels.find(model => model.id === childId);
      if (!childModel) return;
      
      // Update the child model to remove parent reference
      await updateModel(childId, {
        parent_id: null,
        name: childModel.name,
        printing_time: childModel.printing_time,
        studio_id: childModel.studio_id
      });
      
      // Refresh the child models list
      const childrenRes = await getModels(studioId, modelId);
      setChildModels(childrenRes.data);
      
      // Update available models list
      const allModelsRes = await getModels(studioId);
      const filtered = allModelsRes.data.filter(model => 
        model.id !== parseInt(modelId) && 
        !childrenRes.data.some(child => child.id === model.id)
      );
      setAvailableModels(filtered);
    } catch (err) {
      console.error('Error removing child model:', err);
      setError(t('models.removeChildError'));
    }
  };
  
  const renderModelItem = (model, isChild = false) => (
    <div 
      key={model.id} 
      className="flex items-center justify-between p-3 border-b dark:border-gray-700 last:border-0"
    >
      <div className="flex items-center">
        <CubeIcon className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" />
        <div>
          <Link 
            to={`/models/${model.id}`}
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {model.name}
          </Link>
        </div>
      </div>
      
      {isChild && (
        <button
          onClick={() => handleRemoveChild(model.id)}
          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full"
          title={t('models.removeChild')}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
  
  if (loading) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('models.modelRelations')}</h3>
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          {t('common.loading')}
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('models.modelRelations')}</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}
      
      {/* Parent model section */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-2 dark:text-gray-300">{t('models.parentModel')}</h4>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {parentModel ? (
            renderModelItem(parentModel)
          ) : (
            <div className="p-4 text-gray-500 dark:text-gray-400">
              {t('models.noParent')}
            </div>
          )}
        </div>
      </div>
      
      {/* Child models section */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-md font-medium dark:text-gray-300">{t('models.childModels')}</h4>
          {!addMode && (
            <button
              onClick={() => setAddMode(true)}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('models.addChild')}
            </button>
          )}
        </div>
        
        {addMode && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="mb-3">
              <label htmlFor="childModel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('models.selectChild')}
              </label>
              <select
                id="childModel"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t('common.select')}</option>
                {availableModels.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setAddMode(false);
                  setSelectedModelId('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                onClick={handleAddChild}
                disabled={!selectedModelId}
              >
                {t('common.add')}
              </Button>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {childModels.length > 0 ? (
            childModels.map(model => renderModelItem(model, true))
          ) : (
            <div className="p-4 text-gray-500 dark:text-gray-400">
              {t('models.noChildren')}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ModelRelations; 