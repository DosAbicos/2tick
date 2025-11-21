import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { IMaskInput } from 'react-imask';
import { motion } from 'framer-motion';
import { Check, X, User, Mail, Phone, Lock, Building, CreditCard, MapPin } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RegisterPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    company_name: '',
    iin: '',
    legal_address: '',
    language: i18n.language || 'ru'
  });
  
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [userExists, setUserExists] = useState(false);
  const [step, setStep] = useState(1);
  const [verificationMethod, setVerificationMethod] = useState(''); // 'sms', 'call', 'telegram'
  const [verificationCode, setVerificationCode] = useState('');
  const [registrationId, setRegistrationId] = useState(null);
  const [telegramDeepLink, setTelegramDeepLink] = useState('');
  const [callHint, setCallHint] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [callCooldown, setCallCooldown] = useState(0);
  const [smsRequestCount, setSmsRequestCount] = useState(0);
  const [callRequestCount, setCallRequestCount] = useState(0);
  const [smsFirstEntry, setSmsFirstEntry] = useState(true);
  const [callFirstEntry, setCallFirstEntry] = useState(true);
  const [sendingCode, setSendingCode] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    if (e.target.name === 'email') {
      setUserExists(false);
    }
  };
  
  useEffect(() => {
    if (formData.confirmPassword) {
      setPasswordMatch(formData.password === formData.confirmPassword);
    } else {
      setPasswordMatch(true);
    }
  }, [formData.password, formData.confirmPassword]);
  
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Detect mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Calculate progressive cooldown time based on request count
  const getProgressiveCooldown = (requestCount) => {
    if (requestCount <= 2) return 0; // First 2 requests - no cooldown
    if (requestCount === 3) return 60; // 3rd request - 1 minute
    if (requestCount === 4) return 150; // 4th request - 2.5 minutes
    return 150 + (requestCount - 4) * 60; // 5th+ requests - increase by 1 minute each
  };

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

  const handleNextStep = () => {
    if (step === 1) {
      // Валидация личных данных
      if (!formData.full_name || !formData.email || !formData.phone) {
        toast.error('Заполните все обязательные поля');
        return;
      }
      if (!validateEmail(formData.email)) {
        toast.error('Введите корректный email адрес');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Валидация юридических данных
      if (!formData.company_name || !formData.iin || !formData.legal_address) {
        toast.error('Заполните все юридические данные');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Пароли не совпадают');
      setPasswordMatch(false);
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, {
        ...formData,
        language: i18n.language
      });

      if (response.data.registration_id) {
        const regId = response.data.registration_id;
        setRegistrationId(regId);
        toast.success('Данные сохранены. Теперь подтвердите телефон');
        setStep(4); // Переход к верификации
        
        // Предварительно загружаем Telegram deep link
        axios.get(`${API}/auth/registration/${regId}/telegram-deep-link`)
          .then(res => {
            setTelegramDeepLink(res.data.deep_link);
          })
          .catch(err => {
            console.error('Failed to pre-fetch Telegram link:', err);
          });
      } else {
        toast.error(response.data.message || 'Ошибка регистрации');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
        toast.error('Пользователь с таким email уже зарегистрирован');
        setUserExists(true);
        setStep(1);
      } else {
        toast.error(error.response?.data?.detail || 'Ошибка регистрации. Попробуйте снова.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Клик на кнопку SMS - открывает экран
  const handleRequestSMS = async () => {
    if (!registrationId) return;
    
    setVerificationMethod('sms');
    
    // Если первый вход - отправляем код автоматически
    if (smsFirstEntry) {
      setSmsFirstEntry(false);
      await sendSmsCode();
    }
  };

  // Отправка SMS кода (вручную или автоматически)
  const sendSmsCode = async () => {
    if (!registrationId || smsCooldown > 0) return;
    
    setSendingCode(true);
    try {
      const response = await axios.post(`${API}/auth/registration/${registrationId}/request-otp?method=sms`);
      toast.success('Код отправлен на ваш телефон');
      
      // Увеличиваем счетчик запросов
      const newCount = smsRequestCount + 1;
      setSmsRequestCount(newCount);
      
      // Устанавливаем прогрессивный cooldown
      const cooldownTime = getProgressiveCooldown(newCount);
      if (cooldownTime > 0) {
        setSmsCooldown(cooldownTime);
      }
      
      // Если есть mock_otp (для тестирования), показываем его
      if (response.data.mock_otp) {
        setMockOtp(response.data.mock_otp);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка отправки SMS');
    } finally {
      setSendingCode(false);
    }
  };

  // Клик на кнопку Call - открывает экран
  const handleRequestCall = async () => {
    if (!registrationId) return;
    
    setVerificationMethod('call');
    
    // Если первый вход - отправляем код автоматически
    if (callFirstEntry) {
      setCallFirstEntry(false);
      await sendCallCode();
    }
  };

  // Отправка Call кода (вручную или автоматически)
  const sendCallCode = async () => {
    if (!registrationId || callCooldown > 0) return;
    
    setSendingCode(true);
    try {
      const response = await axios.post(`${API}/auth/registration/${registrationId}/request-call-otp`);
      toast.success('Вам поступит звонок. Введите последние 4 цифры номера');
      setCallHint(response.data.hint || '');
      
      // Увеличиваем счетчик запросов
      const newCount = callRequestCount + 1;
      setCallRequestCount(newCount);
      
      // Устанавливаем прогрессивный cooldown
      const cooldownTime = getProgressiveCooldown(newCount);
      if (cooldownTime > 0) {
        setCallCooldown(cooldownTime);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка инициации звонка');
    } finally {
      setSendingCode(false);
    }
  };

  // Верификация кода
  const handleVerifyCode = async () => {
    if (!registrationId || !verificationCode) {
      toast.error('Введите код подтверждения');
      return;
    }

    setVerificationLoading(true);
    try {
      let response;
      
      if (verificationMethod === 'sms') {
        response = await axios.post(`${API}/auth/registration/${registrationId}/verify-otp`, {
          otp_code: verificationCode
        });
      } else if (verificationMethod === 'call') {
        response = await axios.post(`${API}/auth/registration/${registrationId}/verify-call-otp`, {
          code: verificationCode
        });
      } else if (verificationMethod === 'telegram') {
        response = await axios.post(`${API}/auth/registration/${registrationId}/verify-telegram-otp`, {
          code: verificationCode
        });
      }

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        toast.success('Регистрация успешно завершена!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Неверный код. Попробуйте снова.');
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Логотип и заголовок */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="relative">
              <svg width="48" height="48" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="15" fill="#3B82F6" />
                <path d="M10 16 L14 20 L22 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 16 L18 20 L26 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
              </svg>
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              2tick.kz
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Создайте аккаунт
          </h1>
          <p className="text-gray-600 text-sm">
            Подписывайте договоры за 2 клика
          </p>
        </div>

        {/* Прогресс */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-6 h-2 rounded-full transition-all ${step >= 1 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`w-6 h-2 rounded-full transition-all ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`w-6 h-2 rounded-full transition-all ${step >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`w-6 h-2 rounded-full transition-all ${step >= 4 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            {step === 1 && 'Шаг 1 из 4: Личные данные'}
            {step === 2 && 'Шаг 2 из 4: Юридические данные'}
            {step === 3 && 'Шаг 3 из 4: Создание пароля'}
            {step === 4 && 'Шаг 4 из 4: Подтверждение телефона'}
          </p>
        </div>

        {/* Форма */}
        <div className="minimal-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 && (
              <>
                {/* ФИО */}
                <div className="space-y-2">
                  <label htmlFor="full_name" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    ФИО *
                  </label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    className="minimal-input w-full"
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="minimal-input w-full"
                    placeholder="example@company.kz"
                  />
                  {userExists && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <X className="w-4 h-4" /> Пользователь уже зарегистрирован
                    </p>
                  )}
                </div>

                {/* Телефон */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-500" />
                    Телефон *
                  </label>
                  <IMaskInput
                    mask="+7 (000) 000-00-00"
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onAccept={(value) => setFormData({ ...formData, phone: value })}
                    className="minimal-input w-full"
                    placeholder="+7 (777) 123-45-67"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30"
                >
                  Продолжить
                </button>
              </>
            )}

            {step === 2 && (
              <>
                {/* Название компании */}
                <div className="space-y-2">
                  <label htmlFor="company_name" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-500" />
                    Название компании *
                  </label>
                  <input
                    id="company_name"
                    name="company_name"
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={handleChange}
                    className="minimal-input w-full"
                    placeholder="ТОО 'Компания'"
                  />
                </div>

                {/* ИИН/БИН */}
                <div className="space-y-2">
                  <label htmlFor="iin" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    ИИН/БИН *
                  </label>
                  <input
                    id="iin"
                    name="iin"
                    type="text"
                    required
                    value={formData.iin}
                    onChange={handleChange}
                    className="minimal-input w-full"
                    placeholder="123456789012"
                  />
                </div>

                {/* Юридический адрес */}
                <div className="space-y-2">
                  <label htmlFor="legal_address" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    Юридический адрес *
                  </label>
                  <input
                    id="legal_address"
                    name="legal_address"
                    type="text"
                    required
                    value={formData.legal_address}
                    onChange={handleChange}
                    className="minimal-input w-full"
                    placeholder="г. Алматы, ул. Абая, 1"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 px-4 text-base font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 py-4 px-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30"
                  >
                    Продолжить
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                {/* Пароль */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-500" />
                    Пароль *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="minimal-input w-full"
                    placeholder="Минимум 6 символов"
                  />
                </div>

                {/* Подтверждение пароля */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-500" />
                    Подтвердите пароль *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="minimal-input w-full"
                    placeholder="Повторите пароль"
                  />
                  {!passwordMatch && formData.confirmPassword && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <X className="w-4 h-4" /> Пароли не совпадают
                    </p>
                  )}
                  {passwordMatch && formData.confirmPassword && (
                    <p className="text-green-500 text-sm flex items-center gap-1">
                      <Check className="w-4 h-4" /> Пароли совпадают
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 px-4 text-base font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                  >
                    Назад
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !passwordMatch}
                    className="flex-1 py-4 px-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Сохранение...' : 'Продолжить'}
                  </button>
                </div>
              </>
            )}

            {step === 4 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {!verificationMethod ? (
                  // Method selection - Neumorphism style
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
                      Подтверждение регистрации
                    </motion.h3>
                    
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-gray-600 text-sm mb-2"
                    >
                      Выберите удобный способ верификации
                    </motion.p>
                    
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-blue-600 text-sm font-medium mb-8"
                    >
                      {formData.phone}
                    </motion.p>
                    
                    <div className="space-y-4 max-w-md mx-auto">
                      {/* SMS Button - Neumorphism with rounded corners */}
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleRequestSMS}
                        className="neuro-card w-full p-6 rounded-2xl transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0 group-hover:from-blue-100 group-hover:to-blue-200 transition-all">
                            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">SMS</h4>
                            <p className="text-sm text-gray-600">Код придет в сообщении</p>
                          </div>
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </motion.button>
                      
                      {/* Call Button - Neumorphism with rounded corners */}
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleRequestCall}
                        className="neuro-card w-full p-6 rounded-2xl transition-all group"
                        data-testid="call-button"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0 group-hover:from-blue-100 group-hover:to-blue-200 transition-all">
                            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">Звонок</h4>
                            <p className="text-sm text-gray-600">Вам поступит вызов</p>
                          </div>
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </motion.button>
                      
                      {/* Telegram Button - Always active */}
                      <motion.a
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        href={telegramDeepLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (!telegramDeepLink) {
                            e.preventDefault();
                            toast.error('Ссылка Telegram еще загружается...');
                            return;
                          }
                          setVerificationMethod('telegram');
                          toast.success('Откройте Telegram и скопируйте код');
                        }}
                        className="relative overflow-hidden block w-full p-6 rounded-2xl bg-gradient-to-br from-[#0088cc] to-[#0077b3] transition-all no-underline group shadow-lg shadow-[#0088cc]/20 hover:shadow-xl hover:shadow-[#0088cc]/30"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-all">
                            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-lg font-semibold text-white mb-1">Telegram</h4>
                            <p className="text-sm text-white/80">Код в боте @twotick_bot</p>
                          </div>
                          <svg className="w-5 h-5 text-white/80 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </motion.a>
                    </div>
                  </div>
                ) : verificationMethod === 'sms' ? (
                  // SMS verification - OTP boxes
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Введите код верификации</h3>
                      <p className="text-sm text-gray-500">
                        {!smsFirstEntry && !mockOtp ? 'Нажмите кнопку ниже для получения кода' : 'Мы отправили 6-значный код на ваш номер'}
                      </p>
                    </div>
                    
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
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
                    
                    {mockOtp && (
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">Тестовый режим</p>
                        <p className="text-sm text-gray-600 font-mono">{mockOtp}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('');
                          setVerificationCode('');
                          setMockOtp('');
                        }}
                        className="flex-1 py-3 px-6 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
                      >
                        Назад
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={verificationLoading || verificationCode.length !== 6}
                        className="flex-1 py-3 px-6 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {verificationLoading ? 'Проверяем...' : 'Подтвердить'}
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={sendSmsCode}
                      disabled={smsCooldown > 0 || sendingCode}
                      className="w-full py-3 px-6 text-white bg-gradient-to-r from-green-600 to-green-500 rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {sendingCode ? 'Отправка...' : smsCooldown > 0 ? `Отправить через ${Math.floor(smsCooldown / 60)}:${(smsCooldown % 60).toString().padStart(2, '0')}` : 'Отправить код'}
                    </button>
                  </motion.div>
                ) : verificationMethod === 'call' ? (
                  // Call verification - OTP boxes
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Введите код верификации</h3>
                      <p className="text-sm text-gray-500">
                        {!callFirstEntry && !callHint ? 'Нажмите кнопку ниже для инициации звонка' : 'Введите последние 4 цифры номера входящего звонка'}
                      </p>
                    </div>
                    
                    <div className="flex justify-center">
                      <InputOTP maxLength={4} value={verificationCode} onChange={setVerificationCode}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    
                    {callHint && (
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">Подсказка</p>
                        <p className="text-sm text-gray-600">{callHint}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('');
                          setVerificationCode('');
                          setCallHint('');
                        }}
                        className="flex-1 py-3 px-6 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
                      >
                        Назад
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={verificationLoading || verificationCode.length !== 4}
                        className="flex-1 py-3 px-6 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {verificationLoading ? 'Проверяем...' : 'Подтвердить'}
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={sendCallCode}
                      disabled={callCooldown > 0 || sendingCode}
                      className="w-full py-3 px-6 text-white bg-gradient-to-r from-green-600 to-green-500 rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {sendingCode ? 'Инициация звонка...' : callCooldown > 0 ? `Позвонить через ${Math.floor(callCooldown / 60)}:${(callCooldown % 60).toString().padStart(2, '0')}` : 'Инициировать звонок'}
                    </button>
                  </motion.div>
                ) : verificationMethod === 'telegram' ? (
                  // Telegram verification - OTP boxes
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Введите код верификации</h3>
                      <p className="text-sm text-gray-500">
                        Код отправлен в чат с ботом <span className="font-semibold text-[#0088cc]">@twotick_bot</span>
                      </p>
                    </div>
                    
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
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
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('');
                          setVerificationCode('');
                          setTelegramDeepLink('');
                        }}
                        className="flex-1 py-3 px-6 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
                      >
                        Назад
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={verificationLoading || verificationCode.length !== 6}
                        className="flex-1 py-3 px-6 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {verificationLoading ? 'Проверяем...' : 'Подтвердить'}
                      </button>
                    </div>
                    
                    <a
                      href={telegramDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Не получили код? Открыть Telegram снова
                    </a>
                  </motion.div>
                ) : null}
              </motion.div>
            )}
          </form>
        </div>

        {/* Ссылка на вход */}
        {step !== 4 && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Войти
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
