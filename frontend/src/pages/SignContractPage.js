import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import { CheckCircle, CheckCircle2, FileUp, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { IMaskInput } from 'react-imask';
import { computeAllCalculatedFields } from '@/utils/calculatorUtils';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SignContractPage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  // Initialize step from localStorage if available
  const getInitialStep = () => {
    const savedState = localStorage.getItem(`contract_${id}_state`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        console.log('🔄 Initializing from localStorage, step:', parsed.step);
        return parsed.step || 1;
      } catch (e) {
        return 1;
      }
    }
    return 1;
  };
  
  // Initialize from localStorage functions
  const getInitialDocumentUploaded = () => {
    const savedState = localStorage.getItem(`contract_${id}_state`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        return parsed.documentUploaded || false;
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  const [step, setStep] = useState(getInitialStep); // 1: View, 1.5: Fill Info, 2: Upload, 4: Final Review, 5: Verify, 6: Success
  const [loading, setLoading] = useState(true);
  const [otpValue, setOtpValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [documentUploaded, setDocumentUploaded] = useState(getInitialDocumentUploaded); // Track if document is uploaded
  const [verifying, setVerifying] = useState(false);
  const [signatureHash, setSignatureHash] = useState('');
  
  // Language states
  const [contractLanguage, setContractLanguage] = useState(null); // ФИКСИРОВАННЫЙ язык договора
  const [contractLanguageLocked, setContractLanguageLocked] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showEnglishWarning, setShowEnglishWarning] = useState(false);
  const [englishDisclaimerAccepted, setEnglishDisclaimerAccepted] = useState(false);

  // Get localized contract title
  const getLocalizedTitle = () => {
    if (!contract) return '';
    const lang = i18n.language;
    
    // If contract has localized titles, use them
    if (lang === 'kk' && contract.title_kk) return contract.title_kk;
    if (lang === 'en' && contract.title_en) return contract.title_en;
    
    // Otherwise, try to translate the title pattern "Договор № XXX от YYYY-MM-DD"
    const title = contract.title || '';
    const contractMatch = title.match(/^Договор\s*№?\s*(\S+)\s*от\s*(\d{4}-\d{2}-\d{2})$/);
    
    if (contractMatch) {
      const contractNum = contractMatch[1];
      const dateStr = contractMatch[2];
      // Format date as dd-mm-yyyy
      const [year, month, day] = dateStr.split('-');
      const formattedDate = `${day}-${month}-${year}`;
      
      // Return translated title
      if (lang === 'kk') return `Келісімшарт № ${contractNum} ${formattedDate} күні`;
      if (lang === 'en') return `Contract № ${contractNum} dated ${formattedDate}`;
      return `Договор № ${contractNum} от ${formattedDate}`;
    }
    
    return title;
  };
  
  // Check if contract language is already set
  useEffect(() => {
    if (!contract) return;
    
    const lang = contract.contract_language;
    if (lang) {
      // Contract language already locked
      setContractLanguage(lang);
      setContractLanguageLocked(true);
      setShowLanguageSelector(false);
      
      // CRITICAL: Ensure UI language matches contract language
      const currentUiLang = i18n.language;
      if (currentUiLang !== lang) {
        // Set both localStorage keys
        localStorage.setItem('i18nextLng', lang);
        localStorage.setItem('language', lang);
        // Change language without reload (contract already has language set)
        i18n.changeLanguage(lang);
      }
    } else {
      // Need to select contract language
      setShowLanguageSelector(true);
    }
  }, [contract]); // Remove i18n from dependencies
  
  // Initialize verificationMethod from localStorage (important for iOS Chrome return from Telegram)
  const getInitialVerificationMethod = () => {
    const savedState = localStorage.getItem(`contract_${id}_state`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.verificationMethod) {
          console.log('🔄 Restoring verificationMethod from localStorage:', parsed.verificationMethod);
          return parsed.verificationMethod;
        }
      } catch (e) {
        return '';
      }
    }
    return '';
  };
  
  // Call OTP states
  const [verificationMethod, setVerificationMethod] = useState(getInitialVerificationMethod); // 'sms', 'call', or 'telegram'
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
  
  // Progressive cooldown tracking
  const [smsRequestCount, setSmsRequestCount] = useState(0);
  const [callRequestCount, setCallRequestCount] = useState(0);
  const [smsFirstEntry, setSmsFirstEntry] = useState(true);
  const [callFirstEntry, setCallFirstEntry] = useState(true);
  const [sendingCode, setSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  
  // Initialize from localStorage if available
  const getInitialSignerInfo = () => {
    const savedState = localStorage.getItem(`contract_${id}_state`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        return parsed.signerInfo || { name: '', phone: '', email: '' };
      } catch (e) {
        return { name: '', phone: '', email: '' };
      }
    }
    return { name: '', phone: '', email: '' };
  };
  
  const getInitialPlaceholderValues = () => {
    const savedState = localStorage.getItem(`contract_${id}_state`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        return parsed.placeholderValues || {};
      } catch (e) {
        return {};
      }
    }
    return {};
  };
  
  const getInitialUnfilledPlaceholders = () => {
    const savedState = localStorage.getItem(`contract_${id}_state`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        return parsed.unfilledPlaceholders || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };
  
  // Signer info form
  const [signerInfo, setSignerInfo] = useState(getInitialSignerInfo);
  const [needsInfo, setNeedsInfo] = useState(false);
  
  // Template and placeholder states
  const [template, setTemplate] = useState(null);
  const [placeholderValues, setPlaceholderValues] = useState(getInitialPlaceholderValues);
  const [unfilledPlaceholders, setUnfilledPlaceholders] = useState(getInitialUnfilledPlaceholders);

  // Function to highlight placeholders in content
  const highlightPlaceholders = (content) => {
    if (!content) return '';
    
    // Use approved content if contract is approved
    let result = contract?.approved ? (contract.approved_content || content) : content;
    
    // Get all placeholder values (from local state, contract, and localStorage)
    const allPlaceholderValues = {
      ...contract?.placeholder_values,
      ...placeholderValues
    };
    
    // Calculate computed fields if template exists
    let calculatedValues = {};
    if (template?.placeholders) {
      calculatedValues = computeAllCalculatedFields(allPlaceholderValues, template.placeholders);
      // Merge calculated values with all values
      Object.assign(allPlaceholderValues, calculatedValues);
    }
    
    // First, replace {{KEY}} format placeholders with values
    const templatePlaceholderRegex = /\{\{([^}]+)\}\}/g;
    result = result.replace(templatePlaceholderRegex, (match, key) => {
      const value = allPlaceholderValues[key];
      const config = template?.placeholders?.[key];
      
      // Special handling for calculated fields
      if (config?.type === 'calculated') {
        const calcValue = calculatedValues[key];
        if (calcValue !== undefined && calcValue !== 0) {
          return `<span class="inline-block px-2 py-0.5 rounded-md border bg-blue-50 border-blue-200 text-blue-700 font-medium transition-all duration-300 shadow-sm">${calcValue}</span>`;
        } else {
          const label = getPlaceholderLabel(config);
          return `<span class="inline-block px-2 py-0.5 rounded-md border bg-amber-50 border-amber-200 text-amber-700 font-medium transition-all duration-300 shadow-sm">[${label}]</span>`;
        }
      }
      
      if (value) {
        // Value exists - show green highlighted
        return `<span class="inline-block px-2 py-0.5 rounded-md border bg-emerald-50 border-emerald-200 text-emerald-700 font-medium transition-all duration-300 shadow-sm">${value}</span>`;
      } else if (config) {
        // No value but config exists - show placeholder label in amber
        const label = getPlaceholderLabel(config);
        return `<span class="inline-block px-2 py-0.5 rounded-md border bg-amber-50 border-amber-200 text-amber-700 font-medium transition-all duration-300 shadow-sm">[${label}]</span>`;
      }
      return match; // Keep original if no config
    });
    
    // Then handle [Label] format placeholders (legacy format)
    const labelPlaceholderRegex = /\[([^\]]+)\]/g;
    result = result.replace(labelPlaceholderRegex, (match, label) => {
      let isFilled = false;
      let value = match;
      const labelLower = label.toLowerCase();
      
      // Use signerInfo state if available, otherwise use contract data (case-insensitive)
      if (labelLower.includes('фио') || labelLower.includes('нанимателя') || labelLower.includes('имя') || labelLower.includes('атыңыз') || labelLower.includes('name') || labelLower.includes('аты')) {
        value = signerInfo.name || contract?.signer_name || allPlaceholderValues['NAME2'] || allPlaceholderValues['SIGNER_NAME'] || match;
        isFilled = !!(signerInfo.name || contract?.signer_name || allPlaceholderValues['NAME2'] || allPlaceholderValues['SIGNER_NAME']);
      } else if (labelLower.includes('телефон') || labelLower.includes('phone') || labelLower.includes('нөмір')) {
        value = signerInfo.phone || contract?.signer_phone || allPlaceholderValues['PHONE_NUM'] || allPlaceholderValues['PHONE'] || match;
        isFilled = !!(signerInfo.phone || contract?.signer_phone || allPlaceholderValues['PHONE_NUM'] || allPlaceholderValues['PHONE']);
      } else if (labelLower.includes('email') || labelLower.includes('почта') || labelLower.includes('пошта')) {
        value = signerInfo.email || contract?.signer_email || allPlaceholderValues['EMAIL'] || match;
        isFilled = !!(signerInfo.email || contract?.signer_email || allPlaceholderValues['EMAIL']);
      } else if (labelLower.includes('иин') || labelLower.includes('iin')) {
        value = allPlaceholderValues['ID_CARD'] || allPlaceholderValues['IIN'] || match;
        isFilled = !!(allPlaceholderValues['ID_CARD'] || allPlaceholderValues['IIN']);
      } else if (labelLower.includes('дата заселения')) {
        isFilled = !!contract?.move_in_date;
        value = contract?.move_in_date || match;
      } else if (labelLower.includes('дата выселения')) {
        isFilled = !!contract?.move_out_date;
        value = contract?.move_out_date || match;
      } else if (labelLower.includes('адрес') || labelLower.includes('мекенжай') || labelLower.includes('address')) {
        value = contract?.property_address || allPlaceholderValues['ADDRESS'] || match;
        isFilled = !!(contract?.property_address || allPlaceholderValues['ADDRESS']);
      } else if (labelLower.includes('цена') || labelLower.includes('сутки')) {
        isFilled = !!contract?.rent_amount;
        value = contract?.rent_amount || match;
      } else if (labelLower.includes('суток') || labelLower.includes('количество')) {
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
  
  // State is now initialized from localStorage in useState,
  // so we don't need a separate restore effect
  
  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (contract) {
      const stateToSave = {
        step,
        signerInfo,
        placeholderValues,
        documentUploaded,
        unfilledPlaceholders,
        verificationMethod
      };
      console.log('Saving state to localStorage:', stateToSave);
      localStorage.setItem(`contract_${id}_state`, JSON.stringify(stateToSave));
    }
  }, [step, signerInfo, placeholderValues, documentUploaded, unfilledPlaceholders, verificationMethod, id, contract]);

  // Pre-fetch Telegram deep link when step 5 is reached (verification step)
  useEffect(() => {
    if (step === 5 && !telegramDeepLink && !loadingTelegramLink) {
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
          
          // Check if we have saved state - if yes, use it instead of recalculating
          const savedState = localStorage.getItem(`contract_${id}_state`);
          let shouldRecalculate = true;
          
          if (savedState) {
            try {
              const parsed = JSON.parse(savedState);
              if (parsed.placeholderValues && Object.keys(parsed.placeholderValues).length > 0) {
                console.log('📦 Using saved placeholderValues from localStorage');
                shouldRecalculate = false;
                // Don't overwrite - it's already set in useState initialization
              }
              if (parsed.unfilledPlaceholders && parsed.unfilledPlaceholders.length >= 0) {
                console.log('📦 Using saved unfilledPlaceholders from localStorage');
                // Don't overwrite - it's already set in useState initialization
              }
            } catch (e) {
              console.error('Error parsing saved state:', e);
            }
          }
          
          // Only recalculate if no saved state
          if (shouldRecalculate) {
            console.log('🔄 Recalculating placeholders from backend');
            // Initialize placeholder values with existing values
            // Use approved values if contract is approved, otherwise use current values
            const existingValues = contractData.approved 
              ? (contractData.approved_placeholder_values || contractData.placeholder_values || {})
              : (contractData.placeholder_values || {});
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
          } else {
            // Use restored value from localStorage
            console.log('📦 Using saved unfilledPlaceholders for needsInfo calculation');
            unfilledTenantPlaceholders = unfilledPlaceholders; // Use state value restored from localStorage
          }
        } catch (err) {
          console.error('Error loading template:', err);
        }
      }
      
      // NOTE: Do NOT set documentUploaded here - it should only track CLIENT uploads
      // contractData.signature?.document_upload indicates landlord uploaded the document
      // documentUploaded state tracks if CLIENT uploaded in current session
      
      // Check if already signed
      if (contractData.status === 'signed') {
        setStep(6); // Go directly to success
      } else {
        // Don't modify step here - it's already initialized from localStorage
        // Only check if we need additional info for needsInfo flag
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
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error(
        contractLanguage === 'en' ? 'File too large. Maximum size is 10MB.' :
        contractLanguage === 'kk' ? 'Файл тым үлкен. Максималды өлшем 10МБ.' :
        'Файл слишком большой. Максимальный размер 10МБ.'
      );
      return;
    }
    
    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API}/sign/${id}/upload-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout for large files
      });
      console.log('Upload response:', response.data);
      toast.success(t('signing.docUploaded'));
      setDocumentUploaded(true);
      
      // Reload contract to get updated signature with document_upload
      const updatedContractResponse = await axios.get(`${API}/sign/${id}`);
      setContract(updatedContractResponse.data);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.detail || error.message || t('common.error');
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleLanguageSelect = async (lang) => {
    if (lang === 'en') {
      // Show English warning (always in English)
      setShowEnglishWarning(true);
      return;
    }
    
    await setLanguageFinal(lang);
  };
  
  const handleEnglishWarningAccept = async () => {
    setShowEnglishWarning(false);
    await setLanguageFinal('en');
  };
  
  const setLanguageFinal = async (lang) => {
    try {
      // Set contract language (fixed)
      const response = await axios.post(`${API}/sign/${id}/set-contract-language`, { language: lang });
      
      if (response.data.locked) {
        setContractLanguage(lang);
        setContractLanguageLocked(true);
        setShowLanguageSelector(false);
        
        // CRITICAL: Set both localStorage keys for i18n
        localStorage.setItem('i18nextLng', lang);
        localStorage.setItem('language', lang);
        
        // Change i18n language
        await i18n.changeLanguage(lang);
        
        // Force page reload to ensure all components re-render with new language
        // This is the most reliable way to ensure UI updates
        window.location.reload();
      }
    } catch (error) {
      console.error('Error setting language:', error);
      toast.error(t('common.error'));
    }
  };
  
  const getPlaceholderLabel = (config) => {
    // Use CONTRACT language for placeholder labels (not UI language)
    // This ensures placeholders match the contract language
    const lang = contractLanguage || i18n.language;
    if (lang === 'kk' && config.label_kk) {
      return config.label_kk;
    }
    if (lang === 'en' && config.label_en) {
      return config.label_en;
    }
    return config.label;
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
          toast.error(`${t('signing.pleaseFillField')}: ${getPlaceholderLabel(config)}`);
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
        
        toast.success(t('signing.infoSaved'));
        
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
          toast.error(t('signing.pleaseEnterName'));
          return;
        }
        if (!contract.signer_phone && !signerInfo.phone) {
          toast.error(t('signing.pleaseEnterPhone'));
          return;
        }
      }
      
      // Validate email if provided
      if (signerInfo.email && !validateEmail(signerInfo.email)) {
        toast.error(t('signing.invalidEmail'));
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
        
        toast.success(t('signing.infoSaved'));
        
        // Always move to document step after saving info
        setStep(2);
      } catch (error) {
        toast.error(t('common.error'));
      }
    }
  };

  const handleDownloadContract = async () => {
    try {
      const response = await axios.get(`${API}/contracts/${id}/download-pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contract_${contract.contract_code || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t('signing.downloadPdf'));
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleDownloadDocument = () => {
    try {
      if (!contract.signature?.document_upload) {
        toast.error(t('common.error'));
        return;
      }
      
      // Create download link for base64 image
      const link = document.createElement('a');
      link.href = `data:image/jpeg;base64,${contract.signature.document_upload}`;
      link.download = `document_${contract.contract_code || id}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t('signing.downloadPdf'));
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  // Detect mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Calculate progressive cooldown time based on request count
  const getProgressiveCooldown = (requestCount) => {
    if (requestCount <= 2) return 0; // First 2 requests - no cooldown
    if (requestCount === 3) return 60; // 3rd request - 1 minute
    if (requestCount === 4) return 150; // 4th request - 2.5 minutes
    return 150 + (requestCount - 4) * 60; // 5th+ requests - increase by 1 minute each
  };

  // Клик на кнопку SMS - открывает экран
  const handleRequestSMS = async () => {
    if (!id) return;
    
    setVerificationMethod('sms');
    
    // Если первый вход - отправляем код автоматически
    if (smsFirstEntry) {
      setSmsFirstEntry(false);
      await sendSmsCode();
    } else {
      // Если повторный вход - очищаем старый код
    }
  };

  // Отправка SMS кода (вручную или автоматически)
  const sendSmsCode = async () => {
    if (!id || smsCooldown > 0) return;
    
    setSendingCode(true);
    try {
      const response = await axios.post(`${API}/sign/${id}/request-otp?method=sms`);
      toast.success(t('signing.codeSentToPhone'));
      
      // Увеличиваем счетчик запросов
      const newCount = smsRequestCount + 1;
      setSmsRequestCount(newCount);
      
      // Устанавливаем прогрессивный cooldown
      const cooldownTime = getProgressiveCooldown(newCount);
      if (cooldownTime > 0) {
        setSmsCooldown(cooldownTime);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleRequestOTP = async (method = 'sms') => {
    // Legacy function - redirects to new implementation
    await handleRequestSMS();
  };

  // Клик на кнопку Call - открывает экран
  const handleRequestCall = async () => {
    if (!id) return;
    
    setVerificationMethod('call');
    
    // Если первый вход - отправляем код автоматически
    if (callFirstEntry) {
      setCallFirstEntry(false);
      await sendCallCode();
    } else {
      // Если повторный вход - очищаем старый hint
      setCallHint('');
    }
  };

  // Отправка Call кода (вручную или автоматически)
  const sendCallCode = async () => {
    if (!id || callCooldown > 0) return;
    
    setSendingCode(true);
    try {
      const response = await axios.post(`${API}/sign/${id}/request-call-otp`);
      toast.success(t('signing.callInitiated'));
      setCallHint(response.data.hint || '');
      
      // Увеличиваем счетчик запросов
      const newCount = callRequestCount + 1;
      setCallRequestCount(newCount);
      
      // Устанавливаем прогрессивный cooldown
      const cooldownTime = getProgressiveCooldown(newCount);
      if (cooldownTime > 0) {
        setCallCooldown(cooldownTime);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleRequestCallOTP = async () => {
    // Legacy function - redirects to new implementation
    await handleRequestCall();
  };

  const handleRequestTelegramOTP = async () => {
    if (telegramCooldown > 0 || !telegramUsername.trim()) return;
    
    setRequestingTelegram(true);
    try {
      const response = await axios.post(`${API}/sign/${id}/request-telegram-otp`, {
        telegram_username: telegramUsername,
        language: i18n.language
      });
      toast.success(response.data.message);
      setVerificationMethod('telegram');
      setTelegramCooldown(60);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setRequestingTelegram(false);
    }
  };

  const handleVerifyTelegramOTP = async () => {
    if (telegramCode.length !== 6) {
      toast.error(t('signing.enter6DigitCode'));
      return;
    }
    
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/sign/${id}/verify-telegram-otp`, {
        code: telegramCode
      });
      
      if (response.data.verified) {
        toast.success(t('signing.verificationSuccess'));
        setStep(6);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('signing.enterCorrectCode'));
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyCallOTP = async () => {
    if (callCode.length !== 4) {
      toast.error(t('signing.enter4DigitCode'));
      return;
    }
    
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/sign/${id}/verify-call-otp`, {
        code: callCode
      });
      
      if (response.data.verified) {
        toast.success(t('signing.verificationSuccess'));
        setStep(6); // Move to success
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('signing.enterCorrectCode'));
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyOTP = async () => {
    const codeToVerify = verificationCode || otpValue;
    if (codeToVerify.length !== 6 && codeToVerify.length !== 4) {
      toast.error(t('signing.enterCorrectCode'));
      return;
    }
    
    setVerifying(true);
    try {
      // Save placeholder values before signing if there are any unfilled placeholders
      if (unfilledPlaceholders.length > 0 && template) {
        // Update contract with filled placeholder values using public endpoint
        await axios.post(`${API}/sign/${id}/update-placeholder-values`, {
          placeholder_values: { ...contract.placeholder_values, ...placeholderValues }
        });
      }
      
      // Use the actual phone from contract (which may have been updated by signer)
      const phoneToUse = contract.signer_phone || signerInfo.phone;
      
      // Determine which verification endpoint to use
      let response;
      if (verificationMethod === 'call' && codeToVerify.length === 4) {
        response = await axios.post(`${API}/sign/${id}/verify-call-otp`, {
          code: codeToVerify
        });
      } else if (verificationMethod === 'telegram') {
        response = await axios.post(`${API}/sign/${id}/verify-telegram-otp`, {
          code: codeToVerify
        });
      } else {
        // SMS verification
        response = await axios.post(`${API}/sign/${id}/verify-otp`, {
          contract_id: id,
          phone: phoneToUse,
          otp_code: codeToVerify
        });
      }
      
      if (response.data.signature_hash) {
        setSignatureHash(response.data.signature_hash);
      }
      
      if (response.data.verified) {
        toast.success(t('signing.successSigned'));
        setStep(6);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('signing.enterCorrectCode'));
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  if (!contract) return null;

  return (
    <div className="min-h-screen gradient-bg">
      <Header hideLanguageSelector={true} />
      
      {/* Language Selector Modal - показывается только один раз */}
      {showLanguageSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🌐</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('signing.selectLanguage')}</h3>
              <p className="text-gray-600 text-sm">
                {t('signing.languageDescription')}
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleLanguageSelect('ru')}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg flex items-center justify-center gap-3"
              >
                🇷🇺 Русский
              </button>
              <button
                onClick={() => handleLanguageSelect('kk')}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg flex items-center justify-center gap-3"
              >
                🇰🇿 Қазақша
              </button>
              <button
                onClick={() => handleLanguageSelect('en')}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg flex items-center justify-center gap-3"
              >
                🇬🇧 English
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="minimal-card p-6 sm:p-8 animate-fade-in" data-testid="sign-contract-card">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3" data-testid="signing-title">{t('signing.title')}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              {contract.contract_code && (
                <div className="inline-flex px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 self-start">
                  {contract.contract_code}
                </div>
              )}
              <p className="text-gray-600 font-medium whitespace-nowrap">{getLocalizedTitle()}</p>
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
                {/* Show PDF viewer for uploaded PDF contracts */}
                {contract.source_type === 'uploaded_pdf' ? (
                  <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 max-h-[60vh] sm:max-h-[500px] overflow-y-auto">
                    <div className="text-center mb-4">
                      <p className="text-gray-600 text-sm mb-3">{t('signing.pdfContract')}</p>
                    </div>
                    <object
                      data={`${API}/sign/${contract.id}/view-pdf`}
                      type="application/pdf"
                      className="w-full rounded-lg border border-gray-200"
                      style={{ height: '400px' }}
                    >
                      <div className="flex flex-col items-center justify-center h-full py-12">
                        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 text-sm mb-4">PDF не отображается в браузере</p>
                        <a
                          href={`${API}/sign/${contract.id}/view-pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Открыть PDF
                        </a>
                      </div>
                    </object>
                    <div className="mt-4 text-center">
                      <a
                        href={`${API}/sign/${contract.id}/view-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {t('signing.downloadPdf')}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 mb-4 sm:mb-6 max-h-[60vh] sm:max-h-[500px] overflow-y-auto">
                    <div 
                      className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800"
                      style={{
                        fontFamily: 'IBM Plex Sans, sans-serif',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}
                      dangerouslySetInnerHTML={{ __html: highlightPlaceholders(
                        contractLanguage === 'kk' && contract.content_kk ? contract.content_kk :
                        contractLanguage === 'en' && contract.content_en ? contract.content_en :
                        contract.content
                      ) }}
                      data-testid="contract-preview"
                    />
                  </div>
                )}
                
                <button
                  onClick={() => setStep(needsInfo ? 1.5 : 2)}
                  className="w-full py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30"
                  data-testid="proceed-button"
                >
                  {t('signing.continue')} →
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
                  <h3 className="text-lg font-semibold mb-2">{t('signing.fillInfo')}</h3>
                  <p className="text-neutral-600 text-sm">{t('signing.fillInfoDescription')}</p>
                </div>
                
                {/* If contract has template with unfilled placeholders, show them */}
                {template && unfilledPlaceholders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {unfilledPlaceholders.map(({ key, config }) => (
                      <div key={key} className={config.type === 'text' && config.label.length > 20 ? 'md:col-span-2' : ''}>
                        <label htmlFor={`placeholder_${key}`} className="text-sm font-medium text-gray-700 block mb-2">
                          {getPlaceholderLabel(config)} {config.required && <span className="text-red-500">*</span>}
                        </label>
                        
                        {config.type === 'text' && (
                          <input
                            id={`placeholder_${key}`}
                            value={placeholderValues[key] || ''}
                            onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                            className="minimal-input w-full mt-1"
                            placeholder={`${contractLanguage === 'ru' ? 'Введите' : contractLanguage === 'kk' ? 'Енгізіңіз' : 'Enter'} ${getPlaceholderLabel(config).toLowerCase()}`}
                            required={config.required}
                            readOnly={contract?.approved}
                            disabled={contract?.approved}
                          />
                        )}
                        
                        {config.type === 'number' && (
                          <input
                            id={`placeholder_${key}`}
                            type="number"
                            value={placeholderValues[key] || ''}
                            onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                            className="minimal-input w-full mt-1"
                            placeholder={`${contractLanguage === 'ru' ? 'Введите' : contractLanguage === 'kk' ? 'Енгізіңіз' : 'Enter'} ${getPlaceholderLabel(config).toLowerCase()}`}
                            required={config.required}
                            readOnly={contract?.approved}
                            disabled={contract?.approved}
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
                            readOnly={contract?.approved}
                            disabled={contract?.approved}
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
                            readOnly={contract?.approved}
                            disabled={contract?.approved}
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
                            readOnly={contract?.approved}
                            disabled={contract?.approved}
                          />
                        )}
                        
                        {config.type === 'textarea' && (
                          <textarea
                            id={`placeholder_${key}`}
                            value={placeholderValues[key] || ''}
                            onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                            className="minimal-input w-full mt-1 min-h-[100px] resize-y"
                            placeholder={config.label}
                            required={config.required}
                            readOnly={contract?.approved}
                            disabled={contract?.approved}
                            rows={4}
                          />
                        )}
                        
                        {config.type === 'time' && (
                          <input
                            id={`placeholder_${key}`}
                            type="time"
                            value={placeholderValues[key] || ''}
                            onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                            className="minimal-input w-full mt-1"
                            required={config.required}
                            readOnly={contract?.approved}
                            disabled={contract?.approved}
                          />
                        )}
                        
                        {config.type === 'select' && config.options && (
                          <select
                            id={`placeholder_${key}`}
                            value={placeholderValues[key] || ''}
                            onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                            className="minimal-input w-full mt-1"
                            required={config.required}
                            disabled={contract?.approved}
                          >
                            <option value="">{t('common.select')}...</option>
                            {config.options.map((option, idx) => (
                              <option key={idx} value={option.value || option.label}>
                                {i18n.language === 'kk' ? (option.label_kk || option.label) : 
                                 i18n.language === 'en' ? (option.label_en || option.label) : 
                                 option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // For old contracts without template, show old fields (always editable)
                  <>
                    <div>
                      <label htmlFor="signer_name" className="text-sm font-medium text-gray-700 block mb-2">{t('signing.fullName')} *</label>
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
                    
                    <div>
                      <label htmlFor="signer_phone" className="text-sm font-medium text-gray-700 block mb-2">{t('signing.phone')} *</label>
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
                    
                    <div>
                      <label htmlFor="signer_email" className="text-sm font-medium text-gray-700 block mb-2">{t('signing.email')}</label>
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
                        <p className="text-xs text-red-500 mt-1">{t('signing.enterValidEmail')}</p>
                      )}
                    </div>
                  </>
                )}
                
 
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                    data-testid="back-to-view-button"
                  >
                    ← {t('signing.back')}
                  </button>
                  <button
                    onClick={handleSaveSignerInfo}
                    className="flex-1 py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20"
                    data-testid="save-signer-info-button"
                  >
                    {t('signing.saveAndContinue')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Upload Document */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4 sm:space-y-6"
                data-testid="step-upload-document"
              >
                {/* Header - compact on mobile */}
                <div className="text-center mb-2 sm:mb-4">
                  <div className="hidden sm:flex w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                    <FileUp className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">{t('signing.uploadDoc')}</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">{t('signing.uploadDocDescription')}</p>
                </div>
                
                {/* Show uploaded document status - compact on mobile */}
                {documentUploaded && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 sm:border-2 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-green-900 text-sm sm:text-base">
                          {t('signing.docUploaded')}
                        </p>
                        <p className="text-xs sm:text-sm text-green-700 truncate">
                          {t('signing.docUploadedHint')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Upload area - compact button style on mobile, full dropzone on desktop */}
                <div className="sm:bg-gradient-to-br sm:from-blue-50 sm:via-sky-50 sm:to-cyan-50 sm:border-2 sm:border-blue-200 sm:rounded-xl sm:p-6">
                  {/* Mobile: Compact button style like скрин19 */}
                  <label htmlFor="document-mobile" className="sm:hidden cursor-pointer block">
                    <div className="flex items-center justify-center gap-3 py-3 px-6 border-2 border-blue-300 rounded-xl bg-white hover:border-blue-500 hover:bg-blue-50 transition-all">
                      <input
                        id="document-mobile"
                        type="file"
                        accept="image/*,application/pdf,.pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        data-testid="document-upload-input-mobile"
                      />
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="text-blue-600 font-medium">
                        {uploading ? t('signing.uploading') : (documentUploaded ? t('signing.clickToReplace') : t('signing.upload'))}
                      </span>
                    </div>
                  </label>
                  
                  {/* Desktop: Full dropzone */}
                  <label htmlFor="document" className="hidden sm:block cursor-pointer">
                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-white/50 transition-all bg-white/30">
                      <input
                        id="document"
                        type="file"
                        accept="image/*,application/pdf,.pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        data-testid="document-upload-input"
                      />
                      <svg className="w-12 h-12 text-blue-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-base font-medium text-gray-900 mb-1">
                        {uploading ? t('signing.uploading') : (documentUploaded ? t('signing.clickToReplace') : t('signing.clickToUpload'))}
                      </p>
                      <p className="text-sm text-gray-500">
                        JPEG, PNG, PDF до 10MB
                      </p>
                    </div>
                  </label>
                </div>
                
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setStep(1.5)}
                    className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all"
                    data-testid="back-to-info-button"
                  >
                    ← {t('signing.back')}
                  </button>
                  {documentUploaded && (
                    <button
                      onClick={() => setStep(4)}
                      className="flex-1 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20"
                    >
                      {t('signing.reviewContract')}
                    </button>
                  )}
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
                  <h3 className="text-xl font-bold text-gray-900">{t('signing.finalReview')}</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    {t('signing.finalReviewDescription')}
                  </p>
                </div>

                {/* Contract content - PDF viewer for uploaded PDF contracts */}
                {contract.source_type === 'uploaded_pdf' ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <object
                      data={`${API}/sign/${id}/view-pdf`}
                      type="application/pdf"
                      className="w-full border-0"
                      style={{ height: '500px' }}
                      data-testid="pdf-viewer-final-review"
                    >
                      {/* Fallback if PDF doesn't render in browser */}
                      <div className="flex flex-col items-center justify-center h-full py-12 bg-gray-50">
                        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 text-sm mb-4">{t('sign.pdfNotDisplayed', 'PDF не отображается в браузере')}</p>
                        <a
                          href={`${API}/sign/${id}/view-pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {t('sign.openPdf')}
                        </a>
                      </div>
                    </object>
                    <div className="p-3 border-t border-gray-100 flex justify-center gap-3">
                      <a
                        href={`${API}/sign/${id}/view-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                      >
                        {t('sign.openPdf')}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-lg border border-gray-200 max-h-[500px] overflow-y-auto">
                    <div 
                      className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800"
                      style={{
                        fontFamily: 'IBM Plex Sans, sans-serif',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}
                      dangerouslySetInnerHTML={{ __html: highlightPlaceholders(
                        contractLanguage === 'kk' && contract.content_kk ? contract.content_kk :
                        contractLanguage === 'en' && contract.content_en ? contract.content_en :
                        contract.content
                      ) }}
                    />
                  </div>
                )}

                {/* Display uploaded document (ID/passport) if exists */}
                {contract.signature?.document_upload && (
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">{t('signing.clientDocument')}</h4>
                    <div className="relative">
                      <img 
                        src={`data:image/jpeg;base64,${contract.signature.document_upload}`} 
                        alt={t('signing.clientDocument')} 
                        className="w-full max-w-2xl mx-auto rounded-lg shadow-lg border-2 border-gray-200"
                      />
                    </div>
                  </div>
                )}

                {/* English Disclaimer Checkbox - compact for mobile */}
                {contractLanguage === 'en' && (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 sm:p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="english-disclaimer"
                        checked={englishDisclaimerAccepted}
                        onChange={(e) => {
                          setEnglishDisclaimerAccepted(e.target.checked);
                          if (e.target.checked) {
                            axios.post(`${API}/sign/${id}/accept-english-disclaimer`).catch(console.error);
                          }
                        }}
                        className="mt-0.5 w-4 h-4 flex-shrink-0 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="english-disclaimer" className="text-xs text-gray-700 leading-tight">
                        {t('signing.englishDisclaimer')}
                      </label>
                    </div>
                    
                    {/* Dropdown to view original versions */}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-blue-600 font-medium text-xs hover:text-blue-700 flex items-center gap-1">
                        {t('signing.viewOriginalVersions')}
                      </summary>
                      <div className="mt-2 space-y-2">
                        {/* Russian version */}
                        {contract.content && (
                          <div className="border border-gray-200 rounded-lg p-2 bg-white">
                            <h5 className="font-semibold text-gray-900 mb-1 text-xs">{t('signing.russianVersion')}:</h5>
                            <div 
                              className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 max-h-32 overflow-y-auto"
                              dangerouslySetInnerHTML={{ __html: highlightPlaceholders(contract.content) }}
                            />
                          </div>
                        )}
                        
                        {/* Kazakh version */}
                        {contract.content_kk && (
                          <div className="border border-gray-200 rounded-lg p-2 bg-white">
                            <h5 className="font-semibold text-gray-900 mb-1 text-xs">{t('signing.kazakhVersion')}:</h5>
                            <div 
                              className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 max-h-32 overflow-y-auto"
                              dangerouslySetInnerHTML={{ __html: highlightPlaceholders(contract.content_kk) }}
                            />
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    ← {t('signing.back')}
                  </button>
                  <button
                    disabled={contractLanguage === 'en' && !englishDisclaimerAccepted}
                    onClick={async () => {
                      // Check English disclaimer
                      if (contractLanguage === 'en' && !englishDisclaimerAccepted) {
                        toast.error(t('signing.englishDisclaimer'));
                        return;
                      }
                      
                      // Ensure placeholder values and signer info are saved before verification
                      try {
                        // Save placeholder values if we have any unfilled placeholders
                        if (unfilledPlaceholders.length > 0 && template && placeholderValues) {
                          await axios.post(`${API}/sign/${id}/update-placeholder-values`, {
                            placeholder_values: { ...contract.placeholder_values, ...placeholderValues }
                          });
                        }
                        
                        // Extract phone and save signer info
                        let phoneToSave = contract.signer_phone;
                        
                        // Try to find phone in placeholderValues if not set
                        if (!phoneToSave && placeholderValues) {
                          const phoneKeys = ['tenant_phone', 'signer_phone', 'client_phone', 'phone', 'НОМЕР_КЛИЕНТА'];
                          for (const key of phoneKeys) {
                            if (placeholderValues[key]) {
                              phoneToSave = placeholderValues[key];
                              break;
                            }
                          }
                        }
                        
                        // If still no phone, check signerInfo state
                        if (!phoneToSave && signerInfo.phone) {
                          phoneToSave = signerInfo.phone;
                        }
                        
                        // Save signer info if we have phone
                        if (phoneToSave) {
                          await axios.post(`${API}/sign/${id}/update-signer-info`, {
                            signer_phone: phoneToSave
                          });
                        }
                        
                        setStep(5);
                      } catch (error) {
                        console.error('Error saving data before verification:', error);
                        toast.error(t('common.error'));
                        // Don't continue if save fails - user needs valid phone for verification
                      }
                    }}
                    className={`flex-1 py-2.5 sm:py-3 text-sm font-semibold text-white rounded-lg sm:rounded-xl transition-all shadow-md sm:shadow-lg ${
                      contractLanguage === 'en' && !englishDisclaimerAccepted
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-green-500/25 sm:shadow-green-500/30'
                    }`}
                    data-testid="sign-button"
                  >
                    {t('signing.confirmed')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Verify OTP */}
            {step === 5 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-4 sm:space-y-6"
                data-testid="step-verify-otp"
              >
                {!verificationMethod ? (
                  // Method selection - Neumorphism style, compact on mobile
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-6 neuro-card flex items-center justify-center"
                    >
                      <svg className="w-7 h-7 sm:w-10 sm:h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </motion.div>
                    
                    <motion.h3
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2"
                    >
                      {t('signing.confirmSignature')}
                    </motion.h3>
                    
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-gray-600 text-xs sm:text-sm mb-4 sm:mb-8"
                    >
                      {t('signing.selectVerificationMethod')}
                    </motion.p>
                    
                    <div className="space-y-3 sm:space-y-4 max-w-md mx-auto">
                      {/* SMS Button - Neumorphism with rounded corners, compact on mobile */}
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRequestSMS}
                        disabled={smsCooldown > 0}
                        className="neuro-card w-full p-3 sm:p-6 rounded-xl sm:rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0 group-hover:from-blue-100 group-hover:to-blue-200 transition-all">
                            <svg className="w-5 h-5 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1">
                              {smsCooldown > 0 ? `${t('signing.sms')} ${smsCooldown}s` : t('signing.sms')}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600">{t('signing.smsHint')}</p>
                          </div>
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </motion.button>
                      
                      {/* Email Button - compact on mobile */}
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          // Сразу переключаемся на форму ввода кода
                          setVerificationMethod('email');
                          // Параллельно отправляем код
                          try {
                            await axios.post(`${API}/sign/${id}/request-otp?method=email`);
                            toast.success(t('signing.emailCodeSent'));
                          } catch (err) {
                            console.error('Failed to send email OTP:', err);
                            toast.error(err.response?.data?.detail || t('common.error'));
                          }
                        }}
                        disabled={sendingCode}
                        className="neuro-card w-full p-3 sm:p-6 rounded-xl sm:rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center flex-shrink-0 group-hover:from-purple-100 group-hover:to-purple-200 transition-all">
                            <svg className="w-5 h-5 sm:w-7 sm:h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1">
                              {sendingCode ? t('signing.sending') : t('signing.email')}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600">{t('signing.emailHint')}</p>
                          </div>
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </motion.button>
                      
                      {/* Telegram Button - Always active, compact on mobile */}
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={async () => {
                          // Сохраняем состояние перед переходом в Telegram
                          // Это важно для iOS Chrome - при возврате состояние восстановится
                          const stateToSave = {
                            step: 5,
                            signerInfo,
                            placeholderValues,
                            documentUploaded,
                            unfilledPlaceholders,
                            verificationMethod: 'telegram'
                          };
                          localStorage.setItem(`contract_${id}_state`, JSON.stringify(stateToSave));
                          
                          // Загружаем/перезагружаем ссылку при каждом клике
                          let linkToOpen = telegramDeepLink;
                          if (!telegramDeepLink || telegramDeepLink === '#') {
                            try {
                              const res = await axios.get(`${API}/sign/${id}/telegram-deep-link`);
                              linkToOpen = res.data.deep_link;
                              setTelegramDeepLink(linkToOpen);
                            } catch (err) {
                              console.error('Failed to load Telegram link:', err);
                              toast.error(t('common.error'));
                              return;
                            }
                          }
                          
                          // Устанавливаем метод верификации до перехода
                          setVerificationMethod('telegram');
                          toast.success(t('signing.telegramCodeSent'));
                          
                          // Используем window.location.href для мобильных устройств
                          // Это предотвращает создание новой вкладки в iOS Chrome
                          // Desktop браузеры откроют в новой вкладке через window.open
                          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                          
                          if (isMobile) {
                            // Для мобильных: открываем в том же окне
                            // При возврате из Telegram страница перезагрузится и восстановит состояние из localStorage
                            window.location.href = linkToOpen;
                          } else {
                            // Для desktop: открываем в новой вкладке (стандартное поведение)
                            window.open(linkToOpen, '_blank');
                          }
                        }}
                        className="relative overflow-hidden block w-full p-3 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0088cc] to-[#0077b3] transition-all no-underline group shadow-lg shadow-[#0088cc]/20 hover:shadow-xl hover:shadow-[#0088cc]/30 text-left"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-all">
                            <svg className="w-5 h-5 sm:w-8 sm:h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-base sm:text-lg font-semibold text-white mb-0.5 sm:mb-1">{t('signing.telegram')}</h4>
                            <p className="text-xs sm:text-sm text-white/80">{t('signing.telegramHint')}</p>
                          </div>
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                ) : verificationMethod === 'sms' ? (
                  // SMS verification - OTP boxes
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('signing.enterVerificationCode')}</h3>
                      <p className="text-sm text-gray-500">
                        {t('signing.enterSmsCode')}
                      </p>
                    </div>
                    
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
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
                    
                    <button
                      type="button"
                      onClick={sendSmsCode}
                      disabled={smsCooldown > 0 || sendingCode}
                      className="block w-full text-center py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingCode ? t('signing.verifying') : smsCooldown > 0 ? `${t('signing.resendSms')} ${Math.floor(smsCooldown / 60)}:${(smsCooldown % 60).toString().padStart(2, '0')}` : t('signing.resendSms')}
                    </button>
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('');
                          setVerificationCode('');
                        }}
                        className="flex-1 py-3 px-6 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
                      >
                        {t('signing.back')}
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyOTP}
                        disabled={verifying || verificationCode.length !== 6}
                        className="flex-1 py-3 px-6 text-white bg-gradient-to-r from-green-600 to-green-500 rounded-xl hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-green-500/20"
                      >
                        {verifying ? t('signing.verifying') : t('signing.signContract')}
                      </button>
                    </div>
                  </motion.div>
                ) : verificationMethod === 'email' ? (
                  // Email verification - OTP boxes
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center"
                      >
                        <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </motion.div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('signing.enterVerificationCode')}</h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {t('signing.codeSentToEmail')}
                      </p>
                      <p className="text-purple-600 font-medium">
                        {signerInfo.email || contract?.signer_email || placeholderValues?.['EMAIL'] || ''}
                      </p>
                    </div>
                    
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
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
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('');
                          setVerificationCode('');
                        }}
                        className="flex-1 py-3 px-6 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
                      >
                        {t('signing.back')}
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyOTP}
                        disabled={verifying || verificationCode.length !== 6}
                        className="flex-1 py-3 px-6 text-white bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-purple-500/20"
                      >
                        {verifying ? t('signing.verifying') : t('signing.signContract')}
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setSendingCode(true);
                          await axios.post(`${API}/sign/${id}/request-otp?method=email`);
                          toast.success(t('signing.emailCodeSent'));
                        } catch (err) {
                          toast.error(err.response?.data?.detail || t('common.error'));
                        } finally {
                          setSendingCode(false);
                        }
                      }}
                      disabled={sendingCode}
                      className="block w-full text-center py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingCode ? t('signing.sending') : t('signing.resendEmail')}
                    </button>
                  </motion.div>
                ) : verificationMethod === 'telegram' ? (
                  // Telegram verification - OTP boxes
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('signing.enterVerificationCode')}</h3>
                      <p className="text-sm text-gray-500">
                        {t('signing.telegramCodeSent')} <span className="font-semibold text-[#0088cc]">@twotick_bot</span>
                      </p>
                    </div>
                    
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
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
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('');
                          setVerificationCode('');
                          setTelegramDeepLink('');
                        }}
                        className="flex-1 py-3 px-6 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
                      >
                        {t('signing.back')}
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyOTP}
                        disabled={verifying || verificationCode.length !== 6}
                        className="flex-1 py-3 px-6 text-white bg-gradient-to-r from-green-600 to-green-500 rounded-xl hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-green-500/20"
                      >
                        {verifying ? t('signing.verifying') : t('signing.signContract')}
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                        if (isMobile) {
                          window.location.href = telegramDeepLink;
                        } else {
                          window.open(telegramDeepLink, '_blank');
                        }
                      }}
                      className="block w-full text-center py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {t('signing.telegram')} ↗
                    </button>
                  </motion.div>
                ) : null}
              </motion.div>
            )}

            {/* Step 6: Success */}
            {step === 6 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
                data-testid="step-success"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">{t('signing.successSigned')}</h3>
                <p className="text-neutral-600">{t('signing.successDescription')}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      {/* English Warning Popup */}
      {showEnglishWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              {/* Always show in English - hardcoded */}
              <h3 className="text-xl font-bold text-gray-900 mb-3">Important Notice</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                The English version of this contract is a translation for your convenience only. 
                In case of any discrepancies, the Russian version shall prevail and be legally binding.
              </p>
              <button
                onClick={handleEnglishWarningAccept}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SignContractPage;