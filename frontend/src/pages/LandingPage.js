import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import { FileText, Shield, Zap } from 'lucide-react';

const LandingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  React.useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  const features = [
    {
      icon: FileText,
      title: { ru: 'Создавайте договоры', kk: 'Келісімшарт құру', en: 'Create Contracts' },
      description: { ru: 'Быстрое создание и отправка контрактов', kk: 'Жылдам құру және жіберу', en: 'Quick creation and sending' }
    },
    {
      icon: Shield,
      title: { ru: 'Безопасная верификация', kk: 'Қауіпсіз тексеру', en: 'Secure Verification' },
      description: { ru: 'Подтверждение через SMS и звонок', kk: 'SMS және қоңырау арқылы', en: 'SMS and call verification' }
    },
    {
      icon: Zap,
      title: { ru: 'Мгновенные уведомления', kk: 'Жылдам хабарламалар', en: 'Instant Notifications' },
      description: { ru: 'Получайте уведомления в реальном времени', kk: 'Нақты уақытта хабарламалар', en: 'Real-time notifications' }
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header showAuth={true} />
      
      {/* Hero Section */}
      <section className="bg-[linear-gradient(135deg,_#F6FAFF_0%,_#F1FBF9_60%,_#FFFFFF_100%)] pt-16 pb-24 sm:pt-24 sm:pb-32" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 mb-6" data-testid="hero-title">
                {t('landing.hero.title')}
              </h1>
              <p className="text-lg text-neutral-700 mb-8 leading-7" data-testid="hero-subtitle">
                {t('landing.hero.subtitle')}
              </p>
              <Button
                size="lg"
                className="h-12 px-8 text-base"
                onClick={() => navigate('/register')}
                data-testid="hero-cta-button"
              >
                {t('landing.hero.cta')}
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden lg:block"
            >
              <img
                src="https://images.unsplash.com/photo-1589330694653-ded6df03f754?crop=entropy&cs=srgb&fm=jpg&q=85"
                alt="Contract signing"
                className="rounded-lg shadow-[0_8px_16px_rgba(16,24,40,0.08)]"
                data-testid="hero-image"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              {t('landing.nav.features')}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const lang = localStorage.getItem('language') || 'ru';
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full hover:shadow-md transition-shadow" data-testid={`feature-card-${index}`}>
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                        {feature.title[lang]}
                      </h3>
                      <p className="text-neutral-600">
                        {feature.description[lang]}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section Placeholder */}
      <section id="faq" className="py-20 bg-neutral-50" data-testid="faq-section">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-neutral-900 mb-4">
            {t('landing.nav.faq')}
          </h2>
          <p className="text-neutral-600">
            Coming soon...
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-neutral-600 text-sm">
          <p>© 2025 Signify KZ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;