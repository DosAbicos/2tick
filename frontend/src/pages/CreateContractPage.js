import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateContractPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template_id');
  
  const [loading, setLoading] = useState(false);
  const storedTemplateId = sessionStorage.getItem('selectedTemplateId');
  const hasTemplateId = templateId || storedTemplateId;
  const [loadingTemplate, setLoadingTemplate] = useState(!!hasTemplateId); // true if template should be loaded
  const token = localStorage.getItem('token');
  
  // Template data from marketplace
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [placeholderValues, setPlaceholderValues] = useState({});
  
  // Ref to track if template is being loaded to prevent duplicate loads
  const loadingTemplateRef = useRef(false);
  
  // Next contract number (for display)
  const [nextContractNumber, setNextContractNumber] = useState(null);
  
  // Manual editing mode
  const [manualEditMode, setManualEditMode] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [isContentSaved, setIsContentSaved] = useState(false);
  
  // Optional fields visibility
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  
  // Tenant document upload (optional for landlord to upload)
  const [tenantDocument, setTenantDocument] = useState(null);
  const [tenantDocPreview, setTenantDocPreview] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  // Template fields - initialized as empty, will be populated from selected template
  const [templateData, setTemplateData] = useState({
    contract_date: new Date().toISOString().split('T')[0],
    
    // Contract type
    contract_type: 'rent', // rent, service, purchase
    
    // Party roles
    party_a_role: 'Сторона А',
    party_b_role: 'Сторона Б'
  });
  
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

  // Load next contract number on mount
  useEffect(() => {
    const fetchNextContractNumber = async () => {
      try {
        const response = await axios.get(`${API}/contracts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const contractCount = response.data.length;
        const nextNumber = `0${contractCount + 1}`;
        setNextContractNumber(nextNumber);
      } catch (error) {
        console.error('Error fetching contract count:', error);
      }
    };
    
    fetchNextContractNumber();

    // Load template if template_id is provided (from URL or sessionStorage)
    const storedTemplateId = sessionStorage.getItem('selectedTemplateId');
    const templateIdToLoad = templateId || storedTemplateId;
    
    if (templateIdToLoad) {
      loadTemplateFromMarket(templateIdToLoad);
      // Save to sessionStorage for page refresh
      if (templateId) {
        sessionStorage.setItem('selectedTemplateId', templateId);
      }
    }
  }, [templateId]);
 

  const loadTemplateFromMarket = async (id) => {
    // Prevent double loading using ref
    if (loadingTemplateRef.current || (selectedTemplate && selectedTemplate.id === id)) {
      return;
    }
    
    loadingTemplateRef.current = true;
    setLoadingTemplate(true);
    try {
      const response = await axios.get(`${API}/templates/${id}`);
      const template = response.data;
      
      setSelectedTemplate(template);
      setManualContent(template.content || '');
      
      // Initialize placeholder values
      const initialValues = {};
      if (template.placeholders) {
        Object.keys(template.placeholders).forEach(key => {
          initialValues[key] = '';
        });
      }
      setPlaceholderValues(initialValues);
      
      toast.success(`Шаблон "${template.title}" загружен`);
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Ошибка загрузки шаблона');
    } finally {
      setLoadingTemplate(false);
      loadingTemplateRef.current = false;
    }
  };

  const toggleEditMode = () => {
    if (!manualEditMode) {
      // If content was already saved, use it; otherwise generate new WITHOUT highlighting
      if (!isContentSaved) {
        // Generate content without HTML highlighting for editing
        let content = selectedTemplate.content;
        
        if (selectedTemplate.placeholders) {
          Object.entries(selectedTemplate.placeholders).forEach(([key, config]) => {
            let value = placeholderValues[key] || `[${config.label}]`;
            
            // Format dates
            if (config.type === 'date' && placeholderValues[key]) {
              value = formatDateToDDMMYYYY(placeholderValues[key]);
            }
            
            const regex = new RegExp(`{{${key}}}`, 'g');
            
            // For calculated fields
            if (config.type === 'calculated' && config.formula) {
              const { operand1, operation, operand2 } = config.formula;
              let result = 0;
              
              if (operation === 'days_between') {
                if (placeholderValues[operand1] && placeholderValues[operand2]) {
                  const date1 = new Date(placeholderValues[operand1]);
                  const date2 = new Date(placeholderValues[operand2]);
                  const diffTime = Math.abs(date2 - date1);
                  result = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
              } else {
                const val1 = parseFloat(placeholderValues[operand1]) || 0;
                const val2 = parseFloat(placeholderValues[operand2]) || 0;
                
                switch(operation) {
                  case 'add': result = val1 + val2; break;
                  case 'subtract': result = val1 - val2; break;
                  case 'multiply': result = val1 * val2; break;
                  case 'divide': result = val2 !== 0 ? val1 / val2 : 0; break;
                  case 'modulo': result = val2 !== 0 ? val1 % val2 : 0; break;
                  default: result = 0;
                }
              }
              
              content = content.replace(regex, result.toString() || `[${config.label}]`);
            } else {
              content = content.replace(regex, value);
            }
          });
        }
        
        // Convert newlines to <br> for contentEditable
        const editableContent = content.replace(/\n/g, '<br>');
        setManualContent(editableContent);
      }
    }
    setManualEditMode(!manualEditMode);
  };

  const handleSaveContent = () => {
    if (editorRef.current) {
      let savedContent = editorRef.current.innerHTML;
      
      // Convert filled values back to placeholders for continued editing
      if (selectedTemplate?.placeholders) {
        Object.entries(selectedTemplate.placeholders).forEach(([key, config]) => {
          let currentValue = placeholderValues[key];
          
          if (currentValue) {
            // Format dates
            if (config.type === 'date' && currentValue) {
              currentValue = formatDateToDDMMYYYY(currentValue);
            }
            
            // Escape special regex characters in the value
            const escapedValue = currentValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const valueRegex = new RegExp(escapedValue, 'g');
            
            // Replace the actual values back with placeholder syntax
            savedContent = savedContent.replace(valueRegex, `{{${key}}}`);
          }
          
          // Also handle cases where placeholder label is shown
          const labelRegex = new RegExp(`\\[${config.label}\\]`, 'g');
          savedContent = savedContent.replace(labelRegex, `{{${key}}}`);
        });
      }
      
      // Save the template with placeholders
      setManualContent(savedContent);
      setIsContentSaved(true);
      setManualEditMode(false);
      toast.success('Изменения сохранены! Плейсхолдеры продолжают работать.');
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


  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const generatePreviewContent = () => {
    // Use edited content if available, otherwise use template content
    if (selectedTemplate) {
      let content = isContentSaved ? manualContent : selectedTemplate.content;
      
      // IMPORTANT: Convert newlines to <br> for HTML display to preserve formatting
      if (!isContentSaved) {
        content = content.replace(/\n/g, '<br>');
      }
      
      // Replace placeholders with actual values
      if (selectedTemplate.placeholders) {
        Object.entries(selectedTemplate.placeholders).forEach(([key, config]) => {
          let value = placeholderValues[key] || `[${config.label}]`;
          let isFilled = !!placeholderValues[key];
          
          // Format dates to DD.MM.YYYY
          if (config.type === 'date' && placeholderValues[key]) {
            value = formatDateToDDMMYYYY(placeholderValues[key]);
          }
          
          const regex = new RegExp(`{{${key}}}`, 'g');
          
          // For calculated fields, compute the value
          if (config.type === 'calculated' && config.formula) {
            const { operand1, operation, operand2 } = config.formula;
            
            let result = 0;
            
            if (operation === 'days_between') {
              // Date calculation
              if (placeholderValues[operand1] && placeholderValues[operand2]) {
                const date1 = new Date(placeholderValues[operand1]);
                const date2 = new Date(placeholderValues[operand2]);
                const diffTime = Math.abs(date2 - date1);
                result = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                isFilled = true;
              }
            } else {
              // Numerical calculation
              const val1 = parseFloat(placeholderValues[operand1]) || 0;
              const val2 = parseFloat(placeholderValues[operand2]) || 0;
              
              switch(operation) {
                case 'add': result = val1 + val2; break;
                case 'subtract': result = val1 - val2; break;
                case 'multiply': result = val1 * val2; break;
                case 'divide': result = val2 !== 0 ? val1 / val2 : 0; break;
                case 'modulo': result = val2 !== 0 ? val1 % val2 : 0; break;
                default: result = 0;
              }
              isFilled = val1 > 0 || val2 > 0;
            }
            
            const displayValue = result.toString() || `[${config.label}]`;
            const highlightClass = isFilled 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-amber-50 border-amber-200 text-amber-700';
            content = content.replace(regex, `<span class="inline-block px-2 py-0.5 rounded-md border ${highlightClass} font-medium transition-all duration-300 shadow-sm">${displayValue}</span>`);
          } else {
            // Highlight filled vs unfilled placeholders
            const highlightClass = isFilled 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-amber-50 border-amber-200 text-amber-700';
            content = content.replace(regex, `<span class="inline-block px-2 py-0.5 rounded-md border ${highlightClass} font-medium transition-all duration-300 shadow-sm">${value}</span>`);
          }
        });
      }
      
      return content;
    }
    
    // Fallback to old template generation
    return generateContractContent();
  };

  const generateContractContent = () => {
    const { 
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

    return `ДОГОВОР КРАТКОСРОЧНОГО НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ

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
      let contentToSave = isContentSaved ? manualContent : (selectedTemplate ? selectedTemplate.content : generateContractContent());
      
      // Replace placeholders with actual values
      if (selectedTemplate && placeholderValues) {
        // First replace regular placeholders
        Object.entries(selectedTemplate.placeholders || {}).forEach(([key, config]) => {
          if (config.type !== 'calculated') {
            let value = placeholderValues[key] || `[${config.label}]`;
            
            // Format dates to DD.MM.YYYY
            if (config.type === 'date' && placeholderValues[key]) {
              value = formatDateToDDMMYYYY(placeholderValues[key]);
            }
            
            const regex = new RegExp(`{{${key}}}`, 'g');
            contentToSave = contentToSave.replace(regex, value);
          }
        });
        
        // Calculate computed fields
        if (selectedTemplate.placeholders) {
          Object.entries(selectedTemplate.placeholders).forEach(([key, config]) => {
            if (config.type === 'calculated' && config.formula) {
              const { operand1, operation, operand2 } = config.formula;
              
              let result = 0;
              
              if (operation === 'days_between') {
                // Date calculation
                if (placeholderValues[operand1] && placeholderValues[operand2]) {
                  const date1 = new Date(placeholderValues[operand1]);
                  const date2 = new Date(placeholderValues[operand2]);
                  const diffTime = Math.abs(date2 - date1);
                  result = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
              } else {
                // Numerical calculation
                const val1 = parseFloat(placeholderValues[operand1]) || 0;
                const val2 = parseFloat(placeholderValues[operand2]) || 0;
                
                switch(operation) {
                  case 'add': result = val1 + val2; break;
                  case 'subtract': result = val1 - val2; break;
                  case 'multiply': result = val1 * val2; break;
                  case 'divide': result = val2 !== 0 ? val1 / val2 : 0; break;
                  case 'modulo': result = val2 !== 0 ? val1 % val2 : 0; break;
                  default: result = 0;
                }
              }
              
              const regex = new RegExp(`{{${key}}}`, 'g');
              contentToSave = contentToSave.replace(regex, result.toString());
            }
          });
        }
      }
      
      // Clean HTML tags from content for plain text storage
      // Convert <br> to newlines and remove other HTML tags
      contentToSave = contentToSave
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<div>/gi, '\n')
        .replace(/<\/div>/gi, '')
        .replace(/<p>/gi, '')
        .replace(/<\/p>/gi, '\n')
        .replace(/<h2>/gi, '\n')
        .replace(/<\/h2>/gi, '\n')
        .replace(/<h3>/gi, '\n')
        .replace(/<\/h3>/gi, '\n')
        .replace(/<b>/gi, '')
        .replace(/<\/b>/gi, '')
        .replace(/<strong>/gi, '')
        .replace(/<\/strong>/gi, '')
        .replace(/<i>/gi, '')
        .replace(/<\/i>/gi, '')
        .replace(/<em>/gi, '')
        .replace(/<\/em>/gi, '')
        .replace(/<u>/gi, '')
        .replace(/<\/u>/gi, '')
        .replace(/<ul>/gi, '\n')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<span[^>]*>/gi, '')
        .replace(/<\/span>/gi, '');
      
      // Store as plain text
      const isHtmlContent = false;
      
      // Extract tenant info from placeholders or templateData
      let signerName = templateData.tenant_name;
      let signerPhone = templateData.tenant_phone;
      let signerEmail = templateData.tenant_email;
      
      if (selectedTemplate && selectedTemplate.placeholders) {
        // Try to find tenant info in placeholders
        Object.entries(selectedTemplate.placeholders).forEach(([key, config]) => {
          const value = placeholderValues[key];
          if (config.type === 'text' && (key.toLowerCase().includes('tenant') || key.toLowerCase().includes('наниматель'))) {
            signerName = value || signerName;
          } else if (config.type === 'phone') {
            signerPhone = value || signerPhone;
          } else if (config.type === 'email') {
            signerEmail = value || signerEmail;
          }
        });
      }
      
      const contractData = {
        title: selectedTemplate ? selectedTemplate.title : `Договор от ${templateData.contract_date}`,
        content: contentToSave,
        content_type: selectedTemplate ? selectedTemplate.content_type : (isHtmlContent ? 'html' : 'plain'),
        source_type: selectedTemplate ? 'template' : 'manual',
        template_id: selectedTemplate ? selectedTemplate.id : undefined,
        placeholder_values: selectedTemplate ? placeholderValues : undefined,
        signer_name: signerName || '',
        signer_phone: signerPhone || '',
        signer_email: signerEmail || '',
        move_in_date: templateData.move_in_date,
        move_out_date: templateData.move_out_date,
        property_address: templateData.property_address,
        rent_amount: templateData.rent_amount,
        days_count: templateData.days_count,
        amount: templateData.rent_amount ? `${parseInt(templateData.rent_amount) * parseInt(templateData.days_count || 1)} ${templateData.rent_currency}` : undefined,
        party_a_role: templateData.party_a_role || 'Сторона А',
        party_b_role: templateData.party_b_role || 'Сторона Б'
      };
      
      const response = await axios.post(`${API}/contracts`, contractData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const contractId = response.data.id;
      const contractNumber = response.data.contract_number;  // Get contract number from backend
      
      // If contract has placeholder_values, update it to replace placeholders in content
      if (selectedTemplate && placeholderValues && Object.keys(placeholderValues).length > 0) {
        await axios.put(`${API}/contracts/${contractId}`, 
          { placeholder_values: placeholderValues },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      // Update contract title with proper contract number from backend
      if (contractNumber) {
        await axios.put(`${API}/contracts/${contractId}`, 
          { title: `Договор № ${contractNumber} от ${templateData.contract_date}` },
          { headers: { Authorization: `Bearer ${token}` }}
        );
      }
      
      // Save template to localStorage for future use
      const templateToSave = {
        ...templateData,
        savedContent: isContentSaved ? manualContent : null,
        isContentSaved: isContentSaved,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('2tick_last_template', JSON.stringify(templateToSave));
      
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
      
      // Clear stored template ID
      sessionStorage.removeItem('selectedTemplateId');
      navigate(`/contracts/${contractId}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button
          onClick={() => {
            sessionStorage.removeItem('selectedTemplateId');
            navigate('/dashboard');
          }}
          className="mb-6 px-4 py-2 text-gray-600 hover:text-blue-600 flex items-center gap-2 transition-colors"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>
        
        <div className="minimal-card p-6 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {selectedTemplate ? selectedTemplate.title : 'Создать договор'}
            </h1>
            <p className="text-sm text-gray-500">
              {loadingTemplate ? 'Загрузка шаблона...' : 'Заполните данные справа, договор обновится слева'}
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        {selectedTemplate ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Preview */}
            <div className="minimal-card lg:sticky lg:top-4 h-fit">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {manualEditMode ? 'Редактирование' : 'Предпросмотр'}
                  {isContentSaved && !manualEditMode && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium">✓ Изменено</span>
                  )}
                </h3>
                <div className="flex gap-2">
                  {!manualEditMode ? (
                    <button
                      type="button"
                      onClick={toggleEditMode}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Редактировать
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveContent}
                      className="px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-lg hover:from-green-700 hover:to-green-600 transition-all shadow-md"
                    >
                      Сохранить
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6 bg-white max-h-[800px] overflow-y-auto rounded-b-xl">
                {manualEditMode ? (
                  <div className="editor-container">
                    {/* Toolbar */}
                    <div className="bg-gray-50 border border-gray-200 rounded-t-lg p-2 mb-2 flex flex-wrap gap-1 items-center">
                      <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('bold', false, null); }} className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-200 rounded transition-all" title="Жирный текст">
                        <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z"/>
                        </svg>
                      </button>
                      <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('italic', false, null); }} className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-200 rounded transition-all italic font-serif" title="Курсив">I</button>
                      <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('underline', false, null); }} className="h-8 w-8 p-0 text-gray-700 hover:bg-gray-200 rounded transition-all underline" title="Подчеркнутый">U</button>
                      
                      <div className="w-px bg-gray-300 h-6 mx-1" />
                      
                      <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('formatBlock', false, 'h2'); }} className="h-8 px-2 text-base font-bold text-gray-700 hover:bg-gray-200 rounded transition-all" title="Большой заголовок">H2</button>
                      <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('formatBlock', false, 'h3'); }} className="h-8 px-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded transition-all" title="Подзаголовок">H3</button>
                      
                      <div className="w-px bg-gray-300 h-6 mx-1" />
                      
                      <button type="button" onClick={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList', false, null); }} className="h-8 px-2 text-xs font-medium text-gray-700 hover:bg-gray-200 rounded transition-all" title="Маркированный список">• Список</button>
                    </div>
                    
                    {/* Editor */}
                    <div
                      ref={editorRef}
                      contentEditable
                      dangerouslySetInnerHTML={{ __html: manualContent }}
                      suppressContentEditableWarning
                      key={manualContent}
                      onBlur={(e) => setManualContent(e.currentTarget.innerHTML)}
                      className="min-h-[600px] p-4 border border-gray-200 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        fontFamily: 'IBM Plex Sans, sans-serif',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}
                    />
                  </div>
                ) : loadingTemplate ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Загрузка шаблона...</p>
                  </div>
                ) : (
                  <div 
                    className="text-sm leading-relaxed text-gray-800"
                    style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    dangerouslySetInnerHTML={{ __html: generatePreviewContent() }}
                  />
                )}
              </div>
            </div>

            {/* Right: Form */}
            <div className="minimal-card">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Заполните данные
                </h3>
              </div>
              <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-8" data-testid="create-contract-form">
                {/* Show loading indicator while template is loading */}
                {loadingTemplate ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-neutral-600">Загрузка полей шаблона...</p>
                  </div>
                ) : (
                  <>
                {/* Only show old fields if no template selected */}
                {!selectedTemplate && (
                  <>
                    {/* Contract Info */}
                    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Информация о договоре</h3>
                          <p className="text-sm text-gray-600">Выберите дату составления</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <label htmlFor="contract_date" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Дата договора *
                        </label>
                        <input
                          id="contract_date"
                          type="date"
                          value={templateData.contract_date}
                          onChange={(e) => handleFieldChange('contract_date', e.target.value)}
                          required
                          data-testid="contract-date-input"
                          className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base font-medium text-gray-900"
                        />
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Номер договора будет сгенерирован автоматически
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Landlord Info */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b-2 border-gray-100 pb-3">Наймодатель (Вы)</h3>
                      <div>
                        <label htmlFor="landlord_name" className="block text-sm font-medium text-gray-700 mb-2">Наименование *</label>
                        <input
                          id="landlord_name"
                          value={templateData.landlord_name}
                          onChange={(e) => handleFieldChange('landlord_name', e.target.value)}
                          required
                          data-testid="landlord-name-input"
                          className="minimal-input w-full"
                        />
                      </div>
                      <div>
                        <label htmlFor="landlord_representative" className="block text-sm font-medium text-gray-700 mb-2">Представитель (кто составил договор) *</label>
                        <input
                          id="landlord_representative"
                          value={templateData.landlord_representative}
                          onChange={(e) => handleFieldChange('landlord_representative', e.target.value)}
                          required
                          data-testid="landlord-rep-input"
                          className="minimal-input w-full"
                          placeholder="ФИО"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Dynamic Template Fields */}
                {selectedTemplate && selectedTemplate.placeholders && Object.keys(selectedTemplate.placeholders).length > 0 && (
                  <>
                    {/* All Fields - divided by owner */}
                    <div className="space-y-4">
                      {/* Landlord Fields - Always visible */}
                      {Object.entries(selectedTemplate.placeholders).some(([_, config]) => config.owner === 'landlord' && config.type !== 'calculated') && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg">
                              1
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                Ваши данные
                              </h3>
                              <p className="text-sm text-gray-500">
                                Информация о наймодателе
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(selectedTemplate.placeholders).map(([key, config]) => {
                              // Only show landlord fields
                              if (config.type === 'calculated' || config.owner !== 'landlord') return null;
                        
                        return (
                          <div key={key} className={config.type === 'text' ? 'md:col-span-2' : ''}>
                            <label htmlFor={`placeholder_${key}`} className="block text-sm font-medium text-gray-700 mb-2">
                              {config.label} {config.required && <span className="text-red-500">*</span>}
                            </label>
                            
                            {config.type === 'text' && (
                              <input
                                id={`placeholder_${key}`}
                                value={placeholderValues[key] || ''}
                                onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                                required={config.required}
                                className="minimal-input w-full"
                                placeholder={`Введите ${config.label.toLowerCase()}`}
                              />
                            )}
                            
                            {config.type === 'number' && (
                              <input
                                id={`placeholder_${key}`}
                                type="number"
                                value={placeholderValues[key] || ''}
                                onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                                required={config.required}
                                className="minimal-input w-full"
                                placeholder={`Введите ${config.label.toLowerCase()}`}
                              />
                            )}
                            
                            {config.type === 'date' && (
                              <input
                                id={`placeholder_${key}`}
                                type="date"
                                value={placeholderValues[key] || ''}
                                onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                                required={config.required}
                                className="minimal-input w-full"
                              />
                            )}
                            
                            {config.type === 'phone' && (
                              <IMaskInput
                                mask="+7 (000) 000-00-00"
                                value={placeholderValues[key] || ''}
                                onAccept={(value) => setPlaceholderValues({...placeholderValues, [key]: value})}
                                placeholder="+7 (___) ___-__-__"
                                className="minimal-input w-full"
                                id={`placeholder_${key}`}
                                type="tel"
                              />
                            )}
                            
                            {config.type === 'email' && (
                              <input
                                id={`placeholder_${key}`}
                                type="email"
                                value={placeholderValues[key] || ''}
                                onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                                required={config.required}
                                className="minimal-input w-full"
                                placeholder={`Введите ${config.label.toLowerCase()}`}
                              />
                            )}
                          </div>
                        );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tenant/Signer Fields */}
                      {Object.entries(selectedTemplate.placeholders).some(([_, config]) => 
                        (config.owner === 'tenant' || config.owner === 'signer') && config.type !== 'calculated'
                      ) && (
                        <details className="group" open={false}>
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 hover:border-blue-400 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
                                2
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  Данные клиента
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Опционально — клиент заполнит при подписании
                                </p>
                              </div>
                              <svg className="w-5 h-5 text-gray-400 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </summary>
                          
                          <div className="mt-6 space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-800">
                                💡 Можете оставить эти поля пустыми — клиент заполнит их при подписании договора.
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {Object.entries(selectedTemplate.placeholders).map(([key, config]) => {
                                // Only show tenant/signer fields
                                if (config.type === 'calculated' || (config.owner !== 'tenant' && config.owner !== 'signer')) return null;
                                
                                return (
                                  <div key={key} className={config.type === 'text' ? 'md:col-span-2' : ''}>
                                    <label htmlFor={`placeholder_${key}`} className="text-sm font-medium text-gray-700 block mb-2">
                                      {config.label} {config.required && <span className="text-amber-500">*</span>}
                                    </label>
                                    
                                    {config.type === 'text' && (
                                      <input
                                        id={`placeholder_${key}`}
                                        value={placeholderValues[key] || ''}
                                        onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                                        className="minimal-input w-full"
                                        placeholder={`Клиент заполнит: ${config.label.toLowerCase()}`}
                                      />
                                    )}
                                    
                                    {config.type === 'number' && (
                                      <input
                                        id={`placeholder_${key}`}
                                        type="number"
                                        value={placeholderValues[key] || ''}
                                        onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                                        className="minimal-input w-full"
                                        placeholder={`Клиент заполнит`}
                                      />
                                    )}
                                    
                                    {config.type === 'date' && (
                                      <input
                                        id={`placeholder_${key}`}
                                        type="date"
                                        value={placeholderValues[key] || ''}
                                        onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                                        className="minimal-input w-full"
                                      />
                                    )}
                                    
                                    {config.type === 'phone' && (
                                      <IMaskInput
                                        mask="+7 (000) 000-00-00"
                                        value={placeholderValues[key] || ''}
                                        onAccept={(value) => setPlaceholderValues({...placeholderValues, [key]: value})}
                                        placeholder="+7 (___) ___-__-__"
                                        className="minimal-input w-full"
                                        id={`placeholder_${key}`}
                                        type="tel"
                                      />
                                    )}
                                    
                                    {config.type === 'email' && (
                                      <input
                                        id={`placeholder_${key}`}
                                        type="email"
                                        value={placeholderValues[key] || ''}
                                        onChange={(e) => setPlaceholderValues({...placeholderValues, [key]: e.target.value})}
                                        className="minimal-input w-full"
                                        placeholder={`Клиент заполнит`}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Tenant Document Upload inside tenant fields */}
                            {selectedTemplate.requires_tenant_document && (
                              <div className="mt-6 pt-6 border-t border-slate-200">
                                <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl">
                                  <label className="font-semibold text-indigo-900 flex items-center gap-2 mb-2">
                                    📄 Удостоверение личности нанимателя
                                  </label>
                                  <p className="text-xs text-indigo-700 mt-1 mb-3">
                                    Вы можете загрузить удостоверение нанимателя сейчас (если есть копия), 
                                    или наниматель загрузит его при подписании
                                  </p>
                                  
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          setTenantDocument(file);
                                          const reader = new FileReader();
                                          reader.onload = () => setTenantDocPreview(reader.result);
                                          reader.readAsDataURL(file);
                                          toast.success('Документ выбран');
                                        }
                                      }}
                                      className="flex-1 minimal-input"
                                    />
                                    {tenantDocument && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTenantDocument(null);
                                          setTenantDocPreview(null);
                                        }}
                                        className="px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-all"
                                      >
                                        Удалить
                                      </button>
                                    )}
                                  </div>
                                  
                                  {tenantDocPreview && (
                                    <div className="mt-2">
                                      <p className="text-xs text-green-600">✓ Документ загружен: {tenantDocument.name}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </>
                )}

                {/* Tenant Info - Optional Fields (only show if no template selected) */}
                {!selectedTemplate && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <h3 className="font-semibold text-neutral-900">Наниматель (Клиент)</h3>
                        <p className="text-xs text-neutral-500">Необязательные поля - клиент заполнит при подписании</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOptionalFields(!showOptionalFields)}
                        className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {showOptionalFields ? '▼ Скрыть' : '▶ Показать опциональные поля'}
                      </button>
                    </div>
                  
                  {showOptionalFields && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <label htmlFor="tenant_name" className="block text-sm font-medium text-gray-700 mb-2">ФИО нанимателя</label>
                        <input
                          id="tenant_name"
                          value={templateData.tenant_name}
                          onChange={(e) => handleFieldChange('tenant_name', e.target.value)}
                          data-testid="tenant-name-input"
                          className="minimal-input w-full"
                          placeholder="Опционально"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="tenant_phone" className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                          <IMaskInput
                            mask="+7 (000) 000-00-00"
                            value={templateData.tenant_phone}
                            onAccept={(value) => handleFieldChange('tenant_phone', value)}
                            placeholder="+7 (___) ___-__-__"
                            className="minimal-input w-full"
                            id="tenant_phone"
                            type="tel"
                            data-testid="tenant-phone-input"
                          />
                        </div>
                        <div>
                          <label htmlFor="tenant_email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            id="tenant_email"
                            type="email"
                            value={templateData.tenant_email}
                            onChange={(e) => handleFieldChange('tenant_email', e.target.value)}
                            data-testid="tenant-email-input"
                            className="minimal-input w-full"
                            placeholder="Опционально"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Удостоверение личности клиента (опционально)</label>
                        <p className="text-xs text-neutral-500 mb-3">Если есть документ клиента, можете загрузить. Иначе клиент загрузит сам.</p>
                        
                        {tenantDocPreview && (
                          <div className="mb-6">
                            <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r mb-4">
                              <div className="flex items-center gap-2 text-green-800">
                                <CheckCircle className="h-5 w-5" />
                                <span className="font-semibold">Документ загружен успешно</span>
                              </div>
                            </div>
                            <div className="mb-4">
                              <img
                                src={tenantDocPreview}
                                alt=""
                                className="w-full rounded-lg border-2 border-green-200 shadow-md block"
                              />
                            </div>
                          </div>
                        )}
                        
                        <label htmlFor="tenant_doc" className="cursor-pointer block">
                          <div className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2">
                            <Upload className="h-4 w-4" />
                            {tenantDocument ? 'Изменить документ клиента' : 'Загрузить документ клиента'}
                          </div>
                          <input
                            id="tenant_doc"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleTenantDocUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-neutral-500 mt-1">Поддерживаются: JPEG, PNG, PDF</p>
                      </div>
                    </div>
                  )}
                  </div>
                )}

                {/* Property Details (only show if no template selected) */}
                {!selectedTemplate && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-900 border-b pb-2">Описание и адрес квартиры</h3>
                  <div>
                    <label htmlFor="property_address" className="block text-sm font-medium text-gray-700 mb-2">Адрес квартиры *</label>
                    <input
                      id="property_address"
                      value={templateData.property_address}
                      onChange={(e) => handleFieldChange('property_address', e.target.value)}
                      required
                      data-testid="property-address-input"
                      className="minimal-input w-full"
                      placeholder="г. Алматы, ул. ..."
                    />
                  </div>
                </div>
                )}

                {/* Financial Terms */}
                {!selectedTemplate && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-900 border-b pb-2">Финансовые условия</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="rent_amount" className="block text-sm font-medium text-gray-700 mb-2">Цена в сутки *</label>
                      <input
                        id="rent_amount"
                        type="number"
                        value={templateData.rent_amount}
                        onChange={(e) => handleFieldChange('rent_amount', e.target.value)}
                        required
                        data-testid="rent-amount-input"
                        className="minimal-input w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="security_deposit" className="block text-sm font-medium text-gray-700 mb-2">Обеспечительный депозит</label>
                      <input
                        id="security_deposit"
                        type="number"
                        value={templateData.security_deposit}
                        onChange={(e) => handleFieldChange('security_deposit', e.target.value)}
                        data-testid="security-deposit-input"
                        className="minimal-input w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="days_count" className="block text-sm font-medium text-gray-700 mb-2">Количество суток (рассчитывается автоматически)</label>
                    <input
                      id="days_count"
                      type="number"
                      value={templateData.days_count}
                      readOnly
                      className="minimal-input w-full bg-gray-100"
                      data-testid="days-count-input"
                    />
                  </div>
                  {templateData.rent_amount && templateData.days_count && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900">
                        <strong>Полная стоимость:</strong> {parseInt(templateData.rent_amount) * parseInt(templateData.days_count)} {templateData.rent_currency}
                      </p>
                    </div>
                  )}
                </div>
                )}

                {/* Dates */}
                {!selectedTemplate && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-neutral-900 border-b pb-2">Даты заселения и выселения</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="move_in_date" className="block text-sm font-medium text-gray-700 mb-2">Дата заселения *</label>
                      <input
                        id="move_in_date"
                        type="date"
                        value={templateData.move_in_date}
                        onChange={(e) => handleFieldChange('move_in_date', e.target.value)}
                        required
                        data-testid="move-in-date-input"
                        className="minimal-input w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="move_out_date" className="block text-sm font-medium text-gray-700 mb-2">Дата выселения *</label>
                      <input
                        id="move_out_date"
                        type="date"
                        value={templateData.move_out_date}
                        onChange={(e) => handleFieldChange('move_out_date', e.target.value)}
                        required
                        data-testid="move-out-date-input"
                        className="minimal-input w-full"
                      />
                    </div>
                  </div>
                </div>
                )}
                  </>
                )}

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    data-testid="save-contract-button"
                    className="flex-1 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? 'Загрузка...' : 'Отправить на подпись'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.removeItem('selectedTemplateId');
                      navigate('/dashboard');
                    }}
                    data-testid="cancel-button"
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-red-400 transition-all font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="minimal-card p-8">
            <div className="text-center py-16">
              <p className="text-gray-600 mb-4">Выберите шаблон из модального окна</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateContractPage;