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
      toast.error('Ошибка загрузки шаблонов');
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
        toast.success('Удалено из избранного');
      } else {
        await axios.post(`${API}/users/favorites/templates/${templateId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavoriteTemplates([...favoriteTemplates, templateId]);
        toast.success('Добавлено в избранное');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка');
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
        <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
            size="sm"
          >
            <Filter className="mr-2 h-4 w-4" />
            Все категории
          </Button>
          {Object.entries(CATEGORIES).map(([key, { label }]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(key)}
              size="sm"
            >
              {label}
            </Button>
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
                  : 'Шаблоны еще не добавлены'
                }
              </p>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Вернуться к договорам
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    <Badge className={CATEGORIES[template.category]?.color || CATEGORIES.other.color}>
                      {CATEGORIES[template.category]?.label.split(' ')[0] || '📄'}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-3">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewTemplate(template)}
                      className="flex-1"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Просмотр
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleToggleFavorite(template.id)}
                      variant={favoriteTemplates.includes(template.id) ? "default" : "outline"}
                      className="flex-1"
                    >
                      <Heart 
                        className={`mr-2 h-4 w-4 ${favoriteTemplates.includes(template.id) ? 'fill-current' : ''}`} 
                      />
                      {favoriteTemplates.includes(template.id) ? 'В избранном' : 'В избранное'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
