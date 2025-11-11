import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { FileText, Clock, CheckCircle, Plus, Eye, Trash2, Download, XCircle, AlertCircle, Upload } from 'lucide-react';
import { format } from 'date-fns';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, signed: 0, pending: 0, draft: 0 });
  const [limitInfo, setLimitInfo] = useState(null);

  useEffect(() => {
    fetchContracts();
    fetchLimitInfo();
  }, []);

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
      toast.error('Ошибка загрузки договоров');
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
    if (!window.confirm('Вы уверены что хотите удалить этот договор?')) {
      return;
    }

    try {
      await axios.delete(`${API}/contracts/${contractId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Договор удален');
      fetchContracts();
      fetchLimitInfo();
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('Ошибка удаления договора');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'signed': { label: 'Подписан', icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      'pending-signature': { label: 'На подписи', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      'sent': { label: 'Отправлен', icon: Clock, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      'draft': { label: 'Черновик', icon: FileText, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
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
      <div className="min-h-screen gradient-bg">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Заголовок */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Мои договоры</h1>
              <p className="text-sm sm:text-base text-gray-600">Управляйте своими договорами</p>
            </div>
          </div>
          
          {/* Кнопки действий */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/templates')}
              className="px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Маркет шаблонов
            </button>
            <button
              onClick={() => navigate('/contracts/create')}
              className="px-6 py-3 text-base font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Создать договор
            </button>
            <button
              onClick={() => navigate('/contracts/upload-pdf')}
              className="px-6 py-3 text-base font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Загрузить PDF
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
          <div className="minimal-card p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Всего</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="minimal-card p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Подписано</p>
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
                <p className="text-xs sm:text-sm text-gray-600">В ожидании</p>
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
                <p className="text-xs sm:text-sm text-gray-600">Черновики</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.draft}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Лимит договоров */}
        {limitInfo && (
          <div className="minimal-card p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Лимит договоров</h3>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-blue-600">{limitInfo.used}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-2xl font-bold text-gray-400">{limitInfo.limit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-blue-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${Math.min((limitInfo.used / limitInfo.limit) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Осталось {limitInfo.remaining} договоров
                </p>
              </div>
              {limitInfo.remaining <= 2 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-amber-700">Лимит почти исчерпан</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Список договоров */}
        <div className="minimal-card overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Список договоров</h2>
            <p className="text-sm text-gray-600 mt-1">Всего договоров: {contracts.length}</p>
          </div>

          {contracts.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет договоров</h3>
              <p className="text-sm text-gray-600 mb-6">Создайте свой первый договор</p>
              <button
                onClick={() => navigate('/contracts/create')}
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Создать договор
              </button>
            </div>
          ) : (
            <>
              {/* Десктоп таблица */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Код</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
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
              <div className="lg:hidden divide-y divide-gray-100">
                {contracts.map((contract) => (
                  <div key={contract.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 mb-1 truncate">{contract.title}</h3>
                        <code className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {contract.contract_code || 'N/A'}
                        </code>
                      </div>
                      <div className="ml-2">
                        {getStatusBadge(contract.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {format(new Date(contract.created_at), 'dd.MM.yyyy')}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/contracts/${contract.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {contract.status === 'signed' && (
                          <button
                            onClick={() => window.open(`${API}/contracts/${contract.id}/download-pdf`, '_blank')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {contract.status === 'draft' && (
                          <button
                            onClick={() => handleDeleteContract(contract.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
};

export default DashboardPage;
