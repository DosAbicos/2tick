import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import Header from '@/components/Header';
import { ArrowLeft, CheckCircle } from 'lucide-react';

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

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.register.password_mismatch'));
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      toast.error('Пароль должен быть минимум 6 символов');
      return;
    }

    // Validate code length
    if (resetCode.length !== 6) {
      toast.error('Введите 6-значный код');
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
      toast.success('Пароль успешно изменен!');
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error('Неверный или истёкший код');
      } else {
        toast.error(error.response?.data?.detail || 'Ошибка при сбросе пароля');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header showAuth={false} />
        
        <div className="max-w-md mx-auto px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Пароль изменен
              </CardTitle>
              <CardDescription>
                Теперь вы можете войти с новым паролем
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Ваш пароль успешно изменен. Используйте новый пароль для входа в систему.
                </p>
              </div>

              <Button
                onClick={() => navigate('/login')}
                className="w-full"
              >
                Перейти к входу
              </Button>
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
          onClick={() => navigate('/forgot-password')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Новый пароль</CardTitle>
            <CardDescription>
              Введите код из email и установите новый пароль
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
                  className="mt-1"
                  placeholder="example@mail.com"
                />
              </div>

              <div>
                <Label>Код из email (6 цифр)</Label>
                <div className="flex justify-center mt-2">
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
                <Label htmlFor="new_password">Новый пароль</Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="Минимум 6 символов"
                />
              </div>

              <div>
                <Label htmlFor="confirm_password">{t('auth.register.confirm_password')}</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`mt-1 ${
                    confirmPassword && newPassword !== confirmPassword
                      ? 'border-red-500'
                      : confirmPassword && newPassword === confirmPassword
                      ? 'border-green-500'
                      : ''
                  }`}
                  placeholder="Подтвердите новый пароль"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{t('auth.register.password_mismatch')}</p>
                )}
                {confirmPassword && newPassword === confirmPassword && newPassword.length > 0 && (
                  <p className="text-xs text-green-500 mt-1">{t('auth.register.password_match')}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  !email ||
                  resetCode.length !== 6 ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword !== confirmPassword
                }
              >
                {loading ? 'Сброс пароля...' : 'Сбросить пароль'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <Link to="/forgot-password" className="text-primary hover:underline">
                Не получили код? Отправить снова
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
