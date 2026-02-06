import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import SystemMetricsWidget from '@/components/SystemMetricsWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import { 
  Users, 
  FileText, 
  Activity,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Key,
  Plus,
  Minus,
  Settings,
  Bell,
  ScrollText,
  AlertCircle,
  Trash2,
  UserX,
  UserCheck
} from 'lucide-react';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  // Data states
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // System metrics
  const [systemMetrics, setSystemMetrics] = useState(null);
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [addContractsOpen, setAddContractsOpen] = useState(false);
  const [removeContractsOpen, setRemoveContractsOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [errorsModalOpen, setErrorsModalOpen] = useState(false);
  
  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [contractsToAdd, setContractsToAdd] = useState(1);
  const [contractsToRemove, setContractsToRemove] = useState(1);
  const [userLogs, setUserLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [recentErrors, setRecentErrors] = useState([]);
  const [userContracts, setUserContracts] = useState([]);
  const [loadingUserContracts, setLoadingUserContracts] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  
  // Search states
  const [userSearch, setUserSearch] = useState('');
  const [contractSearch, setContractSearch] = useState('');
  const [searchedContract, setSearchedContract] = useState(null);
  const [contractSearchOpen, setContractSearchOpen] = useState(false);
  
  // UI State Persistence
  const [activeMainTab, setActiveMainTab] = useState('activity');
  const [activeUserTab, setActiveUserTab] = useState('activity');

  useEffect(() => {
    fetchAdminData();
    fetchActiveNotification();
    
    // НЕ восстанавливаем поисковые запросы - пользователь хочет чистые поля
    
    // Восстанавливаем состояние вкладок
    const savedMainTab = localStorage.getItem('admin-main-tab');
    const savedUserTab = localStorage.getItem('admin-user-tab');
    if (savedMainTab) setActiveMainTab(savedMainTab);
    if (savedUserTab) setActiveUserTab(savedUserTab);
    
    // Восстанавливаем открытое модальное окно пользователя ТОЛЬКО если была вкладка "users"
    const savedUserId = localStorage.getItem('admin-selected-user-id');
    if (savedUserId && savedMainTab === 'users') {
      // Небольшая задержка чтобы данные успели загрузиться
      setTimeout(() => {
        fetchUserDetails(savedUserId);
      }, 500);
    }
    
    // Set up polling for real-time stats updates (every 30 seconds)
    const statsInterval = setInterval(() => {
      fetchStatsOnly();
    }, 30000);
    
    return () => clearInterval(statsInterval);
  }, []);

  // НЕ сохраняем поисковые запросы - пользователь хочет чистые поля при перезагрузке
  
  // Сохраняем состояние вкладок
  useEffect(() => {
    localStorage.setItem('admin-main-tab', activeMainTab);
  }, [activeMainTab]);
  
  useEffect(() => {
    localStorage.setItem('admin-user-tab', activeUserTab);
  }, [activeUserTab]);
  
  // Сохраняем ID выбранного пользователя
  useEffect(() => {
    if (userDetailsOpen && selectedUser) {
      localStorage.setItem('admin-selected-user-id', selectedUser.id);
    } else {
      localStorage.removeItem('admin-selected-user-id');
    }
  }, [userDetailsOpen, selectedUser]);

  // Polling для ошибок когда модальное окно открыто
  useEffect(() => {
    let errorsInterval;
    
    if (errorsModalOpen) {
      // Обновляем ошибки каждые 5 секунд когда модальное окно открыто
      errorsInterval = setInterval(() => {
        fetchErrorsOnly();
      }, 5000);
    }
    
    return () => {
      if (errorsInterval) clearInterval(errorsInterval);
    };
  }, [errorsModalOpen]);

  const fetchErrorsOnly = async () => {
    try {
      const metricsRes = await axios.get(`${API}/admin/system/metrics`, { headers: { Authorization: `Bearer ${token}` } });
      setRecentErrors(metricsRes.data.recent_errors || []);
    } catch (error) {
      // Silently fail for background updates
      console.error('Error updating errors:', error);
    }
  };

  const fetchStatsOnly = async () => {
    try {
      const statsRes = await axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
      setStats(statsRes.data);
    } catch (error) {
      // Silently fail for background updates
      console.error('Error updating stats:', error);
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch stats and users first (critical data)
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data);
      
      // Fetch metrics separately (non-critical, may fail in some environments)
      try {
        const metricsRes = await axios.get(`${API}/admin/system/metrics`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        const metrics = metricsRes.data;
        setSystemMetrics({
          cpu_usage: metrics.cpu_percent,
          memory_usage: metrics.memory.percent,
          disk_usage: metrics.disk.percent,
          active_sessions: metrics.active_users_24h,
          error_rate: metrics.recent_errors?.length || 0,
          uptime: `${metrics.uptime.days}д ${metrics.uptime.hours}ч`
        });
        
        // Save recent errors for modal
        setRecentErrors(metrics.recent_errors || []);
      } catch (metricsError) {
        console.warn('Metrics not available:', metricsError.message);
        // Set default metrics when unavailable
        setSystemMetrics({
          cpu_usage: 0,
          memory_usage: 0,
          disk_usage: 0,
          active_sessions: 0,
          error_rate: 0,
          uptime: 'Н/Д'
        });
      }
    } catch (error) {
      toast.error('Ошибка загрузки данных');
      if (error.response?.status === 403) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveNotification = async () => {
    try {
      const response = await axios.get(`${API}/notifications/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setNotification(response.data);
        setShowNotification(true);
      }
    } catch (error) {
      // Silently fail - notification is not critical
    }
  };

  const handleDismissNotification = async () => {
    if (!notification) return;
    try {
      await axios.post(`${API}/notifications/${notification.id}/mark-viewed`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowNotification(false);
    } catch (error) {
      console.error('Error marking notification as viewed:', error);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await axios.get(`${API}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSelectedUser(response.data);
      
      // Load user logs and contracts
      await Promise.all([
        fetchUserLogs(userId),
        fetchUserContracts(userId)
      ]);
      
      setUserDetailsOpen(true);
    } catch (error) {
      toast.error('Ошибка загрузки данных пользователя');
    }
  };

  const fetchUserLogs = async (userId) => {
    setLoadingLogs(true);
    try {
      const response = await axios.get(`${API}/admin/users/${userId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserLogs(response.data.logs || []);
    } catch (error) {
      toast.error('Ошибка загрузки логов');
      setUserLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchUserContracts = async (userId) => {
    setLoadingUserContracts(true);
    console.log('🔍 Fetching ALL contracts for user:', userId);
    try {
      const response1 = await axios.get(`${API}/admin/contracts?landlord_id=${userId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const response2 = await axios.get(`${API}/admin/contracts?creator_id=${userId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const contracts1 = response1.data.contracts || [];
      const contracts2 = response2.data.contracts || [];
      
      const allContracts = [...contracts1, ...contracts2];
      const uniqueContracts = allContracts.filter((contract, index, self) => 
        index === self.findIndex(c => c.id === contract.id)
      );
      
      console.log('🔍 Found contracts by landlord_id:', contracts1.length);
      console.log('🔍 Found contracts by creator_id:', contracts2.length); 
      console.log('🔍 Total unique contracts:', uniqueContracts.length);
      
      setUserContracts(uniqueContracts);
    } catch (error) {
      toast.error('Ошибка загрузки договоров');
      console.error('Error fetching user contracts:', error);
      setUserContracts([]);
    } finally {
      setLoadingUserContracts(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      await axios.post(
        `${API}/admin/users/${selectedUser.id}/reset-password`,
        null,
        {
          params: { new_password: newPassword },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success(`Пароль сброшен! Новый пароль: ${newPassword}`);
      setResetPasswordOpen(false);
      setNewPassword('');
    } catch (error) {
      toast.error('Ошибка сброса пароля');
    }
  };

  const handleAddContracts = async () => {
    try {
      const response = await axios.post(
        `${API}/admin/users/${selectedUser.id}/add-contracts`,
        null,
        {
          params: { contracts_to_add: contractsToAdd },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success(`Добавлено ${contractsToAdd} договоров. Новый лимит: ${response.data.new_limit}`);
      setAddContractsOpen(false);
      fetchUserDetails(selectedUser.id);
      fetchAdminData();
    } catch (error) {
      toast.error('Ошибка добавления договоров');
    }
  };

  const handleRemoveContracts = async () => {
    try {
      const response = await axios.post(
        `${API}/admin/users/${selectedUser.id}/remove-contracts`,
        null,
        {
          params: { contracts_to_remove: contractsToRemove },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success(`Отнято ${contractsToRemove} договоров. Новый лимит: ${response.data.new_limit}`);
      setRemoveContractsOpen(false);
      setContractsToRemove(1);
      fetchUserDetails(selectedUser.id);
      fetchAdminData();
    } catch (error) {
      toast.error('Ошибка отнятия договоров');
    }
  };

  const handleToggleUserStatus = async () => {
    try {
      const response = await axios.post(
        `${API}/admin/users/${selectedUser.id}/toggle-status`,
        null,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const status = response.data.is_active ? 'активирован' : 'деактивирован';
      toast.success(`Пользователь ${status}`);
      fetchUserDetails(selectedUser.id);
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка изменения статуса');
    }
  };

  const handleDeleteUser = async () => {
    try {
      await axios.delete(
        `${API}/admin/users/${selectedUser.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Пользователь удалён');
      setDeleteUserOpen(false);
      setUserDetailsOpen(false);
      setSelectedUser(null);
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка удаления пользователя');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'signed': { label: 'Подписан', color: 'bg-green-100 text-green-800' },
      'pending-signature': { label: 'На подписи', color: 'bg-amber-100 text-amber-800' },
      'sent': { label: 'Отправлен', color: 'bg-blue-100 text-blue-800' },
      'draft': { label: 'Черновик', color: 'bg-neutral-100 text-neutral-800' }
    };
    const variant = variants[status] || variants.draft;
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  const searchContract = async () => {
    if (!contractSearch.trim()) return;
    
    try {
      const response = await axios.get(`${API}/admin/contracts?search=${contractSearch.trim()}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const contracts = response.data.contracts || [];
      if (contracts.length > 0) {
        setSearchedContract(contracts[0]);
        setContractSearchOpen(true);
      } else {
        toast.error(`Договор ${contractSearch} не найден`);
      }
    } catch (error) {
      toast.error('Ошибка поиска договора');
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.id?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      {showNotification && notification && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-4 mt-4 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">{notification.title}</h3>
              <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">{notification.message}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDismissNotification}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </Button>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Панель администратора</h1>
            <p className="text-gray-600 text-lg">Управление пользователями и договорами</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Поиск договора по ID"
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchContract()}
                className="w-full sm:w-64 minimal-input"
              />
              <button 
                onClick={searchContract} 
                className="neuro-button whitespace-nowrap px-4 py-2"
              >
                <Search className="h-4 w-4 mr-2 inline" />
                Найти
              </button>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/admin/notifications')}
                className="neuro-button flex items-center gap-2 px-4 py-2"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Оповещения</span>
              </button>
              <button
                onClick={() => navigate('/admin/templates')}
                className="neuro-button-primary flex items-center gap-2 px-4 py-2 text-white"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Шаблоны</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="minimal-card p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-xl">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-1">{stats?.online_users || 0}</div>
            <div className="text-sm font-medium text-gray-900">Пользователей онлайн</div>
            <p className="text-xs text-gray-500 mt-1">Активны последние 15 минут</p>
          </div>

          <div className="minimal-card p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-1">{stats?.total_contracts || 0}</div>
            <div className="text-sm font-medium text-gray-900">Всего договоров</div>
            <p className="text-xs text-gray-500 mt-1">Создано договоров</p>
          </div>

          <div className="minimal-card p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-1">{stats?.signed_contracts || 0}</div>
            <div className="text-sm font-medium text-gray-900">Подписано</div>
            <p className="text-xs text-gray-500 mt-1">Успешно завершено</p>
          </div>

          <div className="minimal-card p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <Activity className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-amber-600 mb-1">{stats?.pending_contracts || 0}</div>
            <div className="text-sm font-medium text-gray-900">В ожидании</div>
            <p className="text-xs text-gray-500 mt-1">Ожидают подписи</p>
          </div>
        </div>

        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 minimal-card p-1 h-auto gap-1">
            <TabsTrigger 
              value="activity"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300 rounded-lg py-3"
            >
              <Activity className="h-4 w-4 mr-2" />
              Активность
            </TabsTrigger>
            <TabsTrigger 
              value="users"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300 rounded-lg py-3"
            >
              <Users className="h-4 w-4 mr-2" />
              Пользователи ({stats?.total_users || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="minimal-card p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Список пользователей</h2>
                  <p className="text-gray-600 mt-1">Все зарегистрированные наймодатели</p>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="text"
                    placeholder="Поиск по ФИО, ID, email"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full sm:w-64 minimal-input"
                  />
                  <Search className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-200">
                      <TableHead className="font-bold text-gray-900">ID</TableHead>
                      <TableHead className="font-bold text-gray-900">Email</TableHead>
                      <TableHead className="font-bold text-gray-900">Имя</TableHead>
                      <TableHead className="font-bold text-gray-900">Роль</TableHead>
                      <TableHead className="font-bold text-gray-900">Лимит договоров</TableHead>
                      <TableHead className="font-bold text-gray-900">Дата регистрации</TableHead>
                      <TableHead className="text-right font-bold text-gray-900">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id || user._id} className="hover:bg-blue-50 transition-colors border-b border-gray-200">
                        <TableCell>
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{(user.id || user._id || '—').substring(0, 8)}...</code>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {user.email}
                            {user.is_active === false && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">отключён</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">{user.full_name}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'destructive' : 'default'} className="font-medium">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700">{user.contract_limit || 10}</TableCell>
                        <TableCell className="text-gray-600">{new Date(user.created_at).toLocaleDateString('ru-RU')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => fetchUserDetails(user.id)}
                              title="Просмотр профиля"
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setResetPasswordOpen(true);
                              }}
                              title="Сбросить пароль"
                              className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <Key className="h-4 w-4 text-amber-600" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setContractsToAdd(1);
                                setAddContractsOpen(true);
                              }}
                              title="Добавить договоры"
                              className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Plus className="h-4 w-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setContractsToRemove(1);
                                setRemoveContractsOpen(true);
                              }}
                              title="Отнять договоры"
                              className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
                            >
                              <Minus className="h-4 w-4 text-orange-600" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                handleToggleUserStatus();
                              }}
                              title={user.is_active !== false ? "Деактивировать" : "Активировать"}
                              className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              {user.is_active !== false ? (
                                <UserX className="h-4 w-4 text-purple-600" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-green-600" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setDeleteUserOpen(true);
                              }}
                              title="Удалить пользователя"
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="minimal-card p-6 mb-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Системные метрики</h3>
              <p className="text-gray-600">Показатели производительности системы в реальном времени (обновление каждые 10 сек)</p>
            </div>
            <SystemMetricsWidget 
              onErrorsClick={(errors) => {
                setRecentErrors(errors);
                setErrorsModalOpen(true);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Профиль пользователя</DialogTitle>
            <DialogDescription className="text-gray-600">Подробная информация о пользователе</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="minimal-card p-4 bg-gradient-to-r from-blue-50 to-blue-100">
                <Label className="text-xs text-blue-700 font-semibold">ID пользователя</Label>
                <div className="flex items-center justify-between mt-2">
                  <code className="text-sm font-mono text-blue-900 font-semibold">{selectedUser.id}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedUser.id);
                      toast.success('ID скопирован в буфер обмена');
                    }}
                    className="neuro-button px-3 py-1 text-xs"
                  >
                    Копировать
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="minimal-card p-4">
                  <Label className="text-sm font-semibold text-gray-700">Email</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedUser.email}</p>
                </div>
                <div className="minimal-card p-4">
                  <Label className="text-sm font-semibold text-gray-700">ФИО</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedUser.full_name}</p>
                </div>
                <div className="minimal-card p-4">
                  <Label className="text-sm font-semibold text-gray-700">Телефон</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedUser.phone}</p>
                </div>
                <div className="minimal-card p-4">
                  <Label className="text-sm font-semibold text-gray-700">Роль</Label>
                  <Badge variant={selectedUser.role === 'admin' ? 'destructive' : 'default'} className="mt-1">
                    {selectedUser.role}
                  </Badge>
                </div>
                <div className="minimal-card p-4">
                  <Label className="text-sm font-semibold text-gray-700">Компания</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedUser.company_name || 'Не указана'}</p>
                </div>
                <div className="minimal-card p-4">
                  <Label className="text-sm font-semibold text-gray-700">ИИН/БИН</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedUser.iin || 'Не указан'}</p>
                </div>
                <div className="minimal-card p-4 col-span-2">
                  <Label className="text-sm font-semibold text-gray-700">Юридический адрес</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedUser.legal_address || 'Не указан'}</p>
                </div>
              </div>
              
              {selectedUser.stats && (
                <div className="pt-4 border-t">
                  <Label className="text-lg font-bold text-gray-900 mb-4 block">Статистика по договорам</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="minimal-card p-6 text-center hover:shadow-lg transition-all">
                      <div className="text-3xl font-bold text-blue-600">{selectedUser.stats.total_contracts}</div>
                      <p className="text-sm text-gray-600 mt-2">Всего</p>
                    </div>
                    <div className="minimal-card p-6 text-center bg-green-50 hover:shadow-lg transition-all">
                      <div className="text-3xl font-bold text-green-600">{selectedUser.stats.signed_contracts}</div>
                      <p className="text-sm text-gray-600 mt-2">Подписано</p>
                    </div>
                    <div className="minimal-card p-6 text-center bg-amber-50 hover:shadow-lg transition-all">
                      <div className="text-3xl font-bold text-amber-600">{selectedUser.stats.pending_contracts}</div>
                      <p className="text-sm text-gray-600 mt-2">В ожидании</p>
                    </div>
                  </div>
                  <div className="mt-4 minimal-card p-4 bg-gradient-to-r from-blue-50 to-blue-100">
                    <p className="text-sm text-blue-900 font-medium">
                      <strong>Лимит договоров:</strong> {selectedUser.stats.contract_limit}
                    </p>
                  </div>
                </div>
              )}
              
              {/* User Details Tabs */}
              <div className="pt-4 border-t">
                <Tabs value={activeUserTab} onValueChange={setActiveUserTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 minimal-card p-1 h-auto gap-1">
                    <TabsTrigger 
                      value="activity" 
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300 rounded-lg py-2"
                    >
                      <Activity className="h-4 w-4" />
                      История действий
                    </TabsTrigger>
                    <TabsTrigger 
                      value="contracts" 
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300 rounded-lg py-2"
                    >
                      <FileText className="h-4 w-4" />
                      Договоры ({userContracts.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="mt-4">
                    {loadingLogs ? (
                      <Loader text="Загрузка логов..." size="small" />
                    ) : userLogs.length === 0 ? (
                      <div className="text-center py-4 text-neutral-500">Нет логов</div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3 bg-neutral-50">
                        {userLogs.map((log, index) => (
                          <div key={index} className="text-xs p-2 bg-white rounded border">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-xs">
                                {log.action.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-neutral-500">
                                {new Date(log.timestamp).toLocaleString('ru-RU')}
                              </span>
                            </div>
                            {log.details && (
                              <p className="text-neutral-600 mt-1">{log.details}</p>
                            )}
                            {log.ip_address && (
                              <p className="text-neutral-400 mt-1">IP: {log.ip_address}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Contracts Tab */}
                  <TabsContent value="contracts" className="mt-4">
                    {loadingUserContracts ? (
                      <Loader text="Загрузка договоров..." size="small" />
                    ) : userContracts.length === 0 ? (
                      <div className="text-center py-4 text-neutral-500">У пользователя нет договоров</div>
                    ) : (
                      <div className="border rounded-lg">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead style={{minWidth: '100px'}}>Код</TableHead>
                                <TableHead style={{minWidth: '200px'}}>Название</TableHead>
                                <TableHead style={{minWidth: '120px'}}>Статус</TableHead>
                                <TableHead style={{minWidth: '100px'}}>Дата</TableHead>
                                <TableHead style={{minWidth: '80px'}}>Действия</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {userContracts.map((contract) => (
                                <TableRow key={contract.id}>
                                  <TableCell>
                                    <code className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
                                      {contract.contract_code || 'N/A'}
                                    </code>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    <div style={{maxWidth: '300px', wordWrap: 'break-word'}}>
                                      {contract.title}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={contract.status === 'signed' ? 'default' : contract.status === 'pending-signature' ? 'secondary' : 'outline'}
                                      className="whitespace-nowrap text-xs"
                                    >
                                      {contract.status === 'signed' ? 'Подписан' : 
                                       contract.status === 'pending-signature' ? 'На подписи' : 'Черновик'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs whitespace-nowrap">
                                    {new Date(contract.created_at).toLocaleDateString('ru-RU')}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => navigate(`/contracts/${contract.id}?readonly=true`)}
                                      title="Просмотреть договор"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {userContracts.length > 0 && (
                          <div className="p-2 text-xs text-center text-neutral-500 border-t bg-neutral-50">
                            Показано {userContracts.length} договоров
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сброс пароля</DialogTitle>
            <DialogDescription>
              Установите новый пароль для пользователя {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-password">Новый пароль</Label>
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleResetPassword}>
              Сбросить пароль
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contracts Dialog */}
      <Dialog open={addContractsOpen} onOpenChange={setAddContractsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Управление лимитом договоров</DialogTitle>
            <DialogDescription>
              Добавить договоры для {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="contracts-to-add">Количество договоров для добавления</Label>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setContractsToAdd(Math.max(1, contractsToAdd - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="contracts-to-add"
                  type="number"
                  value={contractsToAdd}
                  onChange={(e) => setContractsToAdd(parseInt(e.target.value) || 1)}
                  className="text-center"
                  min="1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setContractsToAdd(contractsToAdd + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-900">
                  <strong>Текущий лимит:</strong> {selectedUser?.contract_limit || 10}
                </p>
                <p className="text-sm text-green-900 mt-1">
                  <strong>Новый лимит:</strong> {(selectedUser?.contract_limit || 10) + contractsToAdd}
                </p>
                <p className="text-xs text-green-700 mt-2">
                  Будет добавлено {contractsToAdd} договоров к существующему лимиту
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddContractsOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddContracts} className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Добавить договоры
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Contracts Dialog */}
      <Dialog open={removeContractsOpen} onOpenChange={setRemoveContractsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отнять договоры</DialogTitle>
            <DialogDescription>
              Уменьшить лимит договоров для {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="contracts-to-remove">Количество договоров для отнятия</Label>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setContractsToRemove(Math.max(1, contractsToRemove - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="contracts-to-remove"
                  type="number"
                  value={contractsToRemove}
                  onChange={(e) => setContractsToRemove(parseInt(e.target.value) || 1)}
                  className="text-center"
                  min="1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setContractsToRemove(contractsToRemove + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-900">
                  <strong>Текущий лимит:</strong> {selectedUser?.contract_limit || 10}
                </p>
                <p className="text-sm text-red-900 mt-1">
                  <strong>Новый лимит:</strong> {Math.max(0, (selectedUser?.contract_limit || 10) - contractsToRemove)}
                </p>
                <p className="text-xs text-red-700 mt-2">
                  Будет отнято {contractsToRemove} договоров от текущего лимита
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveContractsOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleRemoveContracts} variant="destructive">
              <Minus className="mr-2 h-4 w-4" />
              Отнять договоры
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Удаление пользователя</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить пользователя {selectedUser?.email}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-900 font-medium">⚠️ Внимание!</p>
              <p className="text-sm text-red-700 mt-2">
                Пользователь будет деактивирован и помечен как удалённый. 
                Это действие можно отменить только через базу данных.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleDeleteUser} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить пользователя
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Search Dialog */}
      <Dialog open={contractSearchOpen} onOpenChange={setContractSearchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Результат поиска договора</DialogTitle>
            <DialogDescription>
              Найденный договор по запросу: "{contractSearch}"
            </DialogDescription>
          </DialogHeader>
          {searchedContract && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-xs text-blue-600 font-semibold">ID договора</Label>
                <div className="flex items-center justify-between mt-1">
                  <code className="text-sm font-mono text-blue-900">{searchedContract.id}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(searchedContract.id);
                      toast.success('ID скопирован в буфер обмена');
                    }}
                    className="h-6 text-xs"
                  >
                    Копировать
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Код договора</Label>
                  <p className="text-sm text-neutral-600 font-mono bg-neutral-50 px-2 py-1 rounded">
                    {searchedContract.contract_code || 'Не указан'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Статус</Label>
                  <div className="mt-1">
                    {getStatusBadge(searchedContract.status)}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Название</Label>
                  <p className="text-sm text-neutral-600">{searchedContract.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Дата создания</Label>
                  <p className="text-sm text-neutral-600">
                    {new Date(searchedContract.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Наймодатель</Label>
                  <p className="text-sm text-neutral-600">{searchedContract.landlord_name || 'Не указан'}</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    window.open(`/contracts/${searchedContract.id}?readonly=true`, '_blank');
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Просмотреть договор
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const response = await axios.get(`${API}/contracts/${searchedContract.id}/download-pdf`, {
                        headers: { Authorization: `Bearer ${token}` },
                        responseType: 'blob'
                      });
                      
                      const url = window.URL.createObjectURL(new Blob([response.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `contract_${searchedContract.contract_code || searchedContract.id}.pdf`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);
                      toast.success('Договор успешно скачан');
                    } catch (error) {
                      console.error('Error downloading PDF:', error);
                      toast.error('Ошибка скачивания договора');
                    }
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Скачать договор
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const userId = searchedContract.landlord_id || searchedContract.creator_id;
                    if (userId) {
                      fetchUserDetails(userId);
                      setContractSearchOpen(false);
                    } else {
                      toast.error('Не удалось найти автора договора');
                    }
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Профиль пользователя
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractSearchOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Errors Modal */}
      <Dialog open={errorsModalOpen} onOpenChange={setErrorsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Системные ошибки ({recentErrors.length})
              <span className="text-xs font-normal text-neutral-500 ml-2">
                Обновляется каждые 5 секунд
              </span>
            </DialogTitle>
            <DialogDescription>
              Последние {recentErrors.length} ошибок из логов системы
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {recentErrors.length > 0 ? (
              recentErrors.map((error, index) => (
                <div key={`error-${index}-${error.slice(0, 50)}`} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 font-mono text-xs font-bold">#{index + 1}</span>
                    <pre className="text-xs text-red-800 font-mono whitespace-pre-wrap break-all flex-1">
                      {error}
                    </pre>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-neutral-500">
                Ошибок не обнаружено
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setErrorsModalOpen(false)}
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
