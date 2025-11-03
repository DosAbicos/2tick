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
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { IMaskInput } from 'react-imask';

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhoneChange = (value) => {
    setFormData({
      ...formData,
      signer_phone: value
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      } else {
        toast.error('Только PDF файлы разрешены');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        toast.error('Только PDF файлы разрешены');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Пожалуйста, загрузите PDF файл');
      return;
    }

    if (!formData.title || !formData.signer_email || !formData.signer_phone) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('signer_email', formData.signer_email);
      uploadFormData.append('signer_phone', formData.signer_phone);
      uploadFormData.append('signer_name', formData.signer_name || '');

      const response = await axios.post(
        `${API}/contracts/upload-pdf`,
        uploadFormData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast.success('PDF договор успешно загружен!');
      navigate(`/contracts/${response.data.contract_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при загрузке файла');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">📤 Загрузить свой PDF договор</CardTitle>
            <CardDescription>
              Загрузите готовый PDF договор и отправьте на подписание
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div>
                <Label>PDF файл договора *</Label>
                <div
                  className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : file
                      ? 'border-green-500 bg-green-50'
                      : 'border-neutral-300'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-4">
                      <FileText className="h-12 w-12 text-green-600" />
                      <div className="text-left">
                        <p className="font-medium text-green-700">{file.name}</p>
                        <p className="text-sm text-neutral-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                      <p className="text-neutral-600 mb-2">
                        Перетащите PDF файл сюда или
                      </p>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-primary hover:underline font-medium">
                          выберите файл
                        </span>
                        <input
                          id="file-upload"
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-neutral-500 mt-2">
                        Максимальный размер: 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">Название договора *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Например: Договор аренды квартиры"
                  required
                  className="mt-1"
                />
              </div>

              {/* Signer Name */}
              <div>
                <Label htmlFor="signer_name">Имя нанимателя</Label>
                <Input
                  id="signer_name"
                  name="signer_name"
                  value={formData.signer_name}
                  onChange={handleChange}
                  placeholder="Иванов Иван Иванович"
                  className="mt-1"
                />
              </div>

              {/* Signer Email */}
              <div>
                <Label htmlFor="signer_email">Email нанимателя *</Label>
                <Input
                  id="signer_email"
                  name="signer_email"
                  type="email"
                  value={formData.signer_email}
                  onChange={handleChange}
                  placeholder="signer@example.com"
                  required
                  className="mt-1"
                />
              </div>

              {/* Signer Phone */}
              <div>
                <Label htmlFor="signer_phone">Телефон нанимателя *</Label>
                <IMaskInput
                  mask="+7 (000) 000-00-00"
                  value={formData.signer_phone}
                  unmask={false}
                  onAccept={handlePhoneChange}
                  placeholder="+7 (777) 777-77-77"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  На этот номер будет отправлен код верификации
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Что произойдет дальше:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Ссылка для подписания будет отправлена нанимателю</li>
                      <li>Наниматель пройдет верификацию (SMS/Telegram)</li>
                      <li>После подписания вы получите финальный PDF с подписями</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={uploading || !file}
                  className="flex-1"
                >
                  {uploading ? 'Загрузка...' : 'Загрузить и отправить'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={uploading}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadPdfContractPage;
