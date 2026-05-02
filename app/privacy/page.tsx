import type { Metadata } from "next"
import Link from "next/link"
import { getLocale } from "next-intl/server"
import { LEGAL } from "@/lib/legal"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return locale === "en"
    ? {
        title: "Privacy Policy — TraveLLM",
        description: "How TraveLLM collects, stores, and uses your personal data.",
      }
    : {
        title: "Политика конфиденциальности — TraveLLM",
        description: "Как TraveLLM собирает, хранит и использует ваши персональные данные.",
      }
}

const EMAIL = LEGAL.privacyEmail

export default async function PrivacyPage() {
  const locale = await getLocale()
  const isEn = locale === "en"

  const UPDATED = isEn ? "May 2, 2026" : "2 мая 2026 г."

  const providers = [
    {
      name: "Supabase Inc.",
      purpose: isEn ? "Database & authentication" : "База данных и авторизация",
      location: isEn ? "US / EU" : "США / ЕС",
      privacy: "https://supabase.com/privacy",
    },
    {
      name: "Google (Gemini API)",
      purpose: isEn ? "AI itinerary generation" : "AI-генерация маршрутов",
      location: isEn ? "US" : "США",
      privacy: "https://policies.google.com/privacy",
    },
    {
      name: "DeepSeek AI",
      purpose: isEn ? "AI generation (fallback)" : "AI-генерация (резервная)",
      location: isEn ? "China" : "Китай",
      privacy: "https://www.deepseek.com/privacy_policy",
    },
    {
      name: "OpenRouter",
      purpose: isEn ? "AI request routing" : "Маршрутизация AI-запросов",
      location: isEn ? "US" : "США",
      privacy: "https://openrouter.ai/privacy",
    },
    {
      name: "TravelPayouts",
      purpose: isEn
        ? "Affiliate links (Aviasales, Ostrovok, etc.)"
        : "Аффилиатные ссылки (Aviasales, Ostrovok и др.)",
      location: isEn ? "Russia / Cyprus" : "Россия / Кипр",
      privacy: "https://www.travelpayouts.com/ru/privacy",
    },
    {
      name: "Vercel / Coolify",
      purpose: isEn ? "Hosting & CDN" : "Хостинг и CDN",
      location: isEn ? "EU / US" : "ЕС / США",
      privacy: "https://vercel.com/legal/privacy-policy",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">

        <div className="mb-12">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-flex items-center gap-2">
            {isEn ? "← Back to home" : "← Вернуться на главную"}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-6 mb-3">
            {isEn ? "Privacy Policy" : "Политика конфиденциальности"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEn ? "Last updated:" : "Последнее обновление:"} <strong>{UPDATED}</strong>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {isEn
              ? "This Policy describes what data we collect, how we use it, and how we protect it, in accordance with applicable data protection laws."
              : "Настоящая Политика описывает, какие данные мы собираем, как их используем и защищаем, в соответствии с Федеральным законом № 152-ФЗ «О персональных данных»."}
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "1. Data Controller" : "1. Оператор персональных данных"}
            </h2>
            <p>
              {isEn
                ? <>The data controller is TraveLLM (hereinafter &quot;we&quot;, &quot;the Service&quot;). For data protection inquiries, contact us at: <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a>.</>
                : <>Оператором персональных данных является TraveLLM (далее — «мы», «Сервис»). Контакт по вопросам персональных данных: <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a>.</>}
            </p>
            <dl className="mt-4 grid gap-2 rounded-xl border border-border bg-muted/30 p-4">
              <div><dt className="font-semibold text-foreground">{isEn ? "Full legal name" : "Полное наименование"}</dt><dd>{LEGAL.operatorName}</dd></div>
              <div><dt className="font-semibold text-foreground">ИНН</dt><dd>{LEGAL.operatorInn}</dd></div>
              <div><dt className="font-semibold text-foreground">ОГРН/ОГРНИП</dt><dd>{LEGAL.operatorOgrn}</dd></div>
              <div><dt className="font-semibold text-foreground">{isEn ? "Postal address" : "Почтовый адрес"}</dt><dd>{LEGAL.operatorAddress}</dd></div>
            </dl>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "2. What Data We Collect" : "2. Какие данные мы собираем"}
            </h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">
                  {isEn ? "Account data" : "Данные аккаунта"}
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{isEn ? "Email address (from email signup or OAuth)" : "Email-адрес (при регистрации по email или OAuth)"}</li>
                  <li>{isEn ? "Name / nickname (if provided in profile settings)" : "Имя/никнейм (если указали при настройке профиля)"}</li>
                  <li>{isEn ? "Avatar (from Google/GitHub OAuth, if used)" : "Аватар (из Google/GitHub OAuth, если использовали)"}</li>
                  <li>{isEn ? "Registration date and last login date" : "Дата регистрации и дата последнего входа"}</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">
                  {isEn ? "Trip data" : "Данные путешествий"}
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{isEn ? "Itinerary parameters: destinations, dates, budget" : "Параметры маршрутов: направления, даты, бюджет"}</li>
                  <li>{isEn ? "Preferences: travel style, interests, dietary restrictions" : "Предпочтения: стиль путешествия, интересы, диетические ограничения"}</li>
                  <li>{isEn ? "AI-generated itineraries and edit history" : "Сгенерированные AI-маршруты и история изменений"}</li>
                  <li>{isEn ? "Messages in the AI assistant chat" : "Сообщения в чате с AI-ассистентом"}</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">
                  {isEn ? "Technical data" : "Технические данные"}
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{isEn ? "IP address (for abuse prevention, stored for up to 90 days)" : "IP-адрес (для защиты от злоупотреблений, хранится не более 90 дней)"}</li>
                  <li>{isEn ? "Browser user agent" : "User-agent браузера"}</li>
                  <li>
                    {isEn
                      ? <>Cookie and localStorage data (see our <Link href="/cookies" className="text-sky-400 hover:underline">Cookie Policy</Link>)</>
                      : <>Данные cookies и localStorage (см. <Link href="/cookies" className="text-sky-400 hover:underline">Политику cookies</Link>)</>}
                  </li>
                  <li>{isEn ? "AI usage statistics (request count, token usage)" : "Статистика использования AI (количество запросов, расход токенов)"}</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">
                  {isEn ? "Payment data" : "Данные об оплате"}
                </p>
                <p>
                  {isEn
                    ? <>We <strong>do not store</strong> credit card details. Payments are processed by third-party providers (Stripe / YooKassa). We only receive the transaction status and the payer&apos;s email.</>
                    : <>Мы <strong>не храним</strong> данные банковских карт. Платёжные операции обрабатываются сторонними провайдерами (Stripe / ЮKassa). Мы получаем только статус транзакции и email плательщика.</>}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "3. Purposes of Data Processing" : "3. Цели обработки персональных данных"}
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                {isEn
                  ? <><strong>Service delivery</strong> — providing core functionality: itinerary generation, trip storage, AI chat.</>
                  : <><strong>Исполнение договора</strong> — предоставление функционала Сервиса: генерация маршрутов, хранение поездок, AI-чат.</>}
              </li>
              <li>
                {isEn
                  ? <><strong>Personalization</strong> — improving AI recommendations based on your preferences.</>
                  : <><strong>Персонализация</strong> — улучшение AI-рекомендаций на основе ваших предпочтений.</>}
              </li>
              <li>
                {isEn
                  ? <><strong>Security</strong> — abuse prevention, rate limiting, suspicious activity detection.</>
                  : <><strong>Безопасность</strong> — защита от злоупотреблений, rate-limiting, обнаружение подозрительной активности.</>}
              </li>
              <li>
                {isEn
                  ? <><strong>Analytics &amp; product improvement</strong> — aggregated (anonymized) usage statistics.</>
                  : <><strong>Аналитика и улучшение продукта</strong> — агрегированная (обезличенная) статистика использования.</>}
              </li>
              <li>
                {isEn
                  ? <><strong>Communication</strong> — important service updates and support replies.</>
                  : <><strong>Коммуникация</strong> — уведомления о важных изменениях Сервиса, ответы на обращения в поддержку.</>}
              </li>
              <li>
                {isEn
                  ? <><strong>Legal compliance</strong> — meeting requirements of applicable laws.</>
                  : <><strong>Соблюдение законодательства</strong> — выполнение требований законов РФ.</>}
              </li>
            </ul>
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
              <p className="font-semibold text-foreground">
                {isEn ? "Legal grounds and methods" : "Правовые основания и способы обработки"}
              </p>
              <p className="mt-2">
                {isEn
                  ? "We process data based on user consent, performance of the user agreement, legal obligations, and legitimate security interests. Processing may include collection, recording, systematization, storage, clarification, use, transfer to processors, blocking, deletion, and destruction using automated systems."
                  : "Мы обрабатываем данные на основании согласия пользователя, исполнения пользовательского соглашения, требований закона и законного интереса по защите сервиса. Обработка может включать сбор, запись, систематизацию, хранение, уточнение, использование, передачу обработчикам, блокирование, удаление и уничтожение с использованием автоматизированных систем."}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "4. Data Sharing with Third Parties" : "4. Передача данных третьим лицам"}
            </h2>
            <p className="mb-3">
              {isEn
                ? "We share the minimum necessary data with the following third parties to operate the Service:"
                : "Мы передаём минимально необходимые данные следующим третьим лицам для обеспечения работы Сервиса:"}
            </p>
            <div className="space-y-3">
              {providers.map(item => (
                <div key={item.name} className="flex flex-col sm:flex-row sm:items-start gap-1 p-3 rounded-xl border border-border bg-muted/20">
                  <div className="sm:w-44 font-semibold text-foreground shrink-0">{item.name}</div>
                  <div className="flex-1 text-xs">
                    <span className="text-muted-foreground">{item.purpose} · {item.location} · </span>
                    <a href={item.privacy} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                      {isEn ? "Policy" : "Политика"}
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3">
              {isEn
                ? "We do not sell or share personal data with third parties for marketing purposes."
                : "Мы не продаём и не передаём персональные данные третьим лицам в маркетинговых целях."}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "5. Data Retention" : "5. Хранение данных"}
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>{isEn ? "Account data and itineraries are retained until the user deletes their account." : "Данные аккаунта и маршруты хранятся до удаления аккаунта пользователем."}</li>
              <li>{isEn ? "IP addresses and technical logs — no longer than 90 days." : "IP-адреса и технические логи — не более 90 дней."}</li>
              <li>{isEn ? "AI chat data is stored in the browser (localStorage) and can be cleared by the user at any time." : "Данные чата с AI — хранятся в браузере (localStorage) и могут быть удалены пользователем самостоятельно."}</li>
              <li>{isEn ? "After account deletion, all personal data is destroyed within 30 days (except data required to be retained by law)." : "После удаления аккаунта все персональные данные уничтожаются в течение 30 дней (кроме данных, хранение которых требует законодательство)."}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "6. Cross-Border Data Transfers" : "6. Трансграничная передача данных"}
            </h2>
            <p>
              {isEn
                ? "Some of our technical partners (Supabase, Google, OpenRouter) are located outside of Russia. Data transfers are carried out in compliance with applicable data protection laws. We take appropriate measures to ensure adequate protection of data during cross-border transfers."
                : "Ряд наших технических партнёров (Supabase, Google, OpenRouter) расположен за пределами РФ. Передача данных осуществляется в соответствии с требованиями ст. 12 Федерального закона № 152-ФЗ. Мы принимаем необходимые меры для обеспечения надлежащей защиты данных при трансграничной передаче."}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "7. Your Rights" : "7. Права субъекта персональных данных"}
            </h2>
            <p className="mb-2">
              {isEn
                ? "Under applicable data protection laws, you have the right to:"
                : "В соответствии с ФЗ № 152-ФЗ вы вправе:"}
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>{isEn ? <><strong>Access</strong> — request a copy of your personal data.</> : <><strong>Доступ</strong> — запросить копию ваших персональных данных.</>}</li>
              <li>{isEn ? <><strong>Rectification</strong> — request correction of inaccurate data.</> : <><strong>Исправление</strong> — потребовать исправления неточных данных.</>}</li>
              <li>{isEn ? <><strong>Erasure</strong> — request deletion of all your data (&quot;right to be forgotten&quot;).</> : <><strong>Удаление</strong> — запросить удаление всех ваших данных («право на забвение»).</>}</li>
              <li>{isEn ? <><strong>Restriction</strong> — request suspension of data processing.</> : <><strong>Ограничение</strong> — потребовать приостановки обработки данных.</>}</li>
              <li>{isEn ? <><strong>Portability</strong> — receive your data in a machine-readable format.</> : <><strong>Портируемость</strong> — получить данные в машиночитаемом формате.</>}</li>
              <li>{isEn ? <><strong>Withdraw consent</strong> — revoke your consent to data processing at any time.</> : <><strong>Отзыв согласия</strong> — отозвать согласие на обработку данных в любой момент.</>}</li>
            </ul>
            <p className="mt-3">
              {isEn
                ? <>To exercise your rights, send a request to <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a>. We will respond within 30 days.</>
                : <>Для реализации прав направьте запрос на <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a>. Срок ответа — 30 дней.</>}
            </p>
            {!isEn && (
              <p className="mt-2">
                Вы также вправе подать жалобу в Роскомнадзор (<a href="https://rkn.gov.ru" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">rkn.gov.ru</a>).
              </p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "8. Data Security" : "8. Безопасность данных"}
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>{isEn ? "All data is transmitted over HTTPS (TLS 1.2+)." : "Передача данных — только по HTTPS (TLS 1.2+)."}</li>
              <li>{isEn ? "Passwords are never stored in plain text (bcrypt via Supabase Auth)." : "Пароли не хранятся в открытом виде (bcrypt через Supabase Auth)."}</li>
              <li>{isEn ? "Row-Level Security (RLS) in Supabase ensures each user can only access their own data." : "Row-Level Security (RLS) в Supabase — каждый пользователь видит только свои данные."}</li>
              <li>{isEn ? "Rate limiting on all API endpoints to prevent brute-force attacks." : "Rate-limiting на все API-endpoints для защиты от перебора."}</li>
              <li>{isEn ? "Regular dependency audits for security vulnerabilities." : "Регулярный аудит зависимостей на уязвимости."}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "9. Personal Data Incidents" : "9. Инциденты с персональными данными"}
            </h2>
            <p>
              {isEn
                ? "If a personal data incident is detected, we register it internally, limit the impact, preserve evidence, assess harm, notify the competent authority where required, and complete the investigation within the statutory timeframe."
                : "При выявлении инцидента с персональными данными мы фиксируем его во внутреннем журнале, ограничиваем последствия, сохраняем доказательства, оцениваем вред, уведомляем уполномоченный орган в установленные законом сроки и завершаем расследование в предусмотренный срок."}
            </p>
            {!isEn && (
              <p className="mt-2">
                Для срочных сообщений об инцидентах используйте <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a> с темой «Инцидент ПДн».
              </p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "10. Children" : "10. Дети"}
            </h2>
            <p>
              {isEn
                ? "The Service is not intended for individuals under 18 years of age. We do not knowingly collect data from minors. If you become aware that a child has provided us with their data, please contact us."
                : "Сервис не предназначен для лиц моложе 18 лет. Мы намеренно не собираем данные несовершеннолетних. Если вам стало известно, что ребёнок передал нам свои данные, пожалуйста, свяжитесь с нами."}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "11. Changes to This Policy" : "11. Изменения Политики"}
            </h2>
            <p>
              {isEn
                ? "We will notify users of significant changes to this Policy by email at least 14 days in advance. The current version is always available at travellm.world/privacy."
                : "При существенных изменениях Политики мы уведомляем пользователей по email не менее чем за 14 дней. Актуальная версия всегда доступна на travellm.ru/privacy."}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "12. Contact Us" : "12. Контакты"}
            </h2>
            <ul className="space-y-1">
              <li>Email: <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a></li>
              <li>Telegram: <a href="https://t.me/travellm_support_bot" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">@travellm_support_bot</a></li>
            </ul>
          </section>

          <div className="pt-6 border-t border-border flex flex-wrap gap-4 text-xs">
            <Link href="/terms" className="text-sky-400 hover:underline">
              {isEn ? "Terms of Service" : "Условия использования"}
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
