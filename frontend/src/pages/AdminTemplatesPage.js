import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Header from '@/components/Header';
import Loader from '@/components/Loader';
import { Plus, Edit, Trash2, Eye, Save } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'real_estate', label: '🏠 Недвижимость' },
  { value: 'services', label: '💼 Услуги' },
  { value: 'employment', label: '👔 Трудоустройство' },
  { value: 'other', label: '📄 Другое' }
];

const AdminTemplatesPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'real_estate',
    content: '',
    content_type: 'plain',
    placeholders: {} // { PLACEHOLDER_NAME: { label, type, owner, required } }
  });
  const [showPlaceholderDialog, setShowPlaceholderDialog] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState({
    name: '',
    label: '',
    type: 'text',
    owner: 'signer',
    required: true,
    showInContractDetails: true,
    showInContent: true,
    showInSignatureInfo: true
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Доступ запрещен');
        navigate('/dashboard');
      } else {
        toast.error('Ошибка загрузки шаблонов');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCategoryChange = (value) => {
    setFormData({
      ...formData,
      category: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    try {
      if (editingTemplate) {
        // Update
        await axios.put(
          `${API}/admin/templates/${editingTemplate.id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        toast.success('Шаблон обновлен');
      } else {
        // Create
        await axios.post(
          `${API}/admin/templates`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        toast.success('Шаблон создан');
      }

      setShowDialog(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при сохранении');
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      description: template.description,
      category: template.category,
      content: template.content,
      content_type: template.content_type || 'plain',
      placeholders: template.placeholders || {}
    });
    setShowDialog(true);
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот шаблон?')) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Шаблон удален');
      fetchTemplates();
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'real_estate',
      content: '',
      content_type: 'plain',
      placeholders: {}
    });
    setEditingTemplate(null);
  };

  const handleAddPlaceholder = () => {
    if (!currentPlaceholder.name || !currentPlaceholder.label) {
      toast.error('Укажите имя и метку плейсхолдера');
      return;
    }

    const placeholderName = currentPlaceholder.name.toUpperCase().replace(/\s+/g, '_');
    
    setFormData({
      ...formData,
      placeholders: {
        ...formData.placeholders,
        [placeholderName]: {
          label: currentPlaceholder.label,
          type: currentPlaceholder.type,
          owner: currentPlaceholder.owner,
          required: currentPlaceholder.required
        }
      }
    });

    setCurrentPlaceholder({
      name: '',
      label: '',
      type: 'text',
      owner: 'signer',
      required: true
    });
    setShowPlaceholderDialog(false);
    toast.success(`Плейсхолдер {{${placeholderName}}} добавлен`);
  };

  const handleRemovePlaceholder = (name) => {
    const newPlaceholders = { ...formData.placeholders };
    delete newPlaceholders[name];
    setFormData({
      ...formData,
      placeholders: newPlaceholders
    });
  };

  const insertPlaceholderToContent = (name) => {
    const placeholder = `{{${name}}}`;
    setFormData({
      ...formData,
      content: formData.content + ' ' + placeholder
    });
    toast.success(`Вставлен ${placeholder}`);
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">⚙️ Управление Шаблонами</h1>
            <p className="text-neutral-600">
              Создавайте и редактируйте шаблоны договоров для маркетплейса
            </p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Создать шаблон
          </Button>
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader size="medium" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-neutral-600 mb-4">Шаблоны еще не созданы</p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Создать первый шаблон
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className={!template.is_active ? 'opacity-50' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {template.title}
                        {!template.is_active && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            Неактивен
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {template.description}
                      </CardDescription>
                      <div className="mt-2 text-xs text-neutral-500">
                        Категория: {CATEGORIES.find(c => c.value === template.category)?.label}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Редактировать шаблон' : 'Создать новый шаблон'}
              </DialogTitle>
              <DialogDescription>
                Заполните информацию о шаблоне договора
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="title">Название *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Договор аренды квартиры"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Описание *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Краткое описание шаблона..."
                  rows={3}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Категория *</Label>
                <Select value={formData.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Конструктор плейсхолдеров */}
              <div className="border rounded-lg p-4 bg-neutral-50">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Конструктор плейсхолдеров</Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowPlaceholderDialog(true)}
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Добавить плейсхолдер
                  </Button>
                </div>

                {Object.keys(formData.placeholders).length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-4">
                    Нет плейсхолдеров. Добавьте их для создания форм заполнения
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(formData.placeholders).map(([name, config]) => (
                      <div key={name} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {'{{'}{name}{'}}'} 
                            </code>
                            <span className="text-xs text-neutral-500">
                              {config.type}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              config.owner === 'landlord' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {config.owner === 'landlord' ? '🏢 Наймодатель' : '👤 Наниматель'}
                            </span>
                            {config.required && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                обязательно
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-neutral-600">{config.label}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertPlaceholderToContent(name)}
                          >
                            Вставить
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePlaceholder(name)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="content">Содержание договора *</Label>
                <Textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Текст договора с плейсхолдерами: {{LANDLORD_NAME}}, {{SIGNER_NAME}} и т.д."
                  rows={15}
                  required
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Используйте плейсхолдеры: {'{{'} LANDLORD_NAME {'}}'},  {'{{'} SIGNER_NAME {'}}'},  {'{{'} RENT_AMOUNT {'}}'} и др.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {editingTemplate ? 'Сохранить изменения' : 'Создать шаблон'}
                </Button>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Placeholder Creation Dialog */}
        <Dialog open={showPlaceholderDialog} onOpenChange={setShowPlaceholderDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Добавить плейсхолдер</DialogTitle>
              <DialogDescription>
                Создайте новый плейсхолдер для формы заполнения
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>Имя плейсхолдера *</Label>
                <Input
                  value={currentPlaceholder.name}
                  onChange={(e) => setCurrentPlaceholder({
                    ...currentPlaceholder,
                    name: e.target.value.toUpperCase().replace(/\s+/g, '_')
                  })}
                  placeholder="RENT_AMOUNT"
                  className="mt-1 font-mono"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Будет использоваться как {'{{'}{currentPlaceholder.name || 'ИМЯ'}{'}}'}
                </p>
              </div>

              <div>
                <Label>Метка (Label) *</Label>
                <Input
                  value={currentPlaceholder.label}
                  onChange={(e) => setCurrentPlaceholder({
                    ...currentPlaceholder,
                    label: e.target.value
                  })}
                  placeholder="Сумма аренды"
                  className="mt-1"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Будет показано пользователю в форме
                </p>
              </div>

              <div>
                <Label>Тип поля *</Label>
                <Select
                  value={currentPlaceholder.type}
                  onValueChange={(value) => setCurrentPlaceholder({
                    ...currentPlaceholder,
                    type: value
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Текст</SelectItem>
                    <SelectItem value="number">Число</SelectItem>
                    <SelectItem value="date">Дата</SelectItem>
                    <SelectItem value="phone">Телефон</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="textarea">Длинный текст</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Кто заполняет? *</Label>
                <Select
                  value={currentPlaceholder.owner}
                  onValueChange={(value) => setCurrentPlaceholder({
                    ...currentPlaceholder,
                    owner: value
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landlord">🏢 Наймодатель</SelectItem>
                    <SelectItem value="signer">👤 Наниматель</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={currentPlaceholder.required}
                  onChange={(e) => setCurrentPlaceholder({
                    ...currentPlaceholder,
                    required: e.target.checked
                  })}
                  className="h-4 w-4"
                />
                <Label htmlFor="required" className="cursor-pointer">
                  Обязательное поле
                </Label>
              </div>

              {/* Секции отображения */}
              <div className="border-t pt-4 mt-4">
                <Label className="text-sm font-semibold mb-3 block">Отображать в секциях:</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showInContractDetails"
                      checked={currentPlaceholder.showInContractDetails !== false}
                      onChange={(e) => setCurrentPlaceholder({
                        ...currentPlaceholder,
                        showInContractDetails: e.target.checked
                      })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="showInContractDetails" className="cursor-pointer text-sm">
                      📋 Contract Details (Детали договора)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showInContent"
                      checked={currentPlaceholder.showInContent !== false}
                      onChange={(e) => setCurrentPlaceholder({
                        ...currentPlaceholder,
                        showInContent: e.target.checked
                      })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="showInContent" className="cursor-pointer text-sm">
                      📄 Content (Содержимое документа)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showInSignatureInfo"
                      checked={currentPlaceholder.showInSignatureInfo !== false}
                      onChange={(e) => setCurrentPlaceholder({
                        ...currentPlaceholder,
                        showInSignatureInfo: e.target.checked
                      })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="showInSignatureInfo" className="cursor-pointer text-sm">
                      ✍️ Signature Info (Информация о подписании)
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleAddPlaceholder}
                  className="flex-1"
                >
                  Добавить
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPlaceholderDialog(false)}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminTemplatesPage;
