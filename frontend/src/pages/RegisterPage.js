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
    if (!registrationId) return;
    
    setVerificationLoading(true);
    try {
      const response = await axios.post(`${API}/auth/registration/${registrationId}/request-otp?method=sms`);
      toast.success('Код отправлен на ваш телефон');
      setVerificationMethod('sms');
      
      // Если есть mock_otp (для тестирования), показываем его
      if (response.data.mock_otp) {
        toast.info(`Тестовый код: ${response.data.mock_otp}`, { duration: 10000 });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка отправки SMS');
    } finally {
      setVerificationLoading(false);
    }
  };

  // Запрос верификации звонком
  const handleRequestCall = async () => {
    if (!registrationId) return;
    
    setVerificationLoading(true);
    try {
      const response = await axios.post(`${API}/auth/registration/${registrationId}/request-call-otp`);
      toast.success('Вам поступит звонок. Введите последние 4 цифры номера');
      setVerificationMethod('call');
      setCallHint(response.data.hint || '');
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
      setTelegramDeepLink(response.data.deep_link);
      setVerificationMethod('telegram');
      toast.success('Нажмите кнопку ниже чтобы получить код в Telegram');
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
              <>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Подтвердите номер телефона
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formData.phone}
                  </p>
                </div>

                {!verificationMethod ? (
                  <>
                    <p className="text-sm text-gray-600 mb-4 text-center">
                      Выберите способ получения кода:
                    </p>
                    
                    <div className="space-y-3">
                      {/* SMS */}
                      <button
                        type="button"
                        onClick={handleRequestSMS}
                        disabled={verificationLoading}
                        className="w-full py-4 px-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Mail className="w-5 h-5" />
                        SMS на телефон
                      </button>

                      {/* Звонок */}
                      <button
                        type="button"
                        onClick={handleRequestCall}
                        disabled={verificationLoading}
                        className="w-full py-4 px-4 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Phone className="w-5 h-5" />
                        Звонок на телефон
                      </button>

                      {/* Telegram */}
                      <button
                        type="button"
                        onClick={handleRequestTelegram}
                        disabled={verificationLoading}
                        className="w-full py-4 px-4 text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                        </svg>
                        Telegram
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {telegramDeepLink && (
                      <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-900 mb-3">
                          Нажмите кнопку ниже чтобы открыть Telegram и получить код верификации
                        </p>
                        <a
                          href={telegramDeepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
                        >
                          Открыть Telegram
                        </a>
                      </div>
                    )}

                    {callHint && (
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-900">
                          {callHint}
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-gray-700 text-sm font-medium">
                          {verificationMethod === 'call' ? 'Последние 4 цифры номера' : 'Код подтверждения'}
                        </label>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="minimal-input w-full text-center text-2xl tracking-widest"
                          placeholder={verificationMethod === 'call' ? '1234' : '123456'}
                          maxLength={verificationMethod === 'call' ? 4 : 6}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={verificationLoading || !verificationCode}
                        className="w-full py-4 px-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verificationLoading ? 'Проверка...' : 'Подтвердить код'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('');
                          setVerificationCode('');
                          setTelegramDeepLink('');
                          setCallHint('');
                        }}
                        className="w-full py-3 px-4 text-base font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                      >
                        Выбрать другой способ
                      </button>
                    </div>
                  </>
                )}
              </>
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
