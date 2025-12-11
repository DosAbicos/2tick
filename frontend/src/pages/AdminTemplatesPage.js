import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Edit, Trash2, Save, GripVertical, Type, Hash, Calendar, Phone, Mail, FileText, User, Building } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'real_estate', label: '🏠 Недвижимость' },
  { value: 'services', label: '💼 Услуги' },
  { value: 'employment', label: '👔 Трудоустройство' },
  { value: 'other', label: '📄 Другое' }
];

const FIELD_TYPES = [
  { value: 'text', label: 'Текст', icon: Type },
  { value: 'number', label: 'Число', icon: Hash },
  { value: 'date', label: 'Дата', icon: Calendar },
  { value: 'phone', label: 'Телефон', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'textarea', label: 'Длинный текст', icon: FileText },
  { value: 'calculated', label: '🧮 Вычисляемое', icon: Hash }
];

const CALCULATOR_OPERATIONS = [
  { value: 'add', label: '+  Сложение', symbol: '+' },
  { value: 'subtract', label: '−  Вычитание', symbol: '-' },
  { value: 'multiply', label: '×  Умножение', symbol: '*' },
  { value: 'divide', label: '÷  Деление', symbol: '/' },
  { value: 'modulo', label: '%  Остаток от деления', symbol: '%' },
  { value: 'days_between', label: '📅  Разница в днях (для дат)', symbol: 'days' }
];

// Predefined placeholder templates for quick insertion
const PRESET_PLACEHOLDERS = [
  {
    name: 'CONTRACT_DATE',
    label: 'Дата составления договора',
    type: 'date',
    owner: 'landlord',
    required: true
  },
  {
    name: 'SIGNING_DATETIME',
    label: 'Дата и время подписания',
    type: 'text',
    owner: 'tenant',
    required: false
  },
  {
    name: 'COMPANY_NAME',
    label: 'Наименование компании',
    type: 'text',
    owner: 'landlord',
    required: true
  },
  {
    name: 'COMPANY_IIN',
    label: 'ИИН/БИН компании',
    type: 'text',
    owner: 'landlord',
    required: true
  },
  {
    name: 'CITY',
    label: 'Город',
    type: 'text',
    owner: 'landlord',
    required: true
  },
  {
    name: 'ADDRESS',
    label: 'Адрес',
    type: 'text',
    owner: 'landlord',
    required: true
  },
  {
    name: 'TENANT_FULL_NAME',
    label: 'ФИО нанимателя',
    type: 'text',
    owner: 'tenant',
    required: true
  },
  {
    name: 'TENANT_PHONE',
    label: 'Телефон нанимателя',
    type: 'phone',
    owner: 'tenant',
    required: true
  },
  {
    name: 'TENANT_EMAIL',
    label: 'Email нанимателя',
    type: 'email',
    owner: 'tenant',
    required: false
  },
  {
    name: 'TENANT_IIN',
    label: 'ИИН нанимателя',
    type: 'text',
    owner: 'tenant',
    required: true
  },
  {
    name: 'START_DATE',
    label: 'Дата начала',
    type: 'date',
    owner: 'landlord',
    required: true
  },
  {
    name: 'END_DATE',
    label: 'Дата окончания',
    type: 'date',
    owner: 'landlord',
    required: true
  },
  {
    name: 'AMOUNT',
    label: 'Сумма',
    type: 'number',
    owner: 'landlord',
    required: true
  }
];


// Sortable Placeholder Item Component
const SortablePlaceholder = ({ id, placeholder, config, onInsert, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const TypeIcon = FIELD_TYPES.find(t => t.value === config.type)?.icon || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white border rounded-lg p-4 hover:shadow-md transition-all ${
        isDragging ? 'shadow-2xl ring-2 ring-primary' : ''
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="ml-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <code className="text-sm font-mono bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-md">
                {'{{'}{id}{'}}'}
              </code>
              
              {/* Type Badge */}
              <div className="flex items-center gap-1 bg-neutral-100 text-neutral-700 px-2 py-1 rounded text-xs">
                <TypeIcon className="h-3 w-3" />
                <span>{FIELD_TYPES.find(t => t.value === config.type)?.label}</span>
              </div>

              {/* Owner Badge */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                config.owner === 'landlord'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {config.owner === 'landlord' ? (
                  <>
                    <Building className="h-3 w-3" />
                    <span>Наймодатель</span>
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3" />
                    <span>Наниматель</span>
                  </>
                )}
              </div>

              {/* Required Badge */}
              {config.required && (
                <div className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">
                  обязательно
                </div>
              )}
            </div>

            {/* Label */}
            <p className="text-sm text-neutral-700 font-medium">{config.label}</p>
            
            {/* Formula for calculated fields */}
            {config.type === 'calculated' && config.formula && (
              <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1 font-mono">
                🧮 {'{{'}{config.formula.operand1}{'}}'}
                {' '}{CALCULATOR_OPERATIONS.find(op => op.value === config.formula.operation)?.symbol || config.formula.operation}{' '}
                {'{{'}{config.formula.operand2}{'}}'}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1 ml-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onInsert(id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Вставить
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => config.onEdit && config.onEdit(id, config)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminTemplatesPageNew = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    title_kk: '',
    title_en: '',
    description: '',
    description_kk: '',
    description_en: '',
    category: 'real_estate',
    content: '',
    content_kk: '',
    content_en: '',
    content_type: 'plain',
    placeholders: {},
    requires_tenant_document: false,
    party_a_role: 'Сторона А',
    party_a_role_kk: 'А жағы',
    party_a_role_en: 'Party A',
    party_b_role: 'Сторона Б',
    party_b_role_kk: 'Б жағы',
    party_b_role_en: 'Party B'
  });
  
  const [currentLang, setCurrentLang] = useState('ru');
  
  // Role pairs
  const rolePairs = [
    { a: 'Сторона А', b: 'Сторона Б' },
    { a: 'Арендодатель', b: 'Арендатор' },
    { a: 'Заказчик', b: 'Исполнитель' },
    { a: 'Продавец', b: 'Покупатель' },
    { a: 'Кредитор', b: 'Должник' },
    { a: 'Лицензиар', b: 'Лицензиат' },
    { a: 'Работодатель', b: 'Работник' },
    { a: 'Учредитель', b: 'Участник' }
  ];
  const [placeholderOrder, setPlaceholderOrder] = useState([]);
  
  const [showPlaceholderDialog, setShowPlaceholderDialog] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [editingPlaceholderName, setEditingPlaceholderName] = useState(null);
  const [placeholderLabelLang, setPlaceholderLabelLang] = useState('ru');
  const [currentPlaceholder, setCurrentPlaceholder] = useState({
    name: '',
    label: '',
    label_kk: '',
    label_en: '',
    type: 'text',
    owner: 'signer',
    required: true,
    showInContractDetails: true,
    showInContent: true,
    showInSignatureInfo: true,
    // For calculated fields
    isCalculated: false,
    formula: {
      operand1: '',
      operation: 'add',
      operand2: ''
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryChange = (value) => {
    setFormData({
      ...formData,
      category: value
    });
  };

  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [pendingTemplateData, setPendingTemplateData] = useState(null);
  const [pendingIsEdit, setPendingIsEdit] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    // Validate all languages are filled
    if (!formData.content_kk || !formData.content_en) {
      toast.error('Заполните содержание договора на всех трех языках (Русский, Казахский, Английский)');
      return;
    }

    // Save data and context before showing popup
    setPendingTemplateData({...formData});
    setPendingIsEdit(!!editingTemplate);
    setPendingTemplateId(editingTemplate?.id || null);
    
    // Close main dialog first
    setShowDialog(false);
    
    // Show confirmation popup
    setShowPublishConfirm(true);
  };
  
  const confirmPublish = async () => {
    if (!pendingTemplateData) {
      toast.error('Данные не найдены');
      return;
    }
    
    try {
      if (pendingIsEdit && pendingTemplateId) {
        await axios.put(
          `${API}/admin/templates/${pendingTemplateId}`,
          pendingTemplateData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        toast.success('Шаблон обновлен');
      } else {
        await axios.post(
          `${API}/admin/templates`,
          pendingTemplateData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        toast.success('Шаблон создан');
      }

      setShowPublishConfirm(false);
      setPendingTemplateData(null);
      setPendingIsEdit(false);
      setPendingTemplateId(null);
      resetForm();
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при сохранении');
      setShowPublishConfirm(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      title_kk: template.title_kk || '',
      title_en: template.title_en || '',
      description: template.description,
      description_kk: template.description_kk || '',
      description_en: template.description_en || '',
      category: template.category,
      content: template.content,
      content_kk: template.content_kk || '',
      content_en: template.content_en || '',
      content_type: template.content_type || 'plain',
      placeholders: template.placeholders || {},
      requires_tenant_document: template.requires_tenant_document || false,
      party_a_role: template.party_a_role || 'Сторона А',
      party_a_role_kk: template.party_a_role_kk || 'А жағы',
      party_a_role_en: template.party_a_role_en || 'Party A',
      party_b_role: template.party_b_role || 'Сторона Б',
      party_b_role_kk: template.party_b_role_kk || 'Б жағы',
      party_b_role_en: template.party_b_role_en || 'Party B'
    });
    setPlaceholderOrder(Object.keys(template.placeholders || {}));
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
      title_kk: '',
      title_en: '',
      description: '',
      description_kk: '',
      description_en: '',
      category: 'real_estate',
      content: '',
      content_kk: '',
      content_en: '',
      content_type: 'plain',
      placeholders: {},
      requires_tenant_document: false,
      party_a_role: 'Сторона А',
      party_a_role_kk: 'А жағы',
      party_a_role_en: 'Party A',
      party_b_role: 'Сторона Б',
      party_b_role_kk: 'Б жағы',
      party_b_role_en: 'Party B'
    });
    setPlaceholderOrder([]);
    setEditingTemplate(null);
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    resetForm();
  };

  const handleAddPlaceholder = () => {
    if (!currentPlaceholder.name || !currentPlaceholder.label) {
      toast.error('Укажите имя и метку плейсхолдера');
      return;
    }

    // Validate multilingual labels
    if (!currentPlaceholder.label_kk || !currentPlaceholder.label_en) {
      toast.error('Укажите метки на всех трех языках (Русский, Казахский, Английский)');
      return;
    }

    // Validation for calculated fields
    if (currentPlaceholder.type === 'calculated') {
      if (!currentPlaceholder.formula.operand1 || !currentPlaceholder.formula.operand2) {
        toast.error('Укажите оба операнда для вычисляемого поля');
        return;
      }
    }

    const placeholderName = currentPlaceholder.name.toUpperCase().replace(/\s+/g, '_');
    
    const placeholderConfig = {
      label: currentPlaceholder.label,
      label_kk: currentPlaceholder.label_kk,
      label_en: currentPlaceholder.label_en,
      type: currentPlaceholder.type,
      owner: currentPlaceholder.owner,
      required: currentPlaceholder.required,
      showInContractDetails: currentPlaceholder.showInContractDetails,
      showInContent: currentPlaceholder.showInContent,
      showInSignatureInfo: currentPlaceholder.showInSignatureInfo
    };

    // Add formula for calculated fields
    if (currentPlaceholder.type === 'calculated') {
      placeholderConfig.formula = currentPlaceholder.formula;
    }

    // Check if editing existing placeholder
    if (editingPlaceholderName) {
      // Remove old placeholder if name changed
      if (editingPlaceholderName !== placeholderName) {
        const newPlaceholders = { ...formData.placeholders };
        delete newPlaceholders[editingPlaceholderName];
        
        setFormData({
          ...formData,
          placeholders: {
            ...newPlaceholders,
            [placeholderName]: placeholderConfig
          }
        });
        
        // Update order
        setPlaceholderOrder(placeholderOrder.map(name => 
          name === editingPlaceholderName ? placeholderName : name
        ));
      } else {
        // Just update config
        setFormData({
          ...formData,
          placeholders: {
            ...formData.placeholders,
            [placeholderName]: placeholderConfig
          }
        });
      }
      toast.success(`Плейсхолдер {{${placeholderName}}} обновлен`);
    } else {
      // Adding new placeholder
      setFormData({
        ...formData,
        placeholders: {
          ...formData.placeholders,
          [placeholderName]: placeholderConfig
        }
      });

      setPlaceholderOrder([...placeholderOrder, placeholderName]);
      toast.success(`Плейсхолдер {{${placeholderName}}} добавлен`);
    }

    // Reset state
    setEditingPlaceholderName(null);
    setCurrentPlaceholder({
      name: '',
      label: '',
      label_kk: '',
      label_en: '',
      type: 'text',
      owner: 'signer',
      required: true,
      showInContractDetails: true,
      showInContent: true,
      showInSignatureInfo: true,
      isCalculated: false,
      formula: {
        operand1: '',
        operation: 'add',
        operand2: ''
      }
    });
    setShowPlaceholderDialog(false);
  };


  const handleInsertPreset = (preset) => {
    // Check if placeholder with this name already exists
    if (formData.placeholders[preset.name]) {
      toast.error(`Плейсхолдер "${preset.name}" уже существует`);
      return;
    }

    const placeholderConfig = {
      label: preset.label,
      type: preset.type,
      owner: preset.owner,
      required: preset.required,
      showInContractDetails: true,
      showInContent: true,
      showInSignatureInfo: true
    };

    setFormData({
      ...formData,
      placeholders: {
        ...formData.placeholders,
        [preset.name]: placeholderConfig
      }
    });

    setPlaceholderOrder([...placeholderOrder, preset.name]);
    toast.success(`Плейсхолдер "${preset.label}" добавлен`);
    setShowPresetDialog(false);
  };

  const handleEditPreset = (preset) => {
    // Open dialog with preset values
    handleEditPlaceholder(preset.name, {
      label: preset.label,
      type: preset.type,
      owner: preset.owner,
      required: preset.required,
      showInContractDetails: true,
      showInContent: true,
      showInSignatureInfo: true
    });
    setShowPresetDialog(false);
  };

  const handleRemovePlaceholder = (name) => {
    const newPlaceholders = { ...formData.placeholders };
    delete newPlaceholders[name];
    setFormData({
      ...formData,
      placeholders: newPlaceholders
    });
    setPlaceholderOrder(placeholderOrder.filter(id => id !== name));
  };

  const handleEditPlaceholder = (name, config) => {
    setEditingPlaceholderName(name);
    setCurrentPlaceholder({
      name: name,
      label: config.label || '',
      label_kk: config.label_kk || '',
      label_en: config.label_en || '',
      type: config.type,
      owner: config.owner,
      required: config.required,
      showInContractDetails: config.showInContractDetails !== false,
      showInContent: config.showInContent !== false,
      showInSignatureInfo: config.showInSignatureInfo !== false,
      isCalculated: config.type === 'calculated',
      formula: config.formula || {
        operand1: '',
        operation: 'add',
        operand2: ''
      }
    });
    setShowPlaceholderDialog(true);
  };

  const contentTextareaRef = React.useRef(null);

  const insertPlaceholderToContent = (name) => {
    const placeholder = `{{${name}}}`;
    const textarea = contentTextareaRef.current;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.content;
      
      // Вставить в позицию курсора
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      
      setFormData(prev => ({
        ...prev,
        content: newText
      }));
      
      // Установить курсор после вставленного плейсхолдера
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + placeholder.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      // Fallback - добавить в конец
      setFormData(prev => ({
        ...prev,
        content: prev.content + ' ' + placeholder
      }));
    }
    
    toast.success(`Вставлен ${placeholder}`);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setPlaceholderOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">⚙️ Управление Шаблонами</h1>
            <p className="text-gray-600 text-lg">
              Создавайте и редактируйте шаблоны договоров с конструктором плейсхолдеров
            </p>
          </div>
          <button 
            onClick={() => setShowDialog(true)} 
            className="neuro-button-primary flex items-center gap-2 px-6 py-3 text-white whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            Создать шаблон
          </button>
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader size="medium" />
          </div>
        ) : templates.length === 0 ? (
          <div className="minimal-card p-12 text-center">
            <FileText className="h-16 w-16 text-blue-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-6 text-lg">Шаблоны еще не созданы</p>
            <button 
              onClick={() => setShowDialog(true)}
              className="neuro-button-primary flex items-center gap-2 px-6 py-3 text-white mx-auto"
            >
              <Plus className="h-5 w-5" />
              Создать первый шаблон
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {templates.map((template) => (
              <div 
                key={template.id} 
                className={`minimal-card p-6 transition-all duration-300 ${!template.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{template.title}</h3>
                      {!template.is_active && (
                        <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                          Неактивен
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-2">
                      {template.description}
                    </p>
                    <div className="mt-3 inline-block px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg font-medium">
                      {CATEGORIES.find(c => c.value === template.category)?.label}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="neuro-button flex items-center gap-2 px-4 py-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden sm:inline">Редактировать</span>
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold text-gray-900">
                {editingTemplate ? '✏️ Редактировать шаблон' : '✨ Создать новый шаблон'}
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-base mt-2">
                Заполните информацию о шаблоне договора и настройте плейсхолдеры
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-semibold text-gray-700">Название *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Договор аренды квартиры"
                    required
                    className="mt-1 minimal-input"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700">Категория *</Label>
                  <Select value={formData.category} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="mt-1 minimal-input">
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
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-semibold text-gray-700">Описание *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Краткое описание шаблона..."
                  rows={2}
                  required
                  className="mt-1 minimal-input"
                />
              </div>

              {/* Party Roles Selection */}
              <div className="minimal-card p-5 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <Label className="text-sm font-semibold text-gray-900">Роли сторон договора *</Label>
                </div>
                <Select 
                  value={`${formData.party_a_role}|${formData.party_b_role}`}
                  onValueChange={(value) => {
                    const [a, b] = value.split('|');
                    setFormData({...formData, party_a_role: a, party_b_role: b});
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rolePairs.map((pair, idx) => (
                      <SelectItem key={idx} value={`${pair.a}|${pair.b}`}>
                        {pair.a} / {pair.b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-purple-700 mt-2">
                  📝 Выбранные роли: <strong>{formData.party_a_role}</strong> и <strong>{formData.party_b_role}</strong>
                </p>
              </div>

              {/* Настройка требования документа нанимателя */}
              <div className="flex items-start space-x-3 p-4 border border-amber-200 rounded-lg bg-amber-50/30">
                <Checkbox 
                  id="requires_tenant_document"
                  checked={formData.requires_tenant_document}
                  onCheckedChange={(checked) => setFormData({...formData, requires_tenant_document: checked})}
                />
                <div className="flex-1">
                  <label htmlFor="requires_tenant_document" className="text-sm font-medium text-neutral-900 cursor-pointer">
                    Требуется удостоверение личности нанимателя
                  </label>
                  <p className="text-xs text-neutral-600 mt-1">
                    При подписании договора наниматель должен будет загрузить копию своего удостоверения личности
                  </p>
                </div>
              </div>

              {/* Beautiful Placeholder Constructor */}
              <div className="minimal-card p-6 bg-gradient-to-r from-pink-50 to-purple-50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                  <div>
                    <Label className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      🎨 Конструктор плейсхолдеров
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Перетаскивайте для изменения порядка
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPlaceholderDialog(true)}
                      className="neuro-button-primary text-white px-4 py-2 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Добавить плейсхолдер
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPresetDialog(true)}
                      className="neuro-button px-4 py-2"
                    >
                      ⚡ Быстрая вставка
                    </button>
                  </div>
                </div>

                {placeholderOrder.length === 0 ? (
                  <div className="text-center py-12 minimal-card">
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="text-gray-600 mb-2 font-semibold text-lg">
                      Нет плейсхолдеров
                    </p>
                    <p className="text-sm text-gray-500">
                      Добавьте плейсхолдеры для создания динамических форм
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={placeholderOrder}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {placeholderOrder.map((name) => (
                          <SortablePlaceholder
                            key={name}
                            id={name}
                            placeholder={name}
                            config={{...formData.placeholders[name], onEdit: handleEditPlaceholder}}
                            onInsert={insertPlaceholderToContent}
                            onRemove={handleRemovePlaceholder}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Language Tabs for Content */}
              <div className="minimal-card p-5 bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setCurrentLang('ru')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      currentLang === 'ru'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                        : 'neuro-button'
                    }`}
                  >
                    🇷🇺 Русский
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentLang('kk')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      currentLang === 'kk'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                        : 'neuro-button'
                    }`}
                  >
                    🇰🇿 Казахский
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentLang('en')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      currentLang === 'en'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                        : 'neuro-button'
                    }`}
                  >
                    🇬🇧 Английский
                  </button>
                </div>

                {/* Russian Content */}
                {currentLang === 'ru' && (
                  <div>
                    <Label htmlFor="content" className="text-sm font-semibold text-gray-700">Содержание договора (Русский) *</Label>
                    <Textarea
                      ref={contentTextareaRef}
                      id="content"
                      name="content"
                      value={formData.content}
                      onChange={handleChange}
                      placeholder="Текст договора с плейсхолдерами: {{LANDLORD_NAME}}, {{SIGNER_NAME}} и т.д."
                      rows={12}
                      required
                      className="mt-1 font-mono text-sm minimal-input"
                    />
                  </div>
                )}

                {/* Kazakh Content */}
                {currentLang === 'kk' && (
                  <div>
                    <Label htmlFor="content_kk" className="text-sm font-semibold text-gray-700">Содержание договора (Қазақша) *</Label>
                    <Textarea
                      id="content_kk"
                      name="content_kk"
                      value={formData.content_kk}
                      onChange={handleChange}
                      placeholder="Шарттың мәтіні {{LANDLORD_NAME}}, {{SIGNER_NAME}} сияқты плейсхолдерлермен"
                      rows={12}
                      required
                      className="mt-1 font-mono text-sm minimal-input"
                    />
                  </div>
                )}

                {/* English Content */}
                {currentLang === 'en' && (
                  <div>
                    <Label htmlFor="content_en" className="text-sm font-semibold text-gray-700">Contract Content (English) *</Label>
                    <Textarea
                      id="content_en"
                      name="content_en"
                      value={formData.content_en}
                      onChange={handleChange}
                      placeholder="Contract text with placeholders: {{LANDLORD_NAME}}, {{SIGNER_NAME}}, etc."
                      rows={12}
                      required
                      className="mt-1 font-mono text-sm minimal-input"
                    />
                  </div>
                )}

                <p className="text-sm text-blue-700 mt-3 font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Все три языка обязательны для публикации в маркет</span>
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="flex-1 neuro-button-primary text-white py-3 flex items-center justify-center gap-2">
                  <Save className="h-5 w-5" />
                  {editingTemplate ? 'Сохранить изменения' : 'Создать шаблон'}
                </button>
                <button type="button" onClick={handleDialogClose} className="neuro-button px-6 py-3">
                  Отмена
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Placeholder Creation Dialog */}
        <Dialog open={showPlaceholderDialog} onOpenChange={setShowPlaceholderDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">✨ Добавить плейсхолдер</DialogTitle>
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

              {/* Language Tabs for Labels */}
              <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50/30">
                <Label className="mb-3 block font-semibold">Метка плейсхолдера (на 3 языках) *</Label>
                
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setPlaceholderLabelLang('ru')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      placeholderLabelLang === 'ru'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    🇷🇺 Русский
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaceholderLabelLang('kk')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      placeholderLabelLang === 'kk'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    🇰🇿 Қазақша
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaceholderLabelLang('en')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      placeholderLabelLang === 'en'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>

                {/* Russian Label */}
                {placeholderLabelLang === 'ru' && (
                  <div>
                    <Input
                      value={currentPlaceholder.label}
                      onChange={(e) => setCurrentPlaceholder({
                        ...currentPlaceholder,
                        label: e.target.value
                      })}
                      placeholder="Сумма аренды"
                      className="mt-1"
                    />
                    <p className="text-xs text-blue-700 mt-2">
                      Будет показано пользователю в форме
                    </p>
                  </div>
                )}

                {/* Kazakh Label */}
                {placeholderLabelLang === 'kk' && (
                  <div>
                    <Input
                      value={currentPlaceholder.label_kk}
                      onChange={(e) => setCurrentPlaceholder({
                        ...currentPlaceholder,
                        label_kk: e.target.value
                      })}
                      placeholder="Жалдау сомасы"
                      className="mt-1"
                    />
                    <p className="text-xs text-blue-700 mt-2">
                      Пайдаланушыға пішінде көрсетіледі
                    </p>
                  </div>
                )}

                {/* English Label */}
                {placeholderLabelLang === 'en' && (
                  <div>
                    <Input
                      value={currentPlaceholder.label_en}
                      onChange={(e) => setCurrentPlaceholder({
                        ...currentPlaceholder,
                        label_en: e.target.value
                      })}
                      placeholder="Rent amount"
                      className="mt-1"
                    />
                    <p className="text-xs text-blue-700 mt-2">
                      Will be shown to user in the form
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>Тип поля *</Label>
                <Select
                  value={currentPlaceholder.type}
                  onValueChange={(value) => setCurrentPlaceholder({
                    ...currentPlaceholder,
                    type: value,
                    isCalculated: value === 'calculated'
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Calculator for calculated fields */}
              {currentPlaceholder.type === 'calculated' && (
                <div className="border-2 border-dashed border-amber-200 rounded-lg p-4 bg-amber-50/50 space-y-3">
                  <Label className="text-sm font-bold text-amber-900">🧮 Настройка формулы</Label>
                  
                  {/* Инструкция по использованию */}
                  <div className="bg-white border border-amber-300 rounded p-3 text-xs space-y-1">
                    <p className="font-semibold text-amber-900">ℹ️ Как работает калькулятор:</p>
                    <p className="text-neutral-700">
                      • Вычисляемые поля автоматически рассчитываются на основе других плейсхолдеров
                    </p>
                    <p className="text-neutral-700">
                      • Калькулятор работает только с полями типа "Число" и "Дата"
                    </p>
                    <p className="text-amber-800 font-medium mt-2">
                      Пример: {'{{'} СУММА_АРЕНДЫ {'}}'} = {'{{'} ЦЕНА_ЗА_ДЕНЬ {'}}'} × {'{{'} КОЛИЧЕСТВО_ДНЕЙ {'}}'}
                    </p>
                  </div>
                  
                  {/* 1. Первый операнд */}
                  <div>
                    <Label className="text-xs font-semibold">1. Первый операнд</Label>
                    <Select
                      value={currentPlaceholder.formula.operand1}
                      onValueChange={(value) => setCurrentPlaceholder({
                        ...currentPlaceholder,
                        formula: { ...currentPlaceholder.formula, operand1: value }
                      })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Выберите плейсхолдер" />
                      </SelectTrigger>
                      <SelectContent>
                        {placeholderOrder
                          .filter(name => {
                            const ph = formData.placeholders[name];
                            // Только number, date и calculated
                            return ph.type === 'number' || ph.type === 'date' || ph.type === 'calculated';
                          })
                          .map((name) => (
                            <SelectItem key={name} value={name}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-500">
                                  {formData.placeholders[name].type === 'date' ? '📅' : 
                                   formData.placeholders[name].type === 'calculated' ? '🧮' : '🔢'}
                                </span>
                                {'{{'}{name}{'}}'} - {formData.placeholders[name].label}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Выберите операцию */}
                  <div>
                    <Label className="text-xs font-semibold">2. Выберите операцию</Label>
                    <Select
                      value={currentPlaceholder.formula.operation}
                      onValueChange={(value) => setCurrentPlaceholder({
                        ...currentPlaceholder,
                        formula: { 
                          ...currentPlaceholder.formula,
                          operation: value
                        }
                      })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CALCULATOR_OPERATIONS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. Второй операнд */}
                  <div>
                    <Label className="text-xs font-semibold">3. Второй операнд</Label>
                    <Select
                      value={currentPlaceholder.formula.operand2}
                      onValueChange={(value) => setCurrentPlaceholder({
                        ...currentPlaceholder,
                        formula: { ...currentPlaceholder.formula, operand2: value }
                      })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Выберите плейсхолдер" />
                      </SelectTrigger>
                      <SelectContent>
                        {placeholderOrder
                          .filter(name => {
                            const ph = formData.placeholders[name];
                            // Только number, date и calculated
                            return ph.type === 'number' || ph.type === 'date' || ph.type === 'calculated';
                          })
                          .map((name) => (
                            <SelectItem key={name} value={name}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-500">
                                  {formData.placeholders[name].type === 'date' ? '📅' : 
                                   formData.placeholders[name].type === 'calculated' ? '🧮' : '🔢'}
                                </span>
                                {'{{'}{name}{'}}'} - {formData.placeholders[name].label}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview */}
                  {currentPlaceholder.formula.operand1 && currentPlaceholder.formula.operand2 && (
                    <div className="bg-white border border-amber-300 rounded p-2 text-xs font-mono">
                      <span className="text-amber-700">Формула:</span>
                      <br />
                      {'{{'}{currentPlaceholder.formula.operand1}{'}}'}
                      {' '}{CALCULATOR_OPERATIONS.find(op => op.value === currentPlaceholder.formula.operation)?.symbol || '+'}{' '}
                      {'{{'}{currentPlaceholder.formula.operand2}{'}}'}
                      {' = '}
                      {'{{'}{currentPlaceholder.name || 'РЕЗУЛЬТАТ'}{'}}'}
                    </div>
                  )}
                </div>
              )}

              {/* Owner - only if NOT calculated */}
              {currentPlaceholder.type !== 'calculated' && (
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
                      <SelectItem value="landlord">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Наймодатель
                        </div>
                      </SelectItem>
                      <SelectItem value="signer">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Наниматель
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Required checkbox - only for non-calculated */}
              {currentPlaceholder.type !== 'calculated' && (
                <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
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
                    <Label htmlFor="required" className="cursor-pointer font-medium">
                      Обязательное поле для наймодателя
                    </Label>
                  </div>
                  <p className="text-xs text-blue-700 ml-6">
                    ℹ️ Если не обязательно для наймодателя, наниматель всё равно должен заполнить
                  </p>
                </div>
              )}

              {/* Секции отображения */}
              <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
                <Label className="text-sm font-semibold mb-3 block text-purple-900">📍 Отображать в секциях:</Label>
                
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
                  <Plus className="mr-2 h-4 w-4" />
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

        {/* Preset Placeholders Dialog */}
        <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">⚡ Быстрая вставка готовых плейсхолдеров</DialogTitle>
              <DialogDescription>
                Выберите готовый плейсхолдер для быстрой вставки в шаблон
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PRESET_PLACEHOLDERS.map((preset) => {
                const isAlreadyAdded = formData.placeholders[preset.name];
                
                return (
                  <div
                    key={preset.name}
                    className={`p-4 text-left border-2 rounded-lg transition-all ${
                      isAlreadyAdded 
                        ? 'border-neutral-200 bg-neutral-50' 
                        : 'border-blue-200 bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-neutral-900">{preset.label}</h3>
                      <div className="flex gap-2">
                        {isAlreadyAdded ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditPreset(preset)}
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Редактировать
                            </Button>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              ✓ Добавлен
                            </span>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              handleInsertPreset(preset);
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            Добавить
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-600 font-mono">
                        {'{{'}{preset.name}{'}}'}
                      </p>
                      
                      <div className="flex gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          preset.type === 'date' ? 'bg-purple-100 text-purple-700' :
                          preset.type === 'number' ? 'bg-blue-100 text-blue-700' :
                          preset.type === 'phone' ? 'bg-green-100 text-green-700' :
                          preset.type === 'email' ? 'bg-orange-100 text-orange-700' :
                          'bg-neutral-100 text-neutral-700'
                        }`}>
                          {preset.type === 'date' ? '📅 Дата' :
                           preset.type === 'number' ? '🔢 Число' :
                           preset.type === 'phone' ? '📞 Телефон' :
                           preset.type === 'email' ? '📧 Email' :
                           '✏️ Текст'}
                        </span>
                        
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          preset.owner === 'landlord' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {preset.owner === 'landlord' ? '🏢 Наймодатель' : '👤 Наниматель'}
                        </span>
                        
                        {preset.required && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                            * Обязательное
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowPresetDialog(false)}
              >
                Закрыть
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Publish Confirmation Popup */}
        {showPublishConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📢</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Подтверждение публикации</h3>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Вы уверены, что хотите {pendingIsEdit ? 'обновить' : 'разместить'} данный договор в маркет?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPublishConfirm(false);
                      setPendingTemplateData(null);
                      setPendingIsEdit(false);
                      setPendingTemplateId(null);
                      setShowDialog(true); // Reopen the main dialog
                    }}
                    className="flex-1 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Назад
                  </button>
                  <button
                    onClick={confirmPublish}
                    className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Да, проверено!
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

export default AdminTemplatesPageNew;
