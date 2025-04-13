import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PrintersList from './pages/PrintersList';
import PrinterDetail from './pages/PrinterDetail';
import ModelsList from './pages/ModelsList';
import ModelDetail from './pages/ModelDetail';
import PrintingsList from './pages/PrintingsList';
import PrintingDetail from './pages/PrintingDetail';
import Reports from './pages/Reports';
import ApiDebug from './pages/ApiDebug';
import UserSettings from './pages/UserSettings';
import HelpSupport from './pages/HelpSupport';
import './index.css';

const App = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/printers" element={<PrintersList />} />
          <Route path="/printers/:id" element={<PrinterDetail />} />
          <Route path="/models" element={<ModelsList />} />
          <Route path="/models/:id" element={<ModelDetail />} />
          <Route path="/printings" element={<PrintingsList />} />
          <Route path="/printings/:id" element={<PrintingDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/debug" element={<ApiDebug />} />
          <Route path="/settings" element={<UserSettings />} />
          <Route path="/help" element={<HelpSupport />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App; 