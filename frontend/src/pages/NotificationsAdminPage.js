import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
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
      toast.success(t('adminNotifications.imageUploaded'));
    } catch (error) {
      toast.error(t('adminNotifications.imageUploadError'));
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error(t('adminNotifications.fillTitleAndMessage'));
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
      
      toast.success(t('adminNotifications.notificationCreated'));
      setTitle('');
      setMessage('');
      setImageUrl('');
      setImageFile(null);
      fetchNotifications();
    } catch (error) {
      toast.error(t('adminNotifications.createError'));
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('adminNotifications.deleteConfirm'))) return;
    
    try {
      await axios.delete(`${API}/admin/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(t('adminNotifications.notificationDeleted'));
      fetchNotifications();
    } catch (error) {
      toast.error(t('adminNotifications.deleteError'));
      console.error(error);
    }
  };

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
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button 
              onClick={() => navigate('/admin')} 
              className="neuro-button flex items-center gap-2 px-4 py-2 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.previous')}
            </button>
            <h1 className="text-4xl font-bold text-gray-900">{t('adminNotifications.title')}</h1>
            <p className="text-gray-600 text-lg mt-2">{t('adminNotifications.subtitle')}</p>
          </div>
        </div>

        {/* Create notification form */}
        <div className="minimal-card p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('adminNotifications.createNew')}</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-semibold text-gray-700">{t('adminNotifications.notificationTitle')} *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('adminNotifications.importantAnnouncement')}
                className="mt-1 minimal-input"
              />
            </div>
            
            <div>
              <Label htmlFor="message" className="text-sm font-semibold text-gray-700">{t('adminNotifications.message')} *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('adminNotifications.notificationText')}
                rows={4}
                className="mt-1 minimal-input"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                  <button 
                    disabled={!title || !message}
                    className="neuro-button flex items-center gap-2 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye className="h-4 w-4" />
                    {t('adminNotifications.preview')}
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-900">{t('adminNotifications.previewTitle')}</DialogTitle>
                  </DialogHeader>
                  <div className="minimal-card p-6 bg-gradient-to-r from-blue-50 to-blue-100">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-200 rounded-lg">
                        <Bell className="h-5 w-5 text-blue-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-blue-900 text-lg">{title}</h3>
                        <p className="text-sm text-blue-800 mt-2 whitespace-pre-wrap leading-relaxed">{message}</p>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <button 
                onClick={handleCreate} 
                disabled={creating || !title || !message} 
                className="neuro-button-primary flex items-center gap-2 px-6 py-2 text-white ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Bell className="h-4 w-4" />
                {creating ? t('adminNotifications.creating') : t('adminNotifications.create')}
              </button>
            </div>
          </div>
        </div>

        {/* List of notifications */}
        <div className="minimal-card p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('adminNotifications.allNotifications')}</h2>
          {!notifications || notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-blue-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">{t('adminNotifications.noNotifications')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notif) => (
                <div key={notif.id} className="minimal-card p-5 flex items-start justify-between hover:shadow-lg transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">{notif.title}</h3>
                      {notif.is_active && (
                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                          {t('adminNotifications.active')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-2">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-3">
                      {t('adminNotifications.created')}: {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDelete(notif.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors ml-4"
                  >
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsAdminPage;
