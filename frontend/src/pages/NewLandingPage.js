import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Zap, Shield, Users, ArrowRight, Check } from 'lucide-react';
import '../styles/neumorphism.css';

const NewLandingPage = () => {
  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Логотип 2tick */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                <svg width="32" height="32" viewBox="0 0 32 32" className="relative">
                  <circle cx="16" cy="16" r="15" fill="#3B82F6" />
                  <path d="M10 16 L14 20 L22 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 16 L18 20 L26 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                </svg>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                2tick.kz
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/login">
              <button className="neuro-button">
                Вход
              </button>
            </Link>
            <Link to="/register">
              <button className="neuro-button-primary">
                Регистрация
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Левая часть - текст */}
            <div className="space-y-8">
              <div className="inline-block neuro-card px-4 py-2">
                <span className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Быстро как колибри
                </span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Подписывайте договоры
                <span className="block bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  за 2 клика
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Современная платформа для электронного подписания договоров в Казахстане. 
                Быстро, безопасно, юридически значимо.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/register">
                  <button className="neuro-button-primary text-lg px-8 py-4 flex items-center gap-2">
                    Начать бесплатно
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <a href="#features">
                  <button className="neuro-button text-lg px-8 py-4">
                    Узнать больше
                  </button>
                </a>
              </div>
              
              {/* Статистика */}
              <div className="flex gap-8 pt-8">
                <div>
                  <div className="text-3xl font-bold text-blue-600">2 сек</div>
                  <div className="text-sm text-gray-500">на подпись</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">100%</div>
                  <div className="text-sm text-gray-500">безопасно</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">24/7</div>
                  <div className="text-sm text-gray-500">доступность</div>
                </div>
              </div>
            </div>
            
            {/* Правая часть - изображение */}
            <div className="relative">
              <div className="neuro-card p-8 animate-float">
                <img 
                  src="https://images.unsplash.com/photo-1580982330720-bd5e0fed108b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHRlY2hub2xvZ3l8ZW58MHx8fGJsdWV8MTc2Mjg2NDQ3M3ww&ixlib=rb-4.1.0&q=85"
                  alt="Digital Contract"
                  className="rounded-xl w-full"
                />
              </div>
              {/* Декоративные элементы */}
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
              Почему выбирают 2tick?
            </h2>
            <p className="text-xl text-gray-600">
              Все что нужно для удобного подписания договоров
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="neuro-card p-8 space-y-4 group hover:scale-105 smooth-transition">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Быстрая подпись</h3>
              <p className="text-gray-600">
                Подписывайте договоры за 2 клика через SMS или Telegram. Без сложных процедур и долгого ожидания.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="neuro-card p-8 space-y-4 group hover:scale-105 smooth-transition">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Безопасность</h3>
              <p className="text-gray-600">
                Многофакторная аутентификация и шифрование данных. Ваши документы защищены по стандартам РК.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="neuro-card p-8 space-y-4 group hover:scale-105 smooth-transition">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Простота</h3>
              <p className="text-gray-600">
                Интуитивный интерфейс на 3 языках. Создавайте и отправляйте договоры без специальных навыков.
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
              Как это работает?
            </h2>
            <p className="text-xl text-gray-600">
              Всего 3 простых шага
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="neuro-card p-8 space-y-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-bold text-gray-900">Создайте договор</h3>
                <p className="text-gray-600">
                  Выберите шаблон или загрузите свой документ. Заполните необходимые поля.
                </p>
              </div>
              {/* Стрелка */}
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                <ArrowRight className="w-8 h-8 text-blue-300" />
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="relative">
              <div className="neuro-card p-8 space-y-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-bold text-gray-900">Отправьте на подпись</h3>
                <p className="text-gray-600">
                  Введите телефон получателя. Система автоматически отправит ссылку для подписания.
                </p>
              </div>
              {/* Стрелка */}
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                <ArrowRight className="w-8 h-8 text-blue-300" />
              </div>
            </div>
            
            {/* Step 3 */}
            <div className="neuro-card p-8 space-y-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Готово!</h3>
              <p className="text-gray-600">
                Получите подписанный договор на email. Храните и скачивайте в любое время.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Простые и честные цены
            </h2>
            <p className="text-xl text-gray-600">
              Начните бесплатно, платите только за результат
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="neuro-card p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Базовый</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-blue-600">0 ₸</span>
                  <span className="text-gray-500">/месяц</span>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  10 договоров в месяц
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  SMS/Telegram подпись
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  Базовые шаблоны
                </li>
              </ul>
              <Link to="/register" className="block">
                <button className="neuro-button w-full py-3">Начать бесплатно</button>
              </Link>
            </div>
            
            {/* Pro Plan */}
            <div className="neuro-card p-8 space-y-6 relative animate-pulse-glow">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Популярный
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Профи</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-blue-600">9,990 ₸</span>
                  <span className="text-gray-500">/месяц</span>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  Неограниченно договоров
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  Все способы подписи
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  Свои шаблоны
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  Приоритетная поддержка
                </li>
              </ul>
              <Link to="/register" className="block">
                <button className="neuro-button-primary w-full py-3">Попробовать Pro</button>
              </Link>
            </div>
            
            {/* Enterprise Plan */}
            <div className="neuro-card p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Бизнес</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-blue-600">Договорная</span>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  Все из Pro
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  API интеграция
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  Корпоративный аккаунт
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  Персональный менеджер
                </li>
              </ul>
              <button className="neuro-button w-full py-3">Связаться с нами</button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="neuro-card p-12 text-center space-y-6">
            <h2 className="text-4xl font-bold text-gray-900">
              Готовы начать?
            </h2>
            <p className="text-xl text-gray-600">
              Присоединяйтесь к сотням компаний, которые доверяют 2tick
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/register">
                <button className="neuro-button-primary text-lg px-8 py-4 flex items-center gap-2">
                  Создать аккаунт бесплатно
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg width="32" height="32" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="15" fill="#4F46E5" />
                  <path d="M10 16 L14 20 L22 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 16 L18 20 L26 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                </svg>
                <span className="text-xl font-bold">2tick.kz</span>
              </div>
              <p className="text-gray-400">
                Современная платформа для электронного подписания договоров
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Продукт</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white">Возможности</a></li>
                <li><a href="#pricing" className="hover:text-white">Цены</a></li>
                <li><a href="#" className="hover:text-white">Шаблоны</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Компания</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">О нас</a></li>
                <li><a href="#" className="hover:text-white">Блог</a></li>
                <li><a href="#" className="hover:text-white">Контакты</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Поддержка</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Документация</a></li>
                <li><a href="#" className="hover:text-white">Связаться</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2025 2tick.kz. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NewLandingPage;
