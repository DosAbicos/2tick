import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, FileText, User, Calendar, Hash, Shield, Clock } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const VerifyContractPage = () => {
  const { contractId } = useParams();
  const [contract, setContract] = useState(null);
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        // Use public verify endpoint - no auth required
        const [contractRes, signatureRes] = await Promise.all([
          axios.get(`${API}/api/verify/${contractId}`).catch(() => null),
          axios.get(`${API}/api/verify/${contractId}/signature`).catch(() => null)
        ]);
        
        if (contractRes?.data) {
          setContract(contractRes.data);
        } else {
          setError('Договор не найден');
        }
        
        if (signatureRes?.data) {
          setSignature(signatureRes.data);
        }
      } catch (err) {
        setError('Ошибка при загрузке договора');
      } finally {
        setLoading(false);
      }
    };

    if (contractId) {
      fetchContract();
    }
  }, [contractId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Договор не найден</h1>
          <p className="text-gray-600 mb-6">Указанный договор не существует или был удалён.</p>
          <Link 
            to="/"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            На главную
          </Link>
        </motion.div>
      </div>
    );
  }

  const isVerified = contract.status === 'signed' && contract.landlord_signature_hash;
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <img src="/logo.png" alt="2tick.kz" className="h-12 mx-auto mb-4" onError={(e) => e.target.style.display = 'none'} />
          <h1 className="text-2xl font-bold text-gray-900">Проверка договора</h1>
          <p className="text-gray-600">Верификация подлинности документа</p>
        </motion.div>

        {/* Verification Status */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-6 mb-6 ${isVerified ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-200'}`}
        >
          <div className="flex items-center gap-4">
            {isVerified ? (
              <CheckCircle className="w-12 h-12 text-green-500 flex-shrink-0" />
            ) : (
              <Clock className="w-12 h-12 text-yellow-500 flex-shrink-0" />
            )}
            <div>
              <h2 className={`text-xl font-bold ${isVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                {isVerified ? '✓ Договор подписан и верифицирован' : '⏳ Договор ожидает подписания'}
              </h2>
              <p className={isVerified ? 'text-green-600' : 'text-yellow-600'}>
                {isVerified 
                  ? 'Данный документ имеет юридическую силу' 
                  : 'Документ ещё не подписан всеми сторонами'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Contract Details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Информация о договоре
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <Hash className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Номер договора</p>
                <p className="font-medium text-gray-900">{contract.contract_code || contract.id?.slice(0, 8)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Название</p>
                <p className="font-medium text-gray-900">{contract.title}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Дата создания</p>
                <p className="font-medium text-gray-900">{formatDate(contract.created_at)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Статус</p>
                <p className="font-medium text-gray-900">
                  {contract.status === 'signed' ? '✅ Подписан' : 
                   contract.status === 'sent' ? '📤 Отправлен на подпись' :
                   contract.status === 'pending-signature' ? '⏳ Ожидает утверждения' :
                   contract.status}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Signatures */}
        {isVerified && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Цифровые подписи
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Party A */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-sm text-purple-600 font-medium mb-1">Сторона А (Арендодатель)</p>
                <p className="font-mono text-sm text-gray-700 break-all">
                  {contract.landlord_signature_hash || '-'}
                </p>
                {contract.approved_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    Подписано: {formatDate(contract.approved_at)}
                  </p>
                )}
              </div>

              {/* Party B */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-600 font-medium mb-1">Сторона Б (Арендатор)</p>
                <p className="font-mono text-sm text-gray-700 break-all">
                  {signature?.signature_hash || '-'}
                </p>
                {signature?.created_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    Подписано: {formatDate(signature.created_at)}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-gray-500 text-sm"
        >
          <p>Проверено через систему 2tick.kz</p>
          <p className="mt-1">ID: {contractId}</p>
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyContractPage;
