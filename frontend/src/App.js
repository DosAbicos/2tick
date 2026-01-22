import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import './i18n';
import './styles/mobile.css';
import NewLandingPage from './pages/NewLandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyRegistrationPage from './pages/VerifyRegistrationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import CreateContractPage from './pages/CreateContractPage';
import ContractDetailsPage from './pages/ContractDetailsPage';
import SignContractPage from './pages/SignContractPage';
import AdminPage from './pages/AdminPage';
import NotificationsAdminPage from './pages/NotificationsAdminPage';
import UserLogsPage from './pages/UserLogsPage';
import ProfilePage from './pages/ProfilePage';
import TemplatesPage from './pages/TemplatesPage';
import UploadPdfContractPage from './pages/UploadPdfContractPage';
import AdminTemplatesPage from './pages/AdminTemplatesPage';
import OfferPage from './pages/OfferPage';
import PrivacyPage from './pages/PrivacyPage';
import RefundPage from './pages/RefundPage';
import ContactsPage from './pages/ContactsPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailurePage from './pages/PaymentFailurePage';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

// Redirect to dashboard if user is already logged in
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/dashboard" /> : children;
};

// Landing page - redirect to dashboard if logged in
const LandingRoute = () => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/dashboard" /> : <NewLandingPage />;
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
          {/* Landing - redirect to dashboard if logged in */}
          <Route path="/" element={<LandingRoute />} />
          
          {/* Auth pages - redirect to dashboard if already logged in */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/verify-registration/:registration_id" element={<VerifyRegistrationPage />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/contracts/create" element={<PrivateRoute><CreateContractPage /></PrivateRoute>} />
          <Route path="/contracts/upload-pdf" element={<PrivateRoute><UploadPdfContractPage /></PrivateRoute>} />
          <Route path="/contracts/:id" element={<PrivateRoute><ContractDetailsPage /></PrivateRoute>} />
          <Route path="/templates" element={<PrivateRoute><TemplatesPage /></PrivateRoute>} />
          <Route path="/sign/:id" element={<SignContractPage />} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
          <Route path="/admin/notifications" element={<PrivateRoute><NotificationsAdminPage /></PrivateRoute>} />
          <Route path="/admin/logs/:userId" element={<PrivateRoute><UserLogsPage /></PrivateRoute>} />
          <Route path="/admin/templates" element={<PrivateRoute><AdminTemplatesPage /></PrivateRoute>} />
          
          {/* Public info pages */}
          <Route path="/offer" element={<OfferPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/refund" element={<RefundPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/failure" element={<PaymentFailurePage />} />
        </Routes>
      </BrowserRouter>
      {/* Toast notifications for errors/success */}
      <Toaster 
        position="top-center" 
        richColors 
        closeButton
        duration={4000}
      />
    </div>
  );
}

export default App;