import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import '../styles/neumorphism.css';

const RefundPage = () => {
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
            ПРАВИЛА И ПОРЯДОК ВОЗВРАТА СРЕДСТВ
          </h1>
          
          <div className="prose prose-gray max-w-none text-sm sm:text-base leading-relaxed space-y-6">
            <p className="text-gray-600 text-center mb-8">
              Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
            </p>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">1. ОБЩИЕ ПОЛОЖЕНИЯ</h2>
              <p className="text-gray-700">
                1.1. Настоящие Правила определяют порядок возврата денежных средств за услуги, 
                оказываемые на платформе 2tick.kz (далее — «Сервис»).
              </p>
              <p className="text-gray-700">
                1.2. Оплачивая услуги Сервиса, вы соглашаетесь с настоящими Правилами.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">2. УСЛОВИЯ ВОЗВРАТА</h2>
              <p className="text-gray-700">
                2.1. Возврат денежных средств возможен в следующих случаях:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Полный возврат (100%)</strong> — в течение 3 (трёх) календарных дней с момента 
                  оплаты, если услугами Сервиса не пользовались (не создано ни одного договора).
                </li>
                <li>
                  <strong>Частичный возврат (50%)</strong> — в течение 7 (семи) календарных дней с момента 
                  оплаты, если создано не более 2 (двух) договоров.
                </li>
                <li>
                  <strong>Техническая неисправность</strong> — полный возврат в случае невозможности 
                  оказания услуг по техническим причинам со стороны Сервиса более 72 часов.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">3. СЛУЧАИ, КОГДА ВОЗВРАТ НЕ ПРОИЗВОДИТСЯ</h2>
              <p className="text-gray-700">
                3.1. Возврат денежных средств не производится в следующих случаях:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Прошло более 7 календарных дней с момента оплаты</li>
                <li>Создано более 2 договоров в рамках оплаченного периода</li>
                <li>Услуги не были оказаны по вине Заказчика</li>
                <li>Заказчик нарушил условия использования Сервиса</li>
                <li>Тарифный план FREE (бесплатный)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">4. ПОРЯДОК ПОДАЧИ ЗАЯВКИ НА ВОЗВРАТ</h2>
              <p className="text-gray-700">
                4.1. Для возврата средств необходимо:
              </p>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>
                  Направить заявку на возврат на электронную почту <strong>admin@2tick.kz</strong> 
                  с темой письма «Заявка на возврат».
                </li>
                <li>
                  В заявке указать:
                  <ul className="list-disc pl-6 mt-1 space-y-1">
                    <li>ФИО плательщика</li>
                    <li>Email, указанный при регистрации</li>
                    <li>Дату и сумму оплаты</li>
                    <li>Причину возврата</li>
                    <li>Реквизиты для возврата (номер карты или счёта)</li>
                  </ul>
                </li>
                <li>
                  Дождаться подтверждения от службы поддержки в течение 3 (трёх) рабочих дней.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">5. СРОКИ ВОЗВРАТА</h2>
              <p className="text-gray-700">
                5.1. После одобрения заявки возврат осуществляется в течение:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li><strong>3-5 рабочих дней</strong> — на банковскую карту</li>
                <li><strong>5-10 рабочих дней</strong> — на банковский счёт</li>
              </ul>
              <p className="text-gray-700 mt-2">
                5.2. Сроки зачисления могут отличаться в зависимости от банка получателя.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">6. АВТОПРОДЛЕНИЕ ПОДПИСКИ</h2>
              <p className="text-gray-700">
                6.1. При включённом автопродлении подписка продлевается автоматически.
              </p>
              <p className="text-gray-700">
                6.2. Для отмены автопродления необходимо отключить его в личном кабинете 
                не позднее чем за 1 (один) день до даты списания.
              </p>
              <p className="text-gray-700">
                6.3. Возврат за автоматически списанные средства возможен только в течение 
                24 часов после списания.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">7. КОНТАКТНАЯ ИНФОРМАЦИЯ</h2>
              <div className="bg-gray-50 p-4 rounded-lg text-gray-700">
                <p><strong>ИП «AN Venture»</strong></p>
                <p>БИН/ИИН: 040825501172</p>
                <p>Адрес: г. Алматы, микрорайон Таугуль, дом 13, кв/офис 64</p>
                <p>Email: admin@2tick.kz</p>
                <p>Телефон: +7 707 400 3201</p>
              </div>
            </section>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-8">
              <p className="text-blue-800 text-sm">
                <strong>Важно:</strong> Все спорные вопросы решаются путём переговоров. 
                Мы стремимся к справедливому решению каждой ситуации и всегда идём навстречу нашим клиентам.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPage;
