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
import { IMaskInput } from 'react-imask';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RegisterPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    language: i18n.language || 'ru'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/register`, formData);
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
        <Card data-testid="register-card">
          <CardHeader>
            <CardTitle className="text-2xl" data-testid="register-title">{t('auth.register.title')}</CardTitle>
            <CardDescription>Create your account to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
              <div>
                <Label htmlFor="full_name">{t('auth.register.full_name')}</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  data-testid="full-name-input"
                  className="mt-1"
                />
              </div>
              
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
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">{t('auth.register.phone')}</Label>
                <IMaskInput
                  mask="+7 (000) 000-00-00"
                  value={formData.phone}
                  onAccept={(value) => setFormData({ ...formData, phone: value })}
                  placeholder="+7 (___) ___-__-__"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  data-testid="phone-input"
                />
              </div>
              
              <div>
                <Label htmlFor="password">{t('auth.login.password')}</Label>
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
                data-testid="register-submit-button"
              >
                {loading ? t('common.loading') : t('auth.register.submit')}
              </Button>
            </form>
            
            <div className="mt-4 text-center text-sm">
              <Link to="/login" className="text-primary hover:underline" data-testid="login-link">
                {t('auth.login.title')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;