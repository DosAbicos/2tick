import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import Header from '@/components/Header';
import { ArrowLeft, CheckCircle2, Lock, Key } from 'lucide-react';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  
  const [email, setEmail] = useState(emailFromUrl);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t('auth.resetPassword.passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('auth.resetPassword.minPassword'));
      return;
    }

    if (resetCode.length !== 6) {
      toast.error(t('auth.resetPassword.enter6Digits'));
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/reset-password`, {
        email,
        reset_code: resetCode,
        new_password: newPassword
      });

      setSuccess(true);
      toast.success(t('auth.resetPassword.success'));
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error(t('auth.resetPassword.invalidCode'));
      } else {
        toast.error(error.response?.data?.detail || t('auth.resetPassword.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen gradient-bg">
        <Header showAuth={false} />
        
        <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <div className="minimal-card p-6 sm:p-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.resetPassword.passwordChanged')}</h2>
              <p className="text-gray-600">{t('auth.resetPassword.canLoginNow')}</p>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-800">
                {t('auth.resetPassword.successMessage')}
              </p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 font-medium"
            >
              {t('auth.resetPassword.goToLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Header showAuth={false} />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <button
          onClick={() => navigate('/forgot-password')}
          className="mb-6 px-4 py-2 text-gray-600 hover:text-blue-600 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.previous')}
        </button>

        <div className="minimal-card p-6 sm:p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.resetPassword.title')}</h2>
            <p className="text-gray-600">{t('auth.resetPassword.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="minimal-input w-full"
                placeholder="example@mail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Key className="w-4 h-4 inline mr-1" />
                {t('auth.resetPassword.codeFromEmail')}
              </label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={resetCode} onChange={setResetCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="neuro-input" />
                    <InputOTPSlot index={1} className="neuro-input" />
                    <InputOTPSlot index={2} className="neuro-input" />
                    <InputOTPSlot index={3} className="neuro-input" />
                    <InputOTPSlot index={4} className="neuro-input" />
                    <InputOTPSlot index={5} className="neuro-input" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.resetPassword.newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="minimal-input w-full"
                placeholder={t('auth.resetPassword.minChars')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.resetPassword.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`minimal-input w-full ${
                  confirmPassword && newPassword !== confirmPassword
                    ? 'border-red-500'
                    : confirmPassword && newPassword === confirmPassword
                    ? 'border-green-500'
                    : ''
                }`}
                placeholder={t('auth.resetPassword.repeatPassword')}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{t('auth.resetPassword.passwordMismatch')}</p>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword.length > 0 && (
                <p className="text-xs text-green-500 mt-1">{t('auth.resetPassword.passwordMatch')} ✓</p>
              )}
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !email ||
                resetCode.length !== 6 ||
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword
              }
              className="w-full px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
              {t('auth.resetPassword.noCode')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
