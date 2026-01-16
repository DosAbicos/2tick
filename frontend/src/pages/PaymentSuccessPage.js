import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Home, Sparkles } from 'lucide-react';
import axios from 'axios';
import '../styles/neumorphism.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PaymentSuccessPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    // Fetch updated subscription info
    if (token) {
      axios.get(`${API}/subscriptions/current`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setSubscription(res.data))
      .catch(err => console.error('Error fetching subscription:', err));
    }
  }, [token]);

  const planNames = {
    'start': 'START',
    'business': 'BUSINESS'
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6 relative">
            <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-14 h-14 text-green-500" />
            </div>
            <Sparkles className="w-6 h-6 text-yellow-400 absolute top-0 right-1/4 animate-pulse" />
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('payment.successTitle', 'Оплата прошла успешно!')}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {t('payment.successDesc', 'Ваша подписка активирована. Теперь вам доступны все возможности выбранного тарифа.')}
          </p>
          
          {/* Subscription Info */}
          {subscription && subscription.plan_id !== 'free' && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-sm text-gray-500">{t('payment.yourPlan', 'Ваш тариф')}</p>
                  <p className="text-xl font-bold text-blue-600">
                    {planNames[subscription.plan_id] || subscription.plan_id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{t('payment.contractLimit', 'Лимит договоров')}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {subscription.contract_limit} / {t('payment.perMonth', 'мес')}
                  </p>
                </div>
              </div>
              {subscription.expires_at && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    {t('payment.validUntil', 'Действует до')}: {' '}
                    <span className="font-medium text-gray-700">
                      {new Date(subscription.expires_at).toLocaleDateString('ru-RU')}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="space-y-3">
            <Link 
              to="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <Home className="w-5 h-5" />
              {t('payment.goToHome', 'Перейти на главную')}
            </Link>
          </div>
        </div>
        
        {/* Support Info */}
        <p className="text-center text-gray-500 text-sm mt-6">
          {t('payment.supportInfo', 'Возникли вопросы?')} {' '}
          <a href="mailto:admin@2tick.kz" className="text-blue-600 hover:underline">
            admin@2tick.kz
          </a>
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
