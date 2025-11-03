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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!validateEmail(formData.email)) {
      toast.error('Введите корректный email адрес');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      toast.success(t('common.success'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header showAuth={false} />
      
      <div className="max-w-md mx-auto px-4 py-16">
        <Card data-testid="login-card">
          <CardHeader>
            <CardTitle className="text-2xl" data-testid="login-title">{t('auth.login.title')}</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
              <div>
                <Label htmlFor="email">{t('auth.login.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  data-testid="email-input"
                  className={`mt-1 ${formData.email && !validateEmail(formData.email) ? 'border-red-500' : ''}`}
                  placeholder="example@mail.com"
                />
                {formData.email && !validateEmail(formData.email) && (
                  <p className="text-xs text-red-500 mt-1">Введите корректный email</p>
                )}
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="password">{t('auth.login.password')}</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Забыл пароль?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  data-testid="password-input"
                  className="mt-1"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="login-submit-button"
              >
                {loading ? t('common.loading') : t('auth.login.submit')}
              </Button>
            </form>
            
            <div className="mt-4 text-center text-sm">
              <Link to="/register" className="text-primary hover:underline" data-testid="register-link">
                {t('auth.register.title')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;