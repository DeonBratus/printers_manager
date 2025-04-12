import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPrintings } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';

const PrintingsList = () => {
  const [printings, setPrintings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPrintings = async () => {
      try {
        const response = await getPrintings();
        setPrintings(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching print jobs:', error);
        setLoading(false);
      }
    };
    
    fetchPrintings();
  }, []);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Print Jobs</h1>
        <Link to="/printers">
          <Button>Start New Print</Button>
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left font-medium text-gray-600">ID</th>
              <th className="py-3 px-4 text-left font-medium text-gray-600">Printer</th>
              <th className="py-3 px-4 text-left font-medium text-gray-600">Model</th>
              <th className="py-3 px-4 text-left font-medium text-gray-600">Status</th>
              <th className="py-3 px-4 text-left font-medium text-gray-600">Started</th>
              <th className="py-3 px-4 text-left font-medium text-gray-600">Completed</th>
              <th className="py-3 px-4 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {printings.length > 0 ? (
              printings.map(printing => (
                <tr key={printing.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">{printing.id}</td>
                  <td className="py-3 px-4">
                    <Link to={`/printers/${printing.printer_id}`} className="text-blue-600 hover:text-blue-800">
                      {printing.printer ? printing.printer.name : `Printer #${printing.printer_id}`}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/models/${printing.model_id}`} className="text-blue-600 hover:text-blue-800">
                      {printing.model ? printing.model.name : `Model #${printing.model_id}`}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={printing.status} />
                  </td>
                  <td className="py-3 px-4">{formatDate(printing.start_time)}</td>
                  <td className="py-3 px-4">{formatDate(printing.real_time_stop)}</td>
                  <td className="py-3 px-4">
                    <Link to={`/printings/${printing.id}`}>
                      <Button variant="secondary" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-8 text-center text-gray-500">
                  No print jobs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrintingsList; 