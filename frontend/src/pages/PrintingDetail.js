import React from 'react';
import { useParams } from 'react-router-dom';

const PrintingDetail = () => {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Print Job Details</h1>
      <p className="text-gray-600">Details for print job ID: {id}</p>
    </div>
  );
};

export default PrintingDetail; 