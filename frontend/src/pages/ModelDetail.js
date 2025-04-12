import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getModel, updateModel, getPrintings } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';

const ModelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState(null);
  const [printings, setPrintings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', printing_time: '' });

  const fetchModelData = useCallback(async () => {
    try {
      const [modelRes, printingsRes] = await Promise.all([
        getModel(id),
        getPrintings()
      ]);
      
      setModel(modelRes.data);
      // Convert minutes to hours for the form
      setEditForm({ 
        name: modelRes.data.name, 
        printing_time: (modelRes.data.printing_time / 60).toFixed(1) 
      });
      
      // Filter printings for this model
      const modelPrintings = printingsRes.data.filter(
        printing => printing.model_id === parseInt(id)
      );
      setPrintings(modelPrintings);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching model data:', error);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchModelData();
  }, [fetchModelData]);

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert hours back to minutes for API
      const modelData = {
        ...editForm,
        printing_time: parseFloat(editForm.printing_time) * 60
      };
      
      await updateModel(id, modelData);
      setEditing(false);
      fetchModelData();
    } catch (error) {
      console.error('Error updating model:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!model) {
    return <div className="text-center py-8">Model not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{model.name}</h1>
        <div className="flex space-x-3">
          <Button onClick={() => navigate(-1)} variant="secondary">
            Back
          </Button>
          <Button onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </div>

      {editing ? (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Edit Model</h2>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Model Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={editForm.name}
                onChange={handleEditChange}
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
                value={editForm.printing_time}
                onChange={handleEditChange}
                required
                min="0.1"
                step="0.1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Model Details</h2>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Printing Time:</span> {Math.round(model.printing_time / 60 * 10) / 10} hours
                </p>
                <p>
                  <span className="font-medium">Total Prints:</span> {printings.length}
                </p>
                <p>
                  <span className="font-medium">Completed Prints:</span> {printings.filter(p => p.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2">Print History</h2>
        {printings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Printer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Downtime</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {printings.map((printing) => (
                  <tr key={printing.id}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {printing.printer?.name || `Printer #${printing.printer_id}`}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(printing.start_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {printing.real_time_stop && new Date(printing.real_time_stop).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <StatusBadge status={printing.status} />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${printing.progress || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-xs">{Math.round(printing.progress || 0)}%</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {Math.round(printing.downtime / 60 * 10) / 10} hours
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No print history available for this model.</p>
        )}
      </Card>
    </div>
  );
};

export default ModelDetail; 