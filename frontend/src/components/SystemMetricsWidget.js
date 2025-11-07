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
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-neutral-500">Загрузка метрик...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* CPU */}
      <Card className={`border-2 ${getColorClass(metrics.cpu_percent)}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            CPU
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.cpu_percent.toFixed(1)}%</div>
          <div className="w-full bg-neutral-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all ${
                metrics.cpu_percent < 50 ? 'bg-green-500' :
                metrics.cpu_percent < 80 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${metrics.cpu_percent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Memory */}
      <Card className={`border-2 ${getColorClass(metrics.memory.percent)}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Память
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.memory.percent.toFixed(1)}%</div>
          <div className="text-xs text-neutral-600 mt-1">
            {metrics.memory.used_gb} / {metrics.memory.total_gb} GB
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all ${
                metrics.memory.percent < 50 ? 'bg-green-500' :
                metrics.memory.percent < 80 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${metrics.memory.percent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Disk */}
      <Card className={`border-2 ${getColorClass(metrics.disk.percent)}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Диск
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.disk.percent.toFixed(1)}%</div>
          <div className="text-xs text-neutral-600 mt-1">
            {metrics.disk.used_gb} / {metrics.disk.total_gb} GB
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all ${
                metrics.disk.percent < 50 ? 'bg-green-500' :
                metrics.disk.percent < 80 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${metrics.disk.percent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-900">
            <Users className="h-4 w-4" />
            Активные пользователи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-900">{metrics.active_users_24h}</div>
          <div className="text-xs text-blue-700 mt-1">За последние 24 часа</div>
        </CardContent>
      </Card>

      {/* Uptime */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-900">
            <Clock className="h-4 w-4" />
            Uptime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-900">
            {metrics.uptime.days}д {metrics.uptime.hours}ч
          </div>
          <div className="text-xs text-purple-700 mt-1">Без перезагрузок</div>
        </CardContent>
      </Card>

      {/* Errors */}
      <Card className={`border-2 ${metrics.recent_errors.length > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${metrics.recent_errors.length > 0 ? 'text-red-900' : 'text-green-900'}`}>
            <AlertCircle className="h-4 w-4" />
            Ошибки
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${metrics.recent_errors.length > 0 ? 'text-red-900' : 'text-green-900'}`}>
            {metrics.recent_errors.length}
          </div>
          <div className={`text-xs mt-1 ${metrics.recent_errors.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {metrics.recent_errors.length > 0 ? 'Найдены ошибки' : 'Нет ошибок'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemMetricsWidget;
