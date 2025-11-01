import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
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
  Settings
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  // State
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [contractsTotal, setContractsTotal] = useState(0);
  const [contractsSkip, setContractsSkip] = useState(0);
  const [contractsHasMore, setContractsHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState('all');
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [contractLimitOpen, setContractLimitOpen] = useState(false);
  const [addContractsOpen, setAddContractsOpen] = useState(false);
  
  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [newContractLimit, setNewContractLimit] = useState(10);
  const [contractsToAdd, setContractsToAdd] = useState(5);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, contractsRes, logsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/contracts?limit=20&skip=0`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/audit-logs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setContracts(contractsRes.data.contracts);
      setContractsTotal(contractsRes.data.total);
      setContractsSkip(contractsRes.data.skip);
      setContractsHasMore(contractsRes.data.has_more);
      setAuditLogs(logsRes.data || []);
    } catch (error) {
      toast.error('Ошибка загрузки данных');
      if (error.response?.status === 403) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMoreContracts = async () => {
    if (!contractsHasMore || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const newSkip = contractsSkip + 20;
      const response = await axios.get(
        `${API}/admin/contracts?limit=20&skip=${newSkip}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setContracts([...contracts, ...response.data.contracts]);
      setContractsSkip(response.data.skip);
      setContractsHasMore(response.data.has_more);
    } catch (error) {
      toast.error('Ошибка загрузки договоров');
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await axios.get(`${API}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedUser(response.data);
      setUserDetailsOpen(true);
    } catch (error) {
      toast.error('Ошибка загрузки данных пользователя');
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

  const handleUpdateContractLimit = async () => {
    try {
      await axios.post(
        `${API}/admin/users/${selectedUser.id}/update-contract-limit`,
        null,
        {
          params: { contract_limit: newContractLimit },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success(`Лимит обновлен до ${newContractLimit}`);
      setContractLimitOpen(false);
      fetchUserDetails(selectedUser.id); // Refresh user details
      fetchAdminData(); // Refresh users list
    } catch (error) {
      toast.error('Ошибка обновления лимита');
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

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredContracts = contracts.filter(contract =>
    contractStatusFilter === 'all' || contract.status === contractStatusFilter
  );

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
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Панель администратора</h1>
            <p className="text-neutral-600 mt-1">Управление пользователями и договорами</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
              <p className="text-xs text-neutral-500 mt-1">Наймодателей в системе</p>
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
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="contracts">
              <FileText className="h-4 w-4 mr-2" />
              Договоры
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Активность
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Список пользователей</CardTitle>
                    <CardDescription>Все зарегистрированные наймодатели</CardDescription>
                  </div>
                  <div className="w-64">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
                      <Input
                        placeholder="Поиск по email или имени"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
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
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewContractLimit(user.contract_limit || 10);
                                setContractLimitOpen(true);
                              }}
                            >
                              <Settings className="h-4 w-4" />
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

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Список договоров</CardTitle>
                    <CardDescription>Последние 20 договоров (от новых к старым)</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={contractStatusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setContractStatusFilter('all')}
                    >
                      Все
                    </Button>
                    <Button
                      variant={contractStatusFilter === 'signed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setContractStatusFilter('signed')}
                    >
                      Подписан
                    </Button>
                    <Button
                      variant={contractStatusFilter === 'pending-signature' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setContractStatusFilter('pending-signature')}
                    >
                      На подписи
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Код</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Наймодатель</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <code className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {contract.contract_code || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{contract.title}</TableCell>
                        <TableCell>{contract.landlord_full_name || contract.landlord_email || 'Неизвестно'}</TableCell>
                        <TableCell>{getStatusBadge(contract.status)}</TableCell>
                        <TableCell>{new Date(contract.created_at).toLocaleDateString('ru-RU')}</TableCell>
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
                
                {contractsHasMore && (
                  <div className="mt-4 text-center">
                    <Button
                      onClick={loadMoreContracts}
                      disabled={loadingMore}
                      variant="outline"
                      className="w-full"
                    >
                      {loadingMore ? 'Загрузка...' : `Показать еще (${contractsTotal - contracts.length} осталось)`}
                    </Button>
                  </div>
                )}
                
                {!contractsHasMore && contracts.length > 0 && (
                  <div className="mt-4 text-center text-sm text-neutral-500">
                    Показаны все {contractsTotal} договоров
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Логи активности</CardTitle>
                <CardDescription>Последние действия в системе</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditLogs.slice(0, 20).map((log, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50">
                      <Activity className="h-4 w-4 text-neutral-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{log.action}</div>
                        <div className="text-xs text-neutral-600">{log.details}</div>
                        <div className="text-xs text-neutral-400 mt-1">
                          {new Date(log.timestamp).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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

      {/* Contract Limit Dialog */}
      <Dialog open={contractLimitOpen} onOpenChange={setContractLimitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Управление лимитом договоров</DialogTitle>
            <DialogDescription>
              Измените лимит договоров для {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="contract-limit">Лимит договоров</Label>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setNewContractLimit(Math.max(1, newContractLimit - 5))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="contract-limit"
                  type="number"
                  value={newContractLimit}
                  onChange={(e) => setNewContractLimit(parseInt(e.target.value) || 1)}
                  className="text-center"
                  min="1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setNewContractLimit(newContractLimit + 5)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Текущий лимит: {selectedUser?.contract_limit || 10}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractLimitOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateContractLimit}>
              Обновить лимит
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
