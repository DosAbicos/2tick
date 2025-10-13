import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import { ArrowLeft } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateContractPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    signer_name: '',
    signer_phone: '',
    signer_email: '',
    amount: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/contracts`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(t('common.success'));
      navigate(`/contracts/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <Card data-testid="create-contract-card">
          <CardHeader>
            <CardTitle className="text-2xl">{t('contract.create.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-contract-form">
              <div>
                <Label htmlFor="title">{t('contract.title')}</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  data-testid="contract-title-input"
                  className="mt-1"
                  placeholder="e.g., Service Agreement"
                />
              </div>
              
              <div>
                <Label htmlFor="content">{t('contract.content')}</Label>
                <Textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  rows={10}
                  data-testid="contract-content-input"
                  className="mt-1"
                  placeholder="Enter contract details..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signer_name">{t('contract.signer_name')}</Label>
                  <Input
                    id="signer_name"
                    name="signer_name"
                    value={formData.signer_name}
                    onChange={handleChange}
                    required
                    data-testid="signer-name-input"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="signer_phone">{t('contract.signer_phone')}</Label>
                  <Input
                    id="signer_phone"
                    name="signer_phone"
                    type="tel"
                    value={formData.signer_phone}
                    onChange={handleChange}
                    required
                    data-testid="signer-phone-input"
                    className="mt-1"
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signer_email">{t('contract.signer_email')} (optional)</Label>
                  <Input
                    id="signer_email"
                    name="signer_email"
                    type="email"
                    value={formData.signer_email}
                    onChange={handleChange}
                    data-testid="signer-email-input"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="amount">{t('contract.amount')} (optional)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    data-testid="amount-input"
                    className="mt-1"
                    placeholder="e.g., 100,000 KZT"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="save-contract-button"
                  className="flex-1"
                >
                  {loading ? t('common.loading') : t('contract.save')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  data-testid="cancel-button"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateContractPage;