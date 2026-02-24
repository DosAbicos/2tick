import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, FileText, User, Calendar, Hash, Shield, Clock, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const API = process.env.REACT_APP_BACKEND_URL;

const VerifyContractPage = () => {
  const { contractId } = useParams();
  const { t, i18n } = useTranslation();
  const [contract, setContract] = useState(null);
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'ru');

  const langOptions = [
    { code: 'ru', label: 'Русский' },
    { code: 'kk', label: 'Қазақша' },
    { code: 'en', label: 'English' }
  ];

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setCurrentLang(lng);
    document.documentElement.lang = lng;
  };

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
          setError(t('verifyContract.notFound'));
        }
        
        if (signatureRes?.data) {
          setSignature(signatureRes.data);
        }
      } catch (err) {
        setError(t('verifyContract.loadError'));
      } finally {
        setLoading(false);
      }
    };

    if (contractId) {
      fetchContract();
    }
  }, [contractId, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 flex items-center justify-center p-4">
        {/* Language Switcher */}
        <div className="fixed top-4 right-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="h-9 px-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-all flex items-center gap-1 shadow-sm"
                data-testid="verify-language-switcher"
              >
                {currentLang.toUpperCase()}
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-gray-200 rounded-lg shadow-lg">
              {langOptions.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer ${currentLang === lang.code ? 'bg-blue-50 text-blue-700' : ''}`}
                  data-testid={`verify-lang-option-${lang.code}`}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('verifyContract.notFound')}</h1>
          <p className="text-gray-600 mb-6">{t('verifyContract.notFoundDesc')}</p>
          <Link 
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            {t('verifyContract.goHome')}
          </Link>
        </motion.div>
      </div>
    );
  }

  const isVerified = contract.verified || (contract.status === 'signed' && contract.landlord_signature_hash);
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const locale = currentLang === 'ru' ? 'ru-RU' : currentLang === 'kk' ? 'kk-KZ' : 'en-US';
    return date.toLocaleDateString(locale, { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status text based on language
  const getStatusText = (status) => {
    switch (status) {
      case 'signed': return t('verifyContract.statusSigned');
      case 'sent': return t('verifyContract.statusSent');
      case 'pending-signature': return t('verifyContract.statusPending');
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 py-8 px-4">
      {/* Language Switcher */}
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="h-9 px-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-all flex items-center gap-1 shadow-sm"
              data-testid="verify-language-switcher"
            >
              {currentLang.toUpperCase()}
              <ChevronDown className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border border-gray-200 rounded-lg shadow-lg">
            {langOptions.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer ${currentLang === lang.code ? 'bg-blue-50 text-blue-700' : ''}`}
                data-testid={`verify-lang-option-${lang.code}`}
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Header with New Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="/assets/logo-2tick.png" 
              alt="2tick.kz Logo" 
              className="w-12 h-12 rounded-xl shadow-md"
              data-testid="verify-logo"
            />
            <span className="text-2xl font-bold text-blue-600">2tick.kz</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t('verifyContract.title')}</h1>
          <p className="text-gray-500 text-sm">{t('verifyContract.subtitle')}</p>
        </motion.div>

        {/* Verification Status */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-6 mb-6 ${isVerified ? 'bg-green-50 border-2 border-green-200' : 'bg-amber-50 border-2 border-amber-200'}`}
        >
          <div className="flex items-center gap-4">
            {isVerified ? (
              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            ) : (
              <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h2 className={`text-lg font-bold ${isVerified ? 'text-green-700' : 'text-amber-700'}`}>
                {isVerified ? t('verifyContract.verified') : t('verifyContract.pending')}
              </h2>
              <p className={`text-sm ${isVerified ? 'text-green-600' : 'text-amber-600'}`}>
                {isVerified 
                  ? t('verifyContract.verifiedDesc') 
                  : t('verifyContract.pendingDesc')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Contract Details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {t('verifyContract.contractInfo')}
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Hash className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">{t('verifyContract.contractNumber')}</p>
                <p className="font-semibold text-gray-900">{contract.contract_code || contract.id?.slice(0, 8)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">{t('verifyContract.contractTitle')}</p>
                <p className="font-medium text-gray-900">{contract.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">{t('verifyContract.createdAt')}</p>
                <p className="font-medium text-gray-900">{formatDate(contract.created_at)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <User className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">{t('verifyContract.status')}</p>
                <p className="font-medium text-gray-900">
                  {getStatusText(contract.status)}
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
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
          >
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              {t('verifyContract.signatures')}
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Party A */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <p className="text-xs text-green-700 font-semibold mb-2">{t('verifyContract.partyA')}</p>
                <p className="font-mono text-xs text-gray-700 break-all bg-white/60 rounded-lg p-2">
                  {contract.landlord_signature_hash || '-'}
                </p>
                {contract.approved_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    {t('verifyContract.signedAt')}: {formatDate(contract.approved_at)}
                  </p>
                )}
              </div>

              {/* Party B */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 font-semibold mb-2">{t('verifyContract.partyB')}</p>
                <p className="font-mono text-xs text-gray-700 break-all bg-white/60 rounded-lg p-2">
                  {signature?.signature_hash || '-'}
                </p>
                {signature?.created_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    {t('verifyContract.signedAt')}: {formatDate(signature.created_at)}
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
          className="text-center space-y-3"
        >
          <p className="text-gray-500 text-sm">{t('verifyContract.verifiedVia')}</p>
          <p className="text-gray-400 text-xs font-mono">{t('verifyContract.contractId')}: {contractId}</p>
          <Link 
            to="/"
            className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
            data-testid="verify-go-home-btn"
          >
            {t('verifyContract.goToSite')}
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyContractPage;
