import React, { useState, useEffect } from 'react';
import { getPrinters, getModels, getPrintings, getPrinterStatusReport } from '../services/api';
import Card from '../components/Card';
import { useTranslation } from 'react-i18next';

const ApiDebug = () => {
  const { t } = useTranslation();
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testEndpoints = async () => {
      setLoading(true);
      setError(null);
      const endpoints = {
        printers: { fn: getPrinters, data: null, error: null },
        models: { fn: getModels, data: null, error: null },
        printings: { fn: getPrintings, data: null, error: null },
        reports: { fn: getPrinterStatusReport, data: null, error: null }
      };

      for (const [name, endpoint] of Object.entries(endpoints)) {
        try {
          console.log(`Testing endpoint: ${name}`);
          const response = await endpoint.fn();
          console.log(`Response for ${name}:`, response);
          endpoints[name].data = response.data;
        } catch (err) {
          console.error(`Error testing ${name}:`, err);
          endpoints[name].error = err.message;
          if (err.response) {
            endpoints[name].status = err.response.status;
            endpoints[name].statusText = err.response.statusText;
            endpoints[name].responseData = err.response.data;
          }
        }
      }

      setResults(endpoints);
      setLoading(false);
    };

    testEndpoints();
  }, []);

  const retryEndpoints = () => {
    setResults({});
    setLoading(true);
  };

  if (loading) {
    return <div className="p-4">{t('debug.testing')}</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('debug.title')}</h1>
        <button 
          onClick={retryEndpoints}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {t('debug.retry')}
        </button>
      </div>

      {Object.entries(results).map(([name, endpoint]) => (
        <Card key={name} className="p-4">
          <h2 className="text-lg font-semibold mb-2">{t('debug.endpoint')}: {name}</h2>
          {endpoint.error ? (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-red-600 font-medium">{t('debug.error')}: {endpoint.error}</p>
              {endpoint.status && (
                <p className="text-red-500">{t('debug.status')}: {endpoint.status} ({endpoint.statusText})</p>
              )}
              {endpoint.responseData && (
                <pre className="mt-2 text-sm overflow-auto max-h-40 bg-gray-50 p-2 rounded">
                  {JSON.stringify(endpoint.responseData, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 p-3 rounded">
              <p className="text-green-600 font-medium">{t('debug.status')}: {t('debug.success')}</p>
              <div className="mt-2">
                <p className="text-sm text-gray-700 mb-1">{t('debug.responseData')}:</p>
                <pre className="text-sm overflow-auto max-h-40 bg-gray-50 p-2 rounded">
                  {JSON.stringify(endpoint.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default ApiDebug; 