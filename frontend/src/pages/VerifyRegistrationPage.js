import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-gray-600">Для завершения регистрации подтвердите ваш номер телефона одним из способов:</p>
                </div>

                {/* SMS Button */}
                <button
                  onClick={handleRequestSMS}
                  disabled={smsCooldown > 0}
                  className="w-full px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  data-testid="sms-button"
                >
                  {smsCooldown > 0 ? `SMS (${smsCooldown}с)` : '📱 SMS-сообщение'}
                </button>

                {/* Call Button */}
                <button
                  onClick={handleRequestCall}
                  disabled={callCooldown > 0 || requestingCall}
                  className="w-full px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  data-testid="call-button"
                >
                  {requestingCall ? 'Звоним...' : callCooldown > 0 ? `Звонок (${callCooldown}с)` : '📞 Входящий звонок'}
                </button>

                {/* Telegram Button */}
                {telegramDeepLink && (
                  <a
                    href={telegramDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full"
                  >
                    <button
                      type="button"
                      className="w-full px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      onClick={() => {
                        setVerificationMethod('telegram');
                        setTelegramCooldown(60);
                      }}
                      disabled={telegramCooldown > 0}
                      data-testid="telegram-button"
                    >
                      {telegramCooldown > 0 ? `Telegram (${telegramCooldown}с)` : '✈️ Telegram'}
                    </button>
                  </a>
                )}
              </motion.div>
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

                <Button
                  onClick={handleVerifyCall}
                  disabled={verifying || callCode.length !== 4}
                  className="w-full"
                >
                  {verifying ? 'Проверка...' : 'Подтвердить'}
                </Button>

                <Button
                  onClick={() => {
                    setVerificationMethod('');
                    setCallCode('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Выбрать другой способ
                </Button>
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

                <Button
                  onClick={handleVerifyTelegram}
                  disabled={verifying || telegramCode.length !== 6}
                  className="w-full"
                >
                  {verifying ? 'Проверка...' : 'Подтвердить'}
                </Button>

                {telegramDeepLink && (
                  <a
                    href={telegramDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                    >
                      🔄 Открыть Telegram снова
                    </Button>
                  </a>
                )}

                <Button
                  onClick={() => {
                    setVerificationMethod('');
                    setTelegramCode('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Выбрать другой способ
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyRegistrationPage;
