import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    result = result.replace(/\[ФИО Нанимателя\]/g, contract.signer_name || '[ФИО Нанимателя]');
    result = result.replace(/\[ФИО\]/g, contract.signer_name || '[ФИО]');
    result = result.replace(/\[Телефон\]/g, contract.signer_phone || '[Телефон]');
    result = result.replace(/\[Email\]/g, contract.signer_email || '[Email]');
    result = result.replace(/\[Дата заселения\]/g, contract.move_in_date || '[Дата заселения]');
    result = result.replace(/\[Дата выселения\]/g, contract.move_out_date || '[Дата выселения]');
    result = result.replace(/\[Адрес квартиры\]/g, contract.property_address || '[Адрес квартиры]');
    result = result.replace(/\[Цена в сутки\]/g, contract.rent_amount || '[Цена в сутки]');
    result = result.replace(/\[Количество суток\]/g, contract.days_count || '[Количество суток]');
    
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
    if (approving) return; // Prevent multiple clicks
    
    setApproving(true);
    try {
      const response = await axios.post(
        `${API}/contracts/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Договор утвержден и отправлен на email нанимателя');
      fetchContract();
      fetchSignature();
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
    const statusMap = {
      draft: { variant: 'secondary', text: t('status.draft') },
      sent: { variant: 'default', text: t('status.sent') },
      'pending-signature': { variant: 'outline', text: t('status.pending-signature') },
      signed: { variant: 'success', text: t('status.signed') },
      declined: { variant: 'destructive', text: t('status.declined') }
    };
    
    const config = statusMap[status] || statusMap.draft;
    return <Badge variant={config.variant}>{config.text}</Badge>;
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
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <Card data-testid="contract-details-card">
          <CardHeader>
            {isReadOnly && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">
                  👁️ Режим просмотра (только чтение)
                </p>
              </div>
            )}
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2" data-testid="contract-title">{contract.title}</CardTitle>
                <div className="flex gap-2 items-center flex-wrap">
                  {contract.contract_code && (
                    <code className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded border border-blue-200">
                      {contract.contract_code}
                    </code>
                  )}
                  {getStatusBadge(contract.status)}
                  <span className="text-sm text-neutral-500">
                    Updated {format(new Date(contract.updated_at), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              </div>
              
              {!isReadOnly && (
                <div className="flex gap-2">
                  {/* Редактировать - только для draft и sent */}
                  {(contract.status === 'draft' || contract.status === 'sent') && (
                    <Button
                      onClick={() => navigate(`/contracts/edit/${id}`)}
                      variant="outline"
                      data-testid="edit-contract-button"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Редактировать
                    </Button>
                  )}
                  
                  {/* Отправить ссылку - только для draft и sent */}
                  {(contract.status === 'draft' || contract.status === 'sent') && (
                    <Button
                      onClick={handleSendContract}
                      disabled={sendingContract}
                      data-testid="send-contract-button"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {sendingContract ? t('common.loading') : 'Отправить ссылку'}
                    </Button>
                  )}
                  
                  {/* Утвердить - только для pending-signature */}
                  {contract.status === 'pending-signature' && (
                    <Button
                      onClick={handleApprove}
                      disabled={approving}
                      data-testid="approve-contract-button"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {approving ? t('common.loading') : 'Утвердить'}
                    </Button>
                  )}
                  
                  {/* Скачать PDF - доступно для signed */}
                  {contract.status === 'signed' && (
                    <Button
                      onClick={handleDownloadPDF}
                      variant="outline"
                      data-testid="download-pdf-button"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t('contract.download')}
                    </Button>
                  )}
                  
                  {/* Удалить - всегда доступно */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" data-testid="delete-contract-button">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Signature Link - Moved to top for better UX */}
            {contract.signature_link && contract.status !== 'signed' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-3">Ссылка для подписания</h3>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const fullLink = `${window.location.origin}${contract.signature_link}`;
                      
                      // Fallback method for clipboard
                      const textArea = document.createElement('textarea');
                      textArea.value = fullLink;
                      textArea.style.position = 'fixed';
                      textArea.style.left = '-999999px';
                      document.body.appendChild(textArea);
                      textArea.focus();
                      textArea.select();
                      
                      try {
                        document.execCommand('copy');
                        toast.success('Ссылка скопирована в буфер обмена!');
                      } catch (err) {
                        toast.error('Не удалось скопировать. Попробуйте вручную.');
                      }
                      
                      document.body.removeChild(textArea);
                    }}
                    data-testid="copy-signature-link-button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Копировать ссылку на подписание
                  </Button>
                  
                  <Button
                    variant="default"
                    onClick={() => window.open(contract.signature_link, '_blank')}
                    data-testid="open-signature-link-button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Открыть
                  </Button>
                </div>
              </div>
            )}
            
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
                        // Show all tenant/signer placeholders in Contract Details
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
              <h3 className="text-lg font-semibold mb-2">Content</h3>
              <div className="bg-neutral-50 p-4 rounded-lg border">
                {contract.content_type === 'html' ? (
                  <div 
                    className="prose prose-sm max-w-none"
                    style={{
                      fontFamily: 'IBM Plex Sans, sans-serif',
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}
                    dangerouslySetInnerHTML={{ __html: replacePlaceholders(contract.content) }}
                    data-testid="contract-content"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm" data-testid="contract-content">
                    {replacePlaceholders(contract.content)}
                  </pre>
                )}
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
                      {/* Show ALL dynamic placeholders from template if available */}
                      {template && template.placeholders ? (
                        <>
                          {Object.entries(template.placeholders)
                            .filter(([key, config]) => {
                              // Skip calculated fields as they are computed
                              if (config.type === 'calculated') return false;
                              // Show all placeholders (not just tenant/signer - show ALL)
                              return true;
                            })
                            .map(([key, config]) => {
                              const value = contract.placeholder_values ? contract.placeholder_values[key] : null;
                              return (
                                <div key={key}>
                                  <span className="text-neutral-500">{config.label} {config.owner && <span className="text-xs">({config.owner})</span>}:</span>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractDetailsPage;