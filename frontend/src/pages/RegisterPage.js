import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { IMaskInput } from 'react-imask';
import { motion } from 'framer-motion';
import { Check, X, User, Mail, Phone, Lock, Building, CreditCard, MapPin } from 'lucide-react';
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
        setRegistrationId(response.data.registration_id);
        toast.success('Данные сохранены. Теперь подтвердите телефон');
        setStep(4); // Переход к верификации
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

  // Запрос верификации SMS
  const handleRequestSMS = async () => {
    if (!registrationId || smsCooldown > 0) return;
    
    setVerificationLoading(true);
    try {
      const response = await axios.post(`${API}/auth/registration/${registrationId}/request-otp?method=sms`);
      toast.success('Код отправлен на ваш телефон');
      setVerificationMethod('sms');
      setSmsCooldown(60); // 60 seconds cooldown
      
      // Если есть mock_otp (для тестирования), показываем его
      if (response.data.mock_otp) {
        setMockOtp(response.data.mock_otp);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка отправки SMS');
    } finally {
      setVerificationLoading(false);
    }
  };

  // Запрос верификации звонком
  const handleRequestCall = async () => {
    if (!registrationId || callCooldown > 0) return;
    
    setVerificationLoading(true);
    try {
      const response = await axios.post(`${API}/auth/registration/${registrationId}/request-call-otp`);
      toast.success('Вам поступит звонок. Введите последние 4 цифры номера');
      setVerificationMethod('call');
      setCallHint(response.data.hint || '');
      setCallCooldown(60); // 60 seconds cooldown
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка инициации звонка');
    } finally {
      setVerificationLoading(false);
    }
  };

  // Запрос Telegram deep link
  const handleRequestTelegram = async () => {
    if (!registrationId) return;
    
    setVerificationLoading(true);
    
    try {
      const response = await axios.get(`${API}/auth/registration/${registrationId}/telegram-deep-link`);
      const deepLink = response.data.deep_link;
      setTelegramDeepLink(deepLink);
      // После получения ссылки - кнопка станет кликабельной ссылкой с target="_blank"
      // Пользователь сам кликнет по ней
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка получения ссылки Telegram');
    } finally {
      setVerificationLoading(false);
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
                    {loading ? 'Сохранение...' : 'Продолжить к верификации'}
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
                        disabled={smsCooldown > 0 || verificationLoading}
                        className="neuro-card w-full p-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
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
                      
                      {/* Call Button - Neumorphism with rounded corners */}
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleRequestCall}
                        disabled={callCooldown > 0 || verificationLoading}
                        className="neuro-card w-full p-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0 group-hover:from-blue-100 group-hover:to-blue-200 transition-all">
                            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">
                              {verificationLoading ? 'Звоним...' : callCooldown > 0 ? `Звонок через ${callCooldown}с` : 'Звонок'}
                            </h4>
                            <p className="text-sm text-gray-600">Вам поступит вызов</p>
                          </div>
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </motion.button>
                      
                      {/* Telegram Button - Load link first then show as clickable */}
                      {!telegramDeepLink ? (
                        <motion.button
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          type="button"
                          onClick={handleRequestTelegram}
                          disabled={verificationLoading}
                          className="relative overflow-hidden w-full p-6 rounded-2xl bg-gradient-to-br from-[#0088cc] to-[#0077b3] transition-all group shadow-lg shadow-[#0088cc]/20 hover:shadow-xl hover:shadow-[#0088cc]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-all">
                              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                              </svg>
                            </div>
                            <div className="flex-1 text-left">
                              <h4 className="text-lg font-semibold text-white mb-1">
                                {verificationLoading ? 'Загрузка...' : 'Telegram'}
                              </h4>
                              <p className="text-sm text-white/80">Получить код в боте</p>
                            </div>
                            <svg className="w-5 h-5 text-white/80 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </motion.button>
                      ) : (
                        <motion.a
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          href={telegramDeepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
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
                      )}
                    </div>
                  </div>
                ) : verificationMethod === 'sms' ? (
                  // SMS verification - Neumorphism style
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 neuro-card flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">SMS верификация</h3>
                      <p className="text-sm text-gray-600 mb-4">Введите 6-значный код из SMS</p>
                      {mockOtp && (
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200 mb-4">
                          <p className="text-sm text-blue-900 font-medium">🔐 Тестовый код: <strong className="text-lg">{mockOtp}</strong></p>
                        </div>
                      )}
                    </div>
                    
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="neuro-input w-full text-center text-3xl font-bold tracking-[0.5em]"
                      placeholder="______"
                      autoFocus
                    />
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('');
                          setVerificationCode('');
                          setMockOtp('');
                        }}
                        className="neuro-button flex-1 py-3"
                      >
                        ← Назад
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={verificationLoading || verificationCode.length !== 6}
                        className="neuro-button-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verificationLoading ? 'Проверяем...' : '✓ Подтвердить'}
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleRequestSMS}
                      disabled={smsCooldown > 0}
                      className="w-full text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed py-2"
                    >
                      {smsCooldown > 0 ? `Повторить через ${smsCooldown}с` : '↻ Отправить код повторно'}
                    </button>
                  </motion.div>
                ) : verificationMethod === 'call' ? (
                  // Call verification - Neumorphism style
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 neuro-card flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Звонок верификация</h3>
                      <p className="text-sm text-gray-600 mb-4">Введите последние 4 цифры номера</p>
                      {callHint && (
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200 mb-4">
                          <p className="text-sm text-blue-900 font-medium">📞 {callHint}</p>
                        </div>
                      )}
                    </div>
                    
                    <input
                      type="text"
                      maxLength={4}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="neuro-input w-full text-center text-3xl font-bold tracking-[0.5em]"
                      placeholder="____"
                      autoFocus
                    />
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('');
                          setVerificationCode('');
                          setCallHint('');
                        }}
                        className="neuro-button flex-1 py-3"
                      >
                        ← Назад
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={verificationLoading || verificationCode.length !== 4}
                        className="neuro-button-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verificationLoading ? 'Проверяем...' : '✓ Подтвердить'}
                      </button>
                    </div>
                  </motion.div>
                ) : verificationMethod === 'telegram' ? (
                  // Telegram verification - Neumorphism style
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 neuro-card flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Telegram верификация</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Скопируйте код из чата с ботом <span className="font-semibold text-[#0088cc]">@twotick_bot</span>
                      </p>
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200 mb-4">
                        <p className="text-sm text-blue-900 font-medium">
                          💡 Код отправлен в Telegram. Если не получили - нажмите кнопку ниже
                        </p>
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="neuro-input w-full text-center text-3xl font-bold tracking-[0.5em]"
                      placeholder="______"
                      autoFocus
                    />
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('');
                          setVerificationCode('');
                          setTelegramDeepLink('');
                        }}
                        className="neuro-button flex-1 py-3"
                      >
                        ← Назад
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={verificationLoading || verificationCode.length !== 6}
                        className="neuro-button-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verificationLoading ? 'Проверяем...' : '✓ Подтвердить'}
                      </button>
                    </div>
                    
                    <a
                      href={telegramDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center py-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      ↻ Отправить код повторно
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
