import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPrinting, getPrinter, getModel } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import { format, differenceInMinutes } from 'date-fns';

const PrintingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [printing, setPrinting] = useState(null);
  const [printer, setPrinter] = useState(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const printingRes = await getPrinting(id);
        setPrinting(printingRes.data);
        
        // Fetch related data
        const [printerRes, modelRes] = await Promise.all([
          getPrinter(printingRes.data.printer_id),
          getModel(printingRes.data.model_id)
        ]);
        
        setPrinter(printerRes.data);
        setModel(modelRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching printing details:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    return format(new Date(dateString), 'MMM d, yyyy HH:mm:ss');
  };
  
  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'In progress';
    
    const minutes = differenceInMinutes(
      new Date(endDate),
      new Date(startDate)
    );
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }
  
  if (!printing) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Print Job Not Found</h2>
        <p className="text-gray-600 mb-6">The print job you are looking for does not exist or has been removed.</p>
        <Button onClick={() => navigate('/printings')}>Back to Print Jobs</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Print Job #{printing.id}</h1>
          <p className="text-gray-600">Started on {formatDate(printing.start_time)}</p>
        </div>
        <Button onClick={() => navigate('/printings')} variant="secondary">
          Back to List
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Job Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <StatusBadge status={printing.status} />
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Start Time:</span>
              <span>{formatDate(printing.start_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">End Time:</span>
              <span>{formatDate(printing.real_time_stop)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Duration:</span>
              <span>{calculateDuration(printing.start_time, printing.real_time_stop)}</span>
            </div>
            {printing.pause_time && (
              <div className="flex justify-between">
                <span className="font-medium">Paused At:</span>
                <span>{formatDate(printing.pause_time)}</span>
              </div>
            )}
          </div>
        </Card>
        
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Printer & Model</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Printer:</span>
              {printer ? (
                <Link to={`/printers/${printer.id}`} className="text-blue-600 hover:text-blue-800">
                  {printer.name}
                </Link>
              ) : (
                <span>Printer #{printing.printer_id}</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Model:</span>
              {model ? (
                <Link to={`/models/${model.id}`} className="text-blue-600 hover:text-blue-800">
                  {model.name}
                </Link>
              ) : (
                <span>Model #{printing.model_id}</span>
              )}
            </div>
            {model && (
              <>
                <div className="flex justify-between">
                  <span className="font-medium">Expected Print Time:</span>
                  <span>{Math.round(model.printing_time / 60)} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Material:</span>
                  <span>{model.material}</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PrintingDetail; 