import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ForgotPasswordPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError(t('auth.forgotPassword.invalidEmail'));
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/forgot-password`, { 
        email,
        language: i18n.language 
      });
      toast.success(t('auth.forgotPassword.success'));
      // Redirect directly to reset password page
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || t('auth.forgotPassword.sendError');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header showAuth={false} />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <button
          onClick={() => navigate('/login')}
          className="mb-4 sm:mb-6 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 minimal-card hover:shadow-lg transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>

        <div className="minimal-card p-6 sm:p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.forgotPassword.title')}</h2>
            <p className="text-gray-600">{t('auth.forgotPassword.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`minimal-input w-full ${
                  email && !validateEmail(email) ? 'border-red-500' : ''
                }`}
                placeholder="example@mail.com"
              />
              {email && !validateEmail(email) && (
                <p className="text-xs text-red-500 mt-1">{t('auth.forgotPassword.invalidEmail')}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !validateEmail(email)}
              className="w-full px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                t('auth.forgotPassword.sending')
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {t('auth.forgotPassword.submit')}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              {t('auth.forgotPassword.rememberPassword')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
