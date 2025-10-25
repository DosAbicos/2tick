import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import Header from '@/components/Header';
import { ArrowLeft, Upload, Edit2, Save, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [user, setUser] = useState(null);
  const [originalUser, setOriginalUser] = useState(null); // Store original for cancel
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Phone verification modal states
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [oldPhone, setOldPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [verificationMethod, setVerificationMethod] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    fetchUser();
  }, []);
  
  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      setOriginalUser(response.data); // Store original for cancel
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    setUser(originalUser); // Revert changes
    setIsEditing(false);
  };
  
  const validatePhone = (phone) => {
    // Check if phone is complete: +7 XXX XXX XX XX
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 11;
  };

  const handleSaveProfile = async () => {
    // Check if phone changed
    const phoneChanged = user.phone !== originalUser.phone;
    
    if (phoneChanged) {
      // Validate new phone format
      if (!validatePhone(user.phone)) {
        toast.error('Введите полный номер телефона');
        return;
      }
      
      // Show verification modal
      setOldPhone(originalUser.phone);
      setNewPhone(user.phone);
      setShowPhoneVerification(true);
      return;
    }
    
    // No phone change, save directly
    await saveProfileData();
  };
  
  const saveProfileData = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('full_name', user.full_name || '');
      formData.append('email', user.email || '');
      formData.append('phone', user.phone || '');
      formData.append('company_name', user.company_name || '');
      formData.append('iin', user.iin || '');
      formData.append('legal_address', user.legal_address || '');
      
      await axios.post(`${API}/auth/update-profile`, 
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      toast.success('Профиль обновлен');
      setIsEditing(false);
      fetchUser();
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };
  
  const handleRequestVerification = async (method) => {
    setCooldown(60);
    setVerificationMethod(method);
    toast.success(`Код отправлен через ${method === 'sms' ? 'SMS' : method === 'call' ? 'звонок' : 'Telegram'}`);
    // TODO: Add actual API call when backend endpoint is ready
  };
  
  const handleVerifyCode = async () => {
    if (otpCode.length < 4) {
      toast.error('Введите код');
      return;
    }
    
    setVerifying(true);
    try {
      // TODO: Add actual verification API call
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save profile with new phone
      await saveProfileData();
      setShowPhoneVerification(false);
      setOtpCode('');
      toast.success('Номер телефона обновлен!');
    } catch (error) {
      toast.error('Неверный код');
    } finally {
      setVerifying(false);
    }
  };
  
  const handleCancelVerification = () => {
    setUser({...user, phone: oldPhone}); // Revert phone
    setShowPhoneVerification(false);
    setVerificationMethod('');
    setOtpCode('');
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
          {/* Personal Info - FIRST */}
          <Card>
            <CardHeader>
              <CardTitle>Личные данные</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="full_name">ФИО</Label>
                <Input 
                  id="full_name"
                  value={user?.full_name || ''} 
                  onChange={(e) => setUser({...user, full_name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    value={user?.email || ''} 
                    onChange={(e) => setUser({...user, email: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input 
                    id="phone"
                    value={user?.phone || ''} 
                    onChange={(e) => setUser({...user, phone: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info - SECOND */}
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
                  onChange={(e) => setUser({...user, company_name: e.target.value})}
                  className="mt-1"
                  placeholder="ИП 'RentDomik'"
                />
              </div>
              <div>
                <Label htmlFor="iin">ИИН/БИН компании</Label>
                <Input
                  id="iin"
                  value={user?.iin || ''}
                  onChange={(e) => setUser({...user, iin: e.target.value})}
                  placeholder="123456789012"
                  className="mt-1"
                  data-testid="iin-input"
                />
              </div>
              <div>
                <Label htmlFor="legal_address">Юридический адрес</Label>
                <Input
                  id="legal_address"
                  value={user?.legal_address || ''}
                  onChange={(e) => setUser({...user, legal_address: e.target.value})}
                  className="mt-1"
                  placeholder="г. Алматы, ул. Абая 1"
                />
              </div>
              
              <Button 
                onClick={handleSaveProfile} 
                disabled={saving}
                className="w-full"
              >
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
