import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import '../styles/neumorphism.css';

const PaymentFailurePage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  
  const errorCode = searchParams.get('pg_error_code');
  const errorDescription = searchParams.get('pg_error_description');

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-14 h-14 text-red-500" />
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('payment.failureTitle', 'Оплата не прошла')}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {t('payment.failureDesc', 'К сожалению, не удалось обработать платёж. Пожалуйста, попробуйте ещё раз или используйте другую карту.')}
          </p>
          
          {/* Error Details */}
          {errorDescription && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {t('payment.errorDetails', 'Детали ошибки')}:
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    {decodeURIComponent(errorDescription)}
                  </p>
                  {errorCode && (
                    <p className="text-xs text-red-400 mt-1">
                      {t('payment.errorCode', 'Код')}: {errorCode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Common Issues */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {t('payment.commonIssues', 'Возможные причины')}:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• {t('payment.issue1', 'Недостаточно средств на карте')}</li>
              <li>• {t('payment.issue2', 'Карта заблокирована или истёк срок')}</li>
              <li>• {t('payment.issue3', 'Превышен лимит операций')}</li>
              <li>• {t('payment.issue4', 'Ошибка 3D Secure')}</li>
            </ul>
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            <Link 
              to="/profile?tab=tariffs"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <RefreshCw className="w-5 h-5" />
              {t('payment.tryAgain', 'Попробовать снова')}
            </Link>
            
            <Link 
              to="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('payment.backToDashboard', 'Вернуться на главную')}
            </Link>
          </div>
        </div>
        
        {/* Support Info */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            {t('payment.needHelp', 'Нужна помощь?')}
          </p>
          <a 
            href="mailto:admin@2tick.kz" 
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            admin@2tick.kz
          </a>
          <span className="text-gray-400 mx-2">|</span>
          <a 
            href="tel:+77074003201" 
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            +7 707 400 3201
          </a>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailurePage;
