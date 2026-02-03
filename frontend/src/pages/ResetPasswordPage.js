import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import Header from '@/components/Header';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
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
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error(t('auth.resetPassword.invalidCode'));
      } else {
        toast.error(error.response?.data?.detail || t('auth.resetPassword.error'));
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header showAuth={false} />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <button
          onClick={() => navigate('/forgot-password')}
          className="mb-4 sm:mb-6 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 minimal-card hover:shadow-lg transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
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
                readOnly
                className="minimal-input w-full bg-gray-100 cursor-not-allowed"
                placeholder="example@mail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('auth.resetPassword.codeFromEmail')}
              </label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={resetCode} onChange={setResetCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
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
                success ||
                !email ||
                resetCode.length !== 6 ||
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword
              }
              className={`w-full px-6 py-3 text-white rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 ${
                success 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/30' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-blue-500/30'
              }`}
            >
              {success ? (
                <motion.div 
                  className="flex items-center gap-1"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0, duration: 0.3 }}
                  >
                    <Check className="w-6 h-6" />
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <Check className="w-6 h-6" />
                  </motion.div>
                </motion.div>
              ) : loading ? (
                t('auth.resetPassword.submitting')
              ) : (
                t('auth.resetPassword.submit')
              )}
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
