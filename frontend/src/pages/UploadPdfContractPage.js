import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { ArrowLeft, Upload, FileText, X, Eye } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UploadPdfContractPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Current user for auto-fill Party A data
  const [currentUser, setCurrentUser] = useState(null);
  
  // File state
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Loading states
  const [uploading, setUploading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    // Party A fields (auto-filled from profile)
    landlord_name: '',
    landlord_iin: '',
    landlord_phone: '',
    landlord_email: '',
    landlord_address: '',
    // Party B fields (optional)
    signer_name: '',
    signer_email: '',
    signer_phone: ''
  });
  
  // Toggle for showing Party B fields
  const [showSignerFields, setShowSignerFields] = useState(false);
  
  // PDF preview
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  // Fetch current user on mount for auto-fill
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const user = response.data;
        setCurrentUser(user);
        
        // Auto-fill Party A fields from user profile
        setFormData(prev => ({
          ...prev,
          landlord_name: user.company_name || user.full_name || '',
          landlord_iin: user.iin || '',
          landlord_phone: user.phone || '',
          landlord_email: user.email || '',
          landlord_address: user.legal_address || ''
        }));
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error(t('common.error'));
      } finally {
        setLoadingUser(false);
      }
    };
    
    fetchCurrentUser();
  }, [token, t]);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf') {
      toast.error(t('uploadPdf.selectPdfFile'));
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error(t('uploadPdf.fileTooLarge'));
      return;
    }
    setFile(selectedFile);
    
    // Create preview URL
    const url = URL.createObjectURL(selectedFile);
    setPdfPreviewUrl(url);
  };

  const removeFile = () => {
    setFile(null);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error(t('uploadPdf.selectPdfFile'));
      return;
    }
    
    if (!formData.title.trim()) {
      toast.error(t('uploadPdf.enterTitle'));
      return;
    }

    setUploading(true);

    const data = new FormData();
    data.append('file', file);
    data.append('title', formData.title);
    
    // Party A data
    data.append('landlord_name', formData.landlord_name);
    data.append('landlord_iin', formData.landlord_iin);
    data.append('landlord_phone', formData.landlord_phone);
    data.append('landlord_email', formData.landlord_email);
    data.append('landlord_address', formData.landlord_address);
    
    // Party B data (only if filled)
    data.append('signer_name', formData.signer_name || '');
    data.append('signer_email', formData.signer_email || '');
    data.append('signer_phone', formData.signer_phone || '');

    try {
      const response = await axios.post(`${API}/contracts/upload-pdf`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(t('uploadPdf.success'));
      
      // Navigate to contract details page (like templates flow)
      navigate(`/contracts/${response.data.contract_id}`);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || '';
      
      // Check if it's a contract limit error
      if (errorMessage.toLowerCase().includes('contract limit') || 
          errorMessage.toLowerCase().includes('upgrade your subscription') ||
          errorMessage.toLowerCase().includes('лимит договоров')) {
        toast.error(t('dashboard.limitReached'));
        navigate('/profile?tab=tariffs');
      } else {
        toast.error(errorMessage || t('uploadPdf.error'));
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back button - same style as CreateContractPage */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 sm:mb-6 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 minimal-card hover:shadow-lg transition-all flex items-center gap-2"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        
        {/* Title card */}
        <div className="minimal-card p-6 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {t('uploadPdf.title')}
            </h1>
            <p className="text-sm text-gray-500">
              {t('uploadPdf.subtitle')}
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Left: PDF Preview */}
          <div className="minimal-card lg:sticky lg:top-4 h-fit overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                <span>{t('contract.preview')}</span>
              </h3>
            </div>
            
            <div className="p-4">
              {/* Drag & Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : file 
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 hover:border-blue-400 bg-white'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {!file ? (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                    <p className="text-gray-700 font-medium mb-2">{t('uploadPdf.dragHere')}</p>
                    <p className="text-sm text-gray-500 mb-4">{t('uploadPdf.or')}</p>
                    <label className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 cursor-pointer transition-all shadow-md">
                      {t('uploadPdf.selectFile')}
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e.target.files[0])}
                        className="hidden"
                        data-testid="file-input"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-4">{t('uploadPdf.pdfUpTo')}</p>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4">
                      <FileText className="w-10 h-10 text-green-500" />
                      <div className="text-left flex-1">
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        data-testid="remove-file-btn"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* PDF Preview */}
                    {pdfPreviewUrl && (
                      <div className="border rounded-lg overflow-hidden bg-gray-100">
                        <iframe 
                          src={pdfPreviewUrl} 
                          className="w-full h-[400px]"
                          title="PDF Preview"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="minimal-card h-fit">
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                {t('contract.fillData')}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-6">
              {/* Contract Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('uploadPdf.contractTitle')} <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="minimal-input w-full"
                  placeholder={t('uploadPdf.contractTitlePlaceholder')}
                  data-testid="contract-title-input"
                />
              </div>

              {/* Party A Section */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('contract.partyA')}
                    </h3>
                    <p className="text-sm text-blue-700 font-medium">
                      {t('contract.yourData')}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.companyName')}
                    </label>
                    <input
                      value={formData.landlord_name}
                      onChange={(e) => setFormData({ ...formData, landlord_name: e.target.value })}
                      className="minimal-input w-full"
                      placeholder={t('profile.companyNamePlaceholder')}
                      data-testid="landlord-name-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.iin')}
                    </label>
                    <input
                      value={formData.landlord_iin}
                      onChange={(e) => setFormData({ ...formData, landlord_iin: e.target.value })}
                      className="minimal-input w-full"
                      placeholder="000000000000"
                      maxLength={12}
                      data-testid="landlord-iin-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.phone')}
                    </label>
                    <IMaskInput
                      mask="+7 (000) 000-00-00"
                      value={formData.landlord_phone}
                      onAccept={(value) => setFormData({ ...formData, landlord_phone: value })}
                      className="minimal-input w-full"
                      placeholder="+7 (___) ___-__-__"
                      data-testid="landlord-phone-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.landlord_email}
                      onChange={(e) => setFormData({ ...formData, landlord_email: e.target.value })}
                      className="minimal-input w-full"
                      placeholder="example@mail.com"
                      data-testid="landlord-email-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.address')}
                    </label>
                    <input
                      value={formData.landlord_address}
                      onChange={(e) => setFormData({ ...formData, landlord_address: e.target.value })}
                      className="minimal-input w-full"
                      placeholder={t('profile.addressPlaceholder')}
                      data-testid="landlord-address-input"
                    />
                  </div>
                </div>
              </div>

              {/* Party B Section (Expandable) */}
              <details className="group" open={showSignerFields}>
                <summary 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowSignerFields(!showSignerFields);
                  }}
                  className="p-4 bg-purple-50 border border-purple-200 rounded-xl cursor-pointer list-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {t('contract.partyB')}
                      </h3>
                      <p className="text-sm text-purple-700 font-medium">
                        {t('contract.clientFieldsOptional', 'Заполните, если знаете данные клиента (опционально)')}
                      </p>
                    </div>
                    <div className={`w-8 h-8 rounded-full bg-white border border-purple-200 flex items-center justify-center transition-transform duration-200 ${showSignerFields ? 'rotate-180' : ''}`}>
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </summary>
                
                {showSignerFields && (
                  <div className="p-4 pt-0 bg-purple-50 border border-t-0 border-purple-200 rounded-b-xl -mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('uploadPdf.signerName')} <span className="text-gray-400 text-xs">({t('common.optional')})</span>
                        </label>
                        <input
                          value={formData.signer_name}
                          onChange={(e) => setFormData({ ...formData, signer_name: e.target.value })}
                          className="minimal-input w-full"
                          placeholder={t('uploadPdf.signerNamePlaceholder')}
                          data-testid="signer-name-input"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('uploadPdf.signerEmail')} <span className="text-gray-400 text-xs">({t('common.optional')})</span>
                        </label>
                        <input
                          type="email"
                          value={formData.signer_email}
                          onChange={(e) => setFormData({ ...formData, signer_email: e.target.value })}
                          className="minimal-input w-full"
                          placeholder="example@mail.com"
                          data-testid="signer-email-input"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('uploadPdf.signerPhone')} <span className="text-gray-400 text-xs">({t('common.optional')})</span>
                        </label>
                        <IMaskInput
                          mask="+7 (000) 000-00-00"
                          value={formData.signer_phone}
                          onAccept={(value) => setFormData({ ...formData, signer_phone: value })}
                          className="minimal-input w-full"
                          placeholder="+7 (___) ___-__-__"
                          data-testid="signer-phone-input"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </details>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full px-6 py-4 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg flex items-center justify-center gap-2"
                data-testid="submit-btn"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('uploadPdf.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    {t('uploadPdf.createContract')}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPdfContractPage;
