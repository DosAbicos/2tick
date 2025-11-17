import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, LogOut, User, Menu, X } from 'lucide-react';
import styles from './Header.module.css';

const Header = ({ showAuth = false }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [currentLang, setCurrentLang] = React.useState(i18n.language || 'ru');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setCurrentLang(lng);
    document.documentElement.lang = lng;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const langOptions = [
    { code: 'ru', label: 'Русский' },
    { code: 'kk', label: 'Қазақша' },
    { code: 'en', label: 'English' }
  ];

  return (
    <header className="border-b border-gray-200/50 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm" data-version="v3">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 h-14 md:h-16 flex items-center justify-between">
        <Link to={token ? "/dashboard" : "/"} className="flex items-center gap-1.5 md:gap-2" data-testid="header-logo-link">
          {/* Логотип 2tick - адаптивный */}
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
            <svg width="28" height="28" viewBox="0 0 32 32" className="relative md:w-8 md:h-8">
              <circle cx="16" cy="16" r="15" fill="#3B82F6" />
              <path d="M10 16 L14 20 L22 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 16 L18 20 L26 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </svg>
          </div>
          <span className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
            2tick.kz
          </span>
        </Link>
        
        {!token && (
          <nav className="hidden md:flex items-center gap-6" aria-label="Main">
            <a href="#features" className="text-sm text-neutral-700 hover:text-neutral-900" data-testid="nav-features-link">
              {t('landing.nav.features')}
            </a>
            <a href="#pricing" className="text-sm text-neutral-700 hover:text-neutral-900" data-testid="nav-pricing-link">
              {t('landing.nav.pricing')}
            </a>
            <a href="#faq" className="text-sm text-neutral-700 hover:text-neutral-900" data-testid="nav-faq-link">
              {t('landing.nav.faq')}
            </a>
          </nav>
        )}
        
        <div className="flex items-center gap-1.5 md:gap-3">
          {/* Языковой селектор - только на desktop для авторизованных */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-all flex items-center gap-1 ${token ? 'hidden md:flex' : ''}`} data-testid="language-switcher">
                {currentLang.toUpperCase()}
                <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-gray-200 rounded-lg shadow-lg">
              {langOptions.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer ${currentLang === lang.code ? 'bg-blue-50 text-blue-700' : ''}`}
                  data-testid={`lang-option-${lang.code}`}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {showAuth && !token && (
            <>
              {/* Desktop - две кнопки */}
              <div className={`${styles.authDesktop} items-center gap-2`}>
                <Link to="/login" className="text-sm text-neutral-700 hover:text-neutral-900" data-testid="login-link">
                  {t('landing.nav.login')}
                </Link>
                <Link to="/register">
                  <Button size="sm" className="h-9 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600" data-testid="register-primary-button">
                    {t('landing.nav.register')}
                  </Button>
                </Link>
              </div>
              
              {/* Mobile - одна кнопка */}
              <div className={styles.authMobile}>
                <Link to="/login">
                  <Button size="sm" className="h-8 px-3 text-xs bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
                    Войти
                  </Button>
                </Link>
              </div>
            </>
          )}
          
          {token && (
            <>
              {/* Desktop - все кнопки */}
              <div className="hidden md:flex items-center gap-2">
              {(() => {
                try {
                  const user = JSON.parse(localStorage.getItem('user') || '{}');
                  const isAdminPage = window.location.pathname === '/admin' || 
                                     window.location.pathname.startsWith('/admin/');
                  
                  if (user.role === 'admin') {
                    if (isAdminPage) {
                      return (
                        <Link to="/dashboard">
                          <button className="h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1" data-testid="back-to-dashboard-button">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span className="hidden md:inline">Назад</span>
                          </button>
                        </Link>
                      );
                    } else {
                      return (
                        <Link to="/admin">
                          <button className="h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all flex items-center gap-1" data-testid="admin-panel-button">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="hidden md:inline">Админка</span>
                          </button>
                        </Link>
                      );
                    }
                  }
                } catch (e) {
                  return null;
                }
              })()}
              <Link to="/profile">
                <button className="h-8 w-8 md:h-9 md:w-9 flex items-center justify-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-all" data-testid="profile-button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{minWidth: '20px', minHeight: '20px'}}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </button>
              </Link>
              <button onClick={handleLogout} className="h-8 w-8 md:h-9 md:w-9 flex items-center justify-center text-red-600 bg-white border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-400 transition-all" data-testid="logout-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{minWidth: '20px', minHeight: '20px'}}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
              </div>
              
              {/* Mobile - бургер меню */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          )}
          
          {/* Mobile меню overlay - только для авторизованных */}
          {token && mobileMenuOpen && (
            <>
              <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              
              <div className="fixed top-14 right-0 w-64 bg-white shadow-xl z-50 md:hidden rounded-bl-2xl border-l border-b border-gray-200">
                <div className="p-4 space-y-3">
                  {/* Языковой селектор в меню */}
                  <div className="pb-3 border-b border-gray-200">
                    <p className="text-xs text-gray-500 mb-2 font-semibold">Язык / Тіл</p>
                    <div className="flex gap-2">
                      {langOptions.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            changeLanguage(lang.code);
                            setMobileMenuOpen(false);
                          }}
                          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                            currentLang === lang.code
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {lang.code.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Кнопки меню */}
                  {(() => {
                    try {
                      const user = JSON.parse(localStorage.getItem('user') || '{}');
                      const isAdminPage = window.location.pathname === '/admin' || 
                                         window.location.pathname.startsWith('/admin/');
                      
                      if (user.role === 'admin') {
                        if (isAdminPage) {
                          return (
                            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                              <button className="w-full py-3 px-4 text-sm font-semibold text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span>Назад</span>
                              </button>
                            </Link>
                          );
                        } else {
                          return (
                            <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                              <button className="w-full py-3 px-4 text-sm font-semibold text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-all flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Админка</span>
                              </button>
                            </Link>
                          );
                        }
                      }
                    } catch (e) {
                      return null;
                    }
                  })()}
                  
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <button className="w-full py-3 px-4 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span>Профиль</span>
                    </button>
                  </Link>
                  
                  <button 
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-3 px-4 text-sm font-semibold text-red-600 bg-white border border-gray-200 rounded-xl hover:bg-red-50 transition-all flex items-center gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Выйти</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
