import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Header from '@/components/Header';
import { FileText, Clock, CheckCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limitInfo, setLimitInfo] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchContracts();
    fetchLimitInfo();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await axios.get(`${API}/contracts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContracts(response.data);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchLimitInfo = async () => {
    try {
      const response = await axios.get(`${API}/contracts/limit/info`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLimitInfo(response.data);
    } catch (error) {
      console.error('Error fetching limit info:', error);
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
    return <Badge variant={config.variant} data-testid={`status-badge-${status}`}>{config.text}</Badge>;
  };

  const stats = [
    {
      icon: FileText,
      label: t('dashboard.stats.active'),
      value: contracts.filter(c => c.status !== 'signed').length,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      icon: Clock,
      label: t('dashboard.stats.pending'),
      value: contracts.filter(c => c.status === 'pending-signature').length,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600'
    },
    {
      icon: CheckCircle,
      label: t('dashboard.stats.signed'),
      value: contracts.filter(c => c.status === 'signed').length,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900" data-testid="dashboard-title">
            {t('dashboard.title')}
          </h1>
          <Button
            onClick={() => {
              if (limitInfo?.exceeded) {
                toast.error(`Достигнут лимит договоров (${limitInfo.limit}). Пожалуйста, обновите подписку.`);
              } else {
                navigate('/contracts/create');
              }
            }}
            disabled={limitInfo?.exceeded}
            data-testid="create-contract-primary-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.new_contract')}
          </Button>
        </div>

        {/* Limit warning */}
        {limitInfo && (
          <div className={`mb-6 p-4 rounded-lg border ${
            limitInfo.exceeded 
              ? 'bg-red-50 border-red-200' 
              : limitInfo.remaining <= 2 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${
                  limitInfo.exceeded 
                    ? 'text-red-900' 
                    : limitInfo.remaining <= 2 
                      ? 'text-amber-900' 
                      : 'text-blue-900'
                }`}>
                  {limitInfo.exceeded 
                    ? '⚠️ Лимит договоров исчерпан' 
                    : limitInfo.remaining <= 2
                      ? '⚠️ Лимит договоров почти исчерпан'
                      : '📊 Лимит договоров'}
                </p>
                <p className={`text-sm mt-1 ${
                  limitInfo.exceeded 
                    ? 'text-red-700' 
                    : limitInfo.remaining <= 2 
                      ? 'text-amber-700' 
                      : 'text-blue-700'
                }`}>
                  Использовано: {limitInfo.used} из {limitInfo.limit} договоров
                  {limitInfo.remaining > 0 && ` (осталось ${limitInfo.remaining})`}
                </p>
              </div>
              {limitInfo.exceeded && (
                <Button variant="destructive" onClick={() => toast.info('Функция покупки подписки в разработке')}>
                  Обновить подписку
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} data-testid={`stat-card-${index}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold" data-testid="dashboard-stat-value">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Contracts Table */}
        <Card data-testid="contracts-table-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{t('dashboard.table.title')}</h2>
            </div>
            
            {loading ? (
              <div className="text-center py-8 text-neutral-500">{t('common.loading')}</div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500">No contracts yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    if (limitInfo?.exceeded) {
                      toast.error(`Достигнут лимит договоров (${limitInfo.limit}). Пожалуйста, обновите подписку.`);
                    } else {
                      navigate('/contracts/create');
                    }
                  }}
                  disabled={limitInfo?.exceeded}
                  data-testid="empty-state-create-button"
                >
                  {t('dashboard.new_contract')}
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table data-testid="contracts-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Код</TableHead>
                      <TableHead>{t('dashboard.table.title')}</TableHead>
                      <TableHead>{t('dashboard.table.counterparty')}</TableHead>
                      <TableHead>{t('dashboard.table.amount')}</TableHead>
                      <TableHead>{t('dashboard.table.status')}</TableHead>
                      <TableHead>{t('dashboard.table.updated')}</TableHead>
                      <TableHead>{t('dashboard.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id} data-testid="contracts-table-row">
                        <TableCell>
                          <code className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {contract.contract_code || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{contract.title}</TableCell>
                        <TableCell>{contract.signer_name}</TableCell>
                        <TableCell>{contract.amount || '-'}</TableCell>
                        <TableCell>{getStatusBadge(contract.status)}</TableCell>
                        <TableCell>{format(new Date(contract.updated_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/contracts/${contract.id}`)}
                            data-testid="view-contract-button"
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;