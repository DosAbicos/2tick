import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import { CheckCircle, FileUp, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { IMaskInput } from 'react-imask';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SignContractPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [step, setStep] = useState(1); // 1: View, 1.5: Fill Info (if needed), 2: Upload, 3: Verify, 4: Success
  const [loading, setLoading] = useState(true);
  const [otpValue, setOtpValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [signatureHash, setSignatureHash] = useState('');
  
  // Call OTP states
  const [verificationMethod, setVerificationMethod] = useState(''); // 'sms', 'call', or 'telegram'
  const [callCode, setCallCode] = useState('');
  const [callHint, setCallHint] = useState('');
  const [requestingCall, setRequestingCall] = useState(false);
  
  // Telegram states
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramCode, setTelegramCode] = useState('');
  const [requestingTelegram, setRequestingTelegram] = useState(false);
  const [telegramDeepLink, setTelegramDeepLink] = useState('');
  const [loadingTelegramLink, setLoadingTelegramLink] = useState(false);
  
  // Cooldown states
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [callCooldown, setCallCooldown] = useState(0);
  const [telegramCooldown, setTelegramCooldown] = useState(0);
  
  // Signer info form
  const [signerInfo, setSignerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [needsInfo, setNeedsInfo] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (smsCooldown > 0) {
      const timer = setTimeout(() => setSmsCooldown(smsCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [smsCooldown]);

  useEffect(() => {
    if (callCooldown > 0) {
      const timer = setTimeout(() => setCallCooldown(callCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [callCooldown]);

  useEffect(() => {
    if (telegramCooldown > 0) {
      const timer = setTimeout(() => setTelegramCooldown(telegramCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [telegramCooldown]);

  useEffect(() => {
    fetchContract();
  }, [id]);

  // Pre-fetch Telegram deep link when step 3 is reached (for iOS compatibility)
  useEffect(() => {
    if (step === 3 && !telegramDeepLink && !loadingTelegramLink) {
      setLoadingTelegramLink(true);
      axios.get(`${API}/sign/${id}/telegram-deep-link`)
        .then(response => {
          setTelegramDeepLink(response.data.deep_link);
        })
        .catch(error => {
          console.error('Failed to pre-fetch Telegram link:', error);
        })
        .finally(() => {
          setLoadingTelegramLink(false);
        });
    }
  }, [step, telegramDeepLink, loadingTelegramLink, id]);

  const fetchContract = async () => {
    try {
      const response = await axios.get(`${API}/sign/${id}`);
      setContract(response.data);
      
      // Check if already signed
      if (response.data.status === 'pending-signature' || response.data.status === 'signed') {
        setStep(4); // Go directly to success
      } else {
        // Check if we need additional info
        const needsName = !response.data.signer_name;
        const needsPhone = !response.data.signer_phone;
        const needsEmail = !response.data.signer_email;
        
        if (needsName || needsPhone || needsEmail) {
          setNeedsInfo(true);
        }
      }
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await axios.post(`${API}/sign/${id}/upload-document`, formData);
      toast.success('Документ загружен');
      setStep(3); // Go to method selection, no auto-send
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  const validateEmail = (email) => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSaveSignerInfo = async () => {
    // Validate required fields
    if (needsInfo) {
      if (!contract.signer_name && !signerInfo.name) {
        toast.error('Пожалуйста, укажите ФИО');
        return;
      }
      if (!contract.signer_phone && !signerInfo.phone) {
        toast.error('Пожалуйста, укажите телефон');
        return;
      }
    }
    
    // Validate email if provided
    if (signerInfo.email && !validateEmail(signerInfo.email)) {
      toast.error('Введите корректный email адрес');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/sign/${id}/update-signer-info`, {
        signer_name: signerInfo.name || undefined,
        signer_phone: signerInfo.phone || undefined,
        signer_email: signerInfo.email || undefined
      });
      
      // Update local contract state with response from backend
      if (response.data.contract) {
        setContract(prev => ({
          ...prev,
          signer_name: response.data.contract.signer_name || prev.signer_name,
          signer_phone: response.data.contract.signer_phone || prev.signer_phone,
          signer_email: response.data.contract.signer_email || prev.signer_email,
          content: response.data.contract.content || prev.content // Update content as well
        }));
      }
      
      toast.success('Информация сохранена');
      
      // Check if document is already uploaded by landlord
      // If so, skip upload step and go directly to verification
      if (contract.signature?.document_upload) {
        setStep(3); // Skip to verification step
      } else {
        setStep(2); // Move to upload step
      }
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleRequestOTP = async (method = 'sms') => {
    if (smsCooldown > 0) return;
    
    try {
      const response = await axios.post(`${API}/sign/${id}/request-otp?method=${method}`);
      setMockOtp(response.data.mock_otp);
      toast.success(`OTP sent! Mock code: ${response.data.mock_otp}`);
      setSmsCooldown(60); // 60 seconds cooldown
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleRequestCallOTP = async () => {
    if (callCooldown > 0) return;
    
    setRequestingCall(true);
    try {
      const response = await axios.post(`${API}/sign/${id}/request-call-otp`);
      toast.success(response.data.message);
      setCallHint(response.data.hint);
      setVerificationMethod('call');
      setCallCooldown(60); // 60 seconds cooldown
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при звонке');
    } finally {
      setRequestingCall(false);
    }
  };

  const handleRequestTelegramOTP = async () => {
    if (telegramCooldown > 0 || !telegramUsername.trim()) return;
    
    setRequestingTelegram(true);
    try {
      const response = await axios.post(`${API}/sign/${id}/request-telegram-otp`, {
        telegram_username: telegramUsername
      });
      toast.success(response.data.message);
      setVerificationMethod('telegram');
      setTelegramCooldown(60);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка Telegram');
    } finally {
      setRequestingTelegram(false);
    }
  };

  const handleVerifyTelegramOTP = async () => {
    if (telegramCode.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }
    
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/sign/${id}/verify-telegram-otp`, {
        code: telegramCode
      });
      
      if (response.data.verified) {
        toast.success('Верификация успешна!');
        setStep(4);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Неверный код');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyCallOTP = async () => {
    if (callCode.length !== 4) {
      toast.error('Введите 4 цифры');
      return;
    }
    
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/sign/${id}/verify-call-otp`, {
        code: callCode
      });
      
      if (response.data.verified) {
        toast.success('Верификация успешна!');
        setStep(4); // Move to success
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Неверный код');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6) {
      toast.error('Please enter 6-digit code');
      return;
    }
    
    setVerifying(true);
    try {
      // Use the actual phone from contract (which may have been updated by signer)
      const phoneToUse = contract.signer_phone || signerInfo.phone;
      
      const response = await axios.post(`${API}/sign/${id}/verify-otp`, {
        contract_id: id,
        phone: phoneToUse,
        otp_code: otpValue
      });
      
      if (response.data.signature_hash) {
        setSignatureHash(response.data.signature_hash);
      }
      
      toast.success(t('signing.success'));
      setStep(4);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (!contract) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card data-testid="sign-contract-card">
          <CardHeader>
            <CardTitle className="text-2xl" data-testid="signing-title">{t('signing.title')}</CardTitle>
            <p className="text-neutral-600">{contract.title}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: View Contract */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid="step-view-contract"
              >
                <div className="bg-neutral-50 p-4 rounded-lg border mb-6">
                  {contract.content_type === 'html' ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      style={{
                        fontFamily: 'IBM Plex Sans, sans-serif',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}
                      dangerouslySetInnerHTML={{ __html: contract.content }}
                      data-testid="contract-preview"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm" data-testid="contract-preview">{contract.content}</pre>
                  )}
                </div>
                <Button
                  onClick={() => {
                    if (needsInfo) {
                      setStep(1.5); // Go to info filling step
                    } else {
                      setStep(2); // Go directly to upload
                    }
                  }}
                  className="w-full"
                  data-testid="proceed-to-upload-button"
                >
                  Proceed to Verification
                </Button>
              </motion.div>
            )}

            {/* Step 1.5: Fill Missing Info */}
            {step === 1.5 && needsInfo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
                data-testid="step-fill-info"
              >
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold mb-2">Заполните ваши данные</h3>
                  <p className="text-neutral-600 text-sm">Для подписания договора необходима дополнительная информация</p>
                </div>
                
                {!contract.signer_name && (
                  <div>
                    <Label htmlFor="signer_name">ФИО *</Label>
                    <Input
                      id="signer_name"
                      value={signerInfo.name}
                      onChange={(e) => setSignerInfo({...signerInfo, name: e.target.value})}
                      required
                      data-testid="signer-name-input"
                      className="mt-1"
                      placeholder="Иванов Иван Иванович"
                    />
                  </div>
                )}
                
                {!contract.signer_phone && (
                  <div>
                    <Label htmlFor="signer_phone">Номер телефона *</Label>
                    <IMaskInput
                      mask="+7 (000) 000-00-00"
                      value={signerInfo.phone}
                      onAccept={(value) => setSignerInfo({...signerInfo, phone: value})}
                      placeholder="+7 (___) ___-__-__"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                      id="signer_phone"
                      type="tel"
                      required
                      data-testid="signer-phone-input"
                    />
                  </div>
                )}
                
                {!contract.signer_email && (
                  <div>
                    <Label htmlFor="signer_email">Email</Label>
                    <Input
                      id="signer_email"
                      type="email"
                      value={signerInfo.email}
                      onChange={(e) => setSignerInfo({...signerInfo, email: e.target.value})}
                      data-testid="signer-email-input"
                      className={`mt-1 ${signerInfo.email && !validateEmail(signerInfo.email) ? 'border-red-500' : ''}`}
                      placeholder="example@mail.com"
                    />
                    {signerInfo.email && !validateEmail(signerInfo.email) && (
                      <p className="text-xs text-red-500 mt-1">Введите корректный email</p>
                    )}
                  </div>
                )}
                
 
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="flex-1"
                    data-testid="back-to-view-button"
                  >
                    ← Назад
                  </Button>
                  <Button
                    onClick={handleSaveSignerInfo}
                    className="flex-1"
                    data-testid="save-signer-info-button"
                  >
                    Продолжить →
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Upload Document - only show if document not already uploaded */}
            {step === 2 && !contract.signature?.document_upload && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
                data-testid="step-upload-document"
              >
                <div className="text-center">
                  <FileUp className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('signing.upload_document')}</h3>
                  <p className="text-neutral-600 text-sm mb-4">Upload your ID or passport for verification</p>
                </div>
                
                <div>
                  <Label htmlFor="document" className="cursor-pointer">
                    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <Input
                        id="document"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        data-testid="document-upload-input"
                      />
                      <p className="text-sm text-neutral-600">
                        {uploading ? t('common.loading') : 'Click to upload or drag and drop'}
                      </p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1.5)}
                    className="flex-1"
                    data-testid="back-to-info-button"
                  >
                    ← Назад
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Verify OTP */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
                data-testid="step-verify-otp"
              >
                {!verificationMethod ? (
                  // Method selection
                  <div className="text-center">
                    <Phone className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Выберите способ верификации</h3>
                    <p className="text-neutral-600 text-sm mb-6">
                      Как удобнее подтвердить подписание?
                    </p>
                    
                    <div className="space-y-3">
                      <Button
                        onClick={() => {
                          setVerificationMethod('sms');
                          handleRequestOTP('sms');
                        }}
                        disabled={smsCooldown > 0}
                        className="w-full"
                        variant="outline"
                      >
                        📱 {smsCooldown > 0 ? `SMS через ${smsCooldown}с` : 'SMS код (6 цифр)'}
                      </Button>
                      
                      <Button
                        onClick={handleRequestCallOTP}
                        disabled={requestingCall || callCooldown > 0}
                        className="w-full"
                        variant="outline"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {requestingCall ? 'Звоним...' : callCooldown > 0 ? `Звонок через ${callCooldown}с` : 'Входящий звонок (4 цифры)'}
                      </Button>
                      
                      {telegramDeepLink ? (
                        <a
                          href={telegramDeepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setVerificationMethod('telegram');
                            toast.success('Откройте Telegram и скопируйте код');
                          }}
                          className="block w-full bg-[#0088cc] hover:bg-[#0077b3] text-white text-center py-3 px-4 rounded-lg font-medium transition-colors no-underline"
                        >
                          💬 Получить код в Telegram
                        </a>
                      ) : (
                        <Button
                          disabled={true}
                          className="w-full bg-[#0088cc] opacity-50"
                          variant="default"
                        >
                          💬 {loadingTelegramLink ? 'Загрузка...' : 'Получить код в Telegram'}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : verificationMethod === 'sms' ? (
                  // SMS verification
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl mb-4">📱</div>
                      <h3 className="text-lg font-semibold mb-2">Введите SMS код</h3>
                      {mockOtp && (
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
                          <p className="text-sm text-amber-900">Mock code: <strong>{mockOtp}</strong></p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otpValue}
                        onChange={setOtpValue}
                        data-testid="otp-input"
                      >
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot key={index} index={index} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setVerificationMethod('')}
                        className="flex-1"
                      >
                        ← Назад
                      </Button>
                      <Button
                        onClick={handleVerifyOTP}
                        disabled={verifying || otpValue.length !== 6}
                        className="flex-1"
                        data-testid="otp-verify-button"
                      >
                        {verifying ? 'Проверяем...' : 'Подтвердить'}
                      </Button>
                    </div>
                    
                    <button
                      onClick={() => handleRequestOTP('sms')}
                      disabled={smsCooldown > 0}
                      className="w-full text-sm text-primary hover:underline disabled:opacity-50"
                    >
                      {smsCooldown > 0 ? `Повторить через ${smsCooldown}с` : 'Отправить код повторно'}
                    </button>
                  </div>
                ) : verificationMethod === 'call' ? (
                  // Call verification
                  <div className="space-y-4">
                    <div className="text-center">
                      <Phone className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Введите последние 4 цифры</h3>
                      {callHint && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                          <p className="text-sm text-blue-900">{callHint}</p>
                        </div>
                      )}
                    </div>
                    
                    <input
                      type="text"
                      maxLength={4}
                      value={callCode}
                      onChange={(e) => setCallCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 text-center text-2xl tracking-widest border rounded-lg"
                      placeholder="_ _ _ _"
                      data-testid="call-code-input"
                    />
                    
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setVerificationMethod('')}
                        className="flex-1"
                      >
                        ← Назад
                      </Button>
                      <Button
                        onClick={handleVerifyCallOTP}
                        disabled={verifying || callCode.length !== 4}
                        className="flex-1"
                        data-testid="call-verify-button"
                      >
                        {verifying ? 'Проверяем...' : 'Подтвердить'}
                      </Button>
                    </div>
                  </div>
                ) : verificationMethod === 'telegram' ? (
                  // Telegram verification
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl mb-4">💬</div>
                      <h3 className="text-lg font-semibold mb-2">Введите код из Telegram</h3>
                      <p className="text-sm text-neutral-600 mb-4">
                        Скопируйте код из чата с ботом @twotick_bot
                      </p>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                        <p className="text-xs text-blue-900">
                          💡 Код отправлен в Telegram. Если не получили - нажмите кнопку ниже
                        </p>
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      maxLength={6}
                      value={telegramCode}
                      onChange={(e) => setTelegramCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 text-center text-2xl tracking-widest border rounded-lg"
                      placeholder="_ _ _ _ _ _"
                      data-testid="telegram-code-input"
                      autoFocus
                    />
                    
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setVerificationMethod('')}
                        className="flex-1"
                      >
                        ← Назад
                      </Button>
                      <Button
                        onClick={handleVerifyTelegramOTP}
                        disabled={verifying || telegramCode.length !== 6}
                        className="flex-1"
                        data-testid="telegram-verify-button"
                      >
                        {verifying ? 'Проверяем...' : 'Подтвердить'}
                      </Button>
                    </div>
                    
                    <a
                      href={telegramDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-sm text-center text-primary hover:underline"
                    >
                      🔄 Отправить код повторно (открыть Telegram)
                    </a>
                  </div>
                ) : null}}
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
                data-testid="step-success"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">{t('signing.success')}</h3>
                <p className="text-neutral-600">Создатель договора получит уведомление и проверит вашу подпись.</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignContractPage;