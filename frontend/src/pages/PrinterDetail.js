import React from 'react';
import { useParams } from 'react-router-dom';

const PrinterDetail = () => {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Printer Details</h1>
      <p className="text-gray-600">Details for printer ID: {id}</p>
    </div>
  );
};

export default PrinterDetail; 