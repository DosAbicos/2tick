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
import { IMaskInput } from 'react-imask';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Change Password Component
const ChangePasswordSection = () => {
  const { t } = useTranslation();
  const token = localStorage.getItem('token');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async () => {
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.register.password_mismatch'));
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      toast.error('Новый пароль должен быть минимум 6 символов');
      return;
    }

    setChanging(true);

    try {
      await axios.post(
        `${API}/auth/change-password`,
        {
          old_password: oldPassword,
          new_password: newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success('Пароль успешно изменен');
      
      // Reset form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error('Неверный текущий пароль');
      } else {
        toast.error(error.response?.data?.detail || 'Ошибка при смене пароля');
      }
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="old_password">Текущий пароль</Label>
        <Input
          id="old_password"
          name="old_password"
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="mt-1"
          placeholder="Введите текущий пароль"
        />
      </div>

      <div>
        <Label htmlFor="new_password">Новый пароль</Label>
        <Input
          id="new_password"
          name="new_password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1"
          placeholder="Введите новый пароль"
        />
      </div>

      <div>
        <Label htmlFor="confirm_new_password">{t('auth.register.confirm_password')}</Label>
        <Input
          id="confirm_new_password"
          name="confirm_new_password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        onClick={handleChangePassword}
        disabled={changing || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
        className="w-full"
      >
        {changing ? 'Изменение...' : 'Изменить пароль'}
      </Button>
    </div>
  );
};

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
  
  const validateEmail = (email) => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSaveProfile = async () => {
    // Validate email format
    if (!validateEmail(user.email)) {
      toast.error('Введите корректный email адрес');
      return;
    }
    
    // Validate phone format
    if (!validatePhone(user.phone)) {
      toast.error('Введите полный номер телефона');
      return;
    }
    
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

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Профиль наймодателя</h1>
          {!isEditing ? (
            <Button onClick={handleEdit} variant="outline">
              <Edit2 className="mr-2 h-4 w-4" />
              Редактировать
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSaveProfile} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button onClick={handleCancel} variant="outline">
                <X className="mr-2 h-4 w-4" />
                Отменить
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Personal Info - FIRST */}
          <Card>
            <CardHeader>
              <CardTitle>Личные данные</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-xs text-blue-600 font-semibold">ID пользователя</Label>
                <div className="flex items-center justify-between mt-1">
                  <code className="text-sm font-mono text-blue-900">{user?.id}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(user?.id || '');
                      toast.success('ID скопирован в буфер обмена');
                    }}
                    className="h-6 text-xs"
                  >
                    Копировать
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="full_name">ФИО</Label>
                <Input 
                  id="full_name"
                  value={user?.full_name || ''} 
                  onChange={(e) => setUser({...user, full_name: e.target.value})}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={user?.email || ''} 
                    onChange={(e) => setUser({...user, email: e.target.value})}
                    disabled={!isEditing}
                    className={`mt-1 ${!validateEmail(user?.email || '') && user?.email ? 'border-red-500' : ''}`}
                    placeholder="example@mail.com"
                  />
                  {user?.email && !validateEmail(user?.email) && (
                    <p className="text-xs text-red-500 mt-1">Введите корректный email</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  {isEditing ? (
                    <IMaskInput
                      mask="+7 (000) 000-00-00"
                      value={user?.phone || ''}
                      onAccept={(value) => setUser({...user, phone: value})}
                      placeholder="+7 (___) ___-__-__"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                      id="phone"
                      name="phone"
                      type="tel"
                    />
                  ) : (
                    <Input 
                      id="phone"
                      value={user?.phone || ''} 
                      disabled={true}
                      className="mt-1"
                    />
                  )}
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
                  className="mt-1"
                  placeholder="г. Алматы, ул. Абая 1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Section - Password Change */}
          <Card>
            <CardHeader>
              <CardTitle>Безопасность</CardTitle>
              <CardDescription>Управление паролем и безопасностью аккаунта</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordSection />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Phone Verification Modal */}
      <Dialog open={showPhoneVerification} onOpenChange={setShowPhoneVerification}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Подтверждение нового номера</DialogTitle>
            <DialogDescription>
              Вы изменили номер телефона с {oldPhone} на {newPhone}. Подтвердите новый номер.
            </DialogDescription>
          </DialogHeader>
          
          {!verificationMethod ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600 mb-4">Выберите способ верификации:</p>
              <Button
                onClick={() => handleRequestVerification('sms')}
                disabled={cooldown > 0}
                className="w-full"
              >
                {cooldown > 0 ? `SMS (${cooldown}с)` : '📱 SMS-сообщение'}
              </Button>
              <Button
                onClick={() => handleRequestVerification('call')}
                disabled={cooldown > 0}
                className="w-full"
                variant="outline"
              >
                {cooldown > 0 ? `Звонок (${cooldown}с)` : '📞 Входящий звонок'}
              </Button>
              <Button
                onClick={() => handleRequestVerification('telegram')}
                disabled={cooldown > 0}
                className="w-full"
                variant="outline"
              >
                {cooldown > 0 ? `Telegram (${cooldown}с)` : '✈️ Telegram'}
              </Button>
              <Button
                onClick={handleCancelVerification}
                variant="ghost"
                className="w-full"
              >
                Отменить
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-neutral-600 mb-4">
                  Введите код из {verificationMethod === 'sms' ? 'SMS' : verificationMethod === 'call' ? 'звонка' : 'Telegram'}
                </p>
              </div>
              
              <div className="flex justify-center">
                <InputOTP 
                  maxLength={verificationMethod === 'call' ? 4 : 6} 
                  value={otpCode} 
                  onChange={setOtpCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    {verificationMethod !== 'call' && (
                      <>
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </>
                    )}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleVerifyCode}
                disabled={verifying || otpCode.length < (verificationMethod === 'call' ? 4 : 6)}
                className="w-full"
              >
                {verifying ? 'Проверка...' : 'Подтвердить'}
              </Button>

              <Button
                onClick={() => {
                  setVerificationMethod('');
                  setOtpCode('');
                }}
                variant="outline"
                className="w-full"
              >
                Выбрать другой способ
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
