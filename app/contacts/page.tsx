import type { Metadata } from "next"
import Link from "next/link"
import { getLocale } from "next-intl/server"
import { LEGAL } from "@/lib/legal"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()

  return locale === "en"
    ? {
        title: "Contacts and Legal Details — TraveLLM",
        description: "Official contacts, legal details, and support channels for TraveLLM.",
      }
    : {
        title: "Контакты и реквизиты — TraveLLM",
        description: "Официальные контакты, реквизиты оператора и каналы поддержки TraveLLM.",
      }
}

export default async function ContactsPage() {
  const locale = await getLocale()
  const isEn = locale === "en"

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Link href="/" className="mb-8 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground">
          {isEn ? "Back to home" : "Вернуться на главную"}
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {isEn ? "Contacts and Legal Details" : "Контакты и реквизиты"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {isEn
            ? "Use these channels for official correspondence, support requests, and personal data inquiries."
            : "Эти данные используются для официальной корреспонденции, обращений в поддержку и запросов по персональным данным."}
        </p>

        <section className="mt-10 rounded-2xl border border-border bg-muted/25 p-5 text-sm text-muted-foreground">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            {isEn ? "Service operator" : "Оператор сервиса"}
          </h2>
          <dl className="space-y-3">
            <div><dt className="font-semibold text-foreground">{isEn ? "Full name" : "Полное наименование"}</dt><dd>{LEGAL.operatorName}</dd></div>
            <div><dt className="font-semibold text-foreground">ИНН</dt><dd>{LEGAL.operatorInn}</dd></div>
            <div><dt className="font-semibold text-foreground">ОГРН/ОГРНИП</dt><dd>{LEGAL.operatorOgrn}</dd></div>
            <div><dt className="font-semibold text-foreground">{isEn ? "Postal address" : "Почтовый адрес"}</dt><dd>{LEGAL.operatorAddress}</dd></div>
          </dl>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-muted/25 p-5 text-sm text-muted-foreground">
          <h2 className="mb-4 text-lg font-bold text-foreground">{isEn ? "Contacts" : "Контакты"}</h2>
          <ul className="space-y-2">
            <li>
              {isEn ? "Personal data:" : "Персональные данные:"}{" "}
              <a href={`mailto:${LEGAL.privacyEmail}`} className="text-sky-400 hover:underline">{LEGAL.privacyEmail}</a>
            </li>
            <li>
              {isEn ? "Legal notices:" : "Юридические уведомления:"}{" "}
              <a href={`mailto:${LEGAL.legalEmail}`} className="text-sky-400 hover:underline">{LEGAL.legalEmail}</a>
            </li>
            <li>
              {isEn ? "Support:" : "Поддержка:"}{" "}
              <a href={LEGAL.supportTelegram} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                {LEGAL.supportTelegramHandle}
              </a>
            </li>
          </ul>
        </section>
      </div>
    </main>
  )
}
