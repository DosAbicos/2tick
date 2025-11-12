import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import { Upload, FileText, X, CheckCircle, ArrowLeft } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UploadPdfContractPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [formData, setFormData] = useState({
    title: '',
    signer_name: '',
    signer_email: '',
    signer_phone: ''
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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
      toast.error('Пожалуйста, выберите PDF файл');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 10 МБ)');
      return;
    }
    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Пожалуйста, выберите PDF файл');
      return;
    }

    setUploading(true);

    const data = new FormData();
    data.append('pdf_file', file);
    data.append('title', formData.title);
    data.append('signer_name', formData.signer_name);
    data.append('signer_email', formData.signer_email);
    data.append('signer_phone', formData.signer_phone);

    try {
      const response = await axios.post(`${API}/contracts/upload-pdf`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('PDF договор успешно загружен!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при загрузке PDF');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 px-4 py-2 text-gray-600 hover:text-blue-600 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        <div className="minimal-card p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Загрузить PDF договор</h1>
            <p className="text-sm text-gray-500">Загрузите готовый PDF договор для отправки на подписание</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drag & Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
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
                  <p className="text-gray-700 font-medium mb-2">Перетащите PDF файл сюда</p>
                  <p className="text-sm text-gray-500 mb-4">или</p>
                  <label className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 cursor-pointer transition-all shadow-md">
                    Выбрать файл
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileChange(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-4">PDF, до 10 МБ</p>
                </>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <FileText className="w-10 h-10 text-blue-500" />
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} МБ</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Название договора</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="minimal-input mt-1"
                  placeholder="Например: Договор аренды квартиры"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">ФИО подписанта</Label>
                <Input
                  value={formData.signer_name}
                  onChange={(e) => setFormData({ ...formData, signer_name: e.target.value })}
                  required
                  className="minimal-input mt-1"
                  placeholder="Иванов Иван Иванович"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Email подписанта</Label>
                <Input
                  type="email"
                  value={formData.signer_email}
                  onChange={(e) => setFormData({ ...formData, signer_email: e.target.value })}
                  required
                  className="minimal-input mt-1"
                  placeholder="ivanov@example.com"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Телефон подписанта</Label>
                <IMaskInput
                  mask="+7 (000) 000-00-00"
                  value={formData.signer_phone}
                  onAccept={(value) => setFormData({ ...formData, signer_phone: value })}
                  className="minimal-input mt-1 w-full"
                  placeholder="+7 (777) 123-45-67"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {uploading ? 'Загрузка...' : 'Загрузить и отправить на подпись'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadPdfContractPage;
