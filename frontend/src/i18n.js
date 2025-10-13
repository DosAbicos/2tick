import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ru: {
    translation: {
      // Landing
      "landing.hero.title": "Подписывайте договоры удалённо",
      "landing.hero.subtitle": "Безопасная платформа для дистанционного подписания контрактов с верификацией через SMS",
      "landing.hero.cta": "Создать контракт",
      "landing.nav.features": "Возможности",
      "landing.nav.pricing": "Тарифы",
      "landing.nav.faq": "FAQ",
      "landing.nav.login": "Войти",
      "landing.nav.register": "Регистрация",
      
      // Auth
      "auth.login.title": "Вход в систему",
      "auth.login.email": "Email",
      "auth.login.password": "Пароль",
      "auth.login.submit": "Войти",
      "auth.register.title": "Регистрация",
      "auth.register.full_name": "Полное имя",
      "auth.register.phone": "Телефон",
      "auth.register.submit": "Зарегистрироваться",
      
      // Dashboard
      "dashboard.title": "Панель управления",
      "dashboard.new_contract": "Новый контракт",
      "dashboard.stats.active": "Активные контракты",
      "dashboard.stats.pending": "Ожидают подписи",
      "dashboard.stats.signed": "Подписано за неделю",
      "dashboard.table.title": "Название",
      "dashboard.table.counterparty": "Контрагент",
      "dashboard.table.amount": "Сумма",
      "dashboard.table.status": "Статус",
      "dashboard.table.updated": "Обновлено",
      "dashboard.table.actions": "Действия",
      
      // Contract
      "contract.create.title": "Создать контракт",
      "contract.title": "Название контракта",
      "contract.content": "Содержание",
      "contract.signer_name": "Имя подписанта",
      "contract.signer_phone": "Телефон подписанта",
      "contract.signer_email": "Email подписанта",
      "contract.amount": "Сумма",
      "contract.save": "Сохранить",
      "contract.send": "Отправить",
      "contract.download": "Скачать PDF",
      "contract.delete": "Удалить",
      "contract.approve": "Утвердить",
      
      // Signing
      "signing.title": "Подписание контракта",
      "signing.upload_document": "Загрузить удостоверение личности",
      "signing.verify_phone": "Подтвердить телефон",
      "signing.enter_otp": "Введите 6-значный код",
      "signing.resend": "Отправить повторно",
      "signing.verify": "Подтвердить",
      "signing.success": "Контракт успешно подписан!",
      
      // Status
      "status.draft": "Черновик",
      "status.sent": "Отправлен",
      "status.pending-signature": "Ожидает утверждения",
      "status.signed": "Подписан",
      "status.declined": "Отклонён",
      
      // Common
      "common.close": "Закрыть",
      "common.cancel": "Отмена",
      "common.confirm": "Подтвердить",
      "common.loading": "Загрузка...",
      "common.error": "Ошибка",
      "common.success": "Успешно",
    }
  },
  kk: {
    translation: {
      // Landing
      "landing.hero.title": "Келісімшарттарды қашықтан қол қойыңыз",
      "landing.hero.subtitle": "SMS арқылы тексерумен қашықтан шарт жасау үшін қауіпсіз платформа",
      "landing.hero.cta": "Келісімшарт құру",
      "landing.nav.features": "Мүмкіндіктер",
      "landing.nav.pricing": "Тарифтер",
      "landing.nav.faq": "Сұрақтар",
      "landing.nav.login": "Кіру",
      "landing.nav.register": "Тіркелу",
      
      // Auth
      "auth.login.title": "Жүйеге кіру",
      "auth.login.email": "Email",
      "auth.login.password": "Құпия сөз",
      "auth.login.submit": "Кіру",
      "auth.register.title": "Тіркелу",
      "auth.register.full_name": "Толық аты",
      "auth.register.phone": "Телефон",
      "auth.register.submit": "Тіркелу",
      
      // Dashboard
      "dashboard.title": "Басқару панелі",
      "dashboard.new_contract": "Жаңа келісімшарт",
      "dashboard.stats.active": "Белсенді келісімшарттар",
      "dashboard.stats.pending": "Қол қоюды күтуде",
      "dashboard.stats.signed": "Аптада қол қойылды",
      "dashboard.table.title": "Атауы",
      "dashboard.table.counterparty": "Контрагент",
      "dashboard.table.amount": "Сома",
      "dashboard.table.status": "Мәртебе",
      "dashboard.table.updated": "Жаңартылды",
      "dashboard.table.actions": "Әрекеттер",
      
      // Contract
      "contract.create.title": "Келісімшарт құру",
      "contract.title": "Келісімшарт атауы",
      "contract.content": "Мазмұны",
      "contract.signer_name": "Қол қоюшының аты",
      "contract.signer_phone": "Қол қоюшының телефоны",
      "contract.signer_email": "Қол қоюшының email",
      "contract.amount": "Сома",
      "contract.save": "Сақтау",
      "contract.send": "Жіберу",
      "contract.download": "PDF жүктеу",
      "contract.delete": "Жою",
      "contract.approve": "Бекіту",
      
      // Signing
      "signing.title": "Келісімшартқа қол қою",
      "signing.upload_document": "Жеке куәлікті жүктеу",
      "signing.verify_phone": "Телефонды растау",
      "signing.enter_otp": "6 таңбалы кодты енгізіңіз",
      "signing.resend": "Қайта жіберу",
      "signing.verify": "Растау",
      "signing.success": "Келісімшарт сәтті қол қойылды!",
      
      // Status
      "status.draft": "Жоба",
      "status.sent": "Жіберілді",
      "status.pending-signature": "Бекітуді күтуде",
      "status.signed": "Қол қойылды",
      "status.declined": "Қабылданбады",
      
      // Common
      "common.close": "Жабу",
      "common.cancel": "Болдырмау",
      "common.confirm": "Растау",
      "common.loading": "Жүктеу...",
      "common.error": "Қате",
      "common.success": "Сәтті",
    }
  },
  en: {
    translation: {
      // Landing
      "landing.hero.title": "Sign Contracts Remotely",
      "landing.hero.subtitle": "Secure platform for remote contract signing with SMS verification",
      "landing.hero.cta": "Create a contract",
      "landing.nav.features": "Features",
      "landing.nav.pricing": "Pricing",
      "landing.nav.faq": "FAQ",
      "landing.nav.login": "Log in",
      "landing.nav.register": "Register",
      
      // Auth
      "auth.login.title": "Log In",
      "auth.login.email": "Email",
      "auth.login.password": "Password",
      "auth.login.submit": "Log in",
      "auth.register.title": "Register",
      "auth.register.full_name": "Full name",
      "auth.register.phone": "Phone",
      "auth.register.submit": "Register",
      
      // Dashboard
      "dashboard.title": "Dashboard",
      "dashboard.new_contract": "New Contract",
      "dashboard.stats.active": "Active Contracts",
      "dashboard.stats.pending": "Pending Signatures",
      "dashboard.stats.signed": "Signed This Week",
      "dashboard.table.title": "Title",
      "dashboard.table.counterparty": "Counterparty",
      "dashboard.table.amount": "Amount",
      "dashboard.table.status": "Status",
      "dashboard.table.updated": "Updated",
      "dashboard.table.actions": "Actions",
      
      // Contract
      "contract.create.title": "Create Contract",
      "contract.title": "Contract Title",
      "contract.content": "Content",
      "contract.signer_name": "Signer Name",
      "contract.signer_phone": "Signer Phone",
      "contract.signer_email": "Signer Email",
      "contract.amount": "Amount",
      "contract.save": "Save",
      "contract.send": "Send",
      "contract.download": "Download PDF",
      "contract.delete": "Delete",
      "contract.approve": "Approve",
      
      // Signing
      "signing.title": "Sign Contract",
      "signing.upload_document": "Upload ID or Passport",
      "signing.verify_phone": "Verify Phone",
      "signing.enter_otp": "Enter 6-digit code",
      "signing.resend": "Resend",
      "signing.verify": "Verify",
      "signing.success": "Contract signed successfully!",
      
      // Status
      "status.draft": "Draft",
      "status.sent": "Sent",
      "status.pending-signature": "Pending Approval",
      "status.signed": "Signed",
      "status.declined": "Declined",
      
      // Common
      "common.close": "Close",
      "common.cancel": "Cancel",
      "common.confirm": "Confirm",
      "common.loading": "Loading...",
      "common.error": "Error",
      "common.success": "Success",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'ru',
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;