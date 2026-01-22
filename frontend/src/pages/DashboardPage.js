import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import { FileText, Clock, CheckCircle, Plus, Eye, Trash2, Download, XCircle, AlertCircle, Upload, Bell, X } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, signed: 0, pending: 0, draft: 0 });
  const [limitInfo, setLimitInfo] = useState(null);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState(null);
  
  // Notification popup state
  const [notification, setNotification] = useState(null);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  
  // Modal for selecting favorite template
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [favoriteTemplates, setFavoriteTemplates] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // Get localized template title based on current UI language
  const getTemplateTitle = (template) => {
    const lang = i18n.language;
    if (lang === 'kk' && template.title_kk) return template.title_kk;
    if (lang === 'en' && template.title_en) return template.title_en;
    return template.title || template.name;
  };

  // Get localized template description based on current UI language
  const getTemplateDescription = (template) => {
    const lang = i18n.language;
    if (lang === 'kk' && template.description_kk) return template.description_kk;
    if (lang === 'en' && template.description_en) return template.description_en;
    return template.description || t('templates.noDescription');
  };

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
      // Toast removed - silently fail
    } finally {
      setLoadingFavorites(false);
    }
  };

  // Open modal and load favorites - check limit first
  const handleCreateContract = () => {
    // Check if user has reached their contract limit
    if (limitInfo && limitInfo.contracts_used >= limitInfo.contract_limit) {
      // Toast removed - redirect to profile instead
      navigate('/profile?tab=tariffs');
      return;
    }
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
      // Toast removed - silently fail
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
    setContractToDelete(contractId);
    setDeleteDialogOpen(true);
  };
  
  const confirmDeleteContract = async () => {
    if (!contractToDelete) return;
    
    try {
      await axios.delete(`${API}/contracts/${contractToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchContracts();
      fetchLimitInfo();
    } catch (error) {
      console.error('Error deleting contract:', error);
    } finally {
      setDeleteDialogOpen(false);
      setContractToDelete(null);
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
      
      {/* Push-style Notification Popup */}
      {showNotificationPopup && notification && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in border border-white/20">
            {/* iOS-style Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800">2tick.kz</span>
              </div>
              <button
                onClick={handleDismissNotification}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Main Content */}
            <div className="px-6 pb-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {notification.title}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {notification.message}
              </p>
            </div>

            {/* Image if present */}
            {notification.image_url && (
              <div className="px-6 py-3">
                <div className="rounded-xl overflow-hidden">
                  <img 
                    src={notification.image_url} 
                    alt={notification.title}
                    className="w-full h-40 object-cover"
                  />
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="p-4">
              <button
                onClick={handleDismissNotification}
                className="w-full py-3.5 px-6 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30 text-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for selecting favorite template */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="w-[92vw] sm:w-full max-w-2xl max-h-[70vh] sm:max-h-[85vh] overflow-y-auto rounded-xl sm:rounded-2xl p-0 sm:p-0">
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 px-3 sm:px-5 pt-3 sm:pt-5 pb-2 sm:pb-3 border-b">
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-sm sm:text-xl font-bold pr-6">{t('dashboard.new_contract')}</DialogTitle>
              <DialogDescription className="text-[10px] sm:text-sm text-gray-500">
                {t('dashboard.selectTemplate')}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="px-3 sm:px-5 py-2 sm:py-4">
            {loadingFavorites ? (
              <div className="py-4 text-center text-gray-600 text-xs sm:text-sm">{t('dashboard.loadingTemplates')}</div>
            ) : (
              <>
                {/* Кнопка загрузить PDF */}
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    navigate('/contracts/upload-pdf');
                  }}
                  className="w-full px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all border border-blue-200 flex items-center justify-center gap-1.5 mb-2 sm:mb-3"
                >
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {t('dashboard.uploadPdf')}
                </button>

                <p className="text-[10px] sm:text-xs text-gray-400 text-center mb-2 sm:mb-3">
                  {t('dashboard.orSelectTemplate')}
                </p>

                {favoriteTemplates.length === 0 ? (
                  <div className="py-3 sm:py-6 text-center">
                    <p className="text-gray-600 mb-2 text-xs sm:text-sm">{t('dashboard.noFavoriteTemplates')}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-3">
                      {t('dashboard.goToTemplatesMarket')}
                    </p>
                    <Button 
                      onClick={() => {
                        setShowTemplateModal(false);
                        navigate('/templates');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-xs py-1.5 h-auto px-4"
                    >
                      {t('dashboard.goToMarket')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    <h3 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">❤️ {t('dashboard.favoriteTemplates')}</h3>
                    {favoriteTemplates.map((template) => (
                      <div 
                        key={template.id}
                        className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-all border border-transparent hover:border-blue-200"
                        onClick={() => {
                          setShowTemplateModal(false);
                          navigate(`/contracts/create?template_id=${template.id}`);
                        }}
                      >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm sm:text-lg">🏠</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{getTemplateTitle(template)}</h4>
                          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{getTemplateDescription(template)}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
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

          <div className="minimal-card p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                limitInfo && (limitInfo.contract_limit - limitInfo.contracts_used) <= 0 
                  ? 'bg-red-500' 
                  : limitInfo && (limitInfo.contract_limit - limitInfo.contracts_used) <= 2 
                    ? 'bg-amber-500' 
                    : 'bg-blue-500'
              }`}>
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.stats.remaining')}</p>
                <p className={`text-xl sm:text-2xl font-bold ${
                  limitInfo && (limitInfo.contract_limit - limitInfo.contracts_used) <= 0 
                    ? 'text-red-600' 
                    : limitInfo && (limitInfo.contract_limit - limitInfo.contracts_used) <= 2 
                      ? 'text-amber-600' 
                      : 'text-blue-600'
                }`}>
                  {limitInfo ? Math.max(limitInfo.contract_limit - limitInfo.contracts_used, 0) : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

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
              <div className="lg:hidden space-y-3 p-3">
                {contracts.map((contract) => (
                  <div 
                    key={contract.id} 
                    className="minimal-card p-4"
                  >
                    {/* Верхняя строка: код и статус */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <code className="text-xs font-mono text-blue-600 font-semibold">
                          {contract.contract_code || 'N/A'}
                        </code>
                      </div>
                      {getStatusBadge(contract.status)}
                    </div>
                    
                    {/* Название договора */}
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 leading-snug">
                      {contract.title}
                    </h3>
                    
                    {/* Нижняя строка: дата и действия */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs">
                          {format(new Date(contract.created_at), 'dd.MM.yyyy')}
                        </span>
                      </div>
                      
                      {/* Кнопки действий - inline-flex для горизонтального расположения */}
                      <div className="inline-flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => navigate(`/contracts/${contract.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                        </button>
                        {contract.status === 'signed' && (
                          <button
                            onClick={() => window.open(`${API}/contracts/${contract.id}/download-pdf`, '_blank')}
                            className="inline-flex items-center p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4 flex-shrink-0" />
                          </button>
                        )}
                        {contract.status === 'draft' && (
                          <button
                            onClick={() => handleDeleteContract(contract.id)}
                            className="inline-flex items-center p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 flex-shrink-0" />
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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('contract.deleteTitle', 'Удалить договор?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('contract.deleteConfirmation', 'Это действие необратимо. Договор будет удалён навсегда.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Отмена')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteContract}>
              {t('contract.delete', 'Удалить')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardPage;
