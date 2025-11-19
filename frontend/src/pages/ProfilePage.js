import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import { User, Mail, Phone, Building, CreditCard, MapPin, Lock, Save, Edit2, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfilePage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

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
      toast.error('Ошибка загрузки профиля');
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
      toast.success('Профиль успешно обновлен');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Ошибка обновления профиля');
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Пароли не совпадают');
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
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
      toast.success('Пароль успешно изменен');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.detail || 'Ошибка смены пароля');
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
                <h1 className="text-xl sm:text-3xl font-bold text-white mb-1">Мой профиль</h1>
                <p className="text-sm sm:text-base text-blue-100">Управляйте своей учетной записью</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Левая колонка - Статистика */}
          <div className="lg:col-span-1 space-y-3 sm:space-y-6">
            {/* Статистика */}
            <div className="bg-white rounded-lg sm:shadow-md sm:border sm:border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Статистика
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Всего договоров</p>
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
                      <p className="text-sm text-gray-600">Подписано</p>
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
                      <p className="text-sm text-gray-600">В ожидании</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.pending_contracts || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Лимит договоров */}
            <div className="bg-white rounded-lg sm:shadow-md sm:border sm:border-gray-200 p-4 sm:p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Лимит договоров</h3>
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
                  ? '⚠️ Лимит исчерпан! Обратитесь к администратору.' 
                  : Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0) <= 2 
                  ? `⚠️ Осталось всего ${Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0)} договоров!` 
                  : `Осталось ${Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0)} договоров`
                }
              </p>
            </div>
          </div>

          {/* Правая колонка - Информация профиля */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-6">
            {/* Основная информация */}
            <div className="bg-white rounded-lg sm:shadow-md sm:border sm:border-gray-200 p-4 sm:p-8 relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base sm:text-xl font-bold text-gray-900">Основная информация</h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 border border-blue-200 rounded text-blue-600 hover:bg-blue-50 hover:border-blue-300 sm:px-3 sm:py-1.5 sm:bg-blue-50 sm:border-blue-100 sm:hover:bg-blue-100 transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs font-medium">Изменить</span>
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleSaveProfile}
                      className="p-1.5 border border-blue-500 rounded text-blue-600 hover:bg-blue-50 sm:px-3 sm:py-1.5 sm:text-white sm:bg-gradient-to-r sm:from-blue-600 sm:to-blue-500 sm:border-0 sm:hover:from-blue-700 sm:hover:to-blue-600 transition-all flex items-center gap-1"
                    >
                      <Save className="w-4 h-4" />
                      <span className="hidden sm:inline text-xs font-medium">Сохранить</span>
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

              <AnimatePresence mode="wait">
              <motion.div 
                key={editing ? 'editing' : 'viewing'}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* ФИО */}
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mt-1">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium text-gray-500 mb-1 block">ФИО</label>
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
                      <p className="text-xs text-gray-400 mt-1">Email нельзя изменить</p>
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
                      <label className="text-sm font-medium text-gray-500 mb-1 block">Телефон</label>
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
                      <label className="text-sm font-medium text-gray-500 mb-1 block">Компания</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editedUser.company_name || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, company_name: e.target.value })}
                          className="minimal-input w-full"
                          placeholder="Не указана"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 break-words">{user?.company_name || 'Не указана'}</p>
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
                      <label className="text-sm font-medium text-gray-500 mb-1 block">ИИН/БИН</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editedUser.iin || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, iin: e.target.value })}
                          className="minimal-input w-full"
                          placeholder="Не указан"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 break-words">{user?.iin || 'Не указан'}</p>
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
                      <label className="text-sm font-medium text-gray-500 mb-1 block">Юридический адрес</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editedUser.legal_address || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, legal_address: e.target.value })}
                          className="minimal-input w-full"
                          placeholder="Не указан"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 break-words">{user?.legal_address || 'Не указан'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
              </AnimatePresence>
            </div>

            {/* Смена пароля */}
            <div className="bg-white rounded-lg sm:shadow-md sm:border sm:border-gray-200 p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">Смена пароля</h2>
                  <p className="text-sm text-gray-500">Обновите пароль для безопасности</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
              {!changingPassword ? (
                <motion.button
                  key="change-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setChangingPassword(true)}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all"
                >
                  Изменить пароль
                </motion.button>
              ) : (
                <motion.div
                  key="password-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Старый пароль</label>
                    <input
                      type="password"
                      value={passwordData.old_password}
                      onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                      className="minimal-input w-full"
                      placeholder="Введите старый пароль"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Новый пароль</label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="minimal-input w-full"
                      placeholder="Минимум 6 символов"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Подтвердите новый пароль</label>
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className="minimal-input w-full"
                      placeholder="Повторите новый пароль"
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
                      Отмена
                    </button>
                    <button
                      onClick={handleChangePassword}
                      className="w-full sm:flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all"
                    >
                      Сохранить пароль
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
