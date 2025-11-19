import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { IMaskInput } from 'react-imask';
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
      if (!formData.full_name || !formData.email || !formData.phone) {
        toast.error('Заполните все обязательные поля');
        return;
      }
      if (!validateEmail(formData.email)) {
        toast.error('Введите корректный email адрес');
        return;
      }
      setStep(2);
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
      const response = await axios.post(`${API}/register`, {
        ...formData,
        language: i18n.language
      });

      if (response.data.message === 'OTP sent to your phone') {
        toast.success('Код подтверждения отправлен на ваш телефон');
        navigate('/verify-registration', { 
          state: { 
            phone: formData.phone,
            email: formData.email 
          } 
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
            <div className={`w-12 h-2 rounded-full transition-all ${step >= 1 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`w-12 h-2 rounded-full transition-all ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            Шаг {step} из 2
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

                {/* Название компании */}
                <div className="space-y-2">
                  <label htmlFor="company_name" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    Название компании
                  </label>
                  <input
                    id="company_name"
                    name="company_name"
                    type="text"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="minimal-input w-full"
                    placeholder="ТОО 'Компания' (опционально)"
                  />
                </div>

                {/* ИИН/БИН */}
                <div className="space-y-2">
                  <label htmlFor="iin" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    ИИН/БИН
                  </label>
                  <input
                    id="iin"
                    name="iin"
                    type="text"
                    value={formData.iin}
                    onChange={handleChange}
                    className="minimal-input w-full"
                    placeholder="123456789012 (опционально)"
                  />
                </div>

                {/* Юридический адрес */}
                <div className="space-y-2">
                  <label htmlFor="legal_address" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    Юридический адрес
                  </label>
                  <input
                    id="legal_address"
                    name="legal_address"
                    type="text"
                    value={formData.legal_address}
                    onChange={handleChange}
                    className="minimal-input w-full"
                    placeholder="г. Алматы, ул. Абая, 1 (опционально)"
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
                    type="submit"
                    disabled={loading || !passwordMatch}
                    className="flex-1 py-4 px-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Ссылка на вход */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
