import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import { ArrowLeft, Mail } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
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
      <div className="min-h-screen bg-neutral-50">
        <Header showAuth={false} />
        
        <div className="max-w-md mx-auto px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Mail className="h-6 w-6 text-green-600" />
                Код отправлен
              </CardTitle>
              <CardDescription>
                Проверьте вашу почту
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Мы отправили 6-значный код на адрес <strong>{email}</strong>
                </p>
                <p className="text-sm text-green-800 mt-2">
                  Код действителен в течение <strong>1 часа</strong>
                </p>
              </div>

              <Button
                onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
                className="w-full"
              >
                Ввести код для сброса пароля
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="w-full"
              >
                Отправить код на другой email
              </Button>

              <div className="text-center text-sm">
                <Link to="/login" className="text-primary hover:underline">
                  Вернуться к входу
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header showAuth={false} />
      
      <div className="max-w-md mx-auto px-4 py-16">
        <Button
          variant="ghost"
          onClick={() => navigate('/login')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к входу
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Восстановление пароля</CardTitle>
            <CardDescription>
              Введите email, на который зарегистрирован аккаунт
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`mt-1 ${email && !validateEmail(email) ? 'border-red-500' : ''}`}
                  placeholder="example@mail.com"
                />
                {email && !validateEmail(email) && (
                  <p className="text-xs text-red-500 mt-1">Введите корректный email</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !validateEmail(email)}
              >
                {loading ? 'Отправка...' : 'Отправить код на email'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <Link to="/login" className="text-primary hover:underline">
                Вспомнили пароль? Войти
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
