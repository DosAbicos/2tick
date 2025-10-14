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
import { ArrowLeft, Send, Download, Trash2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ContractDetailsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingContract, setSendingContract] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchContract();
    fetchSignature();
  }, [id]);

  const fetchContract = async () => {
    try {
      const response = await axios.get(`${API}/contracts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContract(response.data);
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
    try {
      await axios.post(
        `${API}/contracts/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(t('common.success'));
      fetchContract();
      fetchSignature();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
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
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2" data-testid="contract-title">{contract.title}</CardTitle>
                <div className="flex gap-2 items-center">
                  {getStatusBadge(contract.status)}
                  <span className="text-sm text-neutral-500">
                    Updated {format(new Date(contract.updated_at), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                {(contract.status === 'draft' || contract.status === 'sent') && (
                  <Button
                    onClick={handleSendContract}
                    disabled={sendingContract}
                    data-testid="send-contract-button"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sendingContract ? t('common.loading') : t('contract.send')}
                  </Button>
                )}
                
                {contract.status === 'pending-signature' && (
                  <Button
                    onClick={handleApprove}
                    data-testid="approve-contract-button"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('contract.approve')}
                  </Button>
                )}
                
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
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contract Details */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Contract Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                <pre className="whitespace-pre-wrap text-sm" data-testid="contract-content">{contract.content}</pre>
              </div>
            </div>
            
            {/* Signature Link */}
            {contract.signature_link && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Signature Link</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <a 
                      href={contract.signature_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-700"
                      data-testid="signature-link"
                    >
                      {window.location.origin}{contract.signature_link}
                    </a>
                  </p>
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