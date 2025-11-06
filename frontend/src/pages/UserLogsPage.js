import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import { ArrowLeft, Clock, Activity } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserLogsPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [logs, setLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserLogs();
  }, [userId]);

  const fetchUserLogs = async () => {
    try {
      const response = await axios.get(`${API}/admin/users/${userId}/logs?limit=200`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data.logs);
      setUser(response.data.user);
    } catch (error) {
      toast.error('Ошибка загрузки логов');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    const actionMap = {
      'login_success': { variant: 'default', text: '✅ Успешный вход' },
      'login_failed': { variant: 'destructive', text: '❌ Неудачный вход' },
      'logout': { variant: 'secondary', text: '🚪 Выход' },
      'contract_created': { variant: 'default', text: '📄 Создан контракт' },
      'contract_viewed': { variant: 'outline', text: '👁️ Просмотр контракта' },
      'contract_sent': { variant: 'default', text: '📤 Отправлен контракт' },
      'contract_signed': { variant: 'success', text: '✍️ Подписан контракт' },
      'contract_deleted': { variant: 'destructive', text: '🗑️ Удален контракт' },
      'template_favorited': { variant: 'default', text: '⭐ Добавлен в избранное' },
      'template_unfavorited': { variant: 'secondary', text: '➖ Удален из избранного' },
      'profile_updated': { variant: 'default', text: '✏️ Обновлен профиль' },
      'password_changed': { variant: 'default', text: '🔑 Изменен пароль' }
    };
    
    const config = actionMap[action] || { variant: 'outline', text: action };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900">Логи пользователя</h1>
          {user && (
            <div className="mt-2">
              <p className="text-lg text-neutral-700">{user.full_name}</p>
              <p className="text-sm text-neutral-600">{user.email}</p>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              История действий ({logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-neutral-600 text-center py-8">Нет логов</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-neutral-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getActionBadge(log.action)}
                          <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.timestamp).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-sm text-neutral-700 mt-1">{log.details}</p>
                        )}
                        {log.ip_address && (
                          <p className="text-xs text-neutral-500 mt-1">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserLogsPage;
