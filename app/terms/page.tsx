import type { Metadata } from "next"
import Link from "next/link"
import { getLocale } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return locale === "en"
    ? {
        title: "Terms of Service — TraveLLM",
        description: "Terms of use for TraveLLM, including affiliate program disclosures.",
      }
    : {
        title: "Условия использования — TraveLLM",
        description: "Правила использования сервиса TraveLLM, включая информацию о партнёрских программах и аффилиатных ссылках.",
      }
}

const COMPANY = "TraveLLM"
const EMAIL = "legal@travellm.ru"

export default async function TermsPage() {
  const locale = await getLocale()
  const isEn = locale === "en"

  const UPDATED = isEn ? "March 18, 2026" : "18 марта 2026 г."
  const DOMAIN = isEn ? "travellm.world" : "travellm.ru"

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">

        <div className="mb-12">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-flex items-center gap-2">
            {isEn ? "← Back to home" : "← Вернуться на главную"}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-6 mb-3">
            {isEn ? "Terms of Service" : "Условия использования"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEn ? "Last updated:" : "Последнее обновление:"} <strong>{UPDATED}</strong>
          </p>
          <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
            {isEn
              ? <>Please read these Terms carefully before using the Service. By using {COMPANY}, you confirm your agreement with all provisions below.</>
              : <>Пожалуйста, внимательно ознакомьтесь с настоящими Условиями перед использованием сервиса. Используя {COMPANY}, вы подтверждаете своё согласие со всеми пунктами.</>}
          </div>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "1. General Provisions" : "1. Общие положения"}
            </h2>
            <p>
              {isEn
                ? <>{COMPANY} (hereinafter &quot;the Service&quot;), available at <strong>{DOMAIN}</strong>, provides users with AI-powered tools for generating travel itineraries, storing trips, and receiving personalized recommendations. These Terms govern the use of the Service by individuals (hereinafter &quot;User&quot;).</>
                : <>Сервис {COMPANY} (далее — «Сервис»), доступный по адресу <strong>{DOMAIN}</strong>, предоставляет пользователям инструменты для AI-генерации туристических маршрутов, хранения поездок и получения рекомендаций. Настоящие Условия регулируют использование Сервиса физическими лицами (далее — «Пользователь»).</>}
            </p>
            <p className="mt-2">
              {isEn
                ? "By using the Service, you confirm that you are at least 18 years old and that you accept these Terms in full. If you disagree with any provision, please discontinue use of the Service."
                : "Пользуясь Сервисом, вы подтверждаете, что вам исполнилось 18 лет, и что вы принимаете настоящие Условия в полном объёме. Если вы не согласны с какими-либо положениями, пожалуйста, прекратите использование Сервиса."}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "2. Service Description" : "2. Описание Сервиса"}
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>{isEn ? "Personalized travel itinerary generation powered by AI (Gemini, DeepSeek)." : "Генерация персонализированных туристических маршрутов с помощью искусственного интеллекта (Gemini, DeepSeek)."}</li>
              <li>{isEn ? "Trip storage and management in your personal dashboard." : "Хранение и управление маршрутами в личном кабинете."}</li>
              <li>{isEn ? "AI chat for adjusting itineraries and getting answers to your questions." : "AI-чат для корректировки маршрутов и ответов на вопросы."}</li>
              <li>{isEn ? "Aggregation of up-to-date prices for flights, hotels, and activities through partner services." : "Агрегация актуальных цен на авиабилеты, отели и активности через партнёрские сервисы."}</li>
              <li>{isEn ? "10 free itinerary generations per month for each registered user." : "10 бесплатных генераций маршрутов в месяц для каждого зарегистрированного пользователя."}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "3. AI Content Disclaimer" : "3. Ответственность за AI-контент"}
            </h2>
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 mb-3">
              {isEn
                ? <><strong>Important:</strong> {COMPANY} uses artificial intelligence to generate itineraries. AI can make mistakes.</>
                : <><strong>Важно:</strong> {COMPANY} использует искусственный интеллект для генерации маршрутов. AI может допускать ошибки.</>}
            </div>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                {isEn
                  ? <><strong>Flight and hotel prices</strong> are approximate and may not reflect current rates at the time of booking.</>
                  : <><strong>Цены на билеты и отели</strong> носят ориентировочный характер и могут не соответствовать актуальным тарифам в момент бронирования.</>}
              </li>
              <li>
                {isEn
                  ? <><strong>Transport schedules</strong> (flights, trains) may change — always check the latest schedules on carrier websites.</>
                  : <><strong>Расписание транспорта</strong> (рейсы, поезда) может изменяться — всегда проверяйте актуальное расписание на сайтах перевозчиков.</>}
              </li>
              <li>
                {isEn
                  ? <><strong>Visa requirements</strong> — AI provides general information only; check official requirements with embassies and consulates.</>
                  : <><strong>Визовые требования</strong> — AI предоставляет общую информацию; официальные требования уточняйте в посольствах и консульствах.</>}
              </li>
              <li>
                {isEn
                  ? <><strong>Business hours</strong> (restaurants, museums, attractions) — verify before visiting.</>
                  : <><strong>Режим работы заведений</strong> (рестораны, музеи, аттракционы) — проверяйте перед посещением.</>}
              </li>
              <li>
                {isEn
                  ? <><strong>Destination safety</strong> — AI is not an official source of travel advisories. Always check current government warnings.</>
                  : <><strong>Безопасность направлений</strong> — AI не является источником официальных рекомендаций МИД. Следите за актуальными предупреждениями.</>}
              </li>
            </ul>
            <p className="mt-3">
              {isEn
                ? <>{COMPANY} is not liable for any losses resulting from reliance on AI recommendations without independent verification.</>
                : <>{COMPANY} не несёт ответственности за убытки, возникшие вследствие использования AI-рекомендаций без самостоятельной проверки информации.</>}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "4. Affiliate Programs & Affiliate Links" : "4. Партнёрские программы и аффилиатные ссылки"}
            </h2>
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-200 mb-4">
              {isEn
                ? <><strong>Disclosure:</strong> {COMPANY} participates in affiliate programs. Some links in itineraries and on the website are affiliate links — if you click through and make a purchase, we may earn a commission <strong>at no extra cost to you</strong>. This helps us keep the Service free for users.</>
                : <><strong>Раскрытие информации:</strong> {COMPANY} участвует в партнёрских (аффилиатных) программах. Некоторые ссылки в маршрутах и на сайте являются аффилиатными — при переходе и совершении покупки мы можем получать комиссионное вознаграждение <strong>без дополнительных затрат для вас</strong>. Это позволяет нам поддерживать работу Сервиса бесплатно для пользователей.</>}
            </div>

            <p className="font-semibold text-foreground mb-2">
              {isEn
                ? <>{COMPANY} participates in the following affiliate programs:</>
                : <>Партнёрские программы, в которых участвует {COMPANY}:</>}
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground">TravelPayouts (Travelpayouts.com)</p>
                <p className="mt-1">
                  {isEn
                    ? "A travel affiliate marketing platform. Through TravelPayouts we work with the following services:"
                    : "Платформа аффилиатного маркетинга в сфере туризма. Через TravelPayouts мы работаем со следующими сервисами:"}
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Aviasales</strong> — {isEn ? "flight search & comparison" : "поиск и сравнение авиабилетов"}</li>
                  <li><strong>Hotellook</strong> — {isEn ? "hotel price aggregator" : "агрегатор цен на отели"}</li>
                  <li><strong>Ostrovok.ru</strong> — {isEn ? "hotel booking" : "бронирование отелей"}</li>
                  <li><strong>Kiwitaxi</strong> — {isEn ? "transfers & taxi" : "трансферы и такси"}</li>
                  <li>{isEn ? <><strong>Strahovka.ru</strong> — travel insurance</> : <><strong>Страховка.ру</strong> — туристическое страхование</>}</li>
                  <li><strong>Rentalcars</strong> — {isEn ? "car rental" : "аренда автомобилей"}</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground">Booking.com Partner Programme</p>
                <p className="mt-1">
                  {isEn
                    ? <>Hotel booking links via Booking.com may contain an affiliate marker. Booking.com policy: <a href="https://www.booking.com/content/affiliates.ru.html" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">booking.com/affiliates</a></>
                    : <>Ссылки на бронирование отелей через Booking.com могут содержать аффилиатный маркер. Политика Booking.com: <a href="https://www.booking.com/content/affiliates.ru.html" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">booking.com/affiliates</a></>}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground">GetYourGuide Affiliate Program</p>
                <p className="mt-1">
                  {isEn
                    ? <>Links to tours, excursions, and activities via GetYourGuide. <a href="https://affiliate.getyourguide.com/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">affiliate.getyourguide.com</a></>
                    : <>Ссылки на экскурсии, туры и активности через GetYourGuide. <a href="https://affiliate.getyourguide.com/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">affiliate.getyourguide.com</a></>}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground">Viator (TripAdvisor) Affiliate</p>
                <p className="mt-1">
                  {isEn
                    ? "Links to excursions and activities via Viator."
                    : "Ссылки на экскурсии и активности через Viator."}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground">Klook Affiliate Program</p>
                <p className="mt-1">
                  {isEn
                    ? "Links to travel activities and attractions via Klook."
                    : "Ссылки на туристические активности и аттракционы через Klook."}
                </p>
              </div>
            </div>

            <p className="mt-4">
              {isEn
                ? <><strong>Affiliate links do not affect the objectivity of AI recommendations.</strong> Itineraries are generated based on user preferences, not affiliate considerations. We recommend comparing prices across multiple platforms before booking.</>
                : <>Наличие аффилиатных ссылок <strong>не влияет на объективность AI-рекомендаций</strong>. Маршруты генерируются исходя из предпочтений пользователя, а не из партнёрских соображений. Мы рекомендуем самостоятельно сравнивать цены на нескольких платформах перед бронированием.</>}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "5. Generation Limits" : "5. Лимиты генераций"}
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                {isEn
                  ? "Each registered user receives 10 AI itinerary generations per calendar month at no charge."
                  : "Каждый зарегистрированный пользователь получает 10 AI-генераций маршрутов в календарный месяц бесплатно."}
              </li>
              <li>
                {isEn
                  ? "The generation counter resets on the 1st of each month."
                  : "Счётчик генераций обнуляется 1-го числа каждого месяца."}
              </li>
              <li>
                {isEn
                  ? "If the monthly limit is exceeded, itinerary generation will be temporarily unavailable until the next reset. All other features (viewing trips, AI chat, sharing) remain accessible."
                  : "При исчерпании месячного лимита генерация маршрутов будет временно недоступна до следующего сброса. Все остальные функции (просмотр поездок, AI-чат, шеринг) остаются доступными."}
              </li>
              <li>
                {isEn
                  ? <>We reserve the right to change the generation limit with at least 14 days&apos; notice by email.</>
                  : "Мы вправе изменять лимит генераций с уведомлением по email не менее чем за 14 дней."}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "6. User Rights & Obligations" : "6. Права и обязанности пользователя"}
            </h2>
            <p className="font-semibold text-foreground mb-1">
              {isEn ? "Users have the right to:" : "Пользователь вправе:"}
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>{isEn ? "Create, edit, and delete their itineraries." : "Создавать, редактировать и удалять свои маршруты."}</li>
              <li>{isEn ? "Export personal data — upon request, within 30 days." : "Экспортировать личные данные — по запросу в течение 30 дней."}</li>
              <li>{isEn ? "Request account deletion along with all associated data." : "Запросить удаление аккаунта и всех связанных данных."}</li>
            </ul>
            <p className="font-semibold text-foreground mb-1">
              {isEn ? "Users are prohibited from:" : "Пользователю запрещено:"}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{isEn ? "Commercially reselling AI-generated itineraries without written permission." : "Использовать Сервис для коммерческого перепродажи AI-маршрутов без письменного разрешения."}</li>
              <li>{isEn ? "Automated scraping of Service content." : "Автоматически парсить контент Сервиса."}</li>
              <li>{isEn ? "Taking actions that could harm Service infrastructure." : "Предпринимать действия, способные навредить инфраструктуре Сервиса."}</li>
              <li>{isEn ? "Circumventing security systems, rate limits, or authentication mechanisms." : "Обходить системы защиты, лимиты запросов и механизмы авторизации."}</li>
              <li>{isEn ? "Using the Service to generate content that violates applicable laws." : "Использовать Сервис для генерации контента, нарушающего законодательство РФ."}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "7. Intellectual Property" : "7. Интеллектуальная собственность"}
            </h2>
            <p>
              {isEn
                ? <>All AI-generated itineraries are the result of combined use of {COMPANY} technology and user data. Generated itineraries are provided for personal, non-commercial use. The design, logos, source code, and trademarks of {COMPANY} are the exclusive property of the Service.</>
                : <>Все AI-сгенерированные маршруты являются результатом совместного использования технологий {COMPANY} и данных пользователя. Сгенерированные маршруты предоставляются для личного некоммерческого использования. Дизайн, логотипы, программный код и торговые марки {COMPANY} являются исключительной собственностью сервиса.</>}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "8. Limitation of Liability" : "8. Ограничение ответственности"}
            </h2>
            <p>
              {isEn
                ? <>{COMPANY} is provided &quot;as is.&quot; {COMPANY} does not guarantee uninterrupted operation of the Service, accuracy of AI recommendations, or availability of prices and inventory. {COMPANY}&apos;s total liability to the user shall not exceed the amount paid by the user for the Service in the preceding 3 months.</>
                : <>Сервис предоставляется «как есть» (as is). {COMPANY} не гарантирует бесперебойную работу Сервиса, точность AI-рекомендаций, актуальность цен и наличие мест. Совокупная ответственность {COMPANY} перед пользователем не может превышать суммы, уплаченной им за подписку за последние 3 месяца.</>}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "9. Changes to Terms" : "9. Изменение условий"}
            </h2>
            <p>
              {isEn
                ? "We may update these Terms from time to time. We will notify users of significant changes by email at least 14 days in advance. Continued use of the Service after the updated Terms take effect constitutes acceptance."
                : "Мы вправе изменять настоящие Условия. При существенных изменениях уведомляем пользователей по email не менее чем за 14 дней. Продолжение использования Сервиса после вступления в силу новых Условий означает их принятие."}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "10. Governing Law" : "10. Применимое право"}
            </h2>
            <p>
              {isEn
                ? <>These Terms are governed by applicable laws. All disputes shall be resolved in the courts having jurisdiction at the location of {COMPANY}.</>
                : <>Настоящие Условия регулируются законодательством Российской Федерации. Все споры рассматриваются в судах общей юрисдикции по месту нахождения {COMPANY}.</>}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "11. Contact Us" : "11. Контакты"}
            </h2>
            <p>
              {isEn
                ? "For questions regarding these Terms, please contact:"
                : "По вопросам, связанным с настоящими Условиями, обращайтесь:"}
            </p>
            <ul className="mt-2 space-y-1">
              <li>Email: <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a></li>
              <li>Telegram: <a href="https://t.me/travellm_support_bot" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">@travellm_support_bot</a></li>
            </ul>
          </section>

          <div className="pt-6 border-t border-border flex flex-wrap gap-4 text-xs">
            <Link href="/privacy" className="text-sky-400 hover:underline">
              {isEn ? "Privacy Policy" : "Политика конфиденциальности"}
            </Link>
            <Link href="/cookies" className="text-sky-400 hover:underline">
              {isEn ? "Cookie Policy" : "Политика cookies"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
