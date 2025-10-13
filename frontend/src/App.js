import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useTranslation } from 'react-i18next';
import './i18n';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreateContractPage from './pages/CreateContractPage';
import ContractDetailsPage from './pages/ContractDetailsPage';
import SignContractPage from './pages/SignContractPage';
import AdminPage from './pages/AdminPage';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const { i18n } = useTranslation();
  
  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'ru';
    i18n.changeLanguage(savedLang);
    document.documentElement.lang = savedLang;
  }, [i18n]);

  return (
    <div className="App min-h-screen bg-white">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/contracts/create" element={<PrivateRoute><CreateContractPage /></PrivateRoute>} />
          <Route path="/contracts/:id" element={<PrivateRoute><ContractDetailsPage /></PrivateRoute>} />
          <Route path="/sign/:id" element={<SignContractPage />} />
          <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;