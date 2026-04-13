# CLAUDE.md — TraveLLM AI Assistant

## Project Overview

TraveLLM — AI-powered travel planning app that generates personalized trip itineraries. Bilingual interface (RU/EN). Users create trips, get AI-generated day-by-day plans, chat with AI assistant, and share trips with friends.

## Tech Stack

- **Framework**: Next.js 16.1 (App Router), React 19.2, TypeScript 5
- **Styling**: Tailwind CSS 4 + CSS variables (`@theme inline`), shadcn/ui (Radix UI + Lucide icons)
- **i18n**: next-intl v4.8.3 — `localePrefix: 'never'`, locale via `NEXT_LOCALE` cookie
- **Production URLs**: `https://travellm.ru` (RU default) · `https://travellm.world` (EN default)
- **Backend**: Supabase (PostgreSQL, Auth, Real-time subscriptions, RLS)
- **AI**:
  - **Gemini 2.0 Flash** (Primary: `google/gemini-2.0-flash-001` via OpenRouter)
  - **DeepSeek** (Fallback: `deepseek-chat` / `deepseek-reasoner`)
  - **OpenRouter** (Routing layer для Gemini + Qwen fallback)
- **Animation**: Framer Motion, Three.js, OGL (WebGL), Lottie, `tailwindcss-animate`
- **UI Components**: Sonner (Toasts), Vaul (Drawers), CMDK (Command Palette), Embla Carousel
- **Data & APIs**: TravelPayouts (Flights), OpenWeather (Weather), Google Places (Reviews)

> **Removed**: Leaflet, MapLibre GL, react-leaflet, react-leaflet-cluster — карт на сайте нет.
> **Removed**: Subscription tiers (PRO, trial) — заменены на глобальный лимит генераций.
> **Removed**: News pages (`/news`, `/news/[id]`).

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build (standalone output)
npm run start    # Run production server
npm run lint     # ESLint
```

## Project Structure

```
app/                    # Next.js App Router pages
  api/
    user/profile/       # PATCH: безопасное обновление своего profiles (сессия + allowlist полей)
    gemini/             # Основной API генерации (Gemini primary → DeepSeek fallback)
    deepseek/           # Резервный API генерации (DeepSeek primary → Gemini fallback)
    trip-assistant/     # AI чат на `/trip/[id]` — Gemini: классификатор намерений, правка одной активности, rewrite_segment (диапазон дней), вопросы; multipart + vision (фото); `lib/trip-assistant-segment.ts` — merge/валидация сегмента
    modify-itinerary/   # Изменение дней/активностей (DeepSeek)
    guide-chat/         # AI ассистент-чат (OpenRouter / Gemini Flash)
    enrich-trip/        # Обогащение координатами и ценами (DeepSeek)
    flights/            # Цены на авиабилеты (TravelPayouts)
    auth/[provider]/    # OAuth initiation (redirectUri из request.url origin)
    auth/callback/      # OAuth callback (siteUrl из request.url origin)
  admin/                # Admin panel & stats
  (main)/               # Route group — основные страницы приложения
    dashboard/          # Редиректит на /trips
    guide/              # AI assistant chat страница
    plan/               # Trip creation form (хаб: travelMode flight|train|car); после → `/plan/vibe`, затем генерация
    profile/            # User profile (inline editing через PATCH /api/user/profile, не PostgREST)
    trips/              # My trips listing
    trip/[id]/          # Trip detail page; автосохранение itinerary (debounce) для владельца UUID-поездки
  auth/                 # Auth page (login/signup)
  cookies/              # Политика cookies
  privacy/              # Политика конфиденциальности
  terms/                # Условия использования
  robots.ts             # Dynamic robots.txt (domain-aware)
  sitemap.ts            # Dynamic sitemap (domain-aware)
components/             # React components
  ui/                   # shadcn/ui primitives
  plan/                 # Компоненты формы планирования (PlanTooltips и др.)
  trip/                 # TripLinksPanel, TripStatsPanel, ActivityTimelineCard
  itinerary/            # Trip timeline, activities
  social/               # Chat, Share modal, Achievements
  admin/                # Admin specific components
  app-sidebar.tsx       # Desktop sidebar (lg+), показывает лимиты генераций
  header.tsx            # Header: floating (лендинг) + sticky (остальные страницы)
                        #   Мобиль: статичная, без бургер-меню (есть bottom nav)
  footer.tsx            # Footer ("use client", useTranslations)
  WelcomeModal.tsx      # Приветственный экран для новых пользователей
  TourHint.tsx          # Подсказки интерфейса (пульсирующие tooltips)
  GeneratingModal.tsx   # Лоадер генерации маршрута (Framer Motion анимация)
  ItineraryChatWidget.tsx # AI чат-виджет на странице маршрута; фото, linkify URL, бейдж Gemini
  linkify-message.tsx     # кликабельные ссылки в ответах ассистента
  CookieConsent.tsx     # Баннер согласия с cookie
  Aurora.tsx            # Background shader effects
  PlaceGallery.tsx      # Location image gallery
lib/                    # Core logic
  hooks/useDebouncedTripItinerarySave.ts # автосохранение `trips.itinerary` после правок (чат/inline), ~1.8s debounce; только UUID + владелец + `route.id` === URL
  gemini.ts             # Gemini API client (через OpenRouter); текст + multimodal (parts: text + image_url)
  trip-assistant-segment.ts # merge сегмента дней в itinerary, валидация, dayTotal
  chat-image.ts         # клиент: resize JPEG вложений для чата
  deepseek.ts           # DeepSeek API client (fallback)
  openrouter.ts         # OpenRouter клиент (guide-chat, fallback)
  prompt-builder.ts     # AI Context injection (locale-aware: RU/EN + RUB/USD)
  ai-usage-events.ts    # Лимиты генераций: checkMonthlyGenerationLimit(), recordAiUsageEvent()
  travelpayouts.ts      # Flight price API
  weather.ts            # Weather data fetching
  supabase.ts           # Auth & DB helpers
  strict-rules.ts       # JSON generation constraints (AI link rules)
  grounding.ts          # Ground truth 2026 (закрытые аэропорты, визы)
  server/user-access.ts # Сервер: profiles.access_mode / blocked_until → enforceAiAccess, enforceFullSiteAccess
  server/trip-for-ai.ts # Загрузка поездки по tripId с проверкой user_id (trip-assistant, enrich, modify-itinerary)
i18n/
  request.ts            # Locale detection: cookie → domain → Accept-Language
messages/
  ru.json               # Русские переводы
  en.json               # English translations
types/
  database.types.ts     # Supabase generated types
proxy.ts                # Next.js 16 middleware (вместо middleware.ts):
                        #   auth guard, admin subdomain, locale cookie
                        #   в dev по умолчанию те же проверки, что в prod;
                        #   TRAVELLM_DEV_SKIP_PROXY_AUTH=1 — старый «быстрый» dev
supabase/
  migrations/           # SQL migrations
```

## i18n

- **next-intl v4.8.3**, `localePrefix: 'never'` — URL не меняются
- Локаль определяется в `i18n/request.ts`: cookie `NEXT_LOCALE` → домен → Accept-Language → CIS → `ru`, иначе `en`
- `proxy.ts` устанавливает cookie `NEXT_LOCALE` при первом посещении
- `travellm.world` → `en` по умолчанию; `travellm.ru` → `ru` по умолчанию
- Client components: `useTranslations()` | Server components: `getTranslations()`
- Все компоненты внутри `"use client"` layout-ов должны использовать `useTranslations` (не `getTranslations`)

## AI Pipeline

### Генерация маршрута

```
POST /api/gemini  ←  фронт использует сейчас
  Primary:  google/gemini-2.0-flash-001 (OpenRouter) — все маршруты
  Fallback: deepseek-chat / deepseek-reasoner

POST /api/deepseek  ←  готов для быстрого переключения
  Primary:  deepseek-chat (≤7 дней) / deepseek-reasoner (8+ дней)
  Fallback: google/gemini-2.0-flash-001
```

**Переключение провайдера** — одна строка в `app/(main)/plan/page.tsx`:
```ts
const endpoint = "/api/gemini";   // текущий
const endpoint = "/api/deepseek"; // переключить на DeepSeek
```

**Локаль в промптах**: оба роута читают `locale` из body → `buildEnrichedPrompt({ locale })` → промпт и бюджет на нужном языке (RUB/USD).

### Чанкинг длинных маршрутов (>7 дней)

- Разбивка на 4-дневные чанки (sequential, с контекстом предыдущего чанка)
- Отдельный запрос для metadata (title, budget, tags)
- Всё через `gemini-2.0-flash-001` ($0.10/$0.40 per 1M tokens)

### Стоимость (ориентир)

- 14-дневный маршрут + 20 сообщений чата ≈ **$0.02-0.03** (~2 ₽)

### Другие AI эндпоинты

| Роут                    | Модель                  | Назначение                     |
| ----------------------- | ----------------------- | ------------------------------ |
| `/api/trip-assistant`   | Gemini Flash (OpenRouter) | Чат маршрута: вопросы, правка активности, переписать дни `startDay`–`endDay`, vision (фото) |
| `/api/modify-itinerary` | DeepSeek-chat           | Изменение дней/активностей     |
| `/api/guide-chat`       | OpenRouter/Gemini Flash | AI ассистент (500 токенов)     |
| `/api/enrich-trip`      | DeepSeek → OpenRouter   | Координаты, цены, ссылки       |

## Лимиты генераций

Вместо подписок — глобальный лимит: **10 генераций маршрутов в месяц** на пользователя.

- `lib/ai-usage-events.ts` → `checkMonthlyGenerationLimit(userId)` считает `ai_usage_events` с `source = "route-generation"` за текущий месяц
- При превышении → HTTP 429
- `profiles.gen_limit_override` — персональный override (null = стандартные 10)
- Сайдбар показывает прогресс-бар использования в дропдауне профиля
- Админ-панель: колонка "Ген./мес." + просмотр/изменение лимитов в диалоге

### Месячный лимит чата и вспомогательного AI

Отдельно от генерации маршрута: **`MONTHLY_CHAT_AI_LIMIT` = 400** (дефолт) суммарных событий в `ai_usage_events` за календарный месяц по источникам из `MONTHLY_CHAT_AI_SOURCES` (trip-assistant, activity-chat, map.normalize-points, guide-chat, main-chat, modify-itinerary, enrich-trip, budget.economist, memory-board.stats, reviews.ai, travel.search).

- `checkMonthlyChatAiLimit(userId)` + при превышении **429** с `code: "CHAT_MONTHLY_LIMIT"`
- `profiles.chat_limit_override` — персональный потолок (null = дефолт 400; **0** = отключить AI-чат/вспомогательные вызовы)
- Минутные лимиты (`lib/rate-limit.ts`) остаются; при нескольких инстансах in-memory счётчики не склеиваются

## Onboarding & UX

- **WelcomeModal** — показывается 1 раз после первого входа (флаг `travellm_welcome_seen` в localStorage)
- **TourHint** — пульсирующие подсказки на ключевых элементах (`travellm_hint_{id}`)
- Сброс подсказок — в `/profile?tab=settings` → "Сбросить подсказки и приветствие"
- **Переключатель языка** — в `/profile?tab=settings`: устанавливает cookie `NEXT_LOCALE` + `window.location.reload()`

## Database

- **Supabase**: PostgreSQL с RLS
- **JSONB**: `itinerary`, `preferences`, `safety_info`, `visa_advice`
- **Tables**: `trips` (в т.ч. `travel_mode`: flight|train|car с формы `/plan`), `messages`, `achievements`, `viral_spots`, `profiles`, `ai_usage_events` (таблица `trip_members` в БД может остаться для старых данных, в UI не используется)
- `profiles` содержит: `role`, `access_mode` (`active` | `full_blocked` | `ai_blocked`), `gen_limit_override`, `chat_limit_override`, `block_reason`, `blocked_until`
- **Серверный контроль доступа**: после `getRequestUserId()` AI-роуты вызывают `enforceAiAccess(userId)` (`lib/server/user-access.ts`, service role) — учитываются полный бан, временный `blocked_until`, `ai_blocked`. Соц./данные без LLM: `enforceFullSiteAccess` (diary, feedback, social-layer, nearby-poi).
- **Маршрут в AI только из БД при `tripId`**: `/api/trip-assistant` при валидном `tripId` подставляет данные поездки с сервера (`fetchTripOwnedByUser`); несохранённые правки в UI в чат не попадут — сохраните поездку перед чатом. Без `tripId` — доверие клиенту, максимум **60** дней в `itinerary`.
- **`/api/enrich-trip`**: только **`tripId`** (UUID) в теле; маршрут и обновление — из БД владельца.
- **`/api/modify-itinerary`**: обязательны **`tripId`** + `userMessage`; маршрут из БД.

## Environment Variables

### Required

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — для серверных операций (лимиты, запись событий)
- `OPENROUTER_API_KEY` — для Gemini (primary) и guide-chat
- `DEEPSEEK_API_KEY` — для fallback и chat-роутов

### Optional / Feature-Specific

- `TRAVELLM_DEV_SKIP_PROXY_AUTH=1` — только локально: ослабить `proxy.ts` (как раньше в dev); без этого в development те же редиректы/админ-гейт, что в production
- `TRAVELLM_LIMIT_FAIL_OPEN=1` — только локально: если нет `SUPABASE_SERVICE_ROLE_KEY` или сбой запроса лимитов, не блокировать генерации/чат (в **проде не включать**). Без флага — **fail-closed** и **503** `LIMITS_UNAVAILABLE` на `/api/gemini`, `/api/deepseek` и чат-роутах при ошибке бэкенда лимитов.
- `TRAVELPAYOUTS_TOKEN` (Flights)
- `GOOGLE_PLACES_API_KEY` (Reviews/Photos)
- `OPENWEATHER_API_KEY`
- Beta feedback (`app/actions/beta-feedback.ts`): запись только с `SUPABASE_SERVICE_ROLE_KEY` (anon не используется)

## Notes

- **Middleware**: Next.js 16 использует `proxy.ts` (не `middleware.ts`) — оба файла одновременно не могут существовать.
- **Telegram webhooks** (`/api/telegram/webhook`, `webhook-pr`): секреты сравниваются через `timingSafeEqual` (длина буферов выравнивается).
- **`/api/image`**: лимит по IP (`checkIpRateLimit`, ключ `api-destination-image`, 60/окно — как у proxy-image) против злоупотреблений.
- **Deployment**: `output: 'standalone'` в `next.config.mjs` для Docker на Timeweb Cloud.
- **TypeScript errors**: `ignoreBuildErrors: true` в `next.config.mjs` — ошибки TS не блокируют билд.
- **Admin**: Защита через subdomain `admin.*` в `proxy.ts` + проверка роли `admin`/`super_admin` в Supabase.
- **OAuth**: `redirectUri` и `siteUrl` в auth-роутах берутся из `new URL(request.url).origin` — работает на обоих доменах без env-переменных.
- **Header (mobile)**: статичная (`sticky top-0`), без бургер-меню — навигация через bottom nav.
- **Tailwind v4**: `@import "tailwindcss"` + `@theme inline` в globals.css; `@apply` требует `@reference "tailwindcss"`.

## Versioning Rules

We update the site version dynamically in `components/app-sidebar.tsx` and `components/header.tsx` with each commit if logical changes occurred. Next changes depend on the severity of the update:
- Minor tweaks / bug fixes: +0.0.0xb (e.g. 2.0.701b)
- Small features or multiple bugs resolved: +0.0.xb (e.g. 2.0.8b)
- Major feature implementation: +0.x.0b (e.g. 2.1.0b) 
- Massive structural overhaul: +x.0.0b (e.g. 3.0.0b)
