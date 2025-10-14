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
import { ChevronDown, LogOut } from 'lucide-react';

const Header = ({ showAuth = false }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [currentLang, setCurrentLang] = React.useState(i18n.language || 'ru');

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
    <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to={token ? "/dashboard" : "/"} className="font-bold text-xl tracking-tight text-neutral-900" data-testid="header-logo-link">
          Signify KZ
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
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3" data-testid="language-switcher">
                {currentLang.toUpperCase()}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {langOptions.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={currentLang === lang.code ? 'bg-muted' : ''}
                  data-testid={`lang-option-${lang.code}`}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {showAuth && !token && (
            <>
              <Link to="/login" className="text-sm text-neutral-700 hover:text-neutral-900" data-testid="login-link">
                {t('landing.nav.login')}
              </Link>
              <Link to="/register">
                <Button size="sm" className="h-9 px-4" data-testid="register-primary-button">
                  {t('landing.nav.register')}
                </Button>
              </Link>
            </>
          )}
          
          {token && (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm" data-testid="profile-button">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-button">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;