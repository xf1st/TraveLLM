import type { Metadata } from "next"
import Link from "next/link"
import { getLocale } from "next-intl/server"
import { LEGAL } from "@/lib/legal"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return locale === "en"
    ? {
        title: "Cookie Policy — TraveLLM",
        description: "How TraveLLM uses cookies and similar technologies.",
      }
    : {
        title: "Политика cookies — TraveLLM",
        description: "Как TraveLLM использует файлы cookie и аналогичные технологии.",
      }
}

const EMAIL = LEGAL.privacyEmail

function getCookies(isEn: boolean) {
  return [
    {
      category: isEn ? "Essential" : "Необходимые",
      color: "#34d399",
      desc: isEn
        ? "The Service cannot function without these cookies. They cannot be disabled."
        : "Без этих cookies Сервис не может работать. Их нельзя отключить.",
      items: [
        {
          name: "sb-*-auth-token",
          provider: "Supabase",
          purpose: isEn ? "User authentication session" : "Сессия авторизации пользователя",
          duration: isEn ? "Until logout" : "До выхода из аккаунта",
          type: "HTTP Cookie",
        },
        {
          name: "sb-*-auth-token-code-verifier",
          provider: "Supabase",
          purpose: isEn ? "PKCE OAuth verification" : "PKCE верификация OAuth",
          duration: isEn ? "Session" : "Сессионный",
          type: "HTTP Cookie",
        },
        {
          name: "__cf_bm",
          provider: "Cloudflare",
          purpose: isEn ? "Bot protection" : "Защита от ботов",
          duration: isEn ? "30 minutes" : "30 минут",
          type: "HTTP Cookie",
        },
      ],
    },
    {
      category: isEn ? "Functional" : "Функциональные",
      color: "#85adff",
      desc: isEn
        ? "These remember your settings and preferences. Disabling them may degrade the user experience."
        : "Запоминают ваши настройки и предпочтения. Отключение ухудшит удобство использования.",
      items: [
        {
          name: "travellm_theme",
          provider: "TraveLLM",
          purpose: isEn ? "Theme preference (dark/light)" : "Тема оформления (тёмная/светлая)",
          duration: isEn ? "1 year" : "1 год",
          type: "localStorage",
        },
        {
          name: "travellm_welcome_seen",
          provider: "TraveLLM",
          purpose: isEn ? "Welcome screen shown flag" : "Флаг показа приветственного экрана",
          duration: isEn ? "Permanent" : "Постоянный",
          type: "localStorage",
        },
        {
          name: "travellm_hint_*",
          provider: "TraveLLM",
          purpose: isEn ? "UI tooltip shown flags" : "Флаги показанных подсказок интерфейса",
          duration: isEn ? "Permanent" : "Постоянный",
          type: "localStorage",
        },
        {
          name: "travellm_chat_*",
          provider: "TraveLLM",
          purpose: isEn ? "AI chat session history" : "История сессий AI-чата",
          duration: isEn ? "Until browser data is cleared" : "До очистки браузера",
          type: "localStorage",
        },
        {
          name: "travellm_cookies_consent",
          provider: "TraveLLM",
          purpose: isEn ? "Cookie policy acceptance status" : "Факт принятия настоящей политики cookies",
          duration: isEn ? "1 year" : "1 год",
          type: "localStorage",
        },
      ],
    },
    {
      category: isEn ? "Analytics" : "Аналитические",
      color: "#fbbf24",
      desc: isEn
        ? "Help us understand how users interact with the Service. All data is aggregated and anonymized."
        : "Помогают нам понимать, как пользователи используют Сервис. Данные агрегированы и обезличены.",
      items: [
        {
          name: "_ga, _ga_*",
          provider: "Google Analytics",
          purpose: isEn ? "Aggregated visit statistics (if GA is enabled)" : "Агрегированная статистика посещений (если подключён GA)",
          duration: isEn ? "2 years" : "2 года",
          type: "HTTP Cookie",
        },
        {
          name: "vercel-analytics-*",
          provider: "Vercel Analytics",
          purpose: isEn ? "Anonymous performance statistics" : "Анонимная статистика производительности",
          duration: isEn ? "Session" : "Сессионный",
          type: "HTTP Cookie",
        },
      ],
    },
    {
      category: isEn ? "Affiliate (partner)" : "Партнёрские (аффилиатные)",
      color: "#f472b6",
      desc: isEn
        ? "Set when you follow affiliate links to external services. They allow us to earn a commission at no extra cost to you."
        : "Устанавливаются при переходе по партнёрским ссылкам на внешние сервисы. Позволяют нам получать комиссию без дополнительных затрат для вас.",
      items: [
        {
          name: isEn ? "marker (GET parameter)" : "marker (GET-параметр)",
          provider: "TravelPayouts / Aviasales",
          purpose: isEn ? "Tracking clicks to Aviasales, Ostrovok, Hotellook" : "Отслеживание переходов на Aviasales, Ostrovok, Hotellook",
          duration: isEn ? "30 days (on partner site)" : "30 дней (на сайте партнёра)",
          type: isEn ? "Affiliate marker" : "Партнёрский маркер",
        },
        {
          name: "affid / aid",
          provider: "Booking.com",
          purpose: isEn ? "Tracking clicks to Booking.com" : "Отслеживание переходов на Booking.com",
          duration: isEn ? "30 days (on partner site)" : "30 дней (на сайте партнёра)",
          type: isEn ? "Affiliate marker" : "Партнёрский маркер",
        },
        {
          name: "partner_id",
          provider: "GetYourGuide",
          purpose: isEn ? "Tracking clicks to GetYourGuide" : "Отслеживание переходов на GetYourGuide",
          duration: isEn ? "30 days (on partner site)" : "30 дней (на сайте партнёра)",
          type: isEn ? "Affiliate marker" : "Партнёрский маркер",
        },
        {
          name: "affiliate_id",
          provider: "Viator / TripAdvisor",
          purpose: isEn ? "Tracking clicks to Viator" : "Отслеживание переходов на Viator",
          duration: isEn ? "30 days (on partner site)" : "30 дней (на сайте партнёра)",
          type: isEn ? "Affiliate marker" : "Партнёрский маркер",
        },
        {
          name: "aff_id",
          provider: "Klook",
          purpose: isEn ? "Tracking clicks to Klook" : "Отслеживание переходов на Klook",
          duration: isEn ? "30 days (on partner site)" : "30 дней (на сайте партнёра)",
          type: isEn ? "Affiliate marker" : "Партнёрский маркер",
        },
      ],
    },
  ]
}

export default async function CookiesPage() {
  const locale = await getLocale()
  const isEn = locale === "en"

  const UPDATED = isEn ? "May 2, 2026" : "2 мая 2026 г."
  const cookies = getCookies(isEn)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">

        <div className="mb-12">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-flex items-center gap-2">
            {isEn ? "← Back to home" : "← Вернуться на главную"}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-6 mb-3">
            {isEn ? "Cookie Policy" : "Политика cookies"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEn ? "Last updated:" : "Последнее обновление:"} <strong>{UPDATED}</strong>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {isEn
              ? "This Policy explains what cookies and similar technologies (localStorage, sessionStorage) we use, why we use them, and how you can manage them."
              : "Настоящая Политика объясняет, какие cookie-файлы и аналогичные технологии (localStorage, sessionStorage) мы используем, для чего и как вы можете ими управлять."}
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "What are cookies?" : "Что такое cookies?"}
            </h2>
            <p>
              {isEn
                ? "Cookies are small text files stored by your browser when you visit a website. They allow the Service to \"remember\" you between sessions — preserving your login state, settings, and preferences."
                : "Cookies — небольшие текстовые файлы, сохраняемые браузером при посещении сайта. Они позволяют Сервису «помнить» вас между сессиями: сохранять авторизацию, настройки и предпочтения."}
            </p>
            <p className="mt-2">
              {isEn
                ? <>In addition to cookies, we use <strong>localStorage</strong> — a browser storage mechanism that works similarly but is not sent to the server with every request.</>
                : <>Помимо cookies мы используем <strong>localStorage</strong> — хранилище браузера, которое работает аналогично, но не передаётся серверу с каждым запросом.</>}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "Your Consent" : "Ваше согласие"}
            </h2>
            <p>
              {isEn
                ? "When you first visit the Service, a banner appears with cookie choices. Essential cookies are always active. Analytics and partner tracking technologies should only be enabled after your consent; if they are not connected, the relevant rows below describe possible future integrations."
                : "При первом посещении Сервиса появляется баннер с выбором cookies. Необходимые cookies активны всегда. Аналитические и партнёрские трекеры должны включаться только после вашего согласия; если они не подключены, соответствующие строки ниже описывают возможные будущие интеграции."}
            </p>
            <p className="mt-2">
              {isEn
                ? <>You can change your decision at any time in your profile settings (<Link href="/profile?tab=settings" className="text-sky-400 hover:underline">Profile → Settings</Link>) or by clearing your browser data.</>
                : <>Вы можете изменить своё решение в любой момент в настройках профиля (<Link href="/profile?tab=settings" className="text-sky-400 hover:underline">Профиль → Настройки</Link>) или очистив данные браузера.</>}
            </p>
          </section>

          {cookies.map(cat => (
            <section key={cat.category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                <h2 className="text-lg font-bold text-foreground">{cat.category}</h2>
              </div>
              <p className="mb-4 text-sm">{cat.desc}</p>
              <div className="rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground">{isEn ? "Name" : "Название"}</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground hidden sm:table-cell">{isEn ? "Provider" : "Провайдер"}</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground hidden md:table-cell">{isEn ? "Duration" : "Срок"}</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground hidden lg:table-cell">{isEn ? "Type" : "Тип"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item, i) => (
                      <tr key={item.name} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                        <td className="px-4 py-3 align-top">
                          <code className="text-[10px] font-mono" style={{ color: cat.color }}>{item.name}</code>
                          <p className="mt-0.5 text-muted-foreground">{item.purpose}</p>
                          <p className="mt-0.5 text-muted-foreground/60 sm:hidden">{item.provider} · {item.duration}</p>
                        </td>
                        <td className="px-4 py-3 align-top hidden sm:table-cell">{item.provider}</td>
                        <td className="px-4 py-3 align-top hidden md:table-cell">{item.duration}</td>
                        <td className="px-4 py-3 align-top hidden lg:table-cell text-muted-foreground/70">{item.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "How to Manage Cookies" : "Как управлять cookies"}
            </h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">
                  {isEn ? "In Service settings" : "В настройках Сервиса"}
                </p>
                <p>
                  {isEn
                    ? <>Go to <Link href="/profile?tab=settings" className="text-sky-400 hover:underline">Profile → Settings</Link> → &quot;Cookie settings&quot; to manage functional and analytics cookies.</>
                    : <>Перейдите в <Link href="/profile?tab=settings" className="text-sky-400 hover:underline">Профиль → Настройки</Link> → «Cookie-настройки» для управления функциональными и аналитическими cookies.</>}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">
                  {isEn ? "In browser settings" : "В настройках браузера"}
                </p>
                <p>
                  {isEn
                    ? "Most browsers allow you to block or delete cookies in privacy settings. Note: blocking essential cookies will break authentication."
                    : "Большинство браузеров позволяют блокировать или удалять cookies в настройках приватности. Обратите внимание: блокировка необходимых cookies нарушит работу авторизации."}
                </p>
                <ul className="mt-2 space-y-1">
                  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Google Chrome</a></li>
                  <li><a href="https://support.mozilla.org/ru/kb/udalenie-fajlov-cookie" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Mozilla Firefox</a></li>
                  <li><a href="https://support.apple.com/ru-ru/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Safari</a></li>
                </ul>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">
                  {isEn ? "Partner cookies" : "Партнёрские cookies"}
                </p>
                <p>
                  {isEn
                    ? "Partner cookies (Aviasales, Booking.com, etc.) are set on their websites when you follow a link. You can manage them through the respective site settings or by using tools like uBlock Origin."
                    : "Cookies партнёров (Aviasales, Booking.com и др.) устанавливаются на их сайтах при переходе по ссылкам. Управляйте ими через настройки соответствующих сайтов или используя инструменты вроде uBlock Origin."}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "Changes to This Policy" : "Изменения Политики"}
            </h2>
            <p>
              {isEn
                ? "We will notify users of significant changes to this Cookie Policy via a banner on the site and by email (for registered users). The current version is always available at travellm.world/cookies."
                : <>При существенных изменениях Политики cookies мы уведомляем пользователей через баннер на сайте и по email (для зарегистрированных). Актуальная версия доступна на <strong>travellm.ru/cookies</strong>.</>}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              {isEn ? "Contact Us" : "Контакты"}
            </h2>
            <p>
              {isEn
                ? <>Questions about cookies: <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a></>
                : <>По вопросам использования cookies: <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a></>}
            </p>
          </section>

          <div className="pt-6 border-t border-border flex flex-wrap gap-4 text-xs">
            <Link href="/terms" className="text-sky-400 hover:underline">
              {isEn ? "Terms of Service" : "Условия использования"}
            </Link>
            <Link href="/privacy" className="text-sky-400 hover:underline">
              {isEn ? "Privacy Policy" : "Политика конфиденциальности"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
