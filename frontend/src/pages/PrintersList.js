import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPrinters, createPrinter, deletePrinter } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';

const PrintersList = () => {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newPrinter, setNewPrinter] = useState({ name: '' });

  const fetchPrinters = async () => {
    try {
      const response = await getPrinters();
      setPrinters(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching printers:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  const handleInputChange = (e) => {
    setNewPrinter({ ...newPrinter, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPrinter(newPrinter);
      setNewPrinter({ name: '' });
      setShowForm(false);
      fetchPrinters();
    } catch (error) {
      console.error('Error creating printer:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this printer?')) {
      try {
        await deletePrinter(id);
        fetchPrinters();
      } catch (error) {
        console.error('Error deleting printer:', error);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Printers</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add New Printer'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Add New Printer</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Printer Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={newPrinter.name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save Printer</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {printers.map((printer) => (
          <Card key={printer.id} className="p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">
                  <Link to={`/printers/${printer.id}`} className="text-blue-600 hover:text-blue-800">
                    {printer.name}
                  </Link>
                </h3>
                <div className="mt-2 flex items-center">
                  <StatusBadge status={printer.status} />
                </div>
                <div className="mt-4 space-y-1 text-sm text-gray-500">
                  <p>Total Print Time: {Math.round(printer.total_print_time / 60)} hours</p>
                  <p>Total Downtime: {Math.round(printer.total_downtime / 60)} hours</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Link to={`/printers/${printer.id}`}>
                  <Button variant="secondary" size="sm">
                    View
                  </Button>
                </Link>
                <Button variant="danger" size="sm" onClick={() => handleDelete(printer.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {printers.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No printers found. Add your first printer to get started.</p>
        </Card>
      )}
    </div>
  );
};

export default PrintersList; 