import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Zap, Shield, Users, ArrowRight, Check, FileText, Smartphone } from 'lucide-react';
import Header from '../components/Header';
import '../styles/neumorphism.css';

const NewLandingPage = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen gradient-bg">
      <Header showAuth={true} />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block minimal-card px-4 py-2">
                <span className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {t('landing.hero.badge')}
                </span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                {t('landing.hero.title')}
                <span className="block bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  {t('landing.hero.subtitle')}
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                {t('landing.hero.description')}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/register">
                  <button className="text-lg px-8 py-4 font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2">
                    {t('landing.hero.startFree')}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <a href="#features">
                  <button className="text-lg px-8 py-4 font-medium text-blue-600 bg-white border-2 border-blue-100 rounded-xl hover:bg-blue-50 transition-all">
                    {t('landing.hero.ctaSecondary')}
                  </button>
                </a>
              </div>
              
              {/* Statistics */}
              <div className="flex gap-8 pt-8">
                <div>
                  <div className="text-3xl font-bold text-blue-600">2 сек</div>
                  <div className="text-sm text-gray-500">{t('landing.hero.stat1')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">100%</div>
                  <div className="text-sm text-gray-500">{t('landing.hero.stat2')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">24/7</div>
                  <div className="text-sm text-gray-500">{t('landing.hero.stat3')}</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="minimal-card p-8 animate-float">
                <img 
                  src="https://images.unsplash.com/photo-1652992714070-4b1c488ec7cc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwzfHxzbWFydHBob25lJTIwZGlnaXRhbCUyMGRvY3VtZW50JTIwYnVzaW5lc3N8ZW58MHx8fHwxNzY4NTYxMjAwfDA&ixlib=rb-4.1.0&q=85"
                  alt="Электронное подписание договоров онлайн - 2tick.kz"
                  className="rounded-xl w-full"
                />
              </div>
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t('landing.features.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('landing.features.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="minimal-card p-8 space-y-4 group hover:scale-105 smooth-transition">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t('landing.features.speed.title')}</h3>
              <p className="text-gray-600 text-sm">
                {t('landing.features.speed.desc')}
              </p>
            </div>
            
            <div className="minimal-card p-8 space-y-4 group hover:scale-105 smooth-transition">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t('landing.features.security.title')}</h3>
              <p className="text-gray-600 text-sm">
                {t('landing.features.security.desc')}
              </p>
            </div>
            
            <div className="minimal-card p-8 space-y-4 group hover:scale-105 smooth-transition">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t('landing.features.templates.title')}</h3>
              <p className="text-gray-600 text-sm">
                {t('landing.features.templates.desc')}
              </p>
            </div>

            <div className="minimal-card p-8 space-y-4 group hover:scale-105 smooth-transition">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t('landing.features.mobile.title')}</h3>
              <p className="text-gray-600 text-sm">
                {t('landing.features.mobile.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t('landing.howItWorks.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('landing.howItWorks.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="minimal-card p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('landing.howItWorks.step1.title')}</h3>
                <p className="text-gray-600">{t('landing.howItWorks.step1.desc')}</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-blue-200"></div>
            </div>
            
            <div className="relative">
              <div className="minimal-card p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('landing.howItWorks.step2.title')}</h3>
                <p className="text-gray-600">{t('landing.howItWorks.step2.desc')}</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-blue-200"></div>
            </div>
            
            <div className="relative">
              <div className="minimal-card p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('landing.howItWorks.step3.title')}</h3>
                <p className="text-gray-600">{t('landing.howItWorks.step3.desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('landing.pricing.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="minimal-card p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">FREE</h3>
                <p className="text-sm text-gray-500 mt-1">{t('landing.pricing.free.desc', 'Для тестирования')}</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">0 ₸</span>
                </div>
              </div>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600">{t('landing.pricing.free.feature1', 'До 3 договоров')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600">{t('landing.pricing.free.feature2', 'Все способы верификации')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600">{t('landing.pricing.free.feature3', 'Базовые шаблоны')}</span>
                </li>
              </ul>
              <Link to="/register" className="block">
                <button className="w-full py-4 font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all">
                  {t('landing.pricing.choosePlan')}
                </button>
              </Link>
            </div>
            
            {/* Start Plan */}
            <div className="minimal-card p-8 space-y-6 border-2 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                {t('landing.pricing.popular', 'Популярный')}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">START</h3>
                <p className="text-sm text-gray-500 mt-1">{t('landing.pricing.start.desc', 'Для малого бизнеса')}</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">5 990 ₸</span>
                  <span className="ml-2 text-gray-500">/ {t('landing.pricing.month', 'месяц')}</span>
                </div>
              </div>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600">{t('landing.pricing.start.feature1', 'До 20 договоров')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600">{t('landing.pricing.start.feature2', 'Все способы верификации')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600">{t('landing.pricing.start.feature3', 'Все шаблоны')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600">{t('landing.pricing.start.feature4', 'Приоритетная поддержка')}</span>
                </li>
              </ul>
              <Link to="/register" className="block">
                <button className="w-full py-4 font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30">
                  {t('landing.pricing.choosePlan')}
                </button>
              </Link>
            </div>

            {/* Business Plan */}
            <div className="minimal-card p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">BUSINESS</h3>
                <p className="text-sm text-gray-500 mt-1">{t('landing.pricing.business.desc', 'Для компаний')}</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">14 990 ₸</span>
                  <span className="ml-2 text-gray-500">/ {t('landing.pricing.month', 'месяц')}</span>
                </div>
              </div>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600">{t('landing.pricing.business.feature1', 'До 50 договоров')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600">{t('landing.pricing.business.feature2', 'Все способы верификации')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600">{t('landing.pricing.business.feature3', 'Все шаблоны')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600">{t('landing.pricing.business.feature4', 'Персональный менеджер')}</span>
                </li>
              </ul>
              <Link to="/register" className="block">
                <button className="w-full py-4 font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all">
                  {t('landing.pricing.choosePlan')}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {t('landing.cta.subtitle')}
          </p>
          <Link to="/register">
            <button className="px-8 py-4 text-lg font-medium text-blue-600 bg-white rounded-xl hover:bg-blue-50 transition-all shadow-lg flex items-center gap-2 mx-auto">
              {t('landing.cta.button')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div className="md:col-span-2">
              <h3 className="text-white font-bold text-lg mb-4">2tick.kz</h3>
              <p className="text-gray-400 text-sm mb-4">
                {t('landing.footer.companyDesc', 'Сервис электронного подписания договоров для бизнеса в Казахстане')}
              </p>
              <div className="text-gray-500 text-sm space-y-1">
                <p>ИП «AN Venture»</p>
                <p>БИН: 040825501172</p>
              </div>
            </div>
            
            {/* Legal Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">{t('landing.footer.legal', 'Юридическая информация')}</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/offer" className="text-gray-400 hover:text-white text-sm transition-colors">
                    {t('landing.footer.offer', 'Публичная оферта')}
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                    {t('landing.footer.privacy', 'Политика конфиденциальности')}
                  </Link>
                </li>
                <li>
                  <Link to="/refund" className="text-gray-400 hover:text-white text-sm transition-colors">
                    {t('landing.footer.refund', 'Правила возврата')}
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Contacts */}
            <div>
              <h4 className="text-white font-semibold mb-4">{t('landing.footer.contacts', 'Контакты')}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:admin@2tick.kz" className="text-gray-400 hover:text-white transition-colors">
                    admin@2tick.kz
                  </a>
                </li>
                <li>
                  <a href="tel:+77074003201" className="text-gray-400 hover:text-white transition-colors">
                    +7 707 400 3201
                  </a>
                </li>
                <li>
                  <Link to="/contacts" className="text-gray-400 hover:text-white transition-colors">
                    {t('landing.footer.allContacts', 'Все контакты')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Bottom */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} 2tick.kz — {t('landing.footer.copyright', 'Все права защищены')}
            </p>
            <div className="flex items-center gap-4">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-6 opacity-50" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 opacity-50" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NewLandingPage;
