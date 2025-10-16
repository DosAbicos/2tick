import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { ArrowLeft, Eye, Edit3, Upload, Bold, Italic, Underline, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { IMaskInput } from 'react-imask';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateContractPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');
  
  // Manual editing mode
  const [manualEditMode, setManualEditMode] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [isContentSaved, setIsContentSaved] = useState(false);
  
  // Tenant document upload (optional for landlord to upload)
  const [tenantDocument, setTenantDocument] = useState(null);
  const [tenantDocPreview, setTenantDocPreview] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  // Generate unique contract number
  const generateContractNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${year}${month}${day}-${random}`;
  };

  // Template fields
  const [templateData, setTemplateData] = useState({
    // Contract info
    contract_number: generateContractNumber(),
    contract_date: new Date().toISOString().split('T')[0],
    
    // Landlord (Creator) info
    landlord_name: 'ИП "RentDomik"',
    landlord_representative: '',
    
    // Tenant (Signer) info
    tenant_name: '',
    tenant_phone: '',
    tenant_email: '',
    
    // Property details
    property_address: '',
    
    // Financial terms
    rent_amount: '',
    rent_currency: 'тенге',
    security_deposit: '',
    
    // Dates
    move_in_date: '',
    move_out_date: '',
    
    // Additional terms
    days_count: '0',
    payment_method: 'наличными',
    
    // Contract type
    contract_type: 'rent' // rent, service, purchase
  });

  // Calculate days automatically
  const calculateDays = (moveIn, moveOut) => {
    if (!moveIn || !moveOut) return 0;
    
    // Parse dates and set times: check-in at 14:00, check-out at 12:00
    const checkInDate = new Date(moveIn);
    checkInDate.setHours(14, 0, 0, 0);
    
    const checkOutDate = new Date(moveOut);
    checkOutDate.setHours(12, 0, 0, 0);
    
    // Calculate difference in milliseconds
    const diffMs = checkOutDate - checkInDate;
    
    // Convert to days (1 day = 24 hours = 86400000 ms)
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return days > 0 ? days : 0;
  };

  const handleFieldChange = (field, value) => {
    setTemplateData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate days when dates change
      if (field === 'move_in_date' || field === 'move_out_date') {
        newData.days_count = calculateDays(
          field === 'move_in_date' ? value : prev.move_in_date,
          field === 'move_out_date' ? value : prev.move_out_date
        ).toString();
      }
      
      return newData;
    });
  };

  const editorRef = useRef(null);

  const loadLastTemplate = () => {
    try {
      const savedTemplate = localStorage.getItem('signify_last_template');
      if (!savedTemplate) {
        toast.info('Нет сохраненного шаблона');
        return;
      }
      
      const template = JSON.parse(savedTemplate);
      
      // Restore template data (excluding contract_number and contract_date)
      setTemplateData(prev => ({
        ...prev,
        landlord_name: template.landlord_name || prev.landlord_name,
        landlord_representative: template.landlord_representative || prev.landlord_representative,
        tenant_name: template.tenant_name || '',
        tenant_phone: template.tenant_phone || '',
        tenant_email: template.tenant_email || '',
        property_address: template.property_address || prev.property_address,
        rent_amount: template.rent_amount || prev.rent_amount,
        rent_currency: template.rent_currency || prev.rent_currency,
        security_deposit: template.security_deposit || prev.security_deposit,
        move_in_date: template.move_in_date || prev.move_in_date,
        move_out_date: template.move_out_date || prev.move_out_date,
        days_count: template.days_count || prev.days_count,
        payment_method: template.payment_method || prev.payment_method,
        contract_type: template.contract_type || prev.contract_type
      }));
      
      // Restore saved content if exists
      if (template.isContentSaved && template.savedContent) {
        setManualContent(template.savedContent);
        setIsContentSaved(true);
      }
      
      const savedDate = new Date(template.savedAt).toLocaleString('ru-RU');
      toast.success(`Шаблон загружен (сохранен ${savedDate})`);
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Ошибка при загрузке шаблона');
    }
  };

  const toggleEditMode = () => {
    if (!manualEditMode) {
      // If content was already saved, use it; otherwise generate new
      if (!isContentSaved) {
        const content = generateContractContent();
        // Просто конвертируем переносы строк в <br>, БЕЗ подсветки
        setManualContent(content.replace(/\n/g, '<br>'));
      }
      // Если isContentSaved = true, manualContent уже содержит сохраненный контент
    }
    setManualEditMode(!manualEditMode);
  };

  const handleSaveContent = () => {
    if (editorRef.current) {
      const savedContent = editorRef.current.innerHTML;
      setManualContent(savedContent);
      setIsContentSaved(true);
      toast.success('Изменения сохранены! Теперь можете вернуться к форме.');
    }
  };

  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const changeFontSize = (size) => {
    document.execCommand('fontSize', '7');
    const fontElements = editorRef.current?.querySelectorAll('font[size="7"]');
    fontElements?.forEach(el => {
      el.removeAttribute('size');
      el.style.fontSize = size;
    });
  };

  const handleTenantDocUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setTenantDocument(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setTenantDocPreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    toast.success('Документ клиента выбран');
  };

  const generateContractContent = () => {
    const { 
      contract_number, 
      contract_date,
      landlord_name,
      landlord_representative,
      tenant_name,
      property_address,
      rent_amount,
      rent_currency,
      security_deposit,
      move_in_date,
      move_out_date,
      days_count,
      payment_method
    } = templateData;

    return `ДОГОВОР КРАТКОСРОЧНОГО НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ № ${contract_number}

${contract_date}

Мы, нижеподписавшиеся, ${landlord_name}, именуемый в дальнейшем «Наймодатель», с одной стороны, и гражданин ${tenant_name || '[ФИО Нанимателя]'} (ОКПО трлнатт.ндт), именуемый в дальнейшем «Наниматель», с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:

1. Предмет Договора

1.1. Наймодатель предоставляет, а Наниматель принимает во временное платное пользование жилое помещение по адресу: ${property_address || '[Адрес квартиры]'}.

1.2. Жилое помещение передается в найм на срок с ${move_in_date || '[Дата заселения]'} по ${move_out_date || '[Дата выселения]'}, что составляет ${days_count || '[Количество суток]'} суток.

Дата заселения: с 14:00, ${move_in_date || '[Дата заселения]'}
Дата выселения: до 12:00, ${move_out_date || '[Дата выселения]'}

1.3. Право распоряжаться и пользоваться жилым помещением подтверждается следующими документами: Договор долевременного управления.

1.4. Помимо Нанимателя в жилом помещении будет проживать: ${days_count || '[Кто еще будет проживать]'}.

2. Плата за найм

2.1. За пользование жилым помещением устанавливается плата в размере ${rent_amount || '[Цена в сутки]'} ${rent_currency} в сутки.

2.2. При бронировании вносится предоплата за бронь в размере ${security_deposit || '[Оплачено]'}.

2.3. Полная стоимость за указанные даты - ${rent_amount ? (parseInt(rent_amount) * parseInt(days_count || 1)) : '[Полная стоимость]'} ${rent_currency}. Данная сумма уплачивается Нанимателем и полном объеме при заселении в жилое помещение или заранее безналичным способом.

2.4. При въезде вносится обеспечительный платёж в размере ${security_deposit || '[Обеспечительный депозит]'}, за сохранность имущества и полном объеме при выселении. Данный платёж возвращается в полном объеме при выселении.

2.5. Для целей настоящего Договора исчисление каждых суток найма начинается с 14.30, в случае более позднего заселения со дня и часа заселения. Неполные сутки найма, образовавшиеся в случае заселения позднее 14.30 или выселения ранее 12.00, оплачиваются пропорционально времени фактического проживания, но не менее 50% суточной платы за найм увеличивается согласно тарифа.

2.6. В состав платы за найм расходов Наймодателя по оплате коммунальных услуг.

2.7. В случае досрочного расторжения, ранее оговоренных сроков найма жилого помещения, сумма арендной платы по согласованию сторон может быть пересчитана без объяснения причин, оплаченные денежные средства за проживание не возвращаются.

3. Права и обязанности сторон

3.1. Права и обязанности Наймодателя:

3.1.1. Наймодатель обязуется предоставить Нанимателю пользование жилым помещением вместе с мебелью, необходимой бытовой техникой, посудой, кухонными принадлежностями и постельным бельем.

3.1.2. Передать Нанимателю полный комплект ключей от жилого помещения, подъезда и этажа, и в случае если таковой утерян или оставлен внутри помещения без возможности открыть снаружи.

3.1.3. Устранить в жилом помещении поломки, аварии и неисправности, произошедшие не по вине Нанимателя.

3.1.4. Наймодатель имеет право осуществлять проверку порядка использования Нанимателем жилого помещения без согласования с Нанимателем.

3.2. Права и обязанности Нанимателя:

3.2.1. Наниматель вправе пользоваться жилым помещением, мебелью, бытовой техникой, нарушать права и интересов соседей, а также поддерживать жилое помещение в состоянии.

3.2.2. Бережно относиться к имуществу Наймодателя, находящемуся в жилом помещении.

3.2.3. При досрочном прекращении Договора досрочно Наймодателю полученный комплект ключей.

3.2.4. При выселении жилого помещения в состояние, в котором оно было на момент вселения, за исключением нормального износа. В случае малой соседей, жилое помещение подлежит санитарной уборке силами Нанимателя. Перед отъездом следует выселение без возврата в случае ненадлежащего состояния жилого помещения.

3.2.5. В случае, если Нанимателем запрещено проведение шумных мероприятий. В случае жалоб соседей, следует выселение без возврата.

3.2.6. Запрещено проживание в жилом помещении лиц, не указанных в настоящем Договоре. В случае нарушения этого правила, следует выселение без возврата.

3.2.7. Запрещено курение в жилом помещении. В случае выявления запрещается арендаторские средства.

4. Порядок передачи и возврата жилого помещения

4.1. При передаче жилого помещения техническое и внешнее состояние предмета осуществляется осмотр посредством приема-передачи жилого помещения на момент передачи написаны претензии. Прием жилого помещения осуществляется Нанимателем лично, посредством электронной почты или через Ватсап в течении 2 часов после заселения.

4.2. При выселении жилого помещения Наниматель должен вернуть его в состоянии, в котором он получил, за исключением нормального износа. Санитарное состояние жилого помещения должно быть удовлетворительным.

5. Ответственность Сторон

5.1. За неисполнение или ненадлежащее исполнение обязательств по настоящему Договору Стороны несут ответственность в соответствии с законодательством.

6. Прочие условия

6.1. Настоящий Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из Сторон.

6.2. Споры по настоящему Договору разрешаются путем переговоров, а при недостижении согласия — в судебном порядке.

7. Реквизиты и подписи Сторон

Наймодатель: ${landlord_name}
Представитель: ${landlord_representative || '[Представитель]'}

Наниматель: ${tenant_name || '[ФИО]'}
Телефон: ${templateData.tenant_phone || '[Телефон]'}
Email: ${templateData.tenant_email || '[Email]'}

Подписи:

Наймодатель: _____________
Наниматель: _____________

Дата: ${contract_date}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Use saved content if available, otherwise generate from form
      let contentToSave = isContentSaved ? manualContent : generateContractContent();
      
      // Store metadata about whether content is HTML or plain text
      const isHtmlContent = isContentSaved && manualContent.includes('<');
      
      const contractData = {
        title: `Договор № ${templateData.contract_number} от ${templateData.contract_date}`,
        content: contentToSave,
        content_type: isHtmlContent ? 'html' : 'plain', // Add metadata
        signer_name: templateData.tenant_name,
        signer_phone: templateData.tenant_phone,
        signer_email: templateData.tenant_email,
        move_in_date: templateData.move_in_date,
        move_out_date: templateData.move_out_date,
        property_address: templateData.property_address,
        rent_amount: templateData.rent_amount,
        days_count: templateData.days_count,
        amount: templateData.rent_amount ? `${parseInt(templateData.rent_amount) * parseInt(templateData.days_count || 1)} ${templateData.rent_currency}` : undefined
      };
      
      const response = await axios.post(`${API}/contracts`, contractData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const contractId = response.data.id;
      
      // Save template to localStorage for future use
      const templateToSave = {
        ...templateData,
        savedContent: isContentSaved ? manualContent : null,
        isContentSaved: isContentSaved,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('signify_last_template', JSON.stringify(templateToSave));
      
      // Upload tenant document if selected (optional)
      if (tenantDocument) {
        setUploadingDoc(true);
        const formData = new FormData();
        formData.append('file', tenantDocument);
        
        try {
          await axios.post(`${API}/sign/${contractId}/upload-document`, formData);
          toast.success('Договор и документ клиента успешно созданы');
        } catch (docError) {
          console.error('Document upload error:', docError);
          toast.warning('Договор создан, но документ клиента не загружен');
        } finally {
          setUploadingDoc(false);
        }
      } else {
        toast.success(t('common.success'));
      }
      
      navigate(`/contracts/${contractId}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900">{t('contract.create.title')}</h1>
          <p className="text-neutral-600 mt-2">Заполните поля справа, договор автоматически обновится слева</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Contract Preview */}
          <Card className="lg:sticky lg:top-4 h-fit" data-testid="contract-preview-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {manualEditMode ? 'Редактировать договор' : 'Предпросмотр договора'}
                {isContentSaved && !manualEditMode && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">✓ Отредактировано</span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {manualEditMode && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleSaveContent}
                  >
                    Сохранить
                  </Button>
                )}
                <Button
                  type="button"
                  variant={manualEditMode ? "outline" : "outline"}
                  size="sm"
                  onClick={toggleEditMode}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  {manualEditMode ? 'Вернуться к форме' : 'Редактировать вручную'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {manualEditMode ? (
                <div className="editor-container">
                  {/* Toolbar */}
                  <div className="bg-gray-50 border border-gray-300 rounded-t-lg p-2 flex flex-wrap gap-1 items-center">
                    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }} className="h-8 w-8 p-0" title="Жирный"><Bold className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }} className="h-8 w-8 p-0" title="Курсив"><Italic className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }} className="h-8 w-8 p-0" title="Подчеркнутый"><Underline className="h-4 w-4" /></Button>
                    
                    <div className="w-px bg-gray-300 mx-1" />
                    
                    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<h1>'); }} className="h-8 px-2" title="Заголовок 1">H1</Button>
                    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<h2>'); }} className="h-8 px-2" title="Заголовок 2">H2</Button>
                    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<h3>'); }} className="h-8 px-2" title="Заголовок 3">H3</Button>
                    
                    <div className="w-px bg-gray-300 mx-1" />
                    
                    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); executeCommand('justifyLeft'); }} className="h-8 w-8 p-0" title="По левому краю"><AlignLeft className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); executeCommand('justifyCenter'); }} className="h-8 w-8 p-0" title="По центру"><AlignCenter className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); executeCommand('justifyRight'); }} className="h-8 w-8 p-0" title="По правому краю"><AlignRight className="h-4 w-4" /></Button>
                    
                    <div className="w-px bg-gray-300 mx-1" />
                    
                    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }} className="h-8 px-2" title="Маркированный список">• Список</Button>
                    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }} className="h-8 px-2" title="Нумерованный список">1. Список</Button>
                    
                    <div className="w-px bg-gray-300 mx-1" />
                    
                    <select onChange={(e) => changeFontSize(e.target.value)} className="h-8 px-2 border rounded text-sm" defaultValue="14px">
                      <option value="12px">Маленький</option>
                      <option value="14px">Обычный</option>
                      <option value="16px">Большой</option>
                      <option value="18px">Огромный</option>
                    </select>
                  </div>
                  
                  {/* Editor */}
                  <div
                    ref={editorRef}
                    contentEditable
                    dangerouslySetInnerHTML={{ __html: manualContent }}
                    suppressContentEditableWarning
                    key={manualContent}
                    onBlur={(e) => setManualContent(e.currentTarget.innerHTML)}
                    className="min-h-[700px] p-4 border border-t-0 border-gray-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      fontFamily: 'IBM Plex Sans, sans-serif',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      overflowY: 'auto'
                    }}
                  />
                  
                  {/* Legend */}
                  <div className="mt-3 text-xs text-neutral-600 flex gap-3 p-3 bg-neutral-50 rounded border">
                    <span className="font-semibold">Переменные подсвечены:</span>
                    <span className="bg-yellow-50 border border-yellow-200 px-2 py-1 rounded">[ФИО]</span>
                    <span className="bg-blue-50 border border-blue-200 px-2 py-1 rounded">[Телефон]</span>
                    <span className="bg-green-50 border border-green-200 px-2 py-1 rounded">[Email]</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white border rounded-lg p-6 max-h-[800px] overflow-y-auto" data-testid="contract-preview">
                  {isContentSaved ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      style={{
                        fontFamily: 'IBM Plex Sans, sans-serif',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}
                      dangerouslySetInnerHTML={{ __html: manualContent }}
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-xs font-['IBM_Plex_Sans'] leading-relaxed text-neutral-800">
                        {generateContractContent()}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Form Fields */}
          <Card data-testid="contract-form-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Заполните данные
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-contract-form">
                {/* Contract Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-900 border-b pb-2">Информация о договоре</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contract_number">Номер договора *</Label>
                      <Input
                        id="contract_number"
                        value={templateData.contract_number}
                        onChange={(e) => handleFieldChange('contract_number', e.target.value)}
                        required
                        data-testid="contract-number-input"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contract_date">Дата договора *</Label>
                      <Input
                        id="contract_date"
                        type="date"
                        value={templateData.contract_date}
                        onChange={(e) => handleFieldChange('contract_date', e.target.value)}
                        required
                        data-testid="contract-date-input"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Landlord Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-900 border-b pb-2">Наймодатель (Вы)</h3>
                  <div>
                    <Label htmlFor="landlord_name">Наименование *</Label>
                    <Input
                      id="landlord_name"
                      value={templateData.landlord_name}
                      onChange={(e) => handleFieldChange('landlord_name', e.target.value)}
                      required
                      data-testid="landlord-name-input"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="landlord_representative">Представитель</Label>
                    <Input
                      id="landlord_representative"
                      value={templateData.landlord_representative}
                      onChange={(e) => handleFieldChange('landlord_representative', e.target.value)}
                      data-testid="landlord-rep-input"
                      className="mt-1"
                      placeholder="ФИО представителя"
                    />
                  </div>
                </div>

                {/* Tenant Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-900 border-b pb-2">Наниматель (Клиент)</h3>
                  <p className="text-xs text-neutral-500 -mt-2">Если не заполните, клиент заполнит сам при подписании</p>
                  
                  <div>
                    <Label htmlFor="tenant_name">ФИО нанимателя</Label>
                    <Input
                      id="tenant_name"
                      value={templateData.tenant_name}
                      onChange={(e) => handleFieldChange('tenant_name', e.target.value)}
                      data-testid="tenant-name-input"
                      className="mt-1"
                      placeholder="Оставьте пустым, если клиент заполнит сам"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tenant_phone">Телефон</Label>
                      <IMaskInput
                        mask="+7 (000) 000-00-00"
                        value={templateData.tenant_phone}
                        onAccept={(value) => handleFieldChange('tenant_phone', value)}
                        placeholder="+7 (___) ___-__-__"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                        id="tenant_phone"
                        type="tel"
                        data-testid="tenant-phone-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tenant_email">Email</Label>
                      <Input
                        id="tenant_email"
                        type="email"
                        value={templateData.tenant_email}
                        onChange={(e) => handleFieldChange('tenant_email', e.target.value)}
                        data-testid="tenant-email-input"
                        className="mt-1"
                        placeholder="Опционально"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Удостоверение личности клиента (опционально)</Label>
                    <p className="text-xs text-neutral-500 mb-2">Если есть документ клиента, можете загрузить. Иначе клиент загрузит сам.</p>
                    {tenantDocPreview && (
                      <div className="mt-2 mb-3">
                        <img
                          src={tenantDocPreview}
                          alt="Tenant document preview"
                          className="max-w-xs rounded border shadow-sm"
                        />
                      </div>
                    )}
                    <Label htmlFor="tenant_doc" className="cursor-pointer">
                      <Button type="button" variant="outline" className="w-full" asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          {tenantDocument ? 'Изменить документ клиента' : 'Загрузить документ клиента'}
                        </span>
                      </Button>
                      <Input
                        id="tenant_doc"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleTenantDocUpload}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-xs text-neutral-500 mt-1">Поддерживаются: JPEG, PNG, PDF</p>
                  </div>
                </div>

                {/* Property Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-900 border-b pb-2">Описание и адрес квартиры</h3>
                  <div>
                    <Label htmlFor="property_address">Адрес квартиры *</Label>
                    <Input
                      id="property_address"
                      value={templateData.property_address}
                      onChange={(e) => handleFieldChange('property_address', e.target.value)}
                      required
                      data-testid="property-address-input"
                      className="mt-1"
                      placeholder="г. Алматы, ул. ..."
                    />
                  </div>
                </div>

                {/* Financial Terms */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-900 border-b pb-2">Финансовые условия</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rent_amount">Цена в сутки *</Label>
                      <Input
                        id="rent_amount"
                        type="number"
                        value={templateData.rent_amount}
                        onChange={(e) => handleFieldChange('rent_amount', e.target.value)}
                        required
                        data-testid="rent-amount-input"
                        className="mt-1"
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="security_deposit">Обеспечительный депозит</Label>
                      <Input
                        id="security_deposit"
                        type="number"
                        value={templateData.security_deposit}
                        onChange={(e) => handleFieldChange('security_deposit', e.target.value)}
                        data-testid="security-deposit-input"
                        className="mt-1"
                        placeholder="5000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="days_count">Количество суток (рассчитывается автоматически)</Label>
                    <Input
                      id="days_count"
                      type="number"
                      value={templateData.days_count}
                      readOnly
                      disabled
                      data-testid="days-count-input"
                      className="mt-1 bg-neutral-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-neutral-500 mt-1">С 14:00 даты заселения до 12:00 даты выселения</p>
                  </div>
                  {templateData.rent_amount && templateData.days_count && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900">
                        <strong>Полная стоимость:</strong> {parseInt(templateData.rent_amount) * parseInt(templateData.days_count)} {templateData.rent_currency}
                      </p>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-900 border-b pb-2">Даты заселения и выселения</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="move_in_date">Дата заселения *</Label>
                      <Input
                        id="move_in_date"
                        type="date"
                        value={templateData.move_in_date}
                        onChange={(e) => handleFieldChange('move_in_date', e.target.value)}
                        required
                        data-testid="move-in-date-input"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="move_out_date">Дата выселения *</Label>
                      <Input
                        id="move_out_date"
                        type="date"
                        value={templateData.move_out_date}
                        onChange={(e) => handleFieldChange('move_out_date', e.target.value)}
                        required
                        data-testid="move-out-date-input"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={loading}
                    data-testid="save-contract-button"
                    className="flex-1"
                  >
                    {loading ? t('common.loading') : 'Сохранить договор'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    data-testid="cancel-button"
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateContractPage;