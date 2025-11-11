import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import HummingbirdAnimation from '@/components/HummingbirdAnimation';
import { IMaskInput } from 'react-imask';
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
  
  // Состояния для анимации колибри
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [userExists, setUserExists] = useState(false);
  const [showHummingbird, setShowHummingbird] = useState(true);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Сброс состояния userExists при изменении email
    if (e.target.name === 'email') {
      setUserExists(false);
    }
  };
  
  // Проверка совпадения паролей
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmail(formData.email)) {
      toast.error('Введите корректный email адрес');
      return;
    }
    
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
      } else {
        toast.error(error.response?.data?.detail || 'Ошибка регистрации. Попробуйте снова.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header showAuth />
      
      {/* Анимация колибри */}
      {showHummingbird && (
        <HummingbirdAnimation 
          isWatchingPassword={isPasswordFocused}
          passwordMatch={passwordMatch}
          userExists={userExists}
        />
      )}
      
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="neuro-card p-8 smooth-transition">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mb-2">
                Регистрация в 2tick.kz
              </h1>
              <p className="text-gray-600">
                Создайте аккаунт и начните подписывать договоры за 2 клика
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ФИО */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-gray-700 font-medium">
                  ФИО *
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  className="neuro-input"
                  placeholder="Иванов Иван Иванович"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="neuro-input"
                  placeholder="example@company.kz"
                />
                {userExists && (
                  <p className="text-red-500 text-sm">✗ Пользователь уже зарегистрирован</p>
                )}
              </div>

              {/* Телефон */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 font-medium">
                  Телефон *
                </Label>
                <IMaskInput
                  mask="+7 (000) 000-00-00"
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onAccept={(value) => setFormData({ ...formData, phone: value })}
                  className="neuro-input w-full"
                  placeholder="+7 (777) 123-45-67"
                />
              </div>

              {/* Пароль */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Пароль *
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  className="neuro-input"
                  placeholder="Минимум 6 символов"
                />
              </div>

              {/* Подтверждение пароля */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                  Подтвердите пароль *
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  className="neuro-input"
                  placeholder="Повторите пароль"
                />
                {!passwordMatch && formData.confirmPassword && (
                  <p className="text-red-500 text-sm">✗ Пароли не совпадают</p>
                )}
                {passwordMatch && formData.confirmPassword && (
                  <p className="text-green-500 text-sm">✓ Пароли совпадают</p>
                )}
              </div>

              {/* Название компании */}
              <div className="space-y-2">
                <Label htmlFor="company_name" className="text-gray-700 font-medium">
                  Название компании (опционально)
                </Label>
                <Input
                  id="company_name"
                  name="company_name"
                  type="text"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="neuro-input"
                  placeholder="ТОО 'Компания'"
                />
              </div>

              {/* ИИН/БИН */}
              <div className="space-y-2">
                <Label htmlFor="iin" className="text-gray-700 font-medium">
                  ИИН/БИН (опционально)
                </Label>
                <Input
                  id="iin"
                  name="iin"
                  type="text"
                  value={formData.iin}
                  onChange={handleChange}
                  className="neuro-input"
                  placeholder="123456789012"
                />
              </div>

              {/* Юридический адрес */}
              <div className="space-y-2">
                <Label htmlFor="legal_address" className="text-gray-700 font-medium">
                  Юридический адрес (опционально)
                </Label>
                <Input
                  id="legal_address"
                  name="legal_address"
                  type="text"
                  value={formData.legal_address}
                  onChange={handleChange}
                  className="neuro-input"
                  placeholder="г. Алматы, ул. Абая, 1"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !passwordMatch}
                className="neuro-button-primary w-full py-6 text-lg"
              >
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </Button>

              <div className="text-center text-sm text-gray-600">
                Уже есть аккаунт?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Войти
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
