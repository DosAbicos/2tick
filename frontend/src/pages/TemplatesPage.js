import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import { FileText, Eye, Plus, Filter, Heart, X, Languages, ArrowLeft } from 'lucide-react';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TemplatesPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewLanguage, setPreviewLanguage] = useState('ru');
  const [favoriteTemplates, setFavoriteTemplates] = useState([]);

  // Categories with translations
  const CATEGORIES = {
    real_estate: { icon: '🏠', color: 'bg-blue-100 text-blue-800' },
    services: { icon: '💼', color: 'bg-green-100 text-green-800' },
    employment: { icon: '👔', color: 'bg-purple-100 text-purple-800' },
    other: { icon: '📄', color: 'bg-gray-100 text-gray-800' }
  };

  const getCategoryLabel = (key) => {
    return t(`templates.categories.${key}`, key);
  };

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
      // Ignore favorites errors
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

  const getPreviewContent = () => {
    if (!previewTemplate) return '';
    
    switch (previewLanguage) {
      case 'kk':
        return previewTemplate.content_kk || previewTemplate.content || t('templates.noDescription');
      case 'en':
        return previewTemplate.content_en || previewTemplate.content || t('templates.noDescription');
      default:
        return previewTemplate.content || t('templates.noDescription');
    }
  };

  // Get localized template title based on current UI language
  const getTemplateTitle = (template) => {
    const lang = i18n.language;
    if (lang === 'kk' && template.title_kk) return template.title_kk;
    if (lang === 'en' && template.title_en) return template.title_en;
    return template.title;
  };

  // Get localized template description based on current UI language
  const getTemplateDescription = (template) => {
    const lang = i18n.language;
    if (lang === 'kk' && template.description_kk) return template.description_kk;
    if (lang === 'en' && template.description_en) return template.description_en;
    return template.description || t('templates.noDescription');
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 sm:mb-6 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 minimal-card hover:shadow-lg transition-all flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        
        {/* Header */}
        <div className="minimal-card p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{t('templates.title')}</h1>
          <p className="text-sm text-gray-500">
            {t('templates.subtitle')}
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
            {t('templates.allCategories')}
          </button>
          {Object.entries(CATEGORIES).map(([key, { icon }]) => (
            <button
              key={key}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                selectedCategory === key
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'
              }`}
              onClick={() => setSelectedCategory(key)}
            >
              {icon} {getCategoryLabel(key)}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">{t('templates.loading')}</p>
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
              <p className="text-neutral-600 mb-4">
                {selectedCategory 
                  ? t('templates.noTemplatesInCategory')
                  : t('templates.noTemplatesYet')
                }
              </p>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                {t('templates.backToContracts')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="minimal-card p-5 hover:shadow-xl transition-all animate-fade-in group">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{getTemplateTitle(template)}</h3>
                  <span className={`text-xs px-2 py-1 rounded-lg ${CATEGORIES[template.category]?.color || CATEGORIES.other.color}`}>
                    {CATEGORIES[template.category]?.icon || '📄'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {getTemplateDescription(template)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPreviewTemplate(template);
                      setPreviewLanguage('ru');
                    }}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-all flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4 flex-shrink-0" />
                    <span>{t('templates.view')}</span>
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
                    <span className="truncate">
                      {favoriteTemplates.includes(template.id) ? t('templates.inFavorites') : t('templates.toFavorites')}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Improved Preview Modal */}
        {previewTemplate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="minimal-card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-sm px-3 py-1 rounded-lg ${CATEGORIES[previewTemplate.category]?.color || CATEGORIES.other.color}`}>
                        {CATEGORIES[previewTemplate.category]?.icon} {getCategoryLabel(previewTemplate.category)}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{getTemplateTitle(previewTemplate)}</h2>
                    <p className="text-gray-600">{getTemplateDescription(previewTemplate)}</p>
                  </div>
                  <button 
                    onClick={() => setPreviewTemplate(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
                
                {/* Language Tabs */}
                <div className="flex items-center gap-2 mt-4">
                  <Languages className="w-4 h-4 text-gray-400" />
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setPreviewLanguage('ru')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        previewLanguage === 'ru'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('templates.contentRu')}
                    </button>
                    <button
                      onClick={() => setPreviewLanguage('kk')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        previewLanguage === 'kk'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('templates.contentKk')}
                    </button>
                    <button
                      onClick={() => setPreviewLanguage('en')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        previewLanguage === 'en'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('templates.contentEn')}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-mono">
                    {getPreviewContent()}
                  </p>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleToggleFavorite(previewTemplate.id);
                    }}
                    className={`flex-1 px-6 py-3 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
                      favoriteTemplates.includes(previewTemplate.id)
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    }`}
                  >
                    <Heart 
                      className={`w-5 h-5 ${favoriteTemplates.includes(previewTemplate.id) ? 'fill-current' : ''}`} 
                    />
                    {favoriteTemplates.includes(previewTemplate.id) 
                      ? t('templates.removeFromFavorites')
                      : t('templates.addToFavorites')
                    }
                  </button>
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    {t('templates.close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesPage;
