import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
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
        axios.get(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/users/me/stats`, { headers: { Authorization: `Bearer ${token}` } })
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
      await axios.put(`${API}/users/me`, editedUser, {
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Заголовок */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Мой профиль</h1>
          <p className="text-sm sm:text-base text-gray-600">Управляйте своей учетной записью</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Левая колонка - Статистика */}
          <div className="lg:col-span-1 space-y-6">
            {/* Статистика */}
            <div className="minimal-card p-6">
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
            <div className="minimal-card p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Лимит договоров</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-blue-600">{stats?.contracts_used || 0}</span>
                <span className="text-gray-400">/</span>
                <span className="text-2xl font-bold text-gray-400">{user?.contract_limit || 10}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(((stats?.contracts_used || 0) / (user?.contract_limit || 10)) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Осталось {Math.max((user?.contract_limit || 10) - (stats?.contracts_used || 0), 0)} договоров
              </p>
            </div>
          </div>

          {/* Правая колонка - Информация профиля */}
          <div className="lg:col-span-2 space-y-6">
            {/* Основная информация */}
            <div className="minimal-card p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Основная информация</h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Редактировать</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditedUser(user);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Сохранить
                    </button>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {/* ФИО */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-blue-500" />
                    ФИО
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedUser.full_name || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, full_name: e.target.value })}
                      className="minimal-input w-full"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.full_name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    Email
                  </label>
                  <p className="text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Email нельзя изменить</p>
                </div>

                {/* Телефон */}
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-blue-500" />
                    Телефон
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      value={editedUser.phone || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                      className="minimal-input w-full"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.phone}</p>
                  )}
                </div>

                {/* Компания */}
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <Building className="w-4 h-4 text-blue-500" />
                    Компания
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedUser.company_name || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, company_name: e.target.value })}
                      className="minimal-input w-full"
                      placeholder="Не указана"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.company_name || 'Не указана'}</p>
                  )}
                </div>

                {/* ИИН/БИН */}
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    ИИН/БИН
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedUser.iin || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, iin: e.target.value })}
                      className="minimal-input w-full"
                      placeholder="Не указан"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.iin || 'Не указан'}</p>
                  )}
                </div>

                {/* Юридический адрес */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    Юридический адрес
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedUser.legal_address || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, legal_address: e.target.value })}
                      className="minimal-input w-full"
                      placeholder="Не указан"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.legal_address || 'Не указан'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Смена пароля */}
            <div className="minimal-card p-6 sm:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-500" />
                Смена пароля
              </h2>

              {!changingPassword ? (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all"
                >
                  Изменить пароль
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Старый пароль</label>
                    <input
                      type="password"
                      value={passwordData.old_password}
                      onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                      className="minimal-input w-full"
                      placeholder="Введите старый пароль"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Новый пароль</label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="minimal-input w-full"
                      placeholder="Минимум 6 символов"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Подтвердите новый пароль</label>
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className="minimal-input w-full"
                      placeholder="Повторите новый пароль"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setChangingPassword(false);
                        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleChangePassword}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all"
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
