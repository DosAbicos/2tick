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
  AlertCircle
} from 'lucide-react';

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
  const [errorsModalOpen, setErrorsModalOpen] = useState(false);
  
  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [contractsToAdd, setContractsToAdd] = useState(1);
  const [userLogs, setUserLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [recentErrors, setRecentErrors] = useState([]);
  const [userContracts, setUserContracts] = useState([]);
  const [loadingUserContracts, setLoadingUserContracts] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [contractSearch, setContractSearch] = useState('');
  const [searchedContract, setSearchedContract] = useState(null);
  const [contractSearchOpen, setContractSearchOpen] = useState(false);

  useEffect(() => {
    fetchAdminData();
    fetchActiveNotification();
    
    // Set up polling for real-time stats updates (every 30 seconds)
    const statsInterval = setInterval(() => {
      fetchStatsOnly();
    }, 30000);
    
    return () => clearInterval(statsInterval);
  }, []);

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
      const [statsRes, usersRes, metricsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/system/metrics`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data);
      
      // Format system metrics
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
      setUserLogs(response.data.logs || []); // Исправлено: берём logs из response.data
    } catch (error) {
      toast.error('Ошибка загрузки логов');
      setUserLogs([]); // Устанавливаем пустой массив при ошибке
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchUserContracts = async (userId) => {
    setLoadingUserContracts(true);
    try {
      const response = await axios.get(`${API}/admin/contracts?landlord_id=${userId}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserContracts(response.data.contracts || []);
    } catch (error) {
      toast.error('Ошибка загрузки договоров');
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
      fetchUserDetails(selectedUser.id); // Refresh user details
      fetchAdminData(); // Refresh users list
    } catch (error) {
      toast.error('Ошибка добавления договоров');
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
      // Сначала ищем договоры
      const contractsResponse = await axios.get(`${API}/admin/contracts?search=${contractSearch.trim()}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Потом ищем пользователей  
      const usersResponse = await axios.get(`${API}/admin/users?search=${contractSearch.trim()}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const contracts = contractsResponse.data.contracts || [];
      const users = usersResponse.data || [];
      
      if (contracts.length > 0) {
        setSearchedContract(contracts[0]);  // Показать первый найденный договор
        setContractSearchOpen(true);
      } else if (users.length > 0) {
        // Если договоров нет, но есть пользователь - открыть его профиль
        fetchUserDetails(users[0].id);
      } else {
        toast.error(`По запросу "${contractSearch}" ничего не найдено`);
      }
    } catch (error) {
      toast.error('Ошибка поиска');
    }
  };

  const filteredUsers = users;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      {/* Notification Banner */}
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
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Панель администратора</h1>
            <p className="text-neutral-600 mt-1">Управление пользователями и договорами</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Universal Search */}
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Поиск: договор, пользователь, телефон, email, ID"
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchContract()}
                className="w-80"
              />
              <Button onClick={searchContract} variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Найти
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/admin/notifications')}
                variant="outline"
              >
                <Bell className="mr-2 h-4 w-4" />
                Оповещения
              </Button>
              <Button
                onClick={() => navigate('/admin/templates')}
                variant="outline"
              >
                <FileText className="mr-2 h-4 w-4" />
                Управление шаблонами
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Пользователей онлайн</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.online_users || 0}</div>
              <p className="text-xs text-neutral-500 mt-1">Активны последние 15 минут</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего договоров</CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_contracts || 0}</div>
              <p className="text-xs text-neutral-500 mt-1">Создано договоров</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Подписано</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.signed_contracts || 0}</div>
              <p className="text-xs text-neutral-500 mt-1">Успешно завершено</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">В ожидании</CardTitle>
              <Activity className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats?.pending_contracts || 0}</div>
              <p className="text-xs text-neutral-500 mt-1">Ожидают подписи</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Активность
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Пользователи ({stats?.total_users || 0})
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Список пользователей</CardTitle>
                  <CardDescription>Все зарегистрированные наймодатели</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Имя</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Лимит договоров</TableHead>
                      <TableHead>Дата регистрации</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <code className="text-xs text-neutral-500">{user.id.substring(0, 8)}...</code>
                        </TableCell>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.full_name}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.contract_limit || 10}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString('ru-RU')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => fetchUserDetails(user.id)}
                              title="Просмотр профиля"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(user);
                                setResetPasswordOpen(true);
                              }}
                              title="Сбросить пароль"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(user);
                                setContractsToAdd(1);
                                setAddContractsOpen(true);
                              }}
                              title="Добавить договоры"
                            >
                              <Plus className="h-4 w-4 text-green-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-1">Системные метрики</h3>
              <p className="text-sm text-neutral-600">Показатели производительности системы в реальном времени (обновление каждые 10 сек)</p>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Профиль пользователя</DialogTitle>
            <DialogDescription>Подробная информация о пользователе</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <Label className="text-xs text-blue-600 font-semibold">ID пользователя</Label>
                <div className="flex items-center justify-between mt-1">
                  <code className="text-sm font-mono text-blue-900">{selectedUser.id}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedUser.id);
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
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-neutral-600">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">ФИО</Label>
                  <p className="text-sm text-neutral-600">{selectedUser.full_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Телефон</Label>
                  <p className="text-sm text-neutral-600">{selectedUser.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Роль</Label>
                  <Badge variant={selectedUser.role === 'admin' ? 'destructive' : 'default'}>
                    {selectedUser.role}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Компания</Label>
                  <p className="text-sm text-neutral-600">{selectedUser.company_name || 'Не указана'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">ИИН/БИН</Label>
                  <p className="text-sm text-neutral-600">{selectedUser.iin || 'Не указан'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Юридический адрес</Label>
                  <p className="text-sm text-neutral-600">{selectedUser.legal_address || 'Не указан'}</p>
                </div>
              </div>
              
              {selectedUser.stats && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium mb-3 block">Статистика по договорам</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-center">{selectedUser.stats.total_contracts}</div>
                        <p className="text-xs text-neutral-500 text-center mt-1">Всего</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-center text-green-600">{selectedUser.stats.signed_contracts}</div>
                        <p className="text-xs text-neutral-500 text-center mt-1">Подписано</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-center text-amber-600">{selectedUser.stats.pending_contracts}</div>
                        <p className="text-xs text-neutral-500 text-center mt-1">В ожидании</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Лимит договоров:</strong> {selectedUser.stats.contract_limit}
                    </p>
                  </div>
                </div>
              )}
              
              {/* User Details Tabs */}
              <div className="pt-4 border-t">
                <Tabs defaultValue="activity" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="activity" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      История действий
                    </TabsTrigger>
                    <TabsTrigger value="contracts" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Договоры
                    </TabsTrigger>
                  </TabsList>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="mt-4">
                    {loadingLogs ? (
                      <div className="text-center py-4 text-neutral-500">Загрузка...</div>
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
                      <div className="text-center py-4 text-neutral-500">Загрузка...</div>
                    ) : userContracts.length === 0 ? (
                      <div className="text-center py-4 text-neutral-500">У пользователя нет договоров</div>
                    ) : (
                      <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Код</TableHead>
                              <TableHead>Название</TableHead>
                              <TableHead>Статус</TableHead>
                              <TableHead>Дата</TableHead>
                              <TableHead>Действия</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userContracts.map((contract) => (
                              <TableRow key={contract.id}>
                                <TableCell>
                                  <code className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    {contract.contract_code || 'N/A'}
                                  </code>
                                </TableCell>
                                <TableCell className="font-medium">{contract.title}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={contract.status === 'signed' ? 'default' : contract.status === 'pending-signature' ? 'secondary' : 'outline'}
                                  >
                                    {contract.status === 'signed' ? 'Подписан' : 
                                     contract.status === 'pending-signature' ? 'На подписи' : 'Черновик'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {new Date(contract.created_at).toLocaleDateString('ru-RU')}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.open(`/contracts/${contract.id}?readonly=true`, '_blank')}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {userContracts.length > 0 && (
                          <div className="p-2 text-xs text-center text-neutral-500 border-t">
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
                  onClick={() => window.open(`/contracts/${searchedContract.id}?readonly=true`, '_blank')}
                  className="flex-1"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Просмотреть договор
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (searchedContract.landlord_id) {
                      fetchUserDetails(searchedContract.landlord_id);
                      setContractSearchOpen(false);
                    }
                  }}
                  disabled={!searchedContract.landlord_id}
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
