import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPrinter, updatePrinter, getPrintings, getModels, startPrinter, pausePrinter, resumePrinter, stopPrinter } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';

const PrinterDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [printer, setPrinter] = useState(null);
  const [printings, setPrintings] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '' });
  const [startForm, setStartForm] = useState({ model_id: '' });
  const [showStartForm, setShowStartForm] = useState(false);

  const fetchPrinterData = useCallback(async () => {
    try {
      const [printerRes, printingsRes, modelsRes] = await Promise.all([
        getPrinter(id),
        getPrintings(),
        getModels()
      ]);
      
      setPrinter(printerRes.data);
      setEditForm({ name: printerRes.data.name });
      
      // Filter printings for this printer
      const printerPrintings = printingsRes.data.filter(
        printing => printing.printer_id === parseInt(id)
      );
      setPrintings(printerPrintings);
      
      setModels(modelsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching printer data:', error);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPrinterData();
  }, [fetchPrinterData]);

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updatePrinter(id, editForm);
      setEditing(false);
      fetchPrinterData();
    } catch (error) {
      console.error('Error updating printer:', error);
    }
  };

  const handleStartChange = (e) => {
    setStartForm({ ...startForm, [e.target.name]: e.target.value });
  };

  const handleStart = async (e) => {
    e.preventDefault();
    try {
      await startPrinter(id, startForm);
      setShowStartForm(false);
      fetchPrinterData();
    } catch (error) {
      console.error('Error starting print job:', error);
    }
  };

  const handlePause = async () => {
    try {
      await pausePrinter(id);
      fetchPrinterData();
    } catch (error) {
      console.error('Error pausing printer:', error);
    }
  };

  const handleResume = async () => {
    try {
      await resumePrinter(id);
      fetchPrinterData();
    } catch (error) {
      console.error('Error resuming printer:', error);
    }
  };

  const handleStop = async () => {
    if (window.confirm('Are you sure you want to stop the current print job?')) {
      try {
        await stopPrinter(id);
        fetchPrinterData();
      } catch (error) {
        console.error('Error stopping printer:', error);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!printer) {
    return <div className="text-center py-8">Printer not found</div>;
  }

  // Find current printing job if exists
  const currentPrinting = printings.find(p => 
    (p.status === 'printing' || p.status === 'paused') && 
    p.printer_id === parseInt(id)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{printer.name}</h1>
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
          <h2 className="text-lg font-semibold mb-4">Edit Printer</h2>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Printer Name
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
            <div className="flex justify-end">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Printer Details</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Status:</span> <StatusBadge status={printer.status} /></p>
                <p><span className="font-medium">Total Print Time:</span> {Math.round(printer.total_print_time / 60)} hours</p>
                <p><span className="font-medium">Total Downtime:</span> {Math.round(printer.total_downtime / 60)} hours</p>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-2">Printer Control</h2>
              <div className="flex flex-wrap gap-2">
                {printer.status === 'idle' && (
                  <Button onClick={() => setShowStartForm(!showStartForm)}>
                    Start New Print
                  </Button>
                )}
                {printer.status === 'printing' && (
                  <>
                    <Button onClick={handlePause} variant="warning">
                      Pause
                    </Button>
                    <Button onClick={handleStop} variant="danger">
                      Stop
                    </Button>
                  </>
                )}
                {printer.status === 'paused' && (
                  <>
                    <Button onClick={handleResume} variant="primary">
                      Resume
                    </Button>
                    <Button onClick={handleStop} variant="danger">
                      Stop
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {showStartForm && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Start New Print</h2>
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label htmlFor="model_id" className="block text-sm font-medium text-gray-700">
                Select Model
              </label>
              <select
                id="model_id"
                name="model_id"
                value={startForm.model_id}
                onChange={handleStartChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">-- Select a Model --</option>
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.printing_time / 60} hours)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Start Print</Button>
            </div>
          </form>
        </Card>
      )}

      {currentPrinting && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Current Print Job</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><span className="font-medium">Model:</span> {currentPrinting.model_name}</p>
                <p><span className="font-medium">Start Time:</span> {new Date(currentPrinting.start_time).toLocaleString()}</p>
                <p>
                  <span className="font-medium">Expected Finish:</span> {' '}
                  {currentPrinting.calculated_time_stop && new Date(currentPrinting.calculated_time_stop).toLocaleString()}
                </p>
                <p><span className="font-medium">Status:</span> <StatusBadge status={currentPrinting.status} /></p>
              </div>
              <div>
                <p><span className="font-medium">Progress:</span></p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${currentPrinting.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">{Math.round(currentPrinting.progress)}% complete</p>
                {currentPrinting.status === 'paused' && (
                  <p className="mt-2 text-amber-500">
                    <span className="font-medium">Paused at:</span> {currentPrinting.pause_time && new Date(currentPrinting.pause_time).toLocaleString()}
                  </p>
                )}
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Print Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Downtime</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {printings.filter(p => p.real_time_stop).map((printing) => (
                  <tr key={printing.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{printing.model_name}</td>
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
                      {Math.round(printing.printing_time / 60)} hours
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {Math.round(printing.downtime / 60)} hours
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No print history available.</p>
        )}
      </Card>
    </div>
  );
};

export default PrinterDetail; 