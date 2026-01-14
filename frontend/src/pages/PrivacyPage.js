import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
          На главную
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
            ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ
          </h1>
          
          <div className="prose prose-gray max-w-none text-sm sm:text-base leading-relaxed space-y-6">
            <p className="text-gray-600 text-center mb-8">
              Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
            </p>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">1. ОБЩИЕ ПОЛОЖЕНИЯ</h2>
              <p className="text-gray-700">
                1.1. Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок 
                обработки и защиты персональных данных пользователей сервиса 2tick.kz (далее — «Сервис»), 
                принадлежащего ИП «AN Venture» (БИН/ИИН: 040825501172).
              </p>
              <p className="text-gray-700">
                1.2. Используя Сервис, вы соглашаетесь с условиями настоящей Политики.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">2. СОБИРАЕМЫЕ ДАННЫЕ</h2>
              <p className="text-gray-700">
                2.1. Мы собираем следующие персональные данные:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>ФИО</li>
                <li>Адрес электронной почты</li>
                <li>Номер телефона</li>
                <li>ИИН/БИН (для юридических лиц)</li>
                <li>Юридический адрес</li>
                <li>Данные о создаваемых договорах</li>
                <li>IP-адрес и данные об устройстве</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">3. ЦЕЛИ ОБРАБОТКИ ДАННЫХ</h2>
              <p className="text-gray-700">
                3.1. Персональные данные обрабатываются в следующих целях:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Регистрация и идентификация пользователей</li>
                <li>Оказание услуг по электронному документообороту</li>
                <li>Верификация подписантов договоров</li>
                <li>Связь с пользователями (техподдержка, уведомления)</li>
                <li>Улучшение качества Сервиса</li>
                <li>Выполнение требований законодательства РК</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">4. ЗАЩИТА ДАННЫХ</h2>
              <p className="text-gray-700">
                4.1. Мы применяем следующие меры защиты:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Шифрование данных при передаче (SSL/TLS)</li>
                <li>Безопасное хранение паролей (хеширование)</li>
                <li>Регулярное резервное копирование</li>
                <li>Ограничение доступа к данным</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">5. ПЕРЕДАЧА ДАННЫХ ТРЕТЬИМ ЛИЦАМ</h2>
              <p className="text-gray-700">
                5.1. Мы не продаём и не передаём ваши персональные данные третьим лицам, за исключением:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Контрагентов по подписываемым договорам (в рамках оказания услуг)</li>
                <li>Государственных органов по законному запросу</li>
                <li>Платёжных систем для обработки оплаты</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">6. ХРАНЕНИЕ ДАННЫХ</h2>
              <p className="text-gray-700">
                6.1. Персональные данные хранятся в течение срока действия учётной записи и 3 (трёх) 
                лет после её удаления.
              </p>
              <p className="text-gray-700">
                6.2. Подписанные договоры хранятся в течение 5 (пяти) лет в соответствии с 
                требованиями законодательства.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">7. ПРАВА ПОЛЬЗОВАТЕЛЕЙ</h2>
              <p className="text-gray-700">
                7.1. Вы имеете право:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Получить информацию о своих персональных данных</li>
                <li>Требовать исправления неточных данных</li>
                <li>Требовать удаления данных (с учётом законодательных ограничений)</li>
                <li>Отозвать согласие на обработку данных</li>
              </ul>
              <p className="text-gray-700 mt-2">
                Для реализации своих прав обратитесь по адресу: admin@2tick.kz
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">8. ФАЙЛЫ COOKIE</h2>
              <p className="text-gray-700">
                8.1. Сервис использует файлы cookie для:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Авторизации пользователей</li>
                <li>Сохранения настроек интерфейса</li>
                <li>Аналитики использования Сервиса</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">9. КОНТАКТНАЯ ИНФОРМАЦИЯ</h2>
              <div className="bg-gray-50 p-4 rounded-lg text-gray-700">
                <p><strong>ИП «AN Venture»</strong></p>
                <p>БИН/ИИН: 040825501172</p>
                <p>Адрес: г. Алматы, микрорайон Таугуль, дом 13, кв/офис 64</p>
                <p>Email: admin@2tick.kz</p>
                <p>Телефон: +7 707 400 3201</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
