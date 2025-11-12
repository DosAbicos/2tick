import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import Header from '@/components/Header';
import { CheckCircle, CheckCircle2, FileUp, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { IMaskInput } from 'react-imask';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SignContractPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [step, setStep] = useState(1); // 1: View, 1.5: Fill Info, 2: Upload, 4: Final Review, 5: Verify, 6: Success
  const [loading, setLoading] = useState(true);
  const [otpValue, setOtpValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [documentUploaded, setDocumentUploaded] = useState(false); // Track if document is uploaded
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
  
  // Template and placeholder states
  const [template, setTemplate] = useState(null);
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [unfilledPlaceholders, setUnfilledPlaceholders] = useState([]);

  // Function to highlight placeholders in content
  const highlightPlaceholders = (content) => {
    if (!content) return '';
    
    let result = content;
    
    // Regular expression to match placeholders like [Label]
    const placeholderRegex = /\[([^\]]+)\]/g;
    
    result = result.replace(placeholderRegex, (match, label) => {
      // Check if this placeholder has a value
      let isFilled = false;
      let value = match;
      
      // Map common placeholder labels to contract fields
      if (label.includes('ФИО') || label.includes('Нанимателя')) {
        isFilled = !!contract?.signer_name;
        value = contract?.signer_name || match;
      } else if (label.includes('Телефон')) {
        isFilled = !!contract?.signer_phone;
        value = contract?.signer_phone || match;
      } else if (label.includes('Email') || label.includes('Почта')) {
        isFilled = !!contract?.signer_email;
        value = contract?.signer_email || match;
      } else if (label.includes('Дата заселения')) {
        isFilled = !!contract?.move_in_date;
        value = contract?.move_in_date || match;
      } else if (label.includes('Дата выселения')) {
        isFilled = !!contract?.move_out_date;
        value = contract?.move_out_date || match;
      } else if (label.includes('Адрес')) {
        isFilled = !!contract?.property_address;
        value = contract?.property_address || match;
      } else if (label.includes('Цена') || label.includes('сутки')) {
        isFilled = !!contract?.rent_amount;
        value = contract?.rent_amount || match;
      } else if (label.includes('суток') || label.includes('Количество')) {
        isFilled = !!contract?.days_count;
        value = contract?.days_count || match;
      }
      
      const highlightClass = isFilled 
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
        : 'bg-amber-50 border-amber-200 text-amber-700';
      
      return `<span class="inline-block px-2 py-0.5 rounded-md border ${highlightClass} font-medium transition-all duration-300 shadow-sm">${value}</span>`;
    });
    
    return result;
  };

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
      const contractData = response.data;
      setContract(contractData);
      
      // Load template if contract was created from template
      let unfilledTenantPlaceholders = [];
      if (contractData.template_id) {
        try {
          const templateResponse = await axios.get(`${API}/templates/${contractData.template_id}`);
          setTemplate(templateResponse.data);
          
          // Initialize placeholder values with existing values
          const existingValues = contractData.placeholder_values || {};
          setPlaceholderValues(existingValues);
          
          console.log('Debug SignContractPage:');
          console.log('contractData.placeholder_values:', contractData.placeholder_values);
          console.log('existingValues:', existingValues);
          
          // Find unfilled REQUIRED placeholders for tenant/signer
          const unfilled = [];
          if (templateResponse.data.placeholders) {
            Object.entries(templateResponse.data.placeholders).forEach(([key, config]) => {
              // Skip calculated fields
              if (config.type === 'calculated') return;
              
              // Check if this is a tenant/signer placeholder
              const isTenantField = config.owner === 'tenant' || config.owner === 'signer';
              
              // Check if placeholder value is not filled in placeholder_values
              const value = existingValues[key];
              const isNotFilled = !value || (typeof value === 'string' && value.trim() === '');
              
              console.log(`Placeholder ${key}:`, {
                owner: config.owner,
                isTenantField,
                required: config.required,
                value: value,
                isNotFilled,
                willAddToUnfilled: isTenantField && config.required && isNotFilled
              });
              
              // КРИТИЧНО: Только обязательные незаполненные tenant поля
              if (isTenantField && config.required && isNotFilled) {
                unfilled.push({ key, config });
              }
            });
          }
          
          console.log('Final unfilled REQUIRED placeholders:', unfilled);
          setUnfilledPlaceholders(unfilled);
          unfilledTenantPlaceholders = unfilled;
        } catch (err) {
          console.error('Error loading template:', err);
        }
      }
      
      // Check if document already uploaded by landlord
      if (contractData.signature?.document_upload) {
        setDocumentUploaded(true);
      }
      
      // Check if already signed
      if (contractData.status === 'signed') {
        setStep(6); // Go directly to success
      } else {
        // Always start with step 1 - contract review
        setStep(1);
        
        // Check if we need additional info
        let needsInfoFlag = false;
        
        // If contract has template, check unfilled tenant placeholders
        if (contractData.template_id) {
          // ИСПРАВЛЕНО: Проверяем только если есть незаполненные ОБЯЗАТЕЛЬНЫЕ поля
          needsInfoFlag = unfilledTenantPlaceholders.length > 0;
          console.log('needsInfoFlag based on unfilled required placeholders:', needsInfoFlag);
        } else {
          // For old contracts without template, check old fields
          // Also check for "Не указано" for backwards compatibility
          const needsName = !contractData.signer_name || contractData.signer_name === 'Не указано';
          const needsPhone = !contractData.signer_phone;
          const needsEmail = !contractData.signer_email;
          
          // Show form if ANY required field is missing
          if (needsName || needsPhone || needsEmail) {
            needsInfoFlag = true;
          }
        }
        
        setNeedsInfo(needsInfoFlag);
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
      toast.success('Документ загружен успешно!');
      setDocumentUploaded(true); // Mark as uploaded
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
    // If contract has template with placeholders, validate them
    if (template && unfilledPlaceholders.length > 0) {
      // Check if all required placeholders are filled
      for (const { key, config } of unfilledPlaceholders) {
        if (config.required && !placeholderValues[key]) {
          toast.error(`Пожалуйста, заполните поле: ${config.label}`);
          return;
        }
      }
      
      // Save placeholder values to contract using public endpoint
      try {
        const mergedValues = { ...contract.placeholder_values, ...placeholderValues };
        console.log('Saving placeholder values:', mergedValues);
        
        const response = await axios.post(`${API}/sign/${id}/update-signer-info`, {
          placeholder_values: mergedValues
        });
        
        // Reload contract from backend to get updated content
        const updatedContractResponse = await axios.get(`${API}/sign/${id}`);
        setContract(updatedContractResponse.data);
        
        // Mark that all required info is now filled
        setNeedsInfo(false);
        
        toast.success('Информация сохранена');
        
        // Always move to document step after saving info
        setStep(2);
      } catch (error) {
        console.error('Error saving placeholder values:', error);
        toast.error(error.response?.data?.detail || t('common.error'));
      }
    } else {
      // For old contracts without template, validate old fields
      if (needsInfo) {
        if ((!contract.signer_name || contract.signer_name === 'Не указано') && !signerInfo.name) {
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
        
        // Reload contract from backend to get updated content
        const updatedContractResponse = await axios.get(`${API}/sign/${id}`);
        setContract(updatedContractResponse.data);
        
        // Mark that all required info is now filled
        setNeedsInfo(false);
        
        toast.success('Информация сохранена');
        
        // Always move to document step after saving info
        setStep(2);
      } catch (error) {
        toast.error(t('common.error'));
      }
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
      // Save placeholder values before signing if there are any unfilled placeholders
      if (unfilledPlaceholders.length > 0 && template) {
        // Update contract with filled placeholder values
        await axios.patch(`${API}/contracts/${id}`, {
          placeholder_values: { ...contract.placeholder_values, ...placeholderValues }
        });
      }
      
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
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="minimal-card p-6 sm:p-8 animate-fade-in" data-testid="sign-contract-card">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3" data-testid="signing-title">{t('signing.title')}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              {contract.contract_code && (
                <div className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20">
                  {contract.contract_code}
                </div>
              )}
              <p className="text-gray-600 font-medium">{contract.title}</p>
            </div>
          </div>
          <div className="space-y-6">
            {/* Step 1: View Contract */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid="step-view-contract"
              >
                <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                  <div 
                    className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800"
                    style={{
                      fontFamily: 'IBM Plex Sans, sans-serif',
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightPlaceholders(contract.content) }}
                    data-testid="contract-preview"
                  />
                </div>
                
                <button
                  onClick={() => {
                    if (needsInfo) {
                      setStep(1.5); // Go to info filling step
                    } else {
                      setStep(2); // Go directly to upload
                    }
                  }}
                  className="w-full py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30"
                  data-testid="proceed-button"
                >
                  Продолжить →
                </button>
              </motion.div>
            )}

            {/* Step 1.5: Fill Missing Info */}
            {step === 1.5 && (
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
                
                {/* If contract has template with unfilled placeholders, show them */}
                {template && unfilledPlaceholders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {unfilledPlaceholders.map(({ key, config }) => (
                      <div key={key} className={config.type === 'text' && config.label.length > 20 ? 'md:col-span-2' : ''}>
                        <label htmlFor={`placeholder_${key}`} className="text-sm font-medium text-gray-700 block mb-2">
                          {config.label} {config.required && <span className="text-red-500">*</span>}
                        </label>
                        
                        {config.type === 'text' && (
                          <input
                            id={`placeholder_${key}`}
                            value={placeholderValues[key] || ''}
                            onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                            className="minimal-input w-full mt-1"
                            placeholder={`Введите ${config.label.toLowerCase()}`}
                            required={config.required}
                          />
                        )}
                        
                        {config.type === 'number' && (
                          <input
                            id={`placeholder_${key}`}
                            type="number"
                            value={placeholderValues[key] || ''}
                            onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                            className="minimal-input w-full mt-1"
                            placeholder={`Введите ${config.label.toLowerCase()}`}
                            required={config.required}
                          />
                        )}
                        
                        {config.type === 'date' && (
                          <input
                            id={`placeholder_${key}`}
                            type="date"
                            value={placeholderValues[key] || ''}
                            onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                            className="minimal-input w-full mt-1"
                            required={config.required}
                          />
                        )}
                        
                        {config.type === 'phone' && (
                          <IMaskInput
                            mask="+7 (000) 000-00-00"
                            value={placeholderValues[key] || ''}
                            onAccept={(value) => setPlaceholderValues({...placeholderValues, [key]: value})}
                            placeholder="+7 (___) ___-__-__"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                            id={`placeholder_${key}`}
                            type="tel"
                          />
                        )}
                        
                        {config.type === 'email' && (
                          <input
                            id={`placeholder_${key}`}
                            type="email"
                            value={placeholderValues[key] || ''}
                            onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                            className="minimal-input w-full mt-1"
                            placeholder="example@email.com"
                            required={config.required}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // For old contracts without template, show old fields
                  <>
                    {(!contract.signer_name || contract.signer_name === 'Не указано') && (
                      <div>
                        <label htmlFor="signer_name" className="text-sm font-medium text-gray-700 block mb-2">ФИО *</label>
                        <input
                          id="signer_name"
                          value={signerInfo.name}
                          onChange={(e) => setSignerInfo({...signerInfo, name: e.target.value})}
                          required
                          data-testid="signer-name-input"
                          className="minimal-input w-full"
                          placeholder="Иванов Иван Иванович"
                        />
                      </div>
                    )}
                    
                    {!contract.signer_phone && (
                      <div>
                        <label htmlFor="signer_phone" className="text-sm font-medium text-gray-700 block mb-2">Номер телефона *</label>
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
                    
                    {(!contract.signer_email) && (
                      <div>
                        <label htmlFor="signer_email" className="text-sm font-medium text-gray-700 block mb-2">Email</label>
                        <input
                          id="signer_email"
                          type="email"
                          value={signerInfo.email}
                          onChange={(e) => setSignerInfo({...signerInfo, email: e.target.value})}
                          data-testid="signer-email-input"
                          className={`minimal-input w-full ${signerInfo.email && !validateEmail(signerInfo.email) ? 'border-red-500' : ''}`}
                          placeholder="example@mail.com"
                        />
                        {signerInfo.email && !validateEmail(signerInfo.email) && (
                          <p className="text-xs text-red-500 mt-1">Введите корректный email</p>
                        )}
                      </div>
                    )}
                  </>
                )}
                
 
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                    data-testid="back-to-view-button"
                  >
                    ← Назад
                  </button>
                  <button
                    onClick={handleSaveSignerInfo}
                    className="flex-1 py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20"
                    data-testid="save-signer-info-button"
                  >
                    Сохранить и продолжить →
                  </button>
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
                  <label htmlFor="document" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                      <input
                        id="document"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        data-testid="document-upload-input"
                      />
                      <p className="text-sm text-gray-600">
                        {uploading ? t('common.loading') : 'Click to upload or drag and drop'}
                      </p>
                    </div>
                  </label>
                </div>
                
                {documentUploaded && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Документ успешно загружен!</span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  {!documentUploaded ? (
                    <button
                      onClick={() => setStep(needsInfo ? 1.5 : 1)}
                      className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                      data-testid="back-to-info-button"
                    >
                      ← Назад
                    </button>
                  ) : null}
                  {documentUploaded && (
                    <>
                      <button
                        onClick={() => setStep(needsInfo ? 1.5 : 1)}
                        className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                      >
                        ← Назад
                      </button>
                      <button
                        onClick={() => setStep(4)}
                        className="flex-1 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20"
                      >
                        Ознакомиться с договором →
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* Step 2 Alternative: Document already uploaded by landlord */}
            {step === 2 && contract.signature?.document_upload && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
                data-testid="step-document-already-uploaded"
              >
                <div className="text-center mb-6">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Документ уже загружен</h3>
                  <p className="text-neutral-600">Наймодатель загрузил ваше удостоверение личности</p>
                </div>
                
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileUp className="h-5 w-5 text-green-600" />
                      Загруженный документ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="relative group">
                      <img 
                        src={`data:image/jpeg;base64,${contract.signature.document_upload}`} 
                        alt="Document" 
                        className="w-full max-w-2xl mx-auto rounded-lg shadow-lg border-2 border-neutral-200 transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        ✓ Проверено
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">ℹ️</span>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 mb-1">Документ защищен</p>
                      <p className="text-sm text-blue-800">
                        Этот документ был загружен и проверен наймодателем. Изменение невозможно.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep(needsInfo ? 1.5 : 1)}
                    className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    ← Назад
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="flex-1 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20"
                  >
                    Ознакомиться с договором →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Final Review */}
            {step === 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
                data-testid="step-final-review"
              >
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Финальная проверка договора</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Внимательно проверьте все данные перед подписанием
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 max-h-[500px] overflow-y-auto">
                  <div 
                    className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800"
                    style={{
                      fontFamily: 'IBM Plex Sans, sans-serif',
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightPlaceholders(contract.content) }}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    ← Назад
                  </button>
                  <button
                    onClick={() => setStep(5)}
                    className="flex-1 py-4 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-lg shadow-green-500/30"
                    data-testid="sign-button"
                  >
                    Всё верно, подписать договор →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Verify OTP */}
            {step === 5 && (
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
                      <button
                        onClick={() => {
                          setVerificationMethod('sms');
                          handleRequestOTP('sms');
                        }}
                        disabled={smsCooldown > 0}
                        className="w-full py-4 px-4 text-base font-medium text-gray-700 bg-white border-2 border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        📱 {smsCooldown > 0 ? `SMS через ${smsCooldown}с` : 'SMS код (6 цифр)'}
                      </button>
                      
                      <button
                        onClick={handleRequestCallOTP}
                        disabled={requestingCall || callCooldown > 0}
                        className="w-full py-4 px-4 text-base font-medium text-gray-700 bg-white border-2 border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Phone className="h-4 w-4" />
                        {requestingCall ? 'Звоним...' : callCooldown > 0 ? `Звонок через ${callCooldown}с` : 'Входящий звонок (4 цифры)'}
                      </button>
                      
                      {telegramDeepLink ? (
                        <a
                          href={telegramDeepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setVerificationMethod('telegram');
                            toast.success('Откройте Telegram и скопируйте код');
                          }}
                          className="block w-full bg-gradient-to-r from-[#0088cc] to-[#0077b3] hover:from-[#0077b3] hover:to-[#006699] text-white text-center py-4 px-4 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 no-underline"
                        >
                          💬 Получить код в Telegram
                        </a>
                      ) : (
                        <button
                          disabled={true}
                          className="w-full py-4 px-4 text-base font-semibold text-white bg-[#0088cc] opacity-50 rounded-xl cursor-not-allowed"
                        >
                          💬 {loadingTelegramLink ? 'Загрузка...' : 'Получить код в Telegram'}
                        </button>
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
                      <button
                        onClick={() => setVerificationMethod('')}
                        className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                      >
                        ← Назад
                      </button>
                      <button
                        onClick={handleVerifyOTP}
                        disabled={verifying || otpValue.length !== 6}
                        className="flex-1 py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="otp-verify-button"
                      >
                        {verifying ? 'Проверяем...' : 'Подтвердить'}
                      </button>
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
                      <button
                        onClick={() => setVerificationMethod('')}
                        className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                      >
                        ← Назад
                      </button>
                      <button
                        onClick={handleVerifyCallOTP}
                        disabled={verifying || callCode.length !== 4}
                        className="flex-1 py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="call-verify-button"
                      >
                        {verifying ? 'Проверяем...' : 'Подтвердить'}
                      </button>
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
                      <button
                        onClick={() => setVerificationMethod('')}
                        className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                      >
                        ← Назад
                      </button>
                      <button
                        onClick={handleVerifyTelegramOTP}
                        disabled={verifying || telegramCode.length !== 6}
                        className="flex-1 py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="telegram-verify-button"
                      >
                        {verifying ? 'Проверяем...' : 'Подтвердить'}
                      </button>
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
                ) : null}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignContractPage;