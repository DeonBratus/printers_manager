import React from 'react';
import { useParams } from 'react-router-dom';

const ModelDetail = () => {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Model Details</h1>
      <p className="text-gray-600">Details for model ID: {id}</p>
    </div>
  );
};

export default ModelDetail; 