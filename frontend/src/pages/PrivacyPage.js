import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import '../styles/neumorphism.css';

const PrivacyPage = () => {
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
            {t('legal.privacy.title')}
          </h1>
          <p className="text-gray-500 text-center mb-8">{t('legal.privacy.subtitle')}</p>
          
          <div className="space-y-6 text-sm sm:text-base">
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.privacy.section1.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.privacy.section1.p1')}</p>
              <p className="text-gray-700">{t('legal.privacy.section1.p2')}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.privacy.section2.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.privacy.section2.p1')}</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>{t('legal.privacy.section2.list1')}</li>
                <li>{t('legal.privacy.section2.list2')}</li>
                <li>{t('legal.privacy.section2.list3')}</li>
                <li>{t('legal.privacy.section2.list4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.privacy.section3.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.privacy.section3.p1')}</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>{t('legal.privacy.section3.list1')}</li>
                <li>{t('legal.privacy.section3.list2')}</li>
                <li>{t('legal.privacy.section3.list3')}</li>
                <li>{t('legal.privacy.section3.list4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.privacy.section4.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.privacy.section4.p1')}</p>
              <p className="text-gray-700 mb-2">{t('legal.privacy.section4.p2')}</p>
              <p className="text-gray-700">{t('legal.privacy.section4.p3')}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.privacy.section5.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.privacy.section5.p1')}</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>{t('legal.privacy.section5.list1')}</li>
                <li>{t('legal.privacy.section5.list2')}</li>
                <li>{t('legal.privacy.section5.list3')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.privacy.section6.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.privacy.section6.p1')}</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>{t('legal.privacy.section6.list1')}</li>
                <li>{t('legal.privacy.section6.list2')}</li>
                <li>{t('legal.privacy.section6.list3')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.privacy.section7.title')}</h2>
              <p className="text-gray-700 mb-2">{t('legal.privacy.section7.p1')}</p>
              <p className="text-gray-700">{t('legal.privacy.section7.p2')}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('legal.privacy.section8.title')}</h2>
              <p className="text-gray-700 mb-4">{t('legal.privacy.section8.p1')}</p>
              <div className="bg-gray-50 p-4 rounded-lg text-gray-700">
                <p><strong>ИП «AN Venture»</strong></p>
                <p>Email: admin@2tick.kz</p>
                <p>{t('legal.contacts.phone')}: +7 707 400 3201</p>
                <p>{t('legal.contacts.addressValue')}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
