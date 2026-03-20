import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Политика конфиденциальности — TraveLLM",
  description: "Как TraveLLM собирает, хранит и использует ваши персональные данные.",
}

const UPDATED = "18 марта 2026 г."
const EMAIL = "privacy@travellm.ru"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">

        <div className="mb-12">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-flex items-center gap-2">
            ← Вернуться на главную
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-6 mb-3">
            Политика конфиденциальности
          </h1>
          <p className="text-muted-foreground text-sm">Последнее обновление: <strong>{UPDATED}</strong></p>
          <p className="mt-3 text-sm text-muted-foreground">
            Настоящая Политика описывает, какие данные мы собираем, как их используем и защищаем, в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">1. Оператор персональных данных</h2>
            <p>Оператором персональных данных является TraveLLM (далее — «мы», «Сервис»). Контакт по вопросам персональных данных: <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">2. Какие данные мы собираем</h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">Данные аккаунта</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Email-адрес (при регистрации по email или OAuth)</li>
                  <li>Имя/никнейм (если указали при настройке профиля)</li>
                  <li>Аватар (из Google/GitHub OAuth, если использовали)</li>
                  <li>Дата регистрации и дата последнего входа</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">Данные путешествий</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Параметры маршрутов: направления, даты, бюджет</li>
                  <li>Предпочтения: стиль путешествия, интересы, диетические ограничения</li>
                  <li>Сгенерированные AI-маршруты и история изменений</li>
                  <li>Сообщения в чате с AI-ассистентом</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">Технические данные</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>IP-адрес (для защиты от злоупотреблений, хранится не более 90 дней)</li>
                  <li>User-agent браузера</li>
                  <li>Данные cookies и localStorage (см. <Link href="/cookies" className="text-sky-400 hover:underline">Политику cookies</Link>)</li>
                  <li>Статистика использования AI (количество запросов, расход токенов)</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">Данные об оплате</p>
                <p>Мы <strong>не храним</strong> данные банковских карт. Платёжные операции обрабатываются сторонними провайдерами (Stripe / ЮKassa). Мы получаем только статус транзакции и email плательщика.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">3. Цели обработки персональных данных</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Исполнение договора</strong> — предоставление функционала Сервиса: генерация маршрутов, хранение поездок, AI-чат.</li>
              <li><strong>Персонализация</strong> — улучшение AI-рекомендаций на основе ваших предпочтений.</li>
              <li><strong>Безопасность</strong> — защита от злоупотреблений, rate-limiting, обнаружение подозрительной активности.</li>
              <li><strong>Аналитика и улучшение продукта</strong> — агрегированная (обезличенная) статистика использования.</li>
              <li><strong>Коммуникация</strong> — уведомления о важных изменениях Сервиса, ответы на обращения в поддержку.</li>
              <li><strong>Соблюдение законодательства</strong> — выполнение требований законов РФ.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">4. Передача данных третьим лицам</h2>
            <p className="mb-3">Мы передаём минимально необходимые данные следующим третьим лицам для обеспечения работы Сервиса:</p>
            <div className="space-y-3">
              {[
                { name: "Supabase Inc.", purpose: "База данных и авторизация", location: "США / ЕС", privacy: "https://supabase.com/privacy" },
                { name: "Google (Gemini API)", purpose: "AI-генерация маршрутов", location: "США", privacy: "https://policies.google.com/privacy" },
                { name: "DeepSeek AI", purpose: "AI-генерация (резервная)", location: "Китай", privacy: "https://www.deepseek.com/privacy_policy" },
                { name: "OpenRouter", purpose: "Маршрутизация AI-запросов", location: "США", privacy: "https://openrouter.ai/privacy" },
                { name: "TravelPayouts", purpose: "Аффилиатные ссылки (Aviasales, Ostrovok и др.)", location: "Россия / Кипр", privacy: "https://www.travelpayouts.com/ru/privacy" },
                { name: "Vercel / Coolify", purpose: "Хостинг и CDN", location: "ЕС / США", privacy: "https://vercel.com/legal/privacy-policy" },
              ].map(item => (
                <div key={item.name} className="flex flex-col sm:flex-row sm:items-start gap-1 p-3 rounded-xl border border-border bg-muted/20">
                  <div className="sm:w-44 font-semibold text-foreground shrink-0">{item.name}</div>
                  <div className="flex-1 text-xs">
                    <span className="text-muted-foreground">{item.purpose} · {item.location} · </span>
                    <a href={item.privacy} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Политика</a>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3">Мы не продаём и не передаём персональные данные третьим лицам в маркетинговых целях.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">5. Хранение данных</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Данные аккаунта и маршруты хранятся до удаления аккаунта пользователем.</li>
              <li>IP-адреса и технические логи — не более 90 дней.</li>
              <li>Данные чата с AI — хранятся в браузере (localStorage) и могут быть удалены пользователем самостоятельно.</li>
              <li>После удаления аккаунта все персональные данные уничтожаются в течение 30 дней (кроме данных, хранение которых требует законодательство).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">6. Трансграничная передача данных</h2>
            <p>Ряд наших технических партнёров (Supabase, Google, OpenRouter) расположен за пределами РФ. Передача данных осуществляется в соответствии с требованиями ст. 12 Федерального закона № 152-ФЗ. Мы принимаем необходимые меры для обеспечения надлежащей защиты данных при трансграничной передаче.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">7. Права субъекта персональных данных</h2>
            <p className="mb-2">В соответствии с ФЗ № 152-ФЗ вы вправе:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Доступ</strong> — запросить копию ваших персональных данных.</li>
              <li><strong>Исправление</strong> — потребовать исправления неточных данных.</li>
              <li><strong>Удаление</strong> — запросить удаление всех ваших данных («право на забвение»).</li>
              <li><strong>Ограничение</strong> — потребовать приостановки обработки данных.</li>
              <li><strong>Портируемость</strong> — получить данные в машиночитаемом формате.</li>
              <li><strong>Отзыв согласия</strong> — отозвать согласие на обработку данных в любой момент.</li>
            </ul>
            <p className="mt-3">Для реализации прав направьте запрос на <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a>. Срок ответа — 30 дней.</p>
            <p className="mt-2">Вы также вправе подать жалобу в Роскомнадзор (<a href="https://rkn.gov.ru" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">rkn.gov.ru</a>).</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">8. Безопасность данных</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Передача данных — только по HTTPS (TLS 1.2+).</li>
              <li>Пароли не хранятся в открытом виде (bcrypt через Supabase Auth).</li>
              <li>Row-Level Security (RLS) в Supabase — каждый пользователь видит только свои данные.</li>
              <li>Rate-limiting на все API-endpoints для защиты от перебора.</li>
              <li>Регулярный аудит зависимостей на уязвимости.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">9. Дети</h2>
            <p>Сервис не предназначен для лиц моложе 18 лет. Мы намеренно не собираем данные несовершеннолетних. Если вам стало известно, что ребёнок передал нам свои данные, пожалуйста, свяжитесь с нами.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">10. Изменения Политики</h2>
            <p>При существенных изменениях Политики мы уведомляем пользователей по email не менее чем за 14 дней. Актуальная версия всегда доступна на <strong>travellm.ru/privacy</strong>.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">11. Контакты</h2>
            <ul className="space-y-1">
              <li>Email: <a href={`mailto:${EMAIL}`} className="text-sky-400 hover:underline">{EMAIL}</a></li>
              <li>Telegram: <a href="https://t.me/travellm_support_bot" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">@travellm_support_bot</a></li>
            </ul>
          </section>

          <div className="pt-6 border-t border-border flex flex-wrap gap-4 text-xs">
            <Link href="/terms" className="text-sky-400 hover:underline">Условия использования</Link>
            <Link href="/cookies" className="text-sky-400 hover:underline">Политика cookies</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
