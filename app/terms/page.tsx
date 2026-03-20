import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Условия использования — TraveLLM",
  description: "Правила использования сервиса TraveLLM, включая информацию о партнёрских программах и аффилиатных ссылках.",
}

const UPDATED = "18 марта 2026 г."
const COMPANY = "TraveLLM"
const DOMAIN = "travellm.ru"
const EMAIL = "legal@travellm.ru"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">

        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-flex items-center gap-2">
            ← Вернуться на главную
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-6 mb-3">
            Условия использования
          </h1>
          <p className="text-muted-foreground text-sm">
            Последнее обновление: <strong>{UPDATED}</strong>
          </p>
          <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
            Пожалуйста, внимательно ознакомьтесь с настоящими Условиями перед использованием сервиса. Используя {COMPANY}, вы подтверждаете своё согласие со всеми пунктами.
          </div>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">1. Общие положения</h2>
            <p>Сервис {COMPANY} (далее — «Сервис»), доступный по адресу <strong>{DOMAIN}</strong>, предоставляет пользователям инструменты для AI-генерации туристических маршрутов, хранения поездок и получения рекомендаций. Настоящие Условия регулируют использование Сервиса физическими лицами (далее — «Пользователь»).</p>
            <p className="mt-2">Пользуясь Сервисом, вы подтверждаете, что вам исполнилось 18 лет, и что вы принимаете настоящие Условия в полном объёме. Если вы не согласны с какими-либо положениями, пожалуйста, прекратите использование Сервиса.</p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">2. Описание Сервиса</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Генерация персонализированных туристических маршрутов с помощью искусственного интеллекта (Gemini, DeepSeek).</li>
              <li>Хранение и управление маршрутами в личном кабинете.</li>
              <li>AI-чат для корректировки маршрутов и ответов на вопросы.</li>
              <li>Агрегация актуальных цен на авиабилеты, отели и активности через партнёрские сервисы.</li>
              <li>PRO-подписка с расширенными возможностями (бесплатный пробный период 7 дней для новых пользователей).</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">3. Ответственность за AI-контент</h2>
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 mb-3">
              <strong>Важно:</strong> {COMPANY} использует искусственный интеллект для генерации маршрутов. AI может допускать ошибки.
            </div>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Цены на билеты и отели</strong> носят ориентировочный характер и могут не соответствовать актуальным тарифам в момент бронирования.</li>
              <li><strong>Расписание транспорта</strong> (рейсы, поезда) может изменяться — всегда проверяйте актуальное расписание на сайтах перевозчиков.</li>
              <li><strong>Визовые требования</strong> — AI предоставляет общую информацию; официальные требования уточняйте в посольствах и консульствах.</li>
              <li><strong>Режим работы заведений</strong> (рестораны, музеи, аттракционы) — проверяйте перед посещением.</li>
              <li><strong>Безопасность направлений</strong> — AI не является источником официальных рекомендаций МИД. Следите за актуальными предупреждениями.</li>
            </ul>
            <p className="mt-3">{COMPANY} не несёт ответственности за убытки, возникшие вследствие использования AI-рекомендаций без самостоятельной проверки информации.</p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">4. Партнёрские программы и аффилиатные ссылки</h2>
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-200 mb-4">
              <strong>Раскрытие информации:</strong> {COMPANY} участвует в партнёрских (аффилиатных) программах. Некоторые ссылки в маршрутах и на сайте являются аффилиатными — при переходе и совершении покупки мы можем получать комиссионное вознаграждение <strong>без дополнительных затрат для вас</strong>. Это позволяет нам поддерживать работу Сервиса бесплатно для пользователей.
            </div>

            <p className="font-semibold text-foreground mb-2">Партнёрские программы, в которых участвует {COMPANY}:</p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground">TravelPayouts (Travelpayouts.com)</p>
                <p className="mt-1">Платформа аффилиатного маркетинга в сфере туризма. Через TravelPayouts мы работаем со следующими сервисами:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Aviasales</strong> — поиск и сравнение авиабилетов</li>
                  <li><strong>Hotellook</strong> — агрегатор цен на отели</li>
                  <li><strong>Ostrovok.ru</strong> — бронирование отелей</li>
                  <li><strong>Kiwitaxi</strong> — трансферы и такси</li>
                  <li><strong>Страховка.ру</strong> — туристическое страхование</li>
                  <li><strong>Rentalcars</strong> — аренда автомобилей</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground">Booking.com Partner Programme</p>
                <p className="mt-1">Ссылки на бронирование отелей через Booking.com могут содержать аффилиатный маркер. Политика Booking.com: <a href="https://www.booking.com/content/affiliates.ru.html" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">booking.com/affiliates</a></p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground">GetYourGuide Affiliate Program</p>
                <p className="mt-1">Ссылки на экскурсии, туры и активности через GetYourGuide. <a href="https://affiliate.getyourguide.com/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">affiliate.getyourguide.com</a></p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground">Viator (TripAdvisor) Affiliate</p>
                <p className="mt-1">Ссылки на экскурсии и активности через Viator.</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground">Klook Affiliate Program</p>
                <p className="mt-1">Ссылки на туристические активности и аттракционы через Klook.</p>
              </div>
            </div>

            <p className="mt-4">Наличие аффилиатных ссылок <strong>не влияет на объективность AI-рекомендаций</strong>. Маршруты генерируются исходя из предпочтений пользователя, а не из партнёрских соображений. Мы рекомендуем самостоятельно сравнивать цены на нескольких платформах перед бронированием.</p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">5. PRO-подписка</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Бесплатный пробный период</strong> — 7 дней для всех новых пользователей после регистрации, без привязки карты.</li>
              <li>После окончания пробного периода доступ к PRO-функциям прекращается, если подписка не оформлена.</li>
              <li>Тарифы и условия подписки указаны на странице тарифов. Мы вправе изменять тарифы с уведомлением за 30 дней.</li>
              <li>Возврат средств за оплаченный период производится по письменному запросу на <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a> в течение 14 дней с момента оплаты, если услугами не пользовались.</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">6. Права и обязанности пользователя</h2>
            <p className="font-semibold text-foreground mb-1">Пользователь вправе:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Создавать, редактировать и удалять свои маршруты.</li>
              <li>Экспортировать личные данные — по запросу в течение 30 дней.</li>
              <li>Запросить удаление аккаунта и всех связанных данных.</li>
            </ul>
            <p className="font-semibold text-foreground mb-1">Пользователю запрещено:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Использовать Сервис для коммерческого перепродажи AI-маршрутов без письменного разрешения.</li>
              <li>Автоматически парсить контент Сервиса.</li>
              <li>Предпринимать действия, способные навредить инфраструктуре Сервиса.</li>
              <li>Обходить системы защиты, лимиты запросов и механизмы авторизации.</li>
              <li>Использовать Сервис для генерации контента, нарушающего законодательство РФ.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">7. Интеллектуальная собственность</h2>
            <p>Все AI-сгенерированные маршруты являются результатом совместного использования технологий {COMPANY} и данных пользователя. Сгенерированные маршруты предоставляются для личного некоммерческого использования. Дизайн, логотипы, программный код и торговые марки {COMPANY} являются исключительной собственностью сервиса.</p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">8. Ограничение ответственности</h2>
            <p>Сервис предоставляется «как есть» (as is). {COMPANY} не гарантирует бесперебойную работу Сервиса, точность AI-рекомендаций, актуальность цен и наличие мест. Совокупная ответственность {COMPANY} перед пользователем не может превышать суммы, уплаченной им за подписку за последние 3 месяца.</p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">9. Изменение условий</h2>
            <p>Мы вправе изменять настоящие Условия. При существенных изменениях уведомляем пользователей по email не менее чем за 14 дней. Продолжение использования Сервиса после вступления в силу новых Условий означает их принятие.</p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">10. Применимое право</h2>
            <p>Настоящие Условия регулируются законодательством Российской Федерации. Все споры рассматриваются в судах общей юрисдикции по месту нахождения {COMPANY}.</p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">11. Контакты</h2>
            <p>По вопросам, связанным с настоящими Условиями, обращайтесь:</p>
            <ul className="mt-2 space-y-1">
              <li>Email: <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a></li>
              <li>Telegram: <a href="https://t.me/travellm_support_bot" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">@travellm_support_bot</a></li>
            </ul>
          </section>

          {/* Footer nav */}
          <div className="pt-6 border-t border-border flex flex-wrap gap-4 text-xs">
            <Link href="/privacy" className="text-sky-400 hover:underline">Политика конфиденциальности</Link>
            <Link href="/cookies" className="text-sky-400 hover:underline">Политика cookies</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
