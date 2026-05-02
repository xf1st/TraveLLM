import type { Metadata } from "next"
import Link from "next/link"
import { getLocale } from "next-intl/server"
import { LEGAL, LEGAL_DOCUMENT_VERSION } from "@/lib/legal"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()

  return locale === "en"
    ? {
        title: "Personal Data Processing Consent — TraveLLM",
        description: "Consent terms for processing personal data in TraveLLM.",
      }
    : {
        title: "Согласие на обработку персональных данных — TraveLLM",
        description: "Условия согласия на обработку персональных данных в TraveLLM.",
      }
}

export default async function PersonalDataConsentPage() {
  const locale = await getLocale()
  const isEn = locale === "en"

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Link href="/" className="mb-8 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground">
          {isEn ? "Back to home" : "Вернуться на главную"}
        </Link>

        <div className="mb-10">
          <p className="text-sm text-muted-foreground">
            {isEn ? "Version:" : "Версия:"} <strong>{LEGAL_DOCUMENT_VERSION}</strong>
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {isEn ? "Personal Data Processing Consent" : "Согласие на обработку персональных данных"}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {isEn
              ? "This consent is a separate document and applies when a user creates an account, signs in via OAuth, submits trip preferences, writes to AI chat, or contacts support."
              : "Это согласие является отдельным документом и применяется при регистрации, входе через OAuth, отправке параметров поездки, сообщениях в AI-чате и обращениях в поддержку."}
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="rounded-2xl border border-border bg-muted/25 p-5">
            <h2 className="mb-3 text-lg font-bold text-foreground">
              {isEn ? "Controller" : "Оператор персональных данных"}
            </h2>
            <dl className="space-y-2">
              <div><dt className="font-semibold text-foreground">{isEn ? "Name" : "Наименование"}</dt><dd>{LEGAL.operatorName}</dd></div>
              <div><dt className="font-semibold text-foreground">ИНН</dt><dd>{LEGAL.operatorInn}</dd></div>
              <div><dt className="font-semibold text-foreground">ОГРН/ОГРНИП</dt><dd>{LEGAL.operatorOgrn}</dd></div>
              <div><dt className="font-semibold text-foreground">{isEn ? "Postal address" : "Почтовый адрес"}</dt><dd>{LEGAL.operatorAddress}</dd></div>
              <div><dt className="font-semibold text-foreground">Email</dt><dd><a href={`mailto:${LEGAL.privacyEmail}`} className="text-sky-400 hover:underline">{LEGAL.privacyEmail}</a></dd></div>
            </dl>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-foreground">{isEn ? "Purposes" : "Цели обработки"}</h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>{isEn ? "Creating and maintaining the user account." : "Создание и обслуживание аккаунта пользователя."}</li>
              <li>{isEn ? "Generating, saving, editing, and sharing travel itineraries." : "Генерация, сохранение, редактирование и совместное использование маршрутов."}</li>
              <li>{isEn ? "Providing AI chat, support replies, service notifications, security, abuse prevention, and legal compliance." : "Работа AI-чата, ответы поддержки, сервисные уведомления, безопасность, предотвращение злоупотреблений и соблюдение закона."}</li>
              <li>{isEn ? "Aggregated product analytics and service improvement." : "Агрегированная аналитика продукта и улучшение сервиса."}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-foreground">{isEn ? "Data categories" : "Перечень данных"}</h2>
            <p>
              {isEn
                ? "Email, name or nickname, OAuth profile identifiers and avatar if used, trip destinations and dates, budget, preferences, traveler composition, AI chat messages, uploaded chat images, support messages, IP address, user agent, cookies/localStorage identifiers, request timestamps, AI usage counters, and referral or partner promo codes if provided."
                : "Email, имя или никнейм, идентификаторы и аватар OAuth-профиля при использовании, направления и даты поездок, бюджет, предпочтения, состав путешественников, сообщения AI-чата, загруженные в чат изображения, обращения в поддержку, IP-адрес, user-agent, идентификаторы cookies/localStorage, время запросов, счётчики использования AI, реферальные и партнёрские промокоды при наличии."}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-foreground">{isEn ? "Processing methods and retention" : "Способы обработки и срок хранения"}</h2>
            <p>
              {isEn
                ? "Processing may include collection, recording, systematization, storage, clarification, use, transfer to processors, blocking, deletion, and destruction using automated information systems. Account and trip data is retained until account deletion or consent withdrawal, unless a longer period is required by law. Technical logs are normally retained for up to 90 days."
                : "Обработка может включать сбор, запись, систематизацию, хранение, уточнение, использование, передачу обработчикам, блокирование, удаление и уничтожение с использованием автоматизированных информационных систем. Данные аккаунта и поездок хранятся до удаления аккаунта или отзыва согласия, если более длительный срок не требуется законом. Технические логи обычно хранятся до 90 дней."}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-foreground">{isEn ? "Withdrawal" : "Отзыв согласия"}</h2>
            <p>
              {isEn
                ? <>You may withdraw consent at any time by emailing <a href={`mailto:${LEGAL.privacyEmail}`} className="text-sky-400 hover:underline">{LEGAL.privacyEmail}</a> from the account email or by requesting account deletion in the Service. Withdrawal may make account features unavailable.</>
                : <>Вы можете отозвать согласие в любой момент, отправив письмо на <a href={`mailto:${LEGAL.privacyEmail}`} className="text-sky-400 hover:underline">{LEGAL.privacyEmail}</a> с email аккаунта или запросив удаление аккаунта в сервисе. После отзыва согласия функции аккаунта могут стать недоступны.</>}
            </p>
          </section>

          <section className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
            <h2 className="mb-3 text-lg font-bold text-foreground">{isEn ? "Important" : "Важно"}</h2>
            <p>
              {isEn
                ? <>By ticking the consent checkbox on the signup screen, the user confirms that the consent is voluntary, specific, informed, and unambiguous, and also accepts the <Link href="/privacy" className="text-sky-400 hover:underline">Privacy Policy</Link> and <Link href="/terms" className="text-sky-400 hover:underline">Terms of Service</Link>.</>
                : <>Ставя отметку согласия на экране регистрации, пользователь подтверждает, что согласие является добровольным, конкретным, информированным и однозначным, а также принимает <Link href="/privacy" className="text-sky-400 hover:underline">Политику конфиденциальности</Link> и <Link href="/terms" className="text-sky-400 hover:underline">Условия использования</Link>.</>}
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
