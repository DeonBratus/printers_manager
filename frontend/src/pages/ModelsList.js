import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getModels, createModel, deleteModel } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';

const ModelsList = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', printing_time: '' });

  const fetchModels = async () => {
    try {
      const response = await getModels();
      setModels(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching models:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleInputChange = (e) => {
    setNewModel({ ...newModel, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert printing_time to minutes for API
      const modelData = {
        ...newModel,
        printing_time: parseFloat(newModel.printing_time) * 60 // Convert hours to minutes
      };
      
      await createModel(modelData);
      setNewModel({ name: '', printing_time: '' });
      setShowForm(false);
      fetchModels();
    } catch (error) {
      console.error('Error creating model:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this model?')) {
      try {
        await deleteModel(id);
        fetchModels();
      } catch (error) {
        console.error('Error deleting model:', error);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">3D Models</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add New Model'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Add New Model</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Model Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={newModel.name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="printing_time" className="block text-sm font-medium text-gray-700">
                Printing Time (hours)
              </label>
              <input
                type="number"
                id="printing_time"
                name="printing_time"
                value={newModel.printing_time}
                onChange={handleInputChange}
                required
                min="0.1"
                step="0.1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save Model</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <Card key={model.id} className="p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">
                  <Link to={`/models/${model.id}`} className="text-blue-600 hover:text-blue-800">
                    {model.name}
                  </Link>
                </h3>
                <div className="mt-2 text-sm text-gray-500">
                  <p>Printing Time: {Math.round(model.printing_time / 60 * 10) / 10} hours</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Link to={`/models/${model.id}`}>
                  <Button variant="secondary" size="sm">
                    View
                  </Button>
                </Link>
                <Button variant="danger" size="sm" onClick={() => handleDelete(model.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {models.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No models found. Add your first 3D model to get started.</p>
        </Card>
      )}
    </div>
  );
};

export default ModelsList; 