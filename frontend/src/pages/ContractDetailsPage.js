import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import { ArrowLeft, Send, Download, Trash2, CheckCircle, Edit3, Copy, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ContractDetailsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [signature, setSignature] = useState(null);
  const [creator, setCreator] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingContract, setSendingContract] = useState(false);
  const [approving, setApproving] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const token = localStorage.getItem('token');
  
  // Check if readonly mode (for admin)
  const searchParams = new URLSearchParams(window.location.search);
  const isReadOnly = searchParams.get('readonly') === 'true';

  // Function to translate placeholder labels
  const translateLabel = (key, fallbackLabel) => {
    const labelKey = `placeholders.${key}`;
    const translated = t(labelKey, { defaultValue: '' });
    return translated || fallbackLabel;
  };

  useEffect(() => {
    fetchContract();
    fetchSignature();
    
    // Auto-refresh if contract is sent (waiting for signature)
    const intervalId = setInterval(() => {
      if (contract?.status === 'sent') {
        fetchContract();
        fetchSignature();
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [id, contract?.status]);

  const fetchContract = async () => {
    try {
      const response = await axios.get(`${API}/contracts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContract(response.data);
      
      // Fetch template if contract was created from template
      if (response.data.template_id) {
        try {
          const templateResponse = await axios.get(`${API}/templates/${response.data.template_id}`);
          setTemplate(templateResponse.data);
        } catch (error) {
          console.error('Failed to fetch template:', error);
        }
      }
      
      // Fetch creator info
      if (response.data.creator_id) {
        try {
          const creatorResponse = await axios.get(`${API}/users/${response.data.creator_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCreator(creatorResponse.data);
        } catch (error) {
          console.error('Failed to fetch creator info:', error);
        }
      }
    } catch (error) {
      toast.error(t('common.error'));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchSignature = async () => {
    try {
      const response = await axios.get(`${API}/contracts/${id}/signature`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setSignature(response.data);
      }
    } catch (error) {
      console.log('No signature found');
    }
  };

  const replacePlaceholders = (content) => {
    if (!contract) return content;
    
    let result = content;
    
    // Get placeholder values from contract
    const pv = contract.placeholder_values || {};
    
    // First replace {{KEY}} format placeholders
    const templatePlaceholderRegex = /\{\{([^}]+)\}\}/g;
    result = result.replace(templatePlaceholderRegex, (match, key) => {
      const value = pv[key];
      
      if (value) {
        return `<span class="inline-block px-2 py-0.5 rounded-md border bg-emerald-50 border-emerald-200 text-emerald-700 font-medium transition-all duration-300 shadow-sm">${value}</span>`;
      }
      
      // Try to get label from template
      const config = template?.placeholders?.[key];
      const label = config?.label || key;
      return `<span class="inline-block px-2 py-0.5 rounded-md border bg-amber-50 border-amber-200 text-amber-700 font-medium transition-all duration-300 shadow-sm">[${label}]</span>`;
    });
    
    // Universal placeholder regex to match ALL placeholders [...]
    const placeholderRegex = /\[([^\]]+)\]/g;
    
    result = result.replace(placeholderRegex, (match, label) => {
      let value = match;
      let isFilled = false;
      const labelLower = label.toLowerCase();
      
      // Map placeholder labels to contract fields AND placeholder_values (case-insensitive)
      if (labelLower.includes('фио') && labelLower.includes('нанимателя')) {
        value = contract.signer_name || pv['NAME2'] || pv['SIGNER_NAME'] || match;
        isFilled = !!(contract.signer_name || pv['NAME2'] || pv['SIGNER_NAME']);
      } else if (labelLower === 'фио' || labelLower.includes('имя') || labelLower.includes('name') || labelLower.includes('атыңыз') || labelLower.includes('аты')) {
        value = contract.signer_name || pv['NAME2'] || pv['SIGNER_NAME'] || match;
        isFilled = !!(contract.signer_name || pv['NAME2'] || pv['SIGNER_NAME']);
      } else if (labelLower.includes('телефон') || labelLower.includes('phone') || labelLower.includes('нөмір')) {
        value = contract.signer_phone || pv['PHONE_NUM'] || pv['PHONE'] || match;
        isFilled = !!(contract.signer_phone || pv['PHONE_NUM'] || pv['PHONE']);
      } else if (labelLower.includes('email') || labelLower.includes('почта') || labelLower.includes('пошта')) {
        value = contract.signer_email || pv['EMAIL'] || match;
        isFilled = !!(contract.signer_email || pv['EMAIL']);
      } else if (labelLower.includes('иин') || labelLower.includes('iin')) {
        value = pv['ID_CARD'] || pv['IIN'] || match;
        isFilled = !!(pv['ID_CARD'] || pv['IIN']);
      } else if (labelLower.includes('дата заселения')) {
        value = contract.move_in_date || match;
        isFilled = !!contract.move_in_date;
      } else if (labelLower.includes('дата выселения')) {
        value = contract.move_out_date || match;
        isFilled = !!contract.move_out_date;
      } else if (labelLower.includes('адрес') || labelLower.includes('address') || labelLower.includes('мекенжай')) {
        value = contract.property_address || pv['ADDRESS'] || match;
        isFilled = !!(contract.property_address || pv['ADDRESS']);
      } else if (labelLower.includes('цена') || labelLower.includes('сутки')) {
        value = contract.rent_amount || match;
        isFilled = !!contract.rent_amount;
      } else if (labelLower.includes('суток') || labelLower.includes('количество')) {
        value = contract.days_count || match;
        isFilled = !!contract.days_count;
      }
      
      const highlightClass = isFilled 
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
        : 'bg-amber-50 border-amber-200 text-amber-700';
      
      return `<span class="inline-block px-2 py-0.5 rounded-md border ${highlightClass} font-medium transition-all duration-300 shadow-sm">${value}</span>`;
    });
    
    return result;
  };

  const handleSendContract = async () => {
    setSendingContract(true);
    try {
      const response = await axios.post(
        `${API}/contracts/${id}/send`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Contract sent! Mock OTP: ${response.data.mock_otp}`);
      fetchContract();
      fetchSignature();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setSendingContract(false);
    }
  };

  const handleApprove = async () => {
    
    setApproving(true);
    try {
      const response = await axios.post(
        `${API}/contracts/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(t('contract.approved'));
      
      // Reload contract and signature to show updated status
      await fetchContract();
      await fetchSignature();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setApproving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`${API}/contracts/${id}/download-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contract-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(t('contract.downloadSuccess'));
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/contracts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(t('contract.deleted'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-700 border-gray-200',
      sent: 'bg-blue-50 text-blue-700 border-blue-200',
      'pending-signature': 'bg-amber-50 text-amber-700 border-amber-200',
      signed: 'bg-green-50 text-green-700 border-green-200',
      declined: 'bg-red-50 text-red-700 border-red-200'
    };
    
    const statusText = {
      draft: t('status.draft'),
      sent: 'Отправлена',
      'pending-signature': t('status.pending-signature'),
      signed: t('status.signed'),
      declined: t('status.declined')
    };
    
    const style = statusStyles[status] || statusStyles.draft;
    const text = statusText[status] || status;
    
    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-lg border ${style}`}>
        {text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader />
        </div>
      </div>
    );
  }

  if (!contract) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 overflow-x-hidden">
      <Header />
      
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 sm:mb-6 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 minimal-card hover:shadow-lg transition-all flex items-center gap-2"
          data-testid="back-button"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        
        <div className="minimal-card p-4 sm:p-6 lg:p-8 animate-fade-in" data-testid="contract-details-card">
          <div className="mb-6">
            {isReadOnly && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">
                  {t('contractDetails.readOnlyMode')}
                </p>
              </div>
            )}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 lg:gap-6">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 break-words" data-testid="contract-title">{contract.title}</h1>
                <div className="flex gap-2 sm:gap-3 items-center flex-wrap">
                  {contract.contract_code && (
                    <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/20">
                      {contract.contract_code}
                    </div>
                  )}
                  {getStatusBadge(contract.status)}
                  <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
                    {format(new Date(contract.updated_at), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
                <span className="text-xs text-gray-500 mt-2 block sm:hidden">
                  {format(new Date(contract.updated_at), 'dd MMM yyyy HH:mm')}
                </span>
              </div>
              
              {isReadOnly ? (
                <div className="flex gap-2">
                  {/* Кнопка скачивания для админа - с токеном авторизации */}
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const response = await axios.get(`${API}/contracts/${id}/download-pdf`, {
                          headers: { Authorization: `Bearer ${token}` },
                          responseType: 'blob'
                        });
                        
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `contract_${contract.contract_code || id}.pdf`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url);
                        toast.success(t('contract.downloadSuccess'));
                      } catch (error) {
                        console.error('Error downloading PDF:', error);
                        toast.error(t('contract.downloadError'));
                      }
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-lg hover:from-green-700 hover:to-green-600 transition-all shadow-lg shadow-green-500/20 flex items-center gap-2"
                    data-testid="admin-download-pdf-button"
                  >
                    <Download className="h-4 w-4" />
                    {t('contract.download')}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 w-full lg:w-auto justify-between items-center">
                  <div className="flex gap-2 order-1 lg:order-none">
                    {/* Удалить - всегда слева */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="px-3 py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-500 rounded-lg hover:from-red-700 hover:to-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center" data-testid="delete-contract-button">
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('contract.deleteTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the contract.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="cancel-delete-button">{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} data-testid="confirm-delete-button">
                            {t('contract.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    {/* Редактировать - только если ссылка еще не сгенерирована */}
                    {(contract.status === 'draft' || contract.status === 'sent') && !contract.signature_link && (
                      <button
                        onClick={() => navigate(`/contracts/edit/${id}`)}
                        className="px-3 py-2 text-gray-700 minimal-card hover:shadow-xl transition-all"
                        data-testid="edit-contract-button"
                        title="Редактировать договор"
                      >
                        <Edit3 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 order-2 lg:order-none">
                  
                  {/* Генерировать/Копировать ссылку */}
                  {(contract.status === 'draft' || contract.status === 'sent') && (
                    <button
                      onClick={async () => {
                        if (!contract.signature_link) {
                          // Generate link first
                          await handleSendContract();
                        } else {
                          // Copy existing link with animation
                          const fullLink = `${window.location.origin}${contract.signature_link}`;
                          const textArea = document.createElement('textarea');
                          textArea.value = fullLink;
                          textArea.style.position = 'fixed';
                          textArea.style.left = '-999999px';
                          document.body.appendChild(textArea);
                          textArea.focus();
                          textArea.select();
                          try {
                            document.execCommand('copy');
                            setJustCopied(true);
                            toast.success(t('contract.linkCopied'));
                            setTimeout(() => setJustCopied(false), 2000);
                          } catch (err) {
                            toast.error(t('contract.linkCopyError'));
                          }
                          document.body.removeChild(textArea);
                        }
                      }}
                      disabled={sendingContract}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 justify-center ${
                        justCopied 
                          ? 'bg-gradient-to-r from-green-600 to-green-500 shadow-green-500/30' 
                          : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-blue-500/20'
                      }`}
                      data-testid="send-contract-button"
                    >
                      {justCopied ? (
                        <>
                          <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">{t('contractDetails.copied')}</span>
                          <span className="sm:hidden">✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">{sendingContract ? t('contractDetails.generating') : (contract.signature_link ? t('contractDetails.copyLink') : t('contractDetails.generateLink'))}</span>
                          <span className="sm:hidden">{contract.signature_link ? t('contractDetails.copy') : t('contractDetails.link')}</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Утвердить - только для pending-signature */}
                  {contract.status === 'pending-signature' && (
                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-lg hover:from-green-700 hover:to-green-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 justify-center"
                      data-testid="approve-contract-button"
                    >
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{approving ? t('common.loading') : t('contract.approve')}</span>
                    </button>
                  )}
                  
                  {/* Скачать PDF - доступно для signed */}
                  {contract.status === 'signed' && (
                    <button
                      onClick={handleDownloadPDF}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-1.5 sm:gap-2 justify-center"
                      data-testid="download-pdf-button"
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{t('contract.download')}</span>
                      <span className="sm:hidden">PDF</span>
                    </button>
                  )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4 sm:space-y-6">
            {/* Link section removed - button is in header now */}
            
            {/* Contract Details */}
            <div className="minimal-card p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900">{t('contractDetails.details')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                {/* Show dynamic placeholders from template if available */}
                {template && template.placeholders ? (
                  <>
                    {Object.entries(template.placeholders)
                      .filter(([key, config]) => {
                        // Skip calculated fields as they are computed
                        if (config.type === 'calculated') return false;
                        // Show only placeholders marked for Contract Details section
                        if (config.showInContractDetails === false) return false;
                        // Show tenant/signer placeholders
                        return config.owner === 'tenant' || config.owner === 'signer';
                      })
                      .map(([key, config]) => {
                        const value = contract.placeholder_values ? contract.placeholder_values[key] : null;
                        return (
                          <div key={key}>
                            <span className="text-neutral-500">{translateLabel(key, config.label)}:</span>
                            <p className="font-medium" data-testid={`placeholder-${key}`}>
                              {value || <span className="text-neutral-400">{t('contractDetails.notFilled')}</span>}
                            </p>
                          </div>
                        );
                      })}
                  </>
                ) : (
                  // Fallback to old fields for contracts without template
                  <>
                    <div>
                      <span className="text-neutral-500">{t('placeholders.signer')}:</span>
                      <p className="font-medium" data-testid="signer-name">{contract.signer_name}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">{t('placeholders.phone')}:</span>
                      <p className="font-medium" data-testid="signer-phone">{contract.signer_phone}</p>
                    </div>
                    {contract.signer_email && (
                      <div>
                        <span className="text-neutral-500">Email:</span>
                        <p className="font-medium">{contract.signer_email}</p>
                      </div>
                    )}
                  </>
                )}
                {contract.amount && (
                  <div>
                    <span className="text-neutral-500">{t('placeholders.amount')}:</span>
                    <p className="font-medium">{contract.amount}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Content */}
            <div className="minimal-card p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900">{t('contractDetails.content')}</h3>
              <div className="bg-gradient-to-br from-white to-gray-50 p-4 sm:p-6 rounded-xl border border-gray-100 shadow-inner">
                <div 
                  className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-gray-800 break-words overflow-x-auto"
                  style={{
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                    lineHeight: '1.6'
                  }}
                  dangerouslySetInnerHTML={{ __html: replacePlaceholders(contract.content) }}
                  data-testid="contract-content"
                />
              </div>
            </div>
            
            {/* Old signature link block removed - now at top */}
            
            {/* Signature Details (if signed) */}
            {signature && signature.verified && (
              <div className="minimal-card p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-gray-900">{t('contractDetails.signatureInfo')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Landlord Signature - LEFT COLUMN */}
                  <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200">
                    <h4 className="font-semibold mb-3 text-gray-900 text-sm sm:text-base">{contract.party_a_role || t('contractDetails.partyA')}</h4>
                    
                    {contract.landlord_signature_hash ? (
                      <>
                        <div className="bg-emerald-50 p-3 rounded border border-emerald-200 mb-3">
                          <p className="text-xs text-emerald-700 mb-1">{t('contractDetails.codeKey')}:</p>
                          <p className="font-mono text-sm font-bold text-emerald-900">{contract.landlord_signature_hash}</p>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          {/* Show dynamic placeholders from template if available */}
                          {template && template.placeholders && contract.placeholder_values ? (
                            <>
                              {Object.entries(template.placeholders)
                                .filter(([key, config]) => {
                                  // Skip calculated fields
                                  if (config.type === 'calculated') return false;
                                  // Show only placeholders marked for Signature Info section
                                  if (config.showInSignatureInfo === false) return false;
                                  // Show only landlord placeholders
                                  return config.owner === 'landlord';
                                })
                                .map(([key, config]) => {
                                  const value = contract.placeholder_values[key];
                                  return (
                                    <div key={key}>
                                      <span className="text-neutral-500">{translateLabel(key, config.label)}:</span>
                                      <p className="font-medium">{value || <span className="text-neutral-400">{t('contractDetails.notFilled')}</span>}</p>
                                    </div>
                                  );
                                })}
                            </>
                          ) : (
                            // Fallback to old fields for contracts without template
                            <>
                              {contract.landlord_name && (
                                <div>
                                  <span className="text-neutral-500">{t('contractDetails.company')}:</span>
                                  <p className="font-medium">{contract.landlord_name}</p>
                                </div>
                              )}
                              {contract.landlord_representative && (
                                <div>
                                  <span className="text-neutral-500">{t('contractDetails.representative')}:</span>
                                  <p className="font-medium">{contract.landlord_representative}</p>
                                </div>
                              )}
                              {contract.landlord_iin_bin && (
                                <div>
                                  <span className="text-neutral-500">{t('contractDetails.iinBin')}:</span>
                                  <p className="font-medium">{contract.landlord_iin_bin}</p>
                                </div>
                              )}
                              {creator && creator.email && (
                                <div>
                                  <span className="text-neutral-500">Email:</span>
                                  <p className="font-medium">{creator.email}</p>
                                </div>
                              )}
                              {creator && creator.phone && (
                                <div>
                                  <span className="text-neutral-500">{t('contractDetails.phone')}:</span>
                                  <p className="font-medium">{creator.phone}</p>
                                </div>
                              )}
                              {creator && creator.legal_address && (
                                <div>
                                  <span className="text-neutral-500">{t('contractDetails.legalAddress')}:</span>
                                  <p className="font-medium">{creator.legal_address}</p>
                                </div>
                              )}
                            </>
                          )}
                          
                          <div>
                            <span className="text-neutral-500">{t('contractDetails.status')}:</span>
                            <p className="font-medium text-emerald-600">{t('contractDetails.approved')}</p>
                          </div>
                          {contract.approved_at && (
                            <div>
                              <span className="text-neutral-500">{t('contractDetails.approvalTime')}:</span>
                              <p className="font-medium">{format(new Date(contract.approved_at), 'dd MMM yyyy HH:mm')}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-neutral-500">{t('contractDetails.contractLanguage')}:</span>
                            <p className="font-medium">
                              {(contract.contract_language || contract.signing_language) === 'ru' && t('contractDetails.russian')}
                              {(contract.contract_language || contract.signing_language) === 'kk' && t('contractDetails.kazakh')}
                              {(contract.contract_language || contract.signing_language) === 'en' && t('contractDetails.english')}
                              {!(contract.contract_language || contract.signing_language) && t('contractDetails.russianDefault')}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-amber-600">{t('contractDetails.awaitingApproval')}</p>
                    )}
                  </div>
                  
                  {/* Tenant Signature - RIGHT COLUMN */}
                  <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200">
                    <h4 className="font-semibold mb-3 text-gray-900 text-sm sm:text-base">{contract.party_b_role || t('contractDetails.partyB')}</h4>
                    
                    {signature.signature_hash && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-3">
                        <p className="text-xs text-blue-700 mb-1">{t('contractDetails.codeKey')}:</p>
                        <p className="font-mono text-sm font-bold text-blue-900">{signature.signature_hash}</p>
                      </div>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      {/* Show dynamic placeholders from template if available */}
                      {template && template.placeholders && contract.placeholder_values ? (
                        <>
                          {Object.entries(template.placeholders)
                            .filter(([key, config]) => {
                              // Skip calculated fields as they are computed
                              if (config.type === 'calculated') return false;
                              // Show only placeholders marked for Signature Info section
                              if (config.showInSignatureInfo === false) return false;
                              // Show only tenant/signer placeholders (NOT all placeholders)
                              return config.owner === 'tenant' || config.owner === 'signer';
                            })
                            .map(([key, config]) => {
                              const value = contract.placeholder_values[key];
                              return (
                                <div key={key}>
                                  <span className="text-neutral-500">{translateLabel(key, config.label)}:</span>
                                  <p className="font-medium">{value || <span className="text-neutral-400">{t('contractDetails.notFilled')}</span>}</p>
                                </div>
                              );
                            })}
                        </>
                      ) : (
                        // Fallback to old fields for contracts without template
                        <>
                          {contract.signer_name && (
                            <div>
                              <span className="text-neutral-500">{t('contractDetails.name')}:</span>
                              <p className="font-medium">{contract.signer_name}</p>
                            </div>
                          )}
                          {contract.signer_phone && (
                            <div>
                              <span className="text-neutral-500">{t('contractDetails.phone')}:</span>
                              <p className="font-medium">{contract.signer_phone}</p>
                            </div>
                          )}
                          {contract.signer_email && (
                            <div>
                              <span className="text-neutral-500">Email:</span>
                              <p className="font-medium">{contract.signer_email}</p>
                            </div>
                          )}
                        </>
                      )}
                      <div>
                        <span className="text-neutral-500">{t('contractDetails.signingMethod')}:</span>
                        <p className="font-medium">
                          {contract.verification_method === 'sms' && 'SMS'}
                          {contract.verification_method === 'call' && t('contractDetails.incomingCall')}
                          {contract.verification_method === 'telegram' && 'Telegram'}
                          {!contract.verification_method && t('contractDetails.notSpecified')}
                        </p>
                      </div>
                      {contract.verification_method === 'telegram' && contract.telegram_username && (
                        <div>
                          <span className="text-neutral-500">Telegram:</span>
                          <p className="font-medium">@{contract.telegram_username}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-neutral-500">{t('contractDetails.signingTime')}:</span>
                        <p className="font-medium">{signature.signed_at ? format(new Date(signature.signed_at), 'dd MMM yyyy HH:mm') : 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-neutral-500">{t('contractDetails.contractLanguage')}:</span>
                        <p className="font-medium">
                          {(contract.contract_language || contract.signing_language) === 'ru' && t('contractDetails.russian')}
                          {(contract.contract_language || contract.signing_language) === 'kk' && t('contractDetails.kazakh')}
                          {(contract.contract_language || contract.signing_language) === 'en' && t('contractDetails.english')}
                          {!(contract.contract_language || contract.signing_language) && t('contractDetails.russianDefault')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Document Photo */}
                {signature.document_upload && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3 text-sm sm:text-base">{t('contractDetails.signerDocument')}:</h4>
                    <div className="border rounded-lg p-2 sm:p-4 bg-white overflow-hidden">
                      <img 
                        src={`data:image/jpeg;base64,${signature.document_upload}`}
                        alt="ID Document"
                        className="w-full max-w-md lg:max-w-2xl mx-auto rounded shadow-md cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all object-contain"
                        style={{ maxHeight: '500px' }}
                        onClick={() => {
                          // Create modal overlay
                          const overlay = document.createElement('div');
                          overlay.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 cursor-zoom-out';
                          overlay.onclick = () => overlay.remove();
                          
                          const img = document.createElement('img');
                          img.src = `data:image/jpeg;base64,${signature.document_upload}`;
                          img.className = 'max-w-full max-h-full object-contain';
                          
                          overlay.appendChild(img);
                          document.body.appendChild(overlay);
                        }}
                        data-testid="signature-document-image"
                      />
                      {signature.document_filename && (
                        <p className="text-xs text-neutral-500 mt-2 text-center break-all">{signature.document_filename}</p>
                      )}
                      <p className="text-xs text-neutral-400 mt-1 text-center">{t('contractDetails.clickToEnlarge')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Pending signature - show only tenant signature */}
            {signature && !signature.verified && contract.status === 'sent' && (
              <div className="border-t pt-6">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-amber-900">Ожидается подписание от нанимателя</p>
                </div>
              </div>
            )}
            
            {/* Show pending approval message */}
            {contract.status === 'pending-signature' && (
              <div className="border-t pt-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <p className="text-blue-900 font-semibold mb-2">{t('contractDetails.approvalRequired')}</p>
                  <p className="text-sm text-blue-800">{t('contractDetails.tenantSignedMessage')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDetailsPage;