import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import '../styles/neumorphism.css';

const RefundPage = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen gradient-bg py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('legal.backToHome')}
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
            {t('legal.refund.title')}
          </h1>
          <p className="text-gray-500 text-center mb-8">{t('legal.refund.subtitle')}</p>
          
          <div className="space-y-6 text-sm sm:text-base">
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.refund.section1.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.refund.section1.p1')}</p>
              <p className="text-gray-700">{t('legal.refund.section1.p2')}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.refund.section2.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.refund.section2.p1')}</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                <li>{t('legal.refund.section2.list1')}</li>
                <li>{t('legal.refund.section2.list2')}</li>
                <li>{t('legal.refund.section2.list3')}</li>
              </ul>
              <p className="text-gray-700 mb-2">{t('legal.refund.section2.p2')}</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>{t('legal.refund.section2.noRefund1')}</li>
                <li>{t('legal.refund.section2.noRefund2')}</li>
                <li>{t('legal.refund.section2.noRefund3')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.refund.section3.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.refund.section3.p1')}</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                <li>{t('legal.refund.section3.list1')}</li>
                <li>{t('legal.refund.section3.list2')}</li>
                <li>{t('legal.refund.section3.list3')}</li>
              </ul>
              <p className="text-gray-700">{t('legal.refund.section3.p2')}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.refund.section4.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.refund.section4.p1')}</p>
              <p className="text-gray-700 mb-2">{t('legal.refund.section4.p2')}</p>
              <p className="text-gray-700">{t('legal.refund.section4.p3')}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.refund.section5.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.refund.section5.p1')}</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li><strong>{t('legal.refund.section5.days1')}</strong></li>
                <li><strong>{t('legal.refund.section5.days2')}</strong></li>
              </ul>
              <p className="text-gray-700 mt-2">{t('legal.refund.section5.p2')}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.refund.section6.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.refund.section6.p1')}</p>
              <p className="text-gray-700 mb-2">{t('legal.refund.section6.p2')}</p>
              <p className="text-gray-700">{t('legal.refund.section6.p3')}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.refund.section7.title')}</h2>
              <div className="bg-gray-50 p-4 rounded-lg text-gray-700">
                <p><strong>ИП «AN Venture»</strong></p>
                <p>БИН/ИИН: 040825501172</p>
                <p>{t('legal.contacts.addressValue')}</p>
                <p>Email: admin@2tick.kz</p>
                <p>{t('legal.contacts.phone')}: +7 707 400 3201</p>
              </div>
            </section>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-8">
              <p className="text-blue-800 text-sm">
                <strong>{t('legal.refund.important').split(':')[0]}:</strong> {t('legal.refund.important').split(':')[1]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPage;
