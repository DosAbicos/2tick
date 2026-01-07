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
                  src="https://images.unsplash.com/photo-1580982330720-bd5e0fed108b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHRlY2hub2xvZ3l8ZW58MHx8fGJsdWV8MTc2Mjg2NDQ3M3ww&ixlib=rb-4.1.0&q=85"
                  alt="Digital Contract"
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
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="minimal-card p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{t('landing.pricing.free.title')}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{t('landing.pricing.free.price')}</span>
                  <span className="ml-2 text-gray-500">/ {t('landing.pricing.free.period')}</span>
                </div>
              </div>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">{t('landing.pricing.free.feature1')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">{t('landing.pricing.free.feature2')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">{t('landing.pricing.free.feature3')}</span>
                </li>
              </ul>
              <Link to="/register" className="block">
                <button className="w-full py-4 font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all">
                  {t('landing.pricing.choosePlan')}
                </button>
              </Link>
            </div>
            
            {/* Pro Plan */}
            <div className="minimal-card p-8 space-y-6 border-2 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                {t('landing.pricing.pro.title')}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{t('landing.pricing.pro.title')}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{t('landing.pricing.pro.price')}</span>
                  <span className="ml-2 text-gray-500">/ {t('landing.pricing.pro.period')}</span>
                </div>
              </div>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">{t('landing.pricing.pro.feature1')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">{t('landing.pricing.pro.feature2')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">{t('landing.pricing.pro.feature3')}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">{t('landing.pricing.pro.feature4')}</span>
                </li>
              </ul>
              <Link to="/register" className="block">
                <button className="w-full py-4 font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30">
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
      <footer className="py-8 px-4 bg-gray-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            {t('landing.footer.copyright')}
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              {t('landing.footer.privacy')}
            </a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              {t('landing.footer.terms')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NewLandingPage;
