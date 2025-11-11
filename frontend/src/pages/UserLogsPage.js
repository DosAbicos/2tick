import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import { ArrowLeft, Clock, Activity, User } from 'lucide-react';
import '../styles/neumorphism.css';

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
      'logout': { variant: 'secondary', text: '🚺 Выход' },
      'contract_created': { variant: 'default', text: '📄 Создан договор' },
      'contract_viewed': { variant: 'outline', text: '👁️ Просмотр договора' },
      'contract_sent': { variant: 'default', text: '📤 Отправлен договор' },
      'contract_signed': { variant: 'success', text: '✍️ Подписан договор' },
      'contract_deleted': { variant: 'destructive', text: '🗑️ Удален договор' },
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
      <div className="min-h-screen gradient-bg">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-gray-600">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button 
          onClick={() => navigate('/admin')} 
          className="mb-6 px-4 py-2 text-gray-600 hover:text-blue-600 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        {/* Информация о пользователе */}
        {user && (
          <div className="minimal-card p-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Логи */}
        <div className="minimal-card overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              История действий ({logs.length})
            </h3>
          </div>
          <div className="p-6">
            {logs.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Нет логов</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className="border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-blue-100 transition-all bg-white"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getActionBadge(log.action)}
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-sm text-gray-700 mb-1">{log.details}</p>
                        )}
                        {log.ip_address && (
                          <p className="text-xs text-gray-500 font-mono">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogsPage;
