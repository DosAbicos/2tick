import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import Header from '@/components/Header';
import { CheckCircle, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VerifyRegistrationPage = () => {
  const { t } = useTranslation();
  const { registration_id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  
  // Verification method: 'sms', 'call', or 'telegram'
  const [verificationMethod, setVerificationMethod] = useState('');
  
  // SMS OTP
  const [otpValue, setOtpValue] = useState('');
  const [mockOtp, setMockOtp] = useState('');
  const [smsCooldown, setSmsCooldown] = useState(0);
  
  // Call OTP
  const [callCode, setCallCode] = useState('');
  const [callHint, setCallHint] = useState('');
  const [callCooldown, setCallCooldown] = useState(0);
  const [requestingCall, setRequestingCall] = useState(false);
  
  // Telegram OTP
  const [telegramCode, setTelegramCode] = useState('');
  const [telegramDeepLink, setTelegramDeepLink] = useState('');
  const [telegramCooldown, setTelegramCooldown] = useState(0);
  const [loadingTelegramLink, setLoadingTelegramLink] = useState(false);

  // Cooldown timers
  useEffect(() => {
    if (smsCooldown > 0) {
      const timer = setTimeout(() => setSmsCooldown(smsCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [smsCooldown]);

  useEffect(() => {
    if (callCooldown > 0) {
      const timer = setTimeout(() => setCallCooldown(callCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [callCooldown]);

  useEffect(() => {
    if (telegramCooldown > 0) {
      const timer = setTimeout(() => setTelegramCooldown(telegramCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [telegramCooldown]);

  // Pre-fetch Telegram deep link when page loads
  useEffect(() => {
    if (!telegramDeepLink && !loadingTelegramLink) {
      setLoadingTelegramLink(true);
      axios.get(`${API}/auth/registration/${registration_id}/telegram-deep-link`)
        .then(response => {
          setTelegramDeepLink(response.data.deep_link);
        })
        .catch(error => {
          console.error('Failed to pre-fetch Telegram link:', error);
        })
        .finally(() => {
          setLoadingTelegramLink(false);
        });
    }
  }, [registration_id, telegramDeepLink, loadingTelegramLink]);

  const handleRequestSMS = async () => {
    if (smsCooldown > 0) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/registration/${registration_id}/request-otp?method=sms`);
      setMockOtp(response.data.mock_otp || '');
      toast.success('SMS отправлено!');
      setVerificationMethod('sms');
      setSmsCooldown(60);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка отправки SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCall = async () => {
    if (callCooldown > 0) return;
    
    setRequestingCall(true);
    try {
      const response = await axios.post(`${API}/auth/registration/${registration_id}/request-call-otp`);
      toast.success(response.data.message);
      setCallHint(response.data.hint);
      setVerificationMethod('call');
      setCallCooldown(60);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка звонка');
    } finally {
      setRequestingCall(false);
    }
  };

  const handleVerifySMS = async () => {
    if (otpValue.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }
    
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/auth/registration/${registration_id}/verify-otp`, {
        otp_code: otpValue
      });
      
      if (response.data.verified) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        setVerified(true);
        toast.success('Регистрация завершена!');
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Неверный код');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyCall = async () => {
    if (callCode.length !== 4) {
      toast.error('Введите 4 цифры');
      return;
    }
    
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/auth/registration/${registration_id}/verify-call-otp`, {
        code: callCode
      });
      
      if (response.data.verified) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        setVerified(true);
        toast.success('Регистрация завершена!');
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Неверный код');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyTelegram = async () => {
    if (telegramCode.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }
    
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/auth/registration/${registration_id}/verify-telegram-otp`, {
        code: telegramCode
      });
      
      if (response.data.verified) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        setVerified(true);
        toast.success('Регистрация завершена!');
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Неверный код');
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen gradient-bg">
        <Header showAuth={false} />
        <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
          <div className="minimal-card p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Регистрация завершена!</h2>
              <p className="text-gray-600">Перенаправление на панель управления...</p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Header showAuth={false} />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="minimal-card p-6 sm:p-8 animate-fade-in" data-testid="verify-registration-card">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Подтверждение телефона</h2>
            <p className="text-gray-600">Выберите способ верификации</p>
          </div>
          <div className="space-y-6">
            {!verificationMethod && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-6 neuro-card flex items-center justify-center"
                >
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </motion.div>
                
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-gray-900 mb-2"
                >
                  Подтверждение телефона
                </motion.h3>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-600 text-sm mb-8"
                >
                  Выберите удобный способ верификации
                </motion.p>
                
                <div className="space-y-4 max-w-md mx-auto">
                  {/* SMS Button - Neumorphism */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRequestSMS}
                    disabled={smsCooldown > 0}
                    className="neuro-card w-full p-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    data-testid="sms-button"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0 group-hover:from-blue-100 group-hover:to-blue-200 transition-all">
                        <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                          {smsCooldown > 0 ? `SMS через ${smsCooldown}с` : 'SMS'}
                        </h4>
                        <p className="text-sm text-gray-600">Код придет в сообщении</p>
                      </div>
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.button>
                  
                  {/* Call Button - Neumorphism */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRequestCall}
                    disabled={callCooldown > 0 || requestingCall}
                    className="neuro-card w-full p-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    data-testid="call-button"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0 group-hover:from-blue-100 group-hover:to-blue-200 transition-all">
                        <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                          {requestingCall ? 'Звоним...' : callCooldown > 0 ? `Звонок через ${callCooldown}с` : 'Звонок'}
                        </h4>
                        <p className="text-sm text-gray-600">Вам поступит вызов</p>
                      </div>
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.button>
                  
                  {/* Telegram Button - Always visible */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (telegramDeepLink) {
                        setVerificationMethod('telegram');
                        setTelegramCooldown(60);
                        window.location.href = telegramDeepLink;
                      }
                    }}
                    disabled={!telegramDeepLink || telegramCooldown > 0}
                    className="relative overflow-hidden w-full p-6 rounded-2xl bg-gradient-to-br from-[#0088cc] to-[#0077b3] transition-all group shadow-lg shadow-[#0088cc]/20 hover:shadow-xl hover:shadow-[#0088cc]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="telegram-button"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-all">
                        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-lg font-semibold text-white mb-1">
                          {loadingTelegramLink ? 'Загрузка...' : telegramCooldown > 0 ? `Telegram (${telegramCooldown}с)` : 'Telegram'}
                        </h4>
                        <p className="text-sm text-white/80">Код в боте @twotick_bot</p>
                      </div>
                      <svg className="w-5 h-5 text-white/80 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.button>
                </div>
              </div>
            )}

            {/* SMS Verification */}
            {verificationMethod === 'sms' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Введите код из SMS</h3>
                  {mockOtp && (
                    <p className="text-sm text-neutral-500 mb-4">Тестовый код: {mockOtp}</p>
                  )}
                </div>
                
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
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

                <button
                  onClick={handleVerifySMS}
                  disabled={verifying || otpValue.length !== 6}
                  className="w-full px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {verifying ? 'Проверка...' : 'Подтвердить'}
                </button>

                <button
                  onClick={() => {
                    setVerificationMethod('');
                    setOtpValue('');
                  }}
                  className="w-full px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  Выбрать другой способ
                </button>
              </motion.div>
            )}

            {/* Call Verification */}
            {verificationMethod === 'call' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Введите последние 4 цифры номера</h3>
                  {callHint && (
                    <p className="text-sm text-neutral-600 mb-4">{callHint}</p>
                  )}
                </div>
                
                <div className="flex justify-center">
                  <InputOTP maxLength={4} value={callCode} onChange={setCallCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <button
                  onClick={handleVerifyCall}
                  disabled={verifying || callCode.length !== 4}
                  className="w-full px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {verifying ? 'Проверка...' : 'Подтвердить'}
                </button>

                <button
                  onClick={() => {
                    setVerificationMethod('');
                    setCallCode('');
                  }}
                  className="w-full px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  Выбрать другой способ
                </button>
              </motion.div>
            )}

            {/* Telegram Verification */}
            {verificationMethod === 'telegram' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Введите код из Telegram</h3>
                  <p className="text-sm text-neutral-600 mb-4">Откройте Telegram и скопируйте код</p>
                </div>
                
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={telegramCode} onChange={setTelegramCode}>
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

                <button
                  onClick={handleVerifyTelegram}
                  disabled={verifying || telegramCode.length !== 6}
                  className="w-full px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {verifying ? 'Проверка...' : 'Подтвердить'}
                </button>

                {telegramDeepLink && (
                  <a
                    href={telegramDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <button
                      type="button"
                      className="w-full px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
                    >
                      🔄 Открыть Telegram снова
                    </button>
                  </a>
                )}

                <button
                  onClick={() => {
                    setVerificationMethod('');
                    setTelegramCode('');
                  }}
                  className="w-full px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  Выбрать другой способ
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyRegistrationPage;
