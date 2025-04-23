import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from './Card';
import Button from './Button';
import { getModels, getModel, getRelatedModels, addModelRelation, removeModelRelation } from '../services/api';
import { CubeIcon, PlusIcon, XMarkIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const ModelRelations = ({ modelId, studioId }) => {
  const { t } = useTranslation();
  const [relatedTo, setRelatedTo] = useState([]);
  const [relatedFrom, setRelatedFrom] = useState([]);
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
        
        // Get current model with all relationships
        const modelRes = await getModel(modelId);
        const currentModel = modelRes.data;
        
        // Set related models in both directions
        setRelatedTo(currentModel.related_to || []);
        setRelatedFrom(currentModel.related_from || []);
        
        // Get all available models for the studio (for adding new relationships)
        const allModelsRes = await getModels(studioId);
        
        // Filter out the current model and existing related models (in both directions)
        const allRelatedIds = [
          ...(currentModel.related_to || []).map(model => model.id),
          ...(currentModel.related_from || []).map(model => model.id)
        ];
        
        const filtered = allModelsRes.data.filter(model => 
          model.id !== parseInt(modelId) && 
          !allRelatedIds.includes(model.id)
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
  
  const handleAddRelation = async () => {
    if (!selectedModelId) return;
    
    try {
      // Create a relationship between models
      await addModelRelation(modelId, selectedModelId);
      
      // Refresh model data to get updated relationships
      const modelRes = await getModel(modelId);
      const currentModel = modelRes.data;
      
      // Update state with new relationships
      setRelatedTo(currentModel.related_to || []);
      setRelatedFrom(currentModel.related_from || []);
      
      // Update available models list
      const allModelsRes = await getModels(studioId);
      const allRelatedIds = [
        ...(currentModel.related_to || []).map(model => model.id),
        ...(currentModel.related_from || []).map(model => model.id)
      ];
      
      const filtered = allModelsRes.data.filter(model => 
        model.id !== parseInt(modelId) && 
        !allRelatedIds.includes(model.id)
      );
      
      setAvailableModels(filtered);
      
      // Reset form
      setSelectedModelId('');
      setAddMode(false);
    } catch (err) {
      console.error('Error adding related model:', err);
      setError(t('models.addRelationError'));
    }
  };
  
  const handleRemoveRelation = async (relatedModelId, isFromRelation = false) => {
    try {
      // For related_from relationships, we need to remove the relation from the other side
      const sourceId = isFromRelation ? relatedModelId : modelId;
      const targetId = isFromRelation ? modelId : relatedModelId;
      
      // Remove relationship between models
      await removeModelRelation(sourceId, targetId);
      
      // Refresh model data to get updated relationships
      const modelRes = await getModel(modelId);
      const currentModel = modelRes.data;
      
      // Update state with new relationships
      setRelatedTo(currentModel.related_to || []);
      setRelatedFrom(currentModel.related_from || []);
      
      // Update available models list
      const allModelsRes = await getModels(studioId);
      const allRelatedIds = [
        ...(currentModel.related_to || []).map(model => model.id),
        ...(currentModel.related_from || []).map(model => model.id)
      ];
      
      const filtered = allModelsRes.data.filter(model => 
        model.id !== parseInt(modelId) && 
        !allRelatedIds.includes(model.id)
      );
      
      setAvailableModels(filtered);
    } catch (err) {
      console.error('Error removing related model:', err);
      setError(t('models.removeRelationError'));
    }
  };
  
  const renderModelItem = (model, relationType = null) => (
    <div 
      key={model.id} 
      className="flex items-center justify-between p-3 border-b dark:border-gray-700 last:border-0"
    >
      <div className="flex items-center">
        <CubeIcon className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" />
        <div className="flex items-center">
          {relationType === 'from' && (
            <ArrowLeftIcon className="h-4 w-4 text-purple-500 mr-2" title={t('models.relatedFrom')} />
          )}
          {relationType === 'to' && (
            <ArrowRightIcon className="h-4 w-4 text-green-500 mr-2" title={t('models.relatedTo')} />
          )}
          <Link 
            to={`/models/${model.id}`}
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {model.name}
          </Link>
        </div>
      </div>
      
      {relationType && (
        <button
          onClick={() => handleRemoveRelation(model.id, relationType === 'from')}
          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full"
          title={t('models.removeRelation')}
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
  
  // Combine all relations for display
  const hasRelations = relatedTo.length > 0 || relatedFrom.length > 0;
  
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('models.modelRelations')}</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}
      
      {/* Related models section */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-md font-medium dark:text-gray-300">{t('models.relatedModels')}</h4>
          {!addMode && (
            <button
              onClick={() => setAddMode(true)}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('models.addRelation')}
            </button>
          )}
        </div>
        
        {addMode && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="mb-3">
              <label htmlFor="relatedModel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('models.selectRelated')}
              </label>
              <select
                id="relatedModel"
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
                onClick={handleAddRelation}
                disabled={!selectedModelId}
              >
                {t('common.add')}
              </Button>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {hasRelations ? (
            <div>
              {/* Related To section */}
              {relatedTo.length > 0 && (
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <h5 className="text-sm font-medium p-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    {t('models.relatedToThis')}
                  </h5>
                  {relatedTo.map(model => renderModelItem(model, 'to'))}
                </div>
              )}
              
              {/* Related From section */}
              {relatedFrom.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium p-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    {t('models.relatedFromThis')}
                  </h5>
                  {relatedFrom.map(model => renderModelItem(model, 'from'))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-gray-500 dark:text-gray-400">
              {t('models.noRelations')}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ModelRelations; 