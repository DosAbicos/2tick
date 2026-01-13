import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import { User, Mail, Phone, Building, CreditCard, MapPin, Lock, Save, Edit2, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'tariffs'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

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
      popular: false,
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
      popular: true,
      color: 'purple'
    }
  ];

  useEffect(() => {
    fetchUserProfile();
  }, []);

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

  // Handle tariff selection - prepared for payment integration
  const handleSelectTariff = async (plan) => {
    if (plan.id === 'free') {
      // Free plan - no payment needed
      toast.info(t('tariffs.freeSelected'));
      return;
    }
    
    setSelectedPlan(plan);
    setProcessingPayment(true);
    
    try {
      // TODO: Integrate with acquiring service
      // This will be replaced with actual payment gateway integration
      const response = await axios.post(`${API}/subscriptions/create-payment`, {
        plan_id: plan.id,
        amount: plan.price,
        auto_renewal: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Redirect to payment page or open payment modal
      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        toast.success(t('tariffs.paymentInitiated'));
      }
    } catch (error) {
      console.error('Payment error:', error);
      // For now, show info that payment integration is coming soon
      toast.info(t('tariffs.paymentComingSoon'));
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
      </div>
    </div>
  );
};

export default ProfilePage;
