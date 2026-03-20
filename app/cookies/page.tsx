import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Политика cookies — TraveLLM",
  description: "Как TraveLLM использует файлы cookie и аналогичные технологии.",
}

const UPDATED = "18 марта 2026 г."
const EMAIL = "privacy@travellm.ru"

const cookies = [
  {
    category: "Необходимые",
    color: "#34d399",
    desc: "Без этих cookies Сервис не может работать. Их нельзя отключить.",
    items: [
      { name: "sb-*-auth-token", provider: "Supabase", purpose: "Сессия авторизации пользователя", duration: "До выхода из аккаунта", type: "HTTP Cookie" },
      { name: "sb-*-auth-token-code-verifier", provider: "Supabase", purpose: "PKCE верификация OAuth", duration: "Сессионный", type: "HTTP Cookie" },
      { name: "__cf_bm", provider: "Cloudflare", purpose: "Защита от ботов", duration: "30 минут", type: "HTTP Cookie" },
    ],
  },
  {
    category: "Функциональные",
    color: "#85adff",
    desc: "Запоминают ваши настройки и предпочтения. Отключение ухудшит удобство использования.",
    items: [
      { name: "travellm_theme", provider: "TraveLLM", purpose: "Тема оформления (тёмная/светлая)", duration: "1 год", type: "localStorage" },
      { name: "travellm_welcome_seen", provider: "TraveLLM", purpose: "Флаг показа приветственного экрана", duration: "Постоянный", type: "localStorage" },
      { name: "travellm_hint_*", provider: "TraveLLM", purpose: "Флаги показанных подсказок интерфейса", duration: "Постоянный", type: "localStorage" },
      { name: "travellm_chat_*", provider: "TraveLLM", purpose: "История сессий AI-чата", duration: "До очистки браузера", type: "localStorage" },
      { name: "travellm_cookies_consent", provider: "TraveLLM", purpose: "Факт принятия настоящей политики cookies", duration: "1 год", type: "localStorage" },
    ],
  },
  {
    category: "Аналитические",
    color: "#fbbf24",
    desc: "Помогают нам понимать, как пользователи используют Сервис. Данные агрегированы и обезличены.",
    items: [
      { name: "_ga, _ga_*", provider: "Google Analytics", purpose: "Агрегированная статистика посещений (если подключён GA)", duration: "2 года", type: "HTTP Cookie" },
      { name: "vercel-analytics-*", provider: "Vercel Analytics", purpose: "Анонимная статистика производительности", duration: "Сессионный", type: "HTTP Cookie" },
    ],
  },
  {
    category: "Партнёрские (аффилиатные)",
    color: "#f472b6",
    desc: "Устанавливаются при переходе по партнёрским ссылкам на внешние сервисы. Позволяют нам получать комиссию без дополнительных затрат для вас.",
    items: [
      { name: "marker (GET-параметр)", provider: "TravelPayouts / Aviasales", purpose: "Отслеживание переходов на Aviasales, Ostrovok, Hotellook", duration: "30 дней (на сайте партнёра)", type: "Партнёрский маркер" },
      { name: "affid / aid", provider: "Booking.com", purpose: "Отслеживание переходов на Booking.com", duration: "30 дней (на сайте партнёра)", type: "Партнёрский маркер" },
      { name: "partner_id", provider: "GetYourGuide", purpose: "Отслеживание переходов на GetYourGuide", duration: "30 дней (на сайте партнёра)", type: "Партнёрский маркер" },
      { name: "affiliate_id", provider: "Viator / TripAdvisor", purpose: "Отслеживание переходов на Viator", duration: "30 дней (на сайте партнёра)", type: "Партнёрский маркер" },
      { name: "aff_id", provider: "Klook", purpose: "Отслеживание переходов на Klook", duration: "30 дней (на сайте партнёра)", type: "Партнёрский маркер" },
    ],
  },
]

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">

        <div className="mb-12">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-flex items-center gap-2">
            ← Вернуться на главную
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-6 mb-3">
            Политика cookies
          </h1>
          <p className="text-muted-foreground text-sm">Последнее обновление: <strong>{UPDATED}</strong></p>
          <p className="mt-3 text-sm text-muted-foreground">
            Настоящая Политика объясняет, какие cookie-файлы и аналогичные технологии (localStorage, sessionStorage) мы используем, для чего и как вы можете ими управлять.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">Что такое cookies?</h2>
            <p>Cookies — небольшие текстовые файлы, сохраняемые браузером при посещении сайта. Они позволяют Сервису «помнить» вас между сессиями: сохранять авторизацию, настройки и предпочтения.</p>
            <p className="mt-2">Помимо cookies мы используем <strong>localStorage</strong> — хранилище браузера, которое работает аналогично, но не передаётся серверу с каждым запросом.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">Ваше согласие</h2>
            <p>При первом посещении Сервиса появляется баннер с предложением принять cookies. Необходимые cookies активны всегда. Функциональные и аналитические cookies активируются только после вашего явного согласия.</p>
            <p className="mt-2">Вы можете изменить своё решение в любой момент в настройках профиля (<Link href="/profile?tab=settings" className="text-sky-400 hover:underline">Профиль → Настройки</Link>) или очистив данные браузера.</p>
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
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground">Название</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground hidden sm:table-cell">Провайдер</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground hidden md:table-cell">Срок</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-foreground hidden lg:table-cell">Тип</th>
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
            <h2 className="text-lg font-bold text-foreground mb-3">Как управлять cookies</h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">В настройках Сервиса</p>
                <p>Перейдите в <Link href="/profile?tab=settings" className="text-sky-400 hover:underline">Профиль → Настройки</Link> → «Cookie-настройки» для управления функциональными и аналитическими cookies.</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">В настройках браузера</p>
                <p>Большинство браузеров позволяют блокировать или удалять cookies в настройках приватности. Обратите внимание: блокировка необходимых cookies нарушит работу авторизации.</p>
                <ul className="mt-2 space-y-1">
                  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Google Chrome</a></li>
                  <li><a href="https://support.mozilla.org/ru/kb/udalenie-fajlov-cookie" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Mozilla Firefox</a></li>
                  <li><a href="https://support.apple.com/ru-ru/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Safari</a></li>
                </ul>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">Партнёрские cookies</p>
                <p>Cookies партнёров (Aviasales, Booking.com и др.) устанавливаются на их сайтах при переходе по ссылкам. Управляйте ими через настройки соответствующих сайтов или использую инструменты вроде uBlock Origin.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">Изменения Политики</h2>
            <p>При существенных изменениях Политики cookies мы уведомляем пользователей через баннер на сайте и по email (для зарегистрированных). Актуальная версия доступна на <strong>travellm.ru/cookies</strong>.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">Контакты</h2>
            <p>По вопросам использования cookies: <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a></p>
          </section>

          <div className="pt-6 border-t border-border flex flex-wrap gap-4 text-xs">
            <Link href="/terms" className="text-sky-400 hover:underline">Условия использования</Link>
            <Link href="/privacy" className="text-sky-400 hover:underline">Политика конфиденциальности</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
