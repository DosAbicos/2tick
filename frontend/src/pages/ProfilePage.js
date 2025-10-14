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
  const [uploading, setUploading] = useState(false);
  const [documentPreview, setDocumentPreview] = useState(null);

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
      if (response.data.document_upload) {
        setDocumentPreview(`data:image/jpeg;base64,${response.data.document_upload}`);
      }
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

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API}/auth/upload-document`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Документ загружен');
      fetchUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setUploading(false);
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
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>ФИО</Label>
                <Input value={user?.full_name || ''} disabled className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <Input value={user?.phone || ''} disabled className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IIN */}
          <Card>
            <CardHeader>
              <CardTitle>ИИН (Индивидуальный идентификационный номер)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  value={iin}
                  onChange={(e) => setIin(e.target.value)}
                  placeholder="123456789012"
                  maxLength={12}
                  data-testid="iin-input"
                />
                <Button onClick={handleUpdateIIN} data-testid="save-iin-button">
                  Сохранить
                </Button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">12-значный номер</p>
            </CardContent>
          </Card>

          {/* Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Удостоверение личности / Паспорт</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {documentPreview ? (
                <div>
                  <img
                    src={documentPreview}
                    alt="Document"
                    className="max-w-md rounded border shadow-sm"
                  />
                  <p className="text-xs text-neutral-500 mt-2">{user?.document_filename}</p>
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Upload className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
                  <p className="text-neutral-600">Документ не загружен</p>
                </div>
              )}

              <Label htmlFor="document" className="cursor-pointer">
                <Button variant="outline" className="w-full" disabled={uploading} asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? t('common.loading') : documentPreview ? 'Загрузить новый документ' : 'Загрузить документ'}
                  </span>
                </Button>
                <Input
                  id="document"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  data-testid="document-upload-input"
                />
              </Label>
              <p className="text-xs text-neutral-500">Поддерживаются: JPEG, PNG, PDF</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
