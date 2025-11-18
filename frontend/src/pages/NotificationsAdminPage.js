import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import { Bell, Trash2, Eye, Upload, ArrowLeft } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NotificationsAdminPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data || []); // Исправлено: fallback на пустой массив
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]); // Исправлено: установка пустого массива при ошибке
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImageFile(file);
    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/admin/notifications/upload-image`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setImageUrl(response.data.image_url);
      toast.success('Картинка загружена');
    } catch (error) {
      toast.error('Ошибка загрузки картинки');
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Заполните заголовок и сообщение');
      return;
    }
    
    setCreating(true);
    
    try {
      await axios.post(`${API}/admin/notifications`, {
        title,
        message
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Оповещение создано');
      setTitle('');
      setMessage('');
      setImageUrl('');
      setImageFile(null);
      fetchNotifications();
    } catch (error) {
      toast.error('Ошибка создания оповещения');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить оповещение?')) return;
    
    try {
      await axios.delete(`${API}/admin/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Оповещение удалено');
      fetchNotifications();
    } catch (error) {
      toast.error('Ошибка удаления');
      console.error(error);
    }
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
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
            <h1 className="text-3xl font-bold text-neutral-900">Управление оповещениями</h1>
            <p className="text-neutral-600 mt-1">Создавайте оповещения для всех пользователей</p>
          </div>
        </div>

        {/* Create notification form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Создать новое оповещение</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Заголовок *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Важное объявление"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="message">Сообщение *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Текст оповещения..."
                rows={4}
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={!title || !message}>
                    <Eye className="mr-2 h-4 w-4" />
                    Предпросмотр
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Предпросмотр оповещения</DialogTitle>
                  </DialogHeader>
                  <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-3">
                      <Bell className="h-5 w-5 text-blue-600 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-900">{title}</h3>
                        <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">{message}</p>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button onClick={handleCreate} disabled={creating || !title || !message} className="ml-auto">
                <Bell className="mr-2 h-4 w-4" />
                {creating ? 'Создание...' : 'Создать оповещение'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* List of notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Все оповещения</CardTitle>
          </CardHeader>
          <CardContent>
            {!notifications || notifications.length === 0 ? (
              <p className="text-neutral-600 text-center py-8">Нет оповещений</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} className="border rounded-lg p-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{notif.title}</h3>
                        {notif.is_active && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Активно</span>}
                      </div>
                      <p className="text-sm text-neutral-600 mt-1">{notif.message}</p>
                      <p className="text-xs text-neutral-500 mt-2">
                        Создано: {new Date(notif.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(notif.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
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

export default NotificationsAdminPage;
