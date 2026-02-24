import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import { User, Mail, Phone, Building, CreditCard, MapPin, Lock, Save, Edit2, FileText, CheckCircle, Clock, XCircle, Receipt, Download, Copy, Hash, Package, Upload, Minus, Plus } from 'lucide-react';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem('token');
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  // Check URL param for initial tab
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab); // 'profile', 'tariffs', 'history', 'custom'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [subscription, setSubscription] = useState(null);
  
  // Custom contracts calculator state
  const [customContractsCount, setCustomContractsCount] = useState(20);
  const [customPricing, setCustomPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  
  // Custom template request state
  const [customTemplateRequests, setCustomTemplateRequests] = useState([]);
  const [showCustomTemplateForm, setShowCustomTemplateForm] = useState(false);
  const [customTemplateDescription, setCustomTemplateDescription] = useState('');
  const [customTemplateFile, setCustomTemplateFile] = useState(null);

  // Tariff plans data
  const tariffPlans = [
    {
      id: 'free',
      name: 'FREE',
      price: 0,
      priceDisplay: '0 ₸',
      period: t('tariffs.testPlan'),
      contracts: 3,
      features: [
        { key: 'contracts', value: t('tariffs.upToContracts', { count: 3 }) },
        { key: 'templates', value: t('tariffs.basicTemplates') },
        { key: 'signing', value: t('tariffs.signingMethods') },
        { key: 'branding', value: t('tariffs.noBranding') },
      ],
      popular: false,
      color: 'gray'
    },
    {
      id: 'start',
      name: 'START',
      price: 5990,
      priceDisplay: '5 990 ₸',
      period: t('tariffs.perMonth'),
      contracts: 20,
      features: [
        { key: 'contracts', value: t('tariffs.upToContracts', { count: 20 }) },
        { key: 'templates', value: t('tariffs.marketTemplates') },
        { key: 'signing', value: t('tariffs.signingMethods') },
        { key: 'support', value: t('tariffs.standardSupport') },
      ],
      popular: true,
      color: 'blue'
    },
    {
      id: 'business',
      name: 'BUSINESS',
      price: 14990,
      priceDisplay: '14 990 ₸',
      period: t('tariffs.perMonth'),
      contracts: 50,
      features: [
        { key: 'contracts', value: t('tariffs.upToContracts', { count: 50 }) },
        { key: 'templates', value: t('tariffs.allTemplates') },
        { key: 'signing', value: t('tariffs.signingMethods') },
        { key: 'branding', value: t('tariffs.contractBranding') },
        { key: 'support', value: t('tariffs.prioritySupport') },
      ],
      popular: false,
      color: 'purple'
    }
  ];

  useEffect(() => {
    fetchUserProfile();
    fetchSubscription();
    fetchPaymentHistory();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions/current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscription(response.data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await axios.get(`${API}/payment/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Показываем успешные платежи и возвраты
      const relevantPayments = response.data.filter(p => p.status === 'success' || p.status === 'refunded' || p.refund_amount);
      setPaymentHistory(relevantPayments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  // Fetch custom contracts pricing
  const fetchCustomPricing = async (count) => {
    if (count < 20) return;
    setLoadingPricing(true);
    try {
      const response = await axios.get(`${API}/pricing/calculate-custom?count=${count}`);
      setCustomPricing(response.data);
    } catch (error) {
      console.error('Error calculating price:', error);
    } finally {
      setLoadingPricing(false);
    }
  };

  // Fetch user's custom template requests
  const fetchCustomTemplateRequests = async () => {
    try {
      const response = await axios.get(`${API}/custom-template-requests/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomTemplateRequests(response.data);
    } catch (error) {
      console.error('Error fetching custom template requests:', error);
    }
  };

  // Effect to fetch custom pricing when count changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomPricing(customContractsCount);
    }, 300);
    return () => clearTimeout(timer);
  }, [customContractsCount]);

  // Fetch custom template requests on mount
  useEffect(() => {
    fetchCustomTemplateRequests();
  }, []);

  // Handle custom contracts purchase
  const handlePurchaseCustomContracts = async () => {
    if (!customPricing || customContractsCount < 20) return;
    
    setProcessingPayment(true);
    try {
      const response = await axios.post(`${API}/payment/create`, {
        plan_id: 'custom_contracts',
        amount: customPricing.price,
        custom_contracts_count: customContractsCount,
        auto_renewal: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        toast.error(t('tariffs.paymentError', 'Ошибка инициализации платежа'));
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.detail || t('tariffs.paymentError'));
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle custom template purchase
  const handlePurchaseCustomTemplate = async () => {
    setProcessingPayment(true);
    try {
      const response = await axios.post(`${API}/payment/create`, {
        plan_id: 'custom_template',
        amount: 6990,
        auto_renewal: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        toast.error(t('tariffs.paymentError', 'Ошибка инициализации платежа'));
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.detail || t('tariffs.paymentError'));
    } finally {
      setProcessingPayment(false);
    }
  };

  // Submit custom template request with document
  const handleSubmitCustomTemplateRequest = async () => {
    const formData = new FormData();
    formData.append('description', customTemplateDescription);
    if (customTemplateFile) {
      formData.append('file', customTemplateFile);
    }
    
    try {
      await axios.post(`${API}/custom-template-requests`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(t('tariffs.requestSubmitted', 'Заявка отправлена'));
      setShowCustomTemplateForm(false);
      setCustomTemplateDescription('');
      setCustomTemplateFile(null);
      fetchCustomTemplateRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error(error.response?.data?.detail || t('common.error'));
    }
  };

  const fetchUserProfile = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/auth/me/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setUser(profileRes.data);
      setEditedUser(profileRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(t('profile.loadError'));
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await axios.put(`${API}/auth/me`, editedUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(editedUser);
      localStorage.setItem('user', JSON.stringify(editedUser));
      setEditing(false);
      toast.success(t('profile.updateSuccess'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('profile.updateError'));
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      toast.error(t('profile.passwordTooShort'));
      return;
    }

    try {
      await axios.post(`${API}/auth/change-password`, {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setChangingPassword(false);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      toast.success(t('profile.passwordChanged'));
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.detail || t('profile.passwordChangeError'));
    }
  };

  // Handle tariff selection - FreedomPay integration
  const handleSelectTariff = async (plan) => {
    if (plan.id === 'free') {
      // Free plan - no payment needed
      toast.info(t('tariffs.freeSelected'));
      return;
    }
    
    setSelectedPlan(plan);
    setProcessingPayment(true);
    
    try {
      const response = await axios.post(`${API}/payment/create`, {
        plan_id: plan.id,
        amount: plan.price,
        auto_renewal: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Redirect to FreedomPay payment page
      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        toast.error(t('tariffs.paymentError', 'Ошибка инициализации платежа'));
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMsg = error.response?.data?.detail || t('tariffs.paymentError', 'Ошибка при создании платежа');
      toast.error(errorMsg);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle auto-renewal toggle
  const handleToggleAutoRenewal = async () => {
    try {
      await axios.post(`${API}/subscriptions/toggle-auto-renewal`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('tariffs.autoRenewalToggled'));
      fetchUserProfile();
    } catch (error) {
      toast.info(t('tariffs.paymentComingSoon'));
    }
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
      
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Заголовок с улучшенным дизайном */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-8 px-2 sm:px-0"
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-6 sm:p-8 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-white mb-1">{t('profile.title')}</h1>
                <p className="text-sm sm:text-base text-blue-100">{t('profile.subtitle')}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs Navigation */}
        <div className="mb-6 px-2 sm:px-0">
          <div className="inline-flex items-center bg-gray-100 rounded-xl p-1.5 shadow-inner">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="tab-profile"
            >
              <User className="w-4 h-4 inline-block mr-2" />
              {t('profile.profileTab')}
            </button>
            <button
              onClick={() => setActiveTab('tariffs')}
              className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'tariffs'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="tab-tariffs"
            >
              <CreditCard className="w-4 h-4 inline-block mr-2" />
              {t('profile.tariffsTab')}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="tab-history"
            >
              <Receipt className="w-4 h-4 inline-block mr-2" />
              {t('profile.historyTab', 'История')}
            </button>
          </div>
        </div>

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
        <div className="grid lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Левая колонка - Статистика */}
          <div className="lg:col-span-1 space-y-3 sm:space-y-6">
            {/* Статистика */}
            <div className="bg-white rounded-lg sm:shadow-md sm:border sm:border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                {t('profile.statistics')}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('profile.totalContracts')}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.total_contracts || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('profile.signed')}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.signed_contracts || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('profile.pending')}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.pending_contracts || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Лимит договоров */}
            <div className="bg-white rounded-lg sm:shadow-md sm:border sm:border-gray-200 p-4 sm:p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('profile.contractLimit')}</h3>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl font-bold ${
                  Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0) === 0 
                    ? 'text-red-600' 
                    : Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0) <= 2 
                    ? 'text-amber-600' 
                    : 'text-blue-600'
                }`}>{stats?.contracts_used || 0}</span>
                <span className="text-gray-400">/</span>
                <span className="text-2xl font-bold text-gray-400">{user?.contract_limit || 10}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0) === 0 
                      ? 'bg-gradient-to-r from-red-600 to-red-500' 
                      : Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0) <= 2 
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500' 
                      : 'bg-gradient-to-r from-blue-600 to-blue-500'
                  }`}
                  style={{ width: `${Math.min(((stats?.contracts_used || 0) / (user?.contract_limit || 10)) * 100, 100)}%` }}
                ></div>
              </div>
              <p className={`text-xs mt-2 font-medium ${
                Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0) === 0 
                  ? 'text-red-600' 
                  : Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0) <= 2 
                  ? 'text-amber-600' 
                  : 'text-gray-500'
              }`}>
                {Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0) === 0 
                  ? t('profile.limitExhausted') 
                  : Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0) <= 2 
                  ? t('profile.limitAlmostReached', { count: Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0) })
                  : t('profile.contractsRemaining', { count: Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0) })
                }
              </p>
            </div>
          </div>

          {/* Правая колонка - Информация профиля */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-6">
            {/* ID пользователя - отдельный блок */}
            <div className="bg-white rounded-lg sm:shadow-md sm:border sm:border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Hash className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('profile.userId', 'ID пользователя')}</p>
                    <p className="text-base font-mono font-medium text-gray-900">{user?.id || '—'}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user?.id || '');
                    toast.success(t('profile.idCopied', 'ID скопирован'));
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title={t('profile.copyId', 'Копировать ID')}
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Основная информация */}
            <div className="bg-white rounded-lg sm:shadow-md sm:border sm:border-gray-200 p-4 sm:p-8 relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base sm:text-xl font-bold text-gray-900">{t('profile.personalInfo')}</h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 border border-blue-200 rounded text-blue-600 hover:bg-blue-50 hover:border-blue-300 sm:px-3 sm:py-1.5 sm:bg-blue-50 sm:border-blue-100 sm:hover:bg-blue-100 transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs font-medium">{t('profile.edit')}</span>
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleSaveProfile}
                      className="p-1.5 border border-blue-500 rounded text-blue-600 hover:bg-blue-50 sm:px-3 sm:py-1.5 sm:text-white sm:bg-gradient-to-r sm:from-blue-600 sm:to-blue-500 sm:border-0 sm:hover:from-blue-700 sm:hover:to-blue-600 transition-all flex items-center gap-1"
                    >
                      <Save className="w-4 h-4" />
                      <span className="hidden sm:inline text-xs font-medium">{t('profile.save')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditedUser(user);
                      }}
                      className="p-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 sm:px-3 sm:py-1.5 sm:bg-gray-100 sm:hover:bg-gray-200 transition-all flex items-center justify-center"
                    >
                      <span className="text-base sm:text-xs sm:font-medium">✕</span>
                    </button>
                  </div>
                )}
              </div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* ФИО */}
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mt-1">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium text-gray-500 mb-1 block">{t('profile.fullName')}</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editedUser.full_name || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, full_name: e.target.value })}
                          className="minimal-input w-full"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 break-words">{user?.full_name}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mt-1">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium text-gray-500 mb-1 block">Email</label>
                      <p className="text-base font-medium text-gray-900 break-words">{user?.email}</p>
                      <p className="text-xs text-gray-400 mt-1">{t('profile.emailCannotChange')}</p>
                    </div>
                  </div>
                </div>

                {/* Телефон */}
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mt-1">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium text-gray-500 mb-1 block">{t('profile.phone')}</label>
                      {editing ? (
                        <input
                          type="tel"
                          value={editedUser.phone || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                          className="minimal-input w-full"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 break-words">{user?.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Компания */}
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mt-1">
                      <Building className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium text-gray-500 mb-1 block">{t('profile.company')}</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editedUser.company_name || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, company_name: e.target.value })}
                          className="minimal-input w-full"
                          placeholder={t('profile.notSpecified')}
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 break-words">{user?.company_name || t('profile.notSpecified')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ИИН/БИН */}
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mt-1">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium text-gray-500 mb-1 block">{t('profile.iin')}</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editedUser.iin || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, iin: e.target.value })}
                          className="minimal-input w-full"
                          placeholder={t('profile.notSpecified')}
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 break-words">{user?.iin || t('profile.notSpecified')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Юридический адрес */}
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mt-1">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium text-gray-500 mb-1 block">{t('profile.address')}</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editedUser.legal_address || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, legal_address: e.target.value })}
                          className="minimal-input w-full"
                          placeholder={t('profile.notSpecified')}
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 break-words">{user?.legal_address || t('profile.notSpecified')}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Смена пароля */}
            <div className="bg-white rounded-lg sm:shadow-md sm:border sm:border-gray-200 p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">{t('profile.changePassword')}</h2>
                  <p className="text-sm text-gray-500">{t('profile.updatePasswordDesc')}</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
              {!changingPassword ? (
                <motion.button
                  key="change-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  onClick={() => setChangingPassword(true)}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all"
                >
                  {t('profile.changePassword')}
                </motion.button>
              ) : (
                <motion.div
                  key="password-fields"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="space-y-5"
                >
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">{t('profile.oldPassword')}</label>
                    <input
                      type="password"
                      value={passwordData.old_password}
                      onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                      className="minimal-input w-full"
                      placeholder={t('profile.enterOldPassword')}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">{t('profile.newPassword')}</label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="minimal-input w-full"
                      placeholder={t('profile.minPassword')}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">{t('profile.confirmNewPassword')}</label>
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className="minimal-input w-full"
                      placeholder={t('profile.repeatPassword')}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => {
                        setChangingPassword(false);
                        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
                      }}
                      className="w-full sm:flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleChangePassword}
                      className="w-full sm:flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all"
                    >
                      {t('profile.savePassword')}
                    </button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        )}

        {/* Tariffs Tab Content */}
        {activeTab === 'tariffs' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-2 sm:px-0"
          >
            {/* Current Plan Info */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{t('tariffs.currentPlan')}</h3>
                  <p className="text-gray-600">
                    {t('tariffs.currentPlanInfo', { 
                      plan: subscription?.plan_id?.toUpperCase() || 'FREE',
                      contracts: subscription?.contract_limit || 3
                    })}
                  </p>
                </div>
              </div>
              {subscription?.expires_at && (
                <p className="text-sm text-gray-500 mt-2">
                  {t('tariffs.expiresAt')}: {new Date(subscription.expires_at).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'kk' ? 'kk-KZ' : 'en-US')}
                </p>
              )}
            </div>

            {/* Tariff Plans Grid - Landing Page Style */}
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {tariffPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`minimal-card p-8 space-y-6 relative ${
                    plan.popular ? 'border-2 border-blue-500' : ''
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      {t('tariffs.popular')}
                    </div>
                  )}

                  <div>
                    <h3 className={`text-2xl font-bold ${
                      plan.color === 'purple' ? 'text-purple-600' :
                      plan.color === 'blue' ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{plan.period}</p>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">{plan.priceDisplay}</span>
                      {plan.price > 0 && (
                        <span className="ml-2 text-gray-500">/ {t('tariffs.perMonth')}</span>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <CheckCircle className={`w-5 h-5 flex-shrink-0 ${
                          plan.color === 'purple' ? 'text-purple-500' :
                          plan.color === 'blue' ? 'text-blue-500' : 'text-green-500'
                        }`} />
                        <span className="text-gray-600">{feature.value}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Select Button */}
                  <button
                    onClick={() => handleSelectTariff(plan)}
                    disabled={processingPayment || (subscription?.plan_id === plan.id)}
                    className={`w-full py-4 font-medium rounded-xl transition-all ${
                      subscription?.plan_id === plan.id
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : plan.popular
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/30'
                          : plan.color === 'purple'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-700 hover:to-purple-600'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                    data-testid={`select-plan-${plan.id}`}
                  >
                    {subscription?.plan_id === plan.id 
                      ? t('tariffs.currentPlanBtn')
                      : processingPayment && selectedPlan?.id === plan.id
                        ? t('tariffs.processing')
                        : plan.price === 0 
                          ? t('tariffs.selectFree')
                          : t('tariffs.selectPlan')
                    }
                  </button>
                </div>
              ))}
            </div>

            {/* Custom Plans Section */}
            <div className="mt-12 overflow-hidden">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">{t('tariffs.customPlansTitle', 'Индивидуальные решения')}</h3>
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                {/* Custom Contracts Calculator */}
                <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl shadow-md border border-orange-200 p-4 sm:p-6 overflow-hidden">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                      <Package className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{t('tariffs.customContracts.title', 'Пакет договоров')}</h4>
                      <p className="text-sm text-gray-500">{t('tariffs.customContracts.desc', 'Договоры не сгорают ежемесячно')}</p>
                    </div>
                  </div>

                  <div className="mb-4 sm:mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('tariffs.customContracts.selectCount', 'Количество договоров')}
                    </label>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <button
                        onClick={() => setCustomContractsCount(Math.max(20, customContractsCount - 10))}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors flex-shrink-0"
                        disabled={customContractsCount <= 20}
                      >
                        <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <input
                        type="number"
                        min="20"
                        value={customContractsCount}
                        onChange={(e) => setCustomContractsCount(Math.max(20, parseInt(e.target.value) || 20))}
                        className="flex-1 min-w-0 text-center text-xl sm:text-2xl font-bold text-gray-900 border-2 border-orange-200 rounded-lg py-2 focus:border-orange-500 focus:ring-0"
                      />
                      <button
                        onClick={() => setCustomContractsCount(customContractsCount + 10)}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors flex-shrink-0"
                      >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>

                  {customPricing && (
                    <div className="bg-white rounded-lg p-4 mb-6 border border-orange-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">{t('tariffs.customContracts.pricePerContract', 'Цена за договор')}:</span>
                        <span className="font-semibold text-gray-900">{customPricing.price_per_contract} ₸</span>
                      </div>
                      {customPricing.discount > 0 && (
                        <div className="flex justify-between items-center mb-2 text-green-600">
                          <span>{t('tariffs.customContracts.discount', 'Скидка')}:</span>
                          <span className="font-semibold">-{customPricing.discount.toLocaleString()} ₸</span>
                        </div>
                      )}
                      <div className="border-t border-orange-100 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">{t('tariffs.customContracts.total', 'Итого')}:</span>
                          <span className="text-2xl font-bold text-orange-600">{customPricing.price.toLocaleString()} ₸</span>
                        </div>
                      </div>
                      {customPricing.discount_info && (
                        <p className="text-sm text-green-600 mt-2">{customPricing.discount_info}</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handlePurchaseCustomContracts}
                    disabled={processingPayment || !customPricing || loadingPricing}
                    className="w-full py-3 font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
                  >
                    {processingPayment ? t('common.loading') : t('tariffs.purchase', 'Купить')}
                  </button>

                  <p className="text-xs text-gray-500 mt-3 text-center">
                    {t('tariffs.customContracts.note', 'Минимум 20 договоров. Скидка после 50.')}
                  </p>
                </div>

                {/* Custom Template */}
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl shadow-md border border-purple-200 p-4 sm:p-6 overflow-hidden">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{t('tariffs.customTemplate.title', 'Индивидуальный договор')}</h4>
                      <p className="text-sm text-gray-500">{t('tariffs.customTemplate.desc', 'Уникальный шаблон под ваш бизнес')}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="text-3xl font-bold text-gray-900 mb-2">6 990 ₸</div>
                    <p className="text-sm text-gray-500">{t('tariffs.oneTimePayment', 'Разовая оплата')}</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="w-5 h-5 text-purple-500" />
                      {t('tariffs.customTemplate.feature1', 'Разработка шаблона под ваши нужды')}
                    </li>
                    <li className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="w-5 h-5 text-purple-500" />
                      {t('tariffs.customTemplate.feature2', 'Автозаполнение полей')}
                    </li>
                    <li className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="w-5 h-5 text-purple-500" />
                      {t('tariffs.customTemplate.feature3', 'Доступен только вам')}
                    </li>
                  </ul>

                  {customTemplateRequests.find(r => r.status === 'paid') ? (
                    <div className="mb-4">
                      {!showCustomTemplateForm ? (
                        <button
                          onClick={() => setShowCustomTemplateForm(true)}
                          className="w-full py-3 font-semibold text-purple-600 bg-purple-100 rounded-xl hover:bg-purple-200 transition-all"
                        >
                          {t('tariffs.customTemplate.uploadDocument', 'Загрузить документ')}
                        </button>
                      ) : (
                        <div className="space-y-4">
                          <textarea
                            value={customTemplateDescription}
                            onChange={(e) => setCustomTemplateDescription(e.target.value)}
                            placeholder={t('tariffs.customTemplate.descriptionPlaceholder', 'Опишите, какой договор вам нужен...')}
                            className="w-full p-3 border border-purple-200 rounded-lg resize-none h-24 focus:border-purple-500 focus:ring-0"
                          />
                          <label className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
                            <Upload className="w-5 h-5 text-purple-500" />
                            <span className="text-purple-600 font-medium">
                              {customTemplateFile ? customTemplateFile.name : t('tariffs.customTemplate.selectFile', 'Выбрать файл')}
                            </span>
                            <input
                              type="file"
                              onChange={(e) => setCustomTemplateFile(e.target.files[0])}
                              className="hidden"
                              accept=".pdf,.doc,.docx"
                            />
                          </label>
                          <button
                            onClick={handleSubmitCustomTemplateRequest}
                            className="w-full py-3 font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all"
                          >
                            {t('tariffs.customTemplate.submit', 'Отправить заявку')}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={handlePurchaseCustomTemplate}
                      disabled={processingPayment}
                      className="w-full py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                    >
                      {processingPayment ? t('common.loading') : t('tariffs.order', 'Заказать')}
                    </button>
                  )}
                </div>
              </div>

              {customTemplateRequests.length > 0 && (
                <div className="mt-8 bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">{t('tariffs.customTemplate.myRequests', 'Мои заявки')}</h4>
                  <div className="space-y-3">
                    {customTemplateRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            request.status === 'completed' ? 'bg-green-100 text-green-700' :
                            request.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            request.status === 'paid' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {request.status === 'completed' ? t('tariffs.status.completed', 'Готово') :
                             request.status === 'in_progress' ? t('tariffs.status.inProgress', 'В работе') :
                             request.status === 'paid' ? t('tariffs.status.paid', 'Оплачено') :
                             request.status}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {request.status === 'completed' && request.assigned_template_id && (
                          <button
                            onClick={() => navigate(`/create-contract/${request.assigned_template_id}`)}
                            className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                          >
                            {t('tariffs.customTemplate.useTemplate', 'Использовать')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Info */}
            <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{t('tariffs.paymentInfo')}</h4>
                  <p className="text-sm text-gray-600 mb-2">{t('tariffs.paymentInfoDesc')}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-5" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Payment History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-2 sm:px-0"
          >
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Receipt className="w-6 h-6 text-blue-600" />
                {t('profile.paymentHistory', 'История покупок')}
              </h2>

              {paymentHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Receipt className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">{t('profile.noPayments', 'У вас пока нет покупок')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div 
                      key={payment.id}
                      className={`border rounded-xl p-5 transition-all ${
                        payment.status === 'success' 
                          ? 'border-green-200 bg-green-50/50' 
                          : payment.status === 'pending'
                            ? 'border-yellow-200 bg-yellow-50/50'
                            : 'border-red-200 bg-red-50/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            payment.status === 'success' 
                              ? 'bg-green-100' 
                              : payment.status === 'pending'
                                ? 'bg-yellow-100'
                                : 'bg-red-100'
                          }`}>
                            {payment.status === 'success' ? (
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            ) : payment.status === 'pending' ? (
                              <Clock className="w-6 h-6 text-yellow-600" />
                            ) : (
                              <XCircle className="w-6 h-6 text-red-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {t('tariffs.plan', 'Тариф')} {payment.plan_id?.toUpperCase()}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {payment.created_at && new Date(payment.created_at).toLocaleDateString(
                                i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'kk' ? 'kk-KZ' : 'en-US',
                                { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                              )}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {t('profile.orderId', 'Номер заказа')}: {payment.pg_order_id || payment.id}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">
                              {payment.amount?.toLocaleString()} ₸
                            </p>
                            <p className={`text-sm font-medium ${
                              payment.status === 'success' 
                                ? 'text-green-600' 
                                : payment.status === 'pending'
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}>
                              {payment.status === 'success' 
                                ? t('profile.statusPaid', 'Оплачено')
                                : payment.status === 'pending'
                                  ? t('profile.statusPending', 'Ожидает оплаты')
                                  : t('profile.statusFailed', 'Не оплачено')
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Receipt details for successful payments */}
                      {payment.status === 'success' && (
                        <div className="mt-4 pt-4 border-t border-green-200">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">{t('profile.paymentDate', 'Дата оплаты')}</p>
                              <p className="font-medium text-gray-900">
                                {payment.paid_at && new Date(payment.paid_at).toLocaleDateString(
                                  i18n.language === 'ru' ? 'ru-RU' : 'en-US'
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">{t('profile.validUntil', 'Действует до')}</p>
                              <p className="font-medium text-gray-900">
                                {payment.expires_at && new Date(payment.expires_at).toLocaleDateString(
                                  i18n.language === 'ru' ? 'ru-RU' : 'en-US'
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">{t('profile.contractLimit', 'Лимит договоров')}</p>
                              <p className="font-medium text-gray-900">
                                {payment.plan_id === 'start' ? '20' : payment.plan_id === 'business' ? '50' : '3'} / {t('tariffs.perMonth', 'мес')}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">{t('profile.paymentMethod', 'Способ оплаты')}</p>
                              <p className="font-medium text-gray-900">
                                <span className="inline-flex items-center gap-1">
                                  <CreditCard className="w-4 h-4" />
                                  FreedomPay
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Refund Information */}
                      {(payment.refund_amount || payment.status === 'refunded') && (
                        <div className="mt-4 pt-4 border-t border-orange-200 bg-orange-50/50 -mx-5 -mb-5 px-5 pb-5 rounded-b-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </div>
                            <h4 className="font-semibold text-orange-800">{t('profile.refundInfo', 'Информация о возврате')}</h4>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-orange-700">{t('profile.refundAmount', 'Сумма возврата')}</p>
                              <p className="font-bold text-orange-900 text-lg">
                                {(payment.refund_amount || 0).toLocaleString()} ₸
                              </p>
                            </div>
                            {payment.refunded_at && (
                              <div>
                                <p className="text-orange-700">{t('profile.refundDate', 'Дата возврата')}</p>
                                <p className="font-medium text-orange-900">
                                  {new Date(payment.refunded_at).toLocaleDateString(
                                    i18n.language === 'ru' ? 'ru-RU' : 'en-US',
                                    { year: 'numeric', month: 'short', day: 'numeric' }
                                  )}
                                </p>
                              </div>
                            )}
                            {payment.refund_reason && (
                              <div className="col-span-2 sm:col-span-1">
                                <p className="text-orange-700">{t('profile.refundReason', 'Причина')}</p>
                                <p className="font-medium text-orange-900">{payment.refund_reason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
