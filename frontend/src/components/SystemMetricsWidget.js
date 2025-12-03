import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Cpu, HardDrive, Users, AlertCircle, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SystemMetricsWidget = ({ onErrorsClick }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API}/admin/system/metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getColorClass = (percent) => {
    if (percent < 50) return 'text-green-600 bg-green-50 border-green-200';
    if (percent < 80) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  if (loading || !metrics) {
    return (
      <div className="minimal-card p-6">
        <div className="text-center text-gray-500">Загрузка метрик...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* CPU */}
      <div className={`minimal-card p-6 ${getColorClass(metrics.cpu_percent)} transition-all duration-300`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-white rounded-lg">
            <Cpu className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold">CPU</h3>
        </div>
        <div className="text-4xl font-bold mb-3">{metrics.cpu_percent.toFixed(1)}%</div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              metrics.cpu_percent < 50 ? 'bg-green-500' :
              metrics.cpu_percent < 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${metrics.cpu_percent}%` }}
          />
        </div>
      </div>

      {/* Memory */}
      <div className={`minimal-card p-6 ${getColorClass(metrics.memory.percent)} transition-all duration-300`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-white rounded-lg">
            <Activity className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold">Память</h3>
        </div>
        <div className="text-4xl font-bold mb-1">{metrics.memory.percent.toFixed(1)}%</div>
        <div className="text-sm mb-3">
          {metrics.memory.used_gb} / {metrics.memory.total_gb} GB
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              metrics.memory.percent < 50 ? 'bg-green-500' :
              metrics.memory.percent < 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${metrics.memory.percent}%` }}
          />
        </div>
      </div>

      {/* Disk */}
      <div className={`minimal-card p-6 ${getColorClass(metrics.disk.percent)} transition-all duration-300`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-white rounded-lg">
            <HardDrive className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold">Диск</h3>
        </div>
        <div className="text-4xl font-bold mb-1">{metrics.disk.percent.toFixed(1)}%</div>
        <div className="text-sm mb-3">
          {metrics.disk.used_gb} / {metrics.disk.total_gb} GB
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              metrics.disk.percent < 50 ? 'bg-green-500' :
              metrics.disk.percent < 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${metrics.disk.percent}%` }}
          />
        </div>
      </div>

      {/* Active Users */}
      <div className="minimal-card p-6 bg-blue-50 border-blue-100 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-blue-900">Активные пользователи</h3>
        </div>
        <div className="text-4xl font-bold text-blue-900">{metrics.active_users_24h}</div>
        <div className="text-sm text-blue-700 mt-2">За последние 24 часа</div>
      </div>

      {/* Uptime */}
      <div className="minimal-card p-6 bg-purple-50 border-purple-100 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Clock className="h-5 w-5 text-purple-600" />
          </div>
          <h3 className="text-sm font-semibold text-purple-900">Uptime</h3>
        </div>
        <div className="text-3xl font-bold text-purple-900">
          {metrics.uptime.days}д {metrics.uptime.hours}ч
        </div>
        <div className="text-sm text-purple-700 mt-2">Без перезагрузок</div>
      </div>

      {/* Errors */}
      <div 
        className={`minimal-card p-6 ${metrics.recent_errors.length > 0 ? 'bg-red-50 border-red-100 cursor-pointer hover:shadow-xl' : 'bg-green-50 border-green-100'} transition-all duration-300`}
        onClick={() => metrics.recent_errors.length > 0 && onErrorsClick && onErrorsClick(metrics.recent_errors)}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-2 rounded-lg ${metrics.recent_errors.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
            <AlertCircle className={`h-5 w-5 ${metrics.recent_errors.length > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
          <h3 className={`text-sm font-semibold ${metrics.recent_errors.length > 0 ? 'text-red-900' : 'text-green-900'}`}>
            Ошибки
          </h3>
        </div>
        <div className={`text-4xl font-bold ${metrics.recent_errors.length > 0 ? 'text-red-900' : 'text-green-900'}`}>
          {metrics.recent_errors.length}
        </div>
        <div className={`text-sm mt-2 ${metrics.recent_errors.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
          {metrics.recent_errors.length > 0 ? 'Нажмите для просмотра' : 'Нет ошибок'}
        </div>
      </div>
    </div>
  );
};

export default SystemMetricsWidget;
