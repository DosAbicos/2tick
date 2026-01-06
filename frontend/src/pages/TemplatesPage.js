import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import { FileText, Eye, Plus, Filter, Heart } from 'lucide-react';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = {
  real_estate: { label: '🏠 Недвижимость', color: 'bg-blue-100 text-blue-800' },
  services: { label: '💼 Услуги', color: 'bg-green-100 text-green-800' },
  employment: { label: '👔 Трудоустройство', color: 'bg-purple-100 text-purple-800' },
  other: { label: '📄 Другое', color: 'bg-gray-100 text-gray-800' }
};

const TemplatesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [favoriteTemplates, setFavoriteTemplates] = useState([]);

  useEffect(() => {
    fetchTemplates();
    fetchFavorites();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = selectedCategory ? { category: selectedCategory } : {};
      const response = await axios.get(`${API}/templates`, { params });
      setTemplates(response.data);
    } catch (error) {
      toast.error(t('templates.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get(`${API}/users/favorites/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavoriteTemplates(response.data.map(t => t.id));
    } catch (error) {
      // Игнорируем ошибки для избранного
    }
  };

  const handleToggleFavorite = async (templateId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const isFavorite = favoriteTemplates.includes(templateId);

    try {
      if (isFavorite) {
        await axios.delete(`${API}/users/favorites/templates/${templateId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavoriteTemplates(favoriteTemplates.filter(id => id !== templateId));
        toast.success(t('templates.removedFromFavorites'));
      } else {
        await axios.post(`${API}/users/favorites/templates/${templateId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavoriteTemplates([...favoriteTemplates, templateId]);
        toast.success(t('templates.addedToFavorites'));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="minimal-card p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">📚 Маркет шаблонов</h1>
          <p className="text-sm text-gray-500">
            Выберите готовый шаблон договора и добавьте в избранное
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
              selectedCategory === null
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'
            }`}
            onClick={() => setSelectedCategory(null)}
          >
            <Filter className="w-4 h-4" />
            Все категории
          </button>
          {Object.entries(CATEGORIES).map(([key, { label }]) => (
            <button
              key={key}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                selectedCategory === key
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'
              }`}
              onClick={() => setSelectedCategory(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">Загрузка шаблонов...</p>
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
              <p className="text-neutral-600 mb-4">
                {selectedCategory 
                  ? 'Нет шаблонов в этой категории' 
                  : t('templates.noTemplatesYet')
                }
              </p>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Вернуться к договорам
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="minimal-card p-5 hover:shadow-xl transition-all animate-fade-in group">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{template.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-lg ${CATEGORIES[template.category]?.color || CATEGORIES.other.color}`}>
                    {CATEGORIES[template.category]?.label.split(' ')[0] || '📄'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {template.description}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-all flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4 flex-shrink-0" />
                    <span>Просмотр</span>
                  </button>
                  <button
                    onClick={() => handleToggleFavorite(template.id)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                      favoriteTemplates.includes(template.id)
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md'
                        : 'text-gray-700 bg-white border border-gray-300 hover:border-pink-400'
                    }`}
                  >
                    <Heart 
                      className={`w-4 h-4 flex-shrink-0 ${favoriteTemplates.includes(template.id) ? 'fill-current' : ''}`} 
                    />
                    <span className="truncate">{favoriteTemplates.includes(template.id) ? 'В избр.' : 'Избр.'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {previewTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-3xl w-full max-h-[80vh] overflow-auto">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{previewTemplate.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {previewTemplate.description}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" onClick={() => setPreviewTemplate(null)}>
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-neutral-50 p-4 rounded-lg mb-4">
                  <p className="whitespace-pre-wrap text-sm">
                    {previewTemplate.content.substring(0, 1000)}
                    {previewTemplate.content.length > 1000 && '...'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      handleToggleFavorite(previewTemplate.id);
                      setPreviewTemplate(null);
                    }}
                    variant={favoriteTemplates.includes(previewTemplate.id) ? "default" : "outline"}
                    className="flex-1"
                  >
                    <Heart 
                      className={`mr-2 h-4 w-4 ${favoriteTemplates.includes(previewTemplate.id) ? 'fill-current' : ''}`} 
                    />
                    {favoriteTemplates.includes(previewTemplate.id) ? 'Удалить из избранного' : 'Добавить в избранное'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPreviewTemplate(null)}
                  >
                    Закрыть
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesPage;
