import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { StudioProvider } from './context/StudioContext';
import Login from './pages/Login';
import Register from './pages/Register';
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
import StudioManagementPage from './pages/StudioManagementPage';
import './index.css';

const App = () => {
  return (
    <AuthProvider>
      <StudioProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              <Layout>
                <Login />
              </Layout>
            } />
            <Route path="/register" element={
              <Layout>
                <Register />
              </Layout>
            } />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/printers" element={
              <ProtectedRoute>
                <Layout>
                  <PrintersList />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/printers/:id" element={
              <ProtectedRoute>
                <Layout>
                  <PrinterDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/models" element={
              <ProtectedRoute>
                <Layout>
                  <ModelsList />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/models/:id" element={
              <ProtectedRoute>
                <Layout>
                  <ModelDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/printings" element={
              <ProtectedRoute>
                <Layout>
                  <PrintingsList />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/printings/:id" element={
              <ProtectedRoute>
                <Layout>
                  <PrintingDetail />
                </Layout>
              </ProtectedRoute>
            } />
            {/* Redirect /studios to /studios/manage */}
            <Route path="/studios" element={
              <Navigate to="/studios/manage" replace />
            } />
            <Route path="/studios/manage" element={
              <ProtectedRoute>
                <Layout>
                  <StudioManagementPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/debug" element={
              <ProtectedRoute>
                <Layout>
                  <ApiDebug />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout>
                  <UserSettings />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/help" element={
              <ProtectedRoute>
                <Layout>
                  <HelpSupport />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Redirect all other routes to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </StudioProvider>
    </AuthProvider>
  );
};

export default App; 