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
import { ArrowLeft, Send, Download, Trash2, CheckCircle, Edit3 } from 'lucide-react';
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
    
    // Universal placeholder regex to match ALL placeholders [...]
    const placeholderRegex = /\[([^\]]+)\]/g;
    
    result = result.replace(placeholderRegex, (match, label) => {
      let value = match;
      let isFilled = false;
      
      // Map placeholder labels to contract fields
      if (label.includes('ФИО') && label.includes('Нанимателя')) {
        value = contract.signer_name || match;
        isFilled = !!contract.signer_name;
      } else if (label === 'ФИО') {
        value = contract.signer_name || match;
        isFilled = !!contract.signer_name;
      } else if (label.includes('Телефон')) {
        value = contract.signer_phone || match;
        isFilled = !!contract.signer_phone;
      } else if (label.includes('Email') || label.includes('Почта')) {
        value = contract.signer_email || match;
        isFilled = !!contract.signer_email;
      } else if (label.includes('Дата заселения')) {
        value = contract.move_in_date || match;
        isFilled = !!contract.move_in_date;
      } else if (label.includes('Дата выселения')) {
        value = contract.move_out_date || match;
        isFilled = !!contract.move_out_date;
      } else if (label.includes('Адрес')) {
        value = contract.property_address || match;
        isFilled = !!contract.property_address;
      } else if (label.includes('Цена') || label.includes('сутки')) {
        value = contract.rent_amount || match;
        isFilled = !!contract.rent_amount;
      } else if (label.includes('суток') || label.includes('Количество')) {
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
      
      toast.success('Договор утвержден! Email отправлен нанимателю.');
      
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
      
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/contracts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Contract deleted');
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
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (!contract) return null;

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg hover:bg-gray-50 transition-all border border-gray-200 flex items-center gap-2"
          data-testid="back-button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        
        <div className="minimal-card p-6 sm:p-8 animate-fade-in" data-testid="contract-details-card">
          <div className="mb-6">
            {isReadOnly && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">
                  👁️ Режим просмотра (только чтение)
                </p>
              </div>
            )}
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3" data-testid="contract-title">{contract.title}</h1>
                <div className="flex gap-3 items-center flex-wrap">
                  {contract.contract_code && (
                    <div className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20">
                      {contract.contract_code}
                    </div>
                  )}
                  {getStatusBadge(contract.status)}
                  <span className="text-sm text-gray-500">
                    Updated {format(new Date(contract.updated_at), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
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
                        toast.success('Договор успешно скачан');
                      } catch (error) {
                        console.error('Error downloading PDF:', error);
                        toast.error('Ошибка скачивания договора');
                      }
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-lg hover:from-green-700 hover:to-green-600 transition-all shadow-lg shadow-green-500/20 flex items-center gap-2"
                    data-testid="admin-download-pdf-button"
                  >
                    <Download className="h-4 w-4" />
                    Скачать договор
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {/* Редактировать - только если ссылка еще не сгенерирована */}
                  {(contract.status === 'draft' || contract.status === 'sent') && !contract.signature_link && (
                    <button
                      onClick={() => navigate(`/contracts/edit/${id}`)}
                      className="px-3 py-2 text-gray-700 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all"
                      data-testid="edit-contract-button"
                      title="Редактировать договор"
                    >
                      <Edit3 className="h-5 w-5" />
                    </button>
                  )}
                  
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
                            toast.success('Ссылка скопирована!');
                            setTimeout(() => setJustCopied(false), 2000);
                          } catch (err) {
                            toast.error('Не удалось скопировать');
                          }
                          document.body.removeChild(textArea);
                        }
                      }}
                      disabled={sendingContract}
                      className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                        justCopied 
                          ? 'bg-gradient-to-r from-green-600 to-green-500 shadow-green-500/30 scale-105' 
                          : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-blue-500/20'
                      }`}
                      data-testid="send-contract-button"
                    >
                      {justCopied ? (
                        <>
                          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Скопировано!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {sendingContract ? 'Генерация...' : (contract.signature_link ? 'Копировать ссылку' : 'Сгенерировать ссылку')}
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Утвердить - только для pending-signature */}
                  {contract.status === 'pending-signature' && (
                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-lg hover:from-green-700 hover:to-green-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      data-testid="approve-contract-button"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {approving ? t('common.loading') : 'Утвердить'}
                    </button>
                  )}
                  
                  {/* Скачать PDF - доступно для signed */}
                  {contract.status === 'signed' && (
                    <button
                      onClick={handleDownloadPDF}
                      className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                      data-testid="download-pdf-button"
                    >
                      <Download className="h-4 w-4" />
                      Скачать PDF
                    </button>
                  )}
                  
                  {/* Удалить - всегда доступно */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-500 rounded-lg hover:from-red-700 hover:to-red-600 transition-all shadow-lg shadow-red-500/20" data-testid="delete-contract-button">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contract</AlertDialogTitle>
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
                </div>
              )}
            </div>
          </div>
          <div className="space-y-6">
            {/* Link section removed - button is in header now */}
            
            {/* Contract Details */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Contract Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                            <span className="text-neutral-500">{config.label}:</span>
                            <p className="font-medium" data-testid={`placeholder-${key}`}>
                              {value || <span className="text-neutral-400">Не заполнено</span>}
                            </p>
                          </div>
                        );
                      })}
                  </>
                ) : (
                  // Fallback to old fields for contracts without template
                  <>
                    <div>
                      <span className="text-neutral-500">Signer:</span>
                      <p className="font-medium" data-testid="signer-name">{contract.signer_name}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Phone:</span>
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
                    <span className="text-neutral-500">Amount:</span>
                    <p className="font-medium">{contract.amount}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Content */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Содержимое договора</h3>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div 
                  className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800"
                  style={{
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    fontSize: '14px',
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
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Информация о подписании</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Landlord Signature - LEFT COLUMN */}
                  <div className="border rounded-lg p-4 bg-neutral-50">
                    <h4 className="font-semibold mb-3 text-neutral-900">Подпись Наймодателя</h4>
                    
                    {contract.landlord_signature_hash ? (
                      <>
                        <div className="bg-emerald-50 p-3 rounded border border-emerald-200 mb-3">
                          <p className="text-xs text-emerald-700 mb-1">Код-ключ:</p>
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
                                  // Show only landlord placeholders
                                  return config.owner === 'landlord';
                                })
                                .map(([key, config]) => {
                                  const value = contract.placeholder_values[key];
                                  return (
                                    <div key={key}>
                                      <span className="text-neutral-500">{config.label}:</span>
                                      <p className="font-medium">{value || <span className="text-neutral-400">Не заполнено</span>}</p>
                                    </div>
                                  );
                                })}
                            </>
                          ) : (
                            // Fallback to old fields for contracts without template
                            <>
                              {contract.landlord_name && (
                                <div>
                                  <span className="text-neutral-500">Компания:</span>
                                  <p className="font-medium">{contract.landlord_name}</p>
                                </div>
                              )}
                              {contract.landlord_representative && (
                                <div>
                                  <span className="text-neutral-500">Представитель:</span>
                                  <p className="font-medium">{contract.landlord_representative}</p>
                                </div>
                              )}
                              {contract.landlord_iin_bin && (
                                <div>
                                  <span className="text-neutral-500">ИИН/БИН:</span>
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
                                  <span className="text-neutral-500">Телефон:</span>
                                  <p className="font-medium">{creator.phone}</p>
                                </div>
                              )}
                              {creator && creator.legal_address && (
                                <div>
                                  <span className="text-neutral-500">Юр. адрес:</span>
                                  <p className="font-medium">{creator.legal_address}</p>
                                </div>
                              )}
                            </>
                          )}
                          
                          <div>
                            <span className="text-neutral-500">Статус:</span>
                            <p className="font-medium text-emerald-600">Утверждено</p>
                          </div>
                          {contract.approved_at && (
                            <div>
                              <span className="text-neutral-500">Время утверждения:</span>
                              <p className="font-medium">{format(new Date(contract.approved_at), 'dd MMM yyyy HH:mm')}</p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-amber-600">Ожидает утверждения</p>
                    )}
                  </div>
                  
                  {/* Tenant Signature - RIGHT COLUMN */}
                  <div className="border rounded-lg p-4 bg-neutral-50">
                    <h4 className="font-semibold mb-3 text-neutral-900">Подпись Нанимателя</h4>
                    
                    {signature.signature_hash && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-3">
                        <p className="text-xs text-blue-700 mb-1">Код-ключ:</p>
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
                                  <span className="text-neutral-500">{config.label}:</span>
                                  <p className="font-medium">{value || <span className="text-neutral-400">Не заполнено</span>}</p>
                                </div>
                              );
                            })}
                        </>
                      ) : (
                        // Fallback to old fields for contracts without template
                        <>
                          {contract.signer_name && (
                            <div>
                              <span className="text-neutral-500">Имя:</span>
                              <p className="font-medium">{contract.signer_name}</p>
                            </div>
                          )}
                          {contract.signer_phone && (
                            <div>
                              <span className="text-neutral-500">Телефон:</span>
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
                        <span className="text-neutral-500">Метод подписания:</span>
                        <p className="font-medium">
                          {contract.verification_method === 'sms' && '📱 SMS'}
                          {contract.verification_method === 'call' && '☎️ Входящий звонок'}
                          {contract.verification_method === 'telegram' && '💬 Telegram'}
                          {!contract.verification_method && 'Не указан'}
                        </p>
                      </div>
                      {contract.verification_method === 'telegram' && contract.telegram_username && (
                        <div>
                          <span className="text-neutral-500">Telegram:</span>
                          <p className="font-medium">@{contract.telegram_username}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-neutral-500">Время подписания:</span>
                        <p className="font-medium">{signature.signed_at ? format(new Date(signature.signed_at), 'dd MMM yyyy HH:mm') : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Document Photo */}
                {signature.document_upload && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Документ подписанта:</h4>
                    <div className="border rounded-lg p-4 bg-white">
                      <img 
                        src={`data:image/jpeg;base64,${signature.document_upload}`}
                        alt="ID Document"
                        className="max-w-lg mx-auto rounded shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => window.open(`data:image/jpeg;base64,${signature.document_upload}`, '_blank')}
                        data-testid="signature-document-image"
                      />
                      {signature.document_filename && (
                        <p className="text-xs text-neutral-500 mt-2 text-center">{signature.document_filename}</p>
                      )}
                      <p className="text-xs text-neutral-400 mt-1 text-center">Нажмите для увеличения</p>
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
                  <p className="text-blue-900 font-semibold mb-2">Требуется ваше утверждение</p>
                  <p className="text-sm text-blue-800">Наниматель подписал договор. Проверьте документы и нажмите "Утвердить" для завершения.</p>
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