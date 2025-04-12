import React, { useState, useEffect } from 'react';
import { getPrinters, getPrintings, getPrinterStatusReport } from '../services/api';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const [printers, setPrinters] = useState([]);
  const [printings, setPrintings] = useState([]);
  const [statusReport, setStatusReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [printersRes, printingsRes, statusReportRes] = await Promise.all([
          getPrinters(),
          getPrintings(),
          getPrinterStatusReport()
        ]);
        
        setPrinters(printersRes.data);
        setPrintings(printingsRes.data.slice(0, 5)); // Get only 5 most recent printings
        setStatusReport(statusReportRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const printerStatusData = {
    labels: ['Idle', 'Printing', 'Paused', 'Error'],
    datasets: [
      {
        data: [
          printers.filter(p => p.status === 'idle').length,
          printers.filter(p => p.status === 'printing').length,
          printers.filter(p => p.status === 'paused').length,
          printers.filter(p => p.status === 'error').length,
        ],
        backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
      },
    ],
  };

  const printerEfficiencyData = statusReport ? {
    labels: statusReport.printers.map(p => p.name),
    datasets: [{
      label: 'Efficiency (%)',
      data: statusReport.printers.map(p => p.efficiency),
      backgroundColor: '#3B82F6',
    }]
  } : null;

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Printers Status</h2>
          <div className="h-64">
            <Pie data={printerStatusData} options={{ maintainAspectRatio: false }} />
          </div>
        </Card>
        
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Printer Efficiency</h2>
          {printerEfficiencyData && (
            <div className="h-64">
              <Bar 
                data={printerEfficiencyData} 
                options={{
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true, max: 100 } }
                }} 
              />
            </div>
          )}
        </Card>
        
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Printers Overview</h2>
          <div className="space-y-2">
            <p>Total Printers: {printers.length}</p>
            <p>Active Printers: {printers.filter(p => p.status === 'printing').length}</p>
            <p>Total Print Jobs: {printings.length}</p>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2">Recent Print Jobs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Printer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {printings.map((printing) => (
                <tr key={printing.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{printing.printer_name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{printing.model_name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(printing.start_time).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <StatusBadge status={printing.status} />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${printing.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs">{Math.round(printing.progress)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard; 