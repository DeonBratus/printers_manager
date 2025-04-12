import React, { useState, useEffect } from 'react';
import { getPrinterStatusReport, getPrintingEfficiencyReport } from '../services/api';
import Card from '../components/Card';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title,
  PointElement,
  LineElement
} from 'chart.js';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  PointElement,
  LineElement
);

const Reports = () => {
  const [statusReport, setStatusReport] = useState(null);
  const [efficiencyReport, setEfficiencyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week'); // 'day', 'week', 'month'

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const [statusRes, efficiencyRes] = await Promise.all([
          getPrinterStatusReport(),
          getPrintingEfficiencyReport()
        ]);
        
        setStatusReport(statusRes.data);
        setEfficiencyReport(efficiencyRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading report data:', error);
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  // Chart data based on available backend data
  const printerStatusData = statusReport ? {
    labels: ['Idle', 'Printing', 'Paused', 'Error'],
    datasets: [
      {
        label: 'Printer Status',
        data: [
          statusReport.status_counts.idle || 0,
          statusReport.status_counts.printing || 0,
          statusReport.status_counts.paused || 0,
          statusReport.status_counts.error || 0,
        ],
        backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
      },
    ],
  } : null;

  const printerEfficiencyData = statusReport && statusReport.printers ? {
    labels: statusReport.printers.map(p => p.name),
    datasets: [{
      label: 'Efficiency (%)',
      data: statusReport.printers.map(p => p.efficiency),
      backgroundColor: '#3B82F6',
    }]
  } : null;

  const printingVolumeData = efficiencyReport && efficiencyReport.daily_printings ? {
    labels: Object.keys(efficiencyReport.daily_printings).slice(-7),
    datasets: [{
      label: 'Number of Printings',
      data: Object.values(efficiencyReport.daily_printings).slice(-7),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      tension: 0.1
    }]
  } : null;

  const downTimeData = efficiencyReport && efficiencyReport.downtime_by_printer ? {
    labels: Object.keys(efficiencyReport.downtime_by_printer),
    datasets: [{
      label: 'Downtime (Hours)',
      data: Object.values(efficiencyReport.downtime_by_printer).map(val => Math.round(val / 60 * 10) / 10),
      backgroundColor: '#F59E0B',
    }]
  } : null;

  const getTimeframeTitle = () => {
    switch(timeframe) {
      case 'day': return 'Daily Report';
      case 'week': return 'Weekly Report';
      case 'month': return 'Monthly Report';
      default: return 'Report';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 rounded-md ${timeframe === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTimeframe('day')}
          >
            Day
          </button>
          <button 
            className={`px-3 py-1 rounded-md ${timeframe === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTimeframe('week')}
          >
            Week
          </button>
          <button 
            className={`px-3 py-1 rounded-md ${timeframe === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTimeframe('month')}
          >
            Month
          </button>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-700">{getTimeframeTitle()}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {printerStatusData && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Printer Status Distribution</h3>
            <div className="h-64">
              <Pie data={printerStatusData} options={{ maintainAspectRatio: false }} />
            </div>
          </Card>
        )}

        {printerEfficiencyData && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Printer Efficiency</h3>
            <div className="h-64">
              <Bar 
                data={printerEfficiencyData} 
                options={{
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true, max: 100 } }
                }} 
              />
            </div>
          </Card>
        )}

        {printingVolumeData && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Printing Volume</h3>
            <div className="h-64">
              <Line 
                data={printingVolumeData} 
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0
                      }
                    }
                  }
                }} 
              />
            </div>
          </Card>
        )}

        {downTimeData && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Printer Downtime</h3>
            <div className="h-64">
              <Bar 
                data={downTimeData} 
                options={{
                  maintainAspectRatio: false,
                }} 
              />
            </div>
          </Card>
        )}
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Analytics Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-md">
            <div className="text-sm text-blue-500 font-medium">Total Printers</div>
            <div className="mt-1 text-2xl font-semibold">{statusReport?.total_printers || 0}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-md">
            <div className="text-sm text-green-500 font-medium">Active Print Jobs</div>
            <div className="mt-1 text-2xl font-semibold">{statusReport?.status_counts?.printing || 0}</div>
          </div>
          <div className="p-4 bg-amber-50 rounded-md">
            <div className="text-sm text-amber-500 font-medium">Total Print Jobs</div>
            <div className="mt-1 text-2xl font-semibold">{efficiencyReport?.total_printings || 0}</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-md">
            <div className="text-sm text-purple-500 font-medium">Avg. Efficiency</div>
            <div className="mt-1 text-2xl font-semibold">
              {statusReport?.average_efficiency 
                ? `${Math.round(statusReport.average_efficiency)}%` 
                : 'N/A'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Reports; 