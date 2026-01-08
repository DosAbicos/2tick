import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import { FileText, Clock, CheckCircle, Plus, Eye, Trash2, Download, XCircle, AlertCircle, Upload, Bell, X } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, signed: 0, pending: 0, draft: 0 });
  const [limitInfo, setLimitInfo] = useState(null);
  
  // Notification popup state
  const [notification, setNotification] = useState(null);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  
  // Modal for selecting favorite template
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [favoriteTemplates, setFavoriteTemplates] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  useEffect(() => {
    fetchContracts();
    fetchLimitInfo();
    fetchActiveNotification();
  }, []);

  // Fetch active notification for user
  const fetchActiveNotification = async () => {
    try {
      const response = await axios.get(`${API}/notifications/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.id) {
        setNotification(response.data);
        setShowNotificationPopup(true);
      }
    } catch (error) {
      // No active notification or already viewed - this is normal
      console.log('No active notification');
    }
  };

  // Mark notification as viewed
  const handleDismissNotification = async () => {
    if (notification) {
      try {
        await axios.post(`${API}/notifications/${notification.id}/mark-viewed`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Error marking notification as viewed:', error);
      }
    }
    setShowNotificationPopup(false);
  };

  // Load favorite templates for modal
  const loadFavoriteTemplates = async () => {
    setLoadingFavorites(true);
    try {
      const response = await axios.get(`${API}/users/favorites/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Favorite templates loaded:', response.data);
      setFavoriteTemplates(response.data);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error(t('dashboard.errorLoadingFavorites'));
    } finally {
      setLoadingFavorites(false);
    }
  };

  // Open modal and load favorites
  const handleCreateContract = () => {
    setShowTemplateModal(true);
    loadFavoriteTemplates();
  };

  const fetchContracts = async () => {
    try {
      const response = await axios.get(`${API}/contracts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const contractsList = response.data;
      setContracts(contractsList);
      
      // Подсчет статистики
      const stats = {
        total: contractsList.length,
        signed: contractsList.filter(c => c.status === 'signed').length,
        pending: contractsList.filter(c => c.status === 'pending-signature' || c.status === 'sent').length,
        draft: contractsList.filter(c => c.status === 'draft').length
      };
      setStats(stats);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error(t('dashboard.errorLoadingContracts'));
    } finally {
      setLoading(false);
    }
  };

  const fetchLimitInfo = async () => {
    try {
      const response = await axios.get(`${API}/users/me/contract-limit`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLimitInfo(response.data);
    } catch (error) {
      console.error('Error fetching limit:', error);
    }
  };

  const handleDeleteContract = async (contractId) => {
    if (!window.confirm(t('dashboard.confirmDelete'))) {
      return;
    }

    try {
      await axios.delete(`${API}/contracts/${contractId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('contract.deleted'));
      fetchContracts();
      fetchLimitInfo();
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error(t('dashboard.errorDeletingContract'));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'signed': { label: t('status.signed'), icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      'pending-signature': { label: t('status.pending-signature'), icon: Clock, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      'sent': { label: t('status.sent'), icon: Clock, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      'draft': { label: t('status.draft'), icon: FileText, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      {/* Notification Popup */}
      {showNotificationPopup && notification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">{notification.title}</h3>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {notification.image_url && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img 
                    src={notification.image_url} 
                    alt={notification.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {notification.message}
              </p>
            </div>
            
            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={handleDismissNotification}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for selecting favorite template */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{t('dashboard.new_contract')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.selectTemplate')}
            </DialogDescription>
          </DialogHeader>
          
          {loadingFavorites ? (
            <div className="py-8 text-center text-gray-600">{t('dashboard.loadingTemplates')}</div>
          ) : (
            <>
              {/* Кнопка загрузить PDF вверху */}
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    navigate('/contracts/upload-pdf');
                  }}
                  className="w-full px-4 py-3 text-sm font-medium text-blue-700 bg-white rounded-lg hover:bg-blue-50 transition-all shadow-sm border border-blue-300 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {t('dashboard.uploadPdf')}
                </button>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  {t('dashboard.orSelectTemplate')}
                </p>
              </div>

              {favoriteTemplates.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-600 mb-4">{t('dashboard.noFavoriteTemplates')}</p>
                  <p className="text-sm text-gray-500 mb-6">
                    {t('dashboard.goToTemplatesMarket')}
                  </p>
                  <Button 
                    onClick={() => {
                      setShowTemplateModal(false);
                      navigate('/templates');
                    }}
                    className="bg-gradient-to-r from-blue-600 to-blue-500"
                  >
                    {t('dashboard.goToMarket')}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">❤️ {t('dashboard.favoriteTemplates')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {favoriteTemplates.map((template) => (
                        <div 
                          key={template.id}
                          className="minimal-card p-5 hover:shadow-xl transition-all group cursor-pointer"
                          onClick={() => {
                            setShowTemplateModal(false);
                            navigate(`/contracts/create?template_id=${template.id}`);
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{template.title || template.name}</h4>
                            <span className="text-xs px-2 py-1 rounded-lg bg-blue-100 text-blue-800">
                              🏠
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                            {template.description || t('templates.noDescription')}
                          </p>
                          <div className="text-xs text-blue-600 font-medium">
                            {t('dashboard.useTemplate')} →
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Заголовок */}
        <div className="mb-6 sm:mb-8">
          <div className="minimal-card p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{t('dashboard.myContracts')}</h1>
                <p className="text-sm text-gray-500">{t('dashboard.manageContracts')}</p>
              </div>
              
              {/* Кнопки действий справа */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={() => navigate('/templates')}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {t('dashboard.templatesMarket')}
                </button>
                <button
                  onClick={handleCreateContract}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-all shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {t('dashboard.new_contract')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
          <div className="minimal-card p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.stats.total')}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="minimal-card p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.stats.signedTotal')}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.signed}</p>
              </div>
            </div>
          </div>

          <div className="minimal-card p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.stats.pending')}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="minimal-card p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.stats.drafts')}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.draft}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Лимит договоров */}
        {limitInfo && (
          <div className="minimal-card p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 mb-2">{t('dashboard.contractLimit')}</h3>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-blue-600">{limitInfo.used}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-2xl font-bold text-gray-400">{limitInfo.limit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-blue-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${Math.min((limitInfo.used / limitInfo.limit) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {t('dashboard.contractsRemaining', { count: limitInfo.remaining })}
                </p>
              </div>
              {limitInfo.remaining <= 2 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-amber-700">{t('dashboard.limitAlmostReached')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Список договоров */}
        <div className="minimal-card overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{t('dashboard.contractsList')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('dashboard.totalContracts', { count: contracts.length })}</p>
          </div>

          {contracts.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.noContracts')}</h3>
              <p className="text-sm text-gray-600 mb-6">{t('dashboard.createFirstContract')}</p>
              <button
                onClick={handleCreateContract}
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('dashboard.new_contract')}
              </button>
            </div>
          ) : (
            <>
              {/* Десктоп таблица */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboard.table.code')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboard.table.title')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboard.table.status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboard.table.date')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('dashboard.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contracts.map((contract) => (
                      <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {contract.contract_code || 'N/A'}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{contract.title}</p>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(contract.status)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {format(new Date(contract.created_at), 'dd.MM.yyyy')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/contracts/${contract.id}`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Просмотр"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {contract.status === 'signed' && (
                              <button
                                onClick={() => window.open(`${API}/contracts/${contract.id}/download-pdf`, '_blank')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Скачать"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            {contract.status === 'draft' && (
                              <button
                                onClick={() => handleDeleteContract(contract.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Мобильные карточки */}
              <div className="lg:hidden divide-y divide-gray-100">
                {contracts.map((contract) => (
                  <div key={contract.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 mb-1 truncate">{contract.title}</h3>
                        <code className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {contract.contract_code || 'N/A'}
                        </code>
                      </div>
                      <div className="ml-2">
                        {getStatusBadge(contract.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {format(new Date(contract.created_at), 'dd.MM.yyyy')}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/contracts/${contract.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {contract.status === 'signed' && (
                          <button
                            onClick={() => window.open(`${API}/contracts/${contract.id}/download-pdf`, '_blank')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {contract.status === 'draft' && (
                          <button
                            onClick={() => handleDeleteContract(contract.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
