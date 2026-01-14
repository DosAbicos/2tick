import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import '../styles/neumorphism.css';

const OfferPage = () => {
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
            ПУБЛИЧНАЯ ОФЕРТА
          </h1>
          
          <div className="prose prose-gray max-w-none text-sm sm:text-base leading-relaxed space-y-6">
            <p className="text-gray-600 text-center mb-8">
              на оказание услуг по электронному документообороту и подписанию договоров
            </p>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">1. ОБЩИЕ ПОЛОЖЕНИЯ</h2>
              <p className="text-gray-700">
                1.1. Настоящая Публичная оферта (далее — «Оферта») является официальным предложением 
                ИП «AN Venture», БИН/ИИН 040825501172, в лице директора Нұрғожа Әділет Нұралнұлы, 
                действующего на основании свидетельства о регистрации (далее — «Исполнитель»), 
                адресованным неопределённому кругу лиц, заключить договор на оказание услуг по 
                электронному документообороту и подписанию договоров (далее — «Услуги») на условиях, 
                изложенных в настоящей Оферте.
              </p>
              <p className="text-gray-700">
                1.2. Акцептом настоящей Оферты является регистрация на сайте 2tick.kz и/или оплата 
                Услуг Исполнителя. Акцепт Оферты означает полное и безоговорочное принятие всех 
                условий настоящей Оферты.
              </p>
              <p className="text-gray-700">
                1.3. Настоящая Оферта вступает в силу с момента её акцепта и действует до полного 
                исполнения сторонами своих обязательств.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">2. ПРЕДМЕТ ОФЕРТЫ</h2>
              <p className="text-gray-700">
                2.1. Исполнитель обязуется оказать Заказчику услуги по электронному документообороту 
                и подписанию договоров посредством платформы 2tick.kz, а Заказчик обязуется принять 
                и оплатить данные Услуги в соответствии с выбранным тарифным планом.
              </p>
              <p className="text-gray-700">
                2.2. Перечень услуг включает:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Создание и редактирование электронных договоров</li>
                <li>Отправка договоров на подписание</li>
                <li>Верификация подписантов через SMS, звонок или Telegram</li>
                <li>Хранение подписанных документов</li>
                <li>Скачивание документов в формате PDF</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">3. ТАРИФЫ И ПОРЯДОК ОПЛАТЫ</h2>
              <p className="text-gray-700">
                3.1. Стоимость Услуг определяется в соответствии с выбранным тарифным планом:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li><strong>FREE</strong> — 0 ₸ (до 3 договоров, тестовый тариф)</li>
                <li><strong>START</strong> — 5 990 ₸/месяц (до 20 договоров)</li>
                <li><strong>BUSINESS</strong> — 14 990 ₸/месяц (до 50 договоров)</li>
              </ul>
              <p className="text-gray-700">
                3.2. <strong>Процедура оплаты:</strong>
              </p>
              <ol className="list-decimal pl-6 text-gray-700 space-y-1">
                <li>Выберите подходящий тарифный план в разделе «Тарифы» личного кабинета</li>
                <li>Нажмите кнопку «Оплатить»</li>
                <li>Вы будете перенаправлены на защищённую страницу платёжной системы</li>
                <li>Введите данные банковской карты (Visa, Mastercard)</li>
                <li>Подтвердите оплату</li>
                <li>После успешной оплаты тариф активируется автоматически</li>
              </ol>
              <p className="text-gray-700 mt-2">
                3.3. Оплата производится в тенге (₸) путём безналичного перечисления денежных средств 
                через платёжную систему FreedomPay. Принимаются карты Visa и Mastercard.
              </p>
              <p className="text-gray-700">
                3.4. Услуги считаются оплаченными с момента поступления денежных средств на счёт Исполнителя.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h2>
              <p className="text-gray-700">
                <strong>4.1. Исполнитель обязуется:</strong>
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Обеспечить доступ к платформе 24/7 (за исключением технических работ)</li>
                <li>Обеспечить сохранность данных Заказчика</li>
                <li>Оказывать техническую поддержку</li>
              </ul>
              <p className="text-gray-700 mt-3">
                <strong>4.2. Заказчик обязуется:</strong>
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Своевременно оплачивать Услуги</li>
                <li>Предоставлять достоверную информацию при регистрации</li>
                <li>Не использовать платформу в противоправных целях</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">5. ОТВЕТСТВЕННОСТЬ СТОРОН</h2>
              <p className="text-gray-700">
                5.1. Исполнитель не несёт ответственности за содержание документов, создаваемых Заказчиком.
              </p>
              <p className="text-gray-700">
                5.2. Исполнитель не несёт ответственности за убытки, возникшие вследствие 
                неправомерного использования платформы третьими лицами.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">6. СРОК ДЕЙСТВИЯ И РАСТОРЖЕНИЕ</h2>
              <p className="text-gray-700">
                6.1. Настоящая Оферта действует с момента акцепта до момента отказа от Услуг.
              </p>
              <p className="text-gray-700">
                6.2. Заказчик вправе отказаться от Услуг в любое время, направив уведомление на 
                электронную почту admin@2tick.kz.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">7. РЕКВИЗИТЫ ИСПОЛНИТЕЛЯ</h2>
              <div className="bg-gray-50 p-4 rounded-lg text-gray-700">
                <p><strong>ИП «AN Venture»</strong></p>
                <p>БИН/ИИН: 040825501172</p>
                <p>Адрес: г. Алматы, микрорайон Таугуль, дом 13, кв/офис 64</p>
                <p>Email: admin@2tick.kz</p>
                <p>Телефон: +7 707 400 3201</p>
                <p>Директор: Нұрғожа Әділет Нұралнұлы</p>
              </div>
            </section>

            <p className="text-gray-500 text-sm text-center mt-8">
              Дата публикации: {new Date().toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferPage;
