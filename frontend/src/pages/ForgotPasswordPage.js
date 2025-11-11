import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { ArrowLeft, Mail, Send, CheckCircle2 } from 'lucide-react';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error('Введите корректный email адрес');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setEmailSent(true);
      toast.success('Код для восстановления пароля отправлен на email');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при отправке кода');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen gradient-bg">
        <Header showAuth={false} />
        
        <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <div className="minimal-card p-6 sm:p-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Код отправлен</h2>
              <p className="text-gray-600">Проверьте вашу почту</p>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-800 mb-2">
                Мы отправили 6-значный код на адрес <strong>{email}</strong>
              </p>
              <p className="text-sm text-green-800">
                Код действителен в течение <strong>1 часа</strong>
              </p>
            </div>

            <button
              onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
              className="w-full mb-3 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 font-medium"
            >
              Ввести код для сброса пароля
            </button>

            <button
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
              className="w-full mb-4 px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
            >
              Отправить код на другой email
            </button>

            <div className="text-center text-sm">
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Вернуться к входу
              </Link>
            </div>
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
          onClick={() => navigate('/login')}
          className="mb-6 px-4 py-2 text-gray-600 hover:text-blue-600 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к входу
        </button>

        <div className="minimal-card p-6 sm:p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Восстановление пароля</h2>
            <p className="text-gray-600">Введите email, на который зарегистрирован аккаунт</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`minimal-input w-full pl-12 ${
                    email && !validateEmail(email) ? 'border-red-500' : ''
                  }`}
                  placeholder="example@mail.com"
                />
              </div>
              {email && !validateEmail(email) && (
                <p className="text-xs text-red-500 mt-1">Введите корректный email</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !validateEmail(email)}
              className="w-full px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                'Отправка...'
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Отправить код на email
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Вспомнили пароль? Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
