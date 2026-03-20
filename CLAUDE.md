# CLAUDE.md — TraveLLM AI Guide

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
    gemini/             # Основной API генерации (Gemini primary → DeepSeek fallback)
    deepseek/           # Резервный API генерации (DeepSeek primary → Gemini fallback)
    trip-assistant/     # AI чат для редактирования маршрута (DeepSeek)
    modify-itinerary/   # Изменение дней/активностей (DeepSeek)
    guide-chat/         # AI гид-чат (OpenRouter / Gemini Flash)
    enrich-trip/        # Обогащение координатами и ценами (DeepSeek)
    flights/            # Цены на авиабилеты (TravelPayouts)
    auth/[provider]/    # OAuth initiation (redirectUri из request.url origin)
    auth/callback/      # OAuth callback (siteUrl из request.url origin)
  admin/                # Admin panel & stats
  (main)/               # Route group — основные страницы приложения
    dashboard/          # Редиректит на /trips
    guide/              # AI guide chat страница
    plan/               # Trip creation form (Bento Grid, 5 шагов)
    profile/            # User profile (inline editing, язык, history)
    trips/              # My trips listing
    trip/[id]/          # Trip detail page
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
  ItineraryChatWidget.tsx # AI чат-виджет на странице маршрута
  CookieConsent.tsx     # Баннер согласия с cookie
  Aurora.tsx            # Background shader effects
  PlaceGallery.tsx      # Location image gallery
lib/                    # Core logic
  gemini.ts             # Gemini API client (через OpenRouter, primary)
  deepseek.ts           # DeepSeek API client (fallback)
  openrouter.ts         # OpenRouter клиент (guide-chat, fallback)
  prompt-builder.ts     # AI Context injection (locale-aware: RU/EN + RUB/USD)
  ai-usage-events.ts    # Лимиты генераций: checkMonthlyGenerationLimit(), recordAiUsageEvent()
  travelpayouts.ts      # Flight price API
  weather.ts            # Weather data fetching
  supabase.ts           # Auth & DB helpers
  strict-rules.ts       # JSON generation constraints (AI link rules)
  grounding.ts          # Ground truth 2026 (закрытые аэропорты, визы)
i18n/
  request.ts            # Locale detection: cookie → domain → Accept-Language
messages/
  ru.json               # Русские переводы
  en.json               # English translations
types/
  database.types.ts     # Supabase generated types
proxy.ts                # Next.js 16 middleware (вместо middleware.ts):
                        #   auth guard, admin subdomain, locale cookie
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
| `/api/trip-assistant`   | DeepSeek-chat           | Редактирование маршрута в чате |
| `/api/modify-itinerary` | DeepSeek-chat           | Изменение дней/активностей     |
| `/api/guide-chat`       | OpenRouter/Gemini Flash | AI гид (500 токенов)           |
| `/api/enrich-trip`      | DeepSeek → OpenRouter   | Координаты, цены, ссылки       |

## Лимиты генераций

Вместо подписок — глобальный лимит: **10 генераций маршрутов в месяц** на пользователя.

- `lib/ai-usage-events.ts` → `checkMonthlyGenerationLimit(userId)` считает `ai_usage_events` с `source = "route-generation"` за текущий месяц
- При превышении → HTTP 429
- `profiles.gen_limit_override` — персональный override (null = стандартные 10)
- `profiles.chat_limit_override` — лимит сообщений чата
- Сайдбар показывает прогресс-бар использования в дропдауне профиля
- Админ-панель: колонка "Ген./мес." + просмотр/изменение лимитов в диалоге

## Onboarding & UX

- **WelcomeModal** — показывается 1 раз после первого входа (флаг `travellm_welcome_seen` в localStorage)
- **TourHint** — пульсирующие подсказки на ключевых элементах (`travellm_hint_{id}`)
- Сброс подсказок — в `/profile?tab=settings` → "Сбросить подсказки и приветствие"
- **Переключатель языка** — в `/profile?tab=settings`: устанавливает cookie `NEXT_LOCALE` + `window.location.reload()`

## Database

- **Supabase**: PostgreSQL с RLS
- **JSONB**: `itinerary`, `preferences`, `safety_info`, `visa_advice`
- **Tables**: `trips`, `trip_members`, `messages`, `achievements`, `viral_spots`, `profiles`, `ai_usage_events`
- `profiles` содержит: `role`, `access_mode`, `gen_limit_override`, `chat_limit_override`, `block_reason`, `blocked_until`

## Environment Variables

### Required

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — для серверных операций (лимиты, запись событий)
- `OPENROUTER_API_KEY` — для Gemini (primary) и guide-chat
- `DEEPSEEK_API_KEY` — для fallback и chat-роутов

### Optional / Feature-Specific

- `TRAVELPAYOUTS_TOKEN` (Flights)
- `GOOGLE_PLACES_API_KEY` (Reviews/Photos)
- `OPENWEATHER_API_KEY`

## Notes

- **Middleware**: Next.js 16 использует `proxy.ts` (не `middleware.ts`) — оба файла одновременно не могут существовать.
- **Deployment**: `output: 'standalone'` в `next.config.mjs` для Docker/Coolify (Timeweb Cloud).
- **TypeScript errors**: `ignoreBuildErrors: true` в `next.config.mjs` — ошибки TS не блокируют билд.
- **Admin**: Защита через subdomain `admin.*` в `proxy.ts` + проверка роли `admin`/`super_admin` в Supabase.
- **OAuth**: `redirectUri` и `siteUrl` в auth-роутах берутся из `new URL(request.url).origin` — работает на обоих доменах без env-переменных.
- **Header (mobile)**: статичная (`sticky top-0`), без бургер-меню — навигация через bottom nav.
- **Tailwind v4**: `@import "tailwindcss"` + `@theme inline` в globals.css; `@apply` требует `@reference "tailwindcss"`.
