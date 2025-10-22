import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import { ArrowLeft, Upload } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [iin, setIin] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      setIin(response.data.iin || '');
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIIN = async () => {
    try {
      await axios.post(`${API}/auth/update-profile`, 
        { iin },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('ИИН сохранен');
      fetchUser();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold text-neutral-900 mb-8">Профиль наймодателя</h1>

        <div className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>Информация о компании</CardTitle>
              <CardDescription>Эти данные будут отображаться в договорах</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company_name">Название компании</Label>
                <Input 
                  id="company_name"
                  value={user?.company_name || ''} 
                  onChange={(e) => handleUpdateField('company_name', e.target.value)}
                  className="mt-1"
                  placeholder="ИП 'RentDomik'"
                />
              </div>
              <div>
                <Label htmlFor="iin">ИИН/БИН компании</Label>
                <Input
                  id="iin"
                  value={iin}
                  onChange={(e) => setIin(e.target.value)}
                  placeholder="123456789012"
                  className="mt-1"
                  data-testid="iin-input"
                />
                <Button
                  onClick={handleSaveIin}
                  disabled={iinLoading}
                  className="mt-2"
                  size="sm"
                  data-testid="save-iin-button"
                >
                  {iinLoading ? 'Сохранение...' : 'Сохранить ИИН/БИН'}
                </Button>
              </div>
              <div>
                <Label htmlFor="legal_address">Юридический адрес</Label>
                <Input
                  id="legal_address"
                  value={user?.legal_address || ''}
                  onChange={(e) => handleUpdateField('legal_address', e.target.value)}
                  className="mt-1"
                  placeholder="г. Алматы, ул. Абая 1"
                />
                <Button onClick={handleUpdateIIN} data-testid="save-iin-button">
                  Сохранить
                </Button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">12-значный номер</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
