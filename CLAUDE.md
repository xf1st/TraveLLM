# CLAUDE.md — TraveLLM AI Guide

## Project Overview

TraveLLM — AI-powered travel planning app that generates personalized trip itineraries. Russian-language interface. Users create trips, get AI-generated day-by-day plans, view on maps (2D/3D), chat with AI assistant, and share trips with friends.

## Tech Stack

- **Framework**: Next.js 16.1 (App Router), React 19.2, TypeScript 5
- **Styling**: Tailwind CSS 4 + CSS variables, shadcn/ui (Radix UI + Lucide icons)
- **Production URL**: `https://travellm.ru`
- **Backend**: Supabase (PostgreSQL, Auth, Real-time subscriptions, RLS)
- **AI**:
  - **Gemini 2.0 Flash** (Primary: `google/gemini-2.0-flash-001` via OpenRouter)
  - **DeepSeek** (Fallback: `deepseek-chat` / `deepseek-reasoner`)
  - **OpenRouter** (Routing layer для Gemini + Qwen fallback)
- **Maps**:
  - **Leaflet** (Standard 2D)
  - **MapLibre GL** (Vector Maps, Dark Mode)
- **Animation**: Framer Motion, Three.js, OGL (WebGL), Lottie, `tailwindcss-animate`
- **UI Components**: Sonner (Toasts), Vaul (Drawers), CMDK (Command Palette), Embla Carousel
- **Data & APIs**: TravelPayouts (Flights), OpenWeather (Weather), Google Places (Reviews)

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
  admin/                # Admin panel & stats
  dashboard/            # User dashboard
  guide/                # AI guide chat страница
  onboarding/           # User onboarding flow (13 шагов)
  plan/                 # Trip creation form (Stepper, 4 шага)
  results/              # My trips listing
  trip/[id]/            # Trip detail page
  news/                 # Travel news/articles
  auth/                 # OAuth callbacks
components/             # React components
  ui/                   # shadcn/ui primitives
  travel/               # Map engines (MapLibre, Leaflet), Flight prices
  itinerary/            # Trip timeline, activities
  social/               # Chat, Share modal, Achievements
  admin/                # Admin specific components
  WelcomeModal.tsx      # Приветственный экран для новых пользователей
  TourHint.tsx          # Подсказки интерфейса (пульсирующие tooltips)
  GeneratingModal.tsx   # Лоадер генерации маршрута (Framer Motion анимация)
  Aurora.tsx            # Background shader effects
  PlaceGallery.tsx      # Location image gallery
lib/                    # Core logic
  gemini.ts             # Gemini API client (через OpenRouter, primary)
  deepseek.ts           # DeepSeek API client (fallback)
  openrouter.ts         # OpenRouter клиент (guide-chat, fallback)
  prompt-builder.ts     # AI Context injection
  travelpayouts.ts      # Flight price API
  weather.ts            # Weather data fetching
  supabase.ts           # Auth & DB helpers
  strict-rules.ts       # JSON generation constraints
  grounding.ts          # Ground truth 2026 (закрытые аэропорты, визы)
types/                  # TypeScript definitions
  database.types.ts     # Supabase generated types
supabase/
  migrations/           # SQL migrations
```

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

**Переключение провайдера** — одна строка в `app/plan/page.tsx`:

```ts
const endpoint = "/api/gemini"; // текущий
const endpoint = "/api/deepseek"; // переключить на DeepSeek
```

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

## Onboarding & UX

- **WelcomeModal** — показывается 1 раз после первого входа (флаг `travellm_welcome_seen` в localStorage)
- **TourHint** — пульсирующие подсказки на ключевых элементах (`travellm_hint_{id}`)
- Сброс подсказок — в `/profile?tab=settings` → "Сбросить подсказки и приветствие"

## Database

- **Supabase**: PostgreSQL с RLS
- **JSONB**: `itinerary`, `preferences`, `safety_info`, `visa_advice`
- **Tables**: `trips`, `trip_members`, `messages`, `achievements`, `viral_spots`, `profiles`, `ai_usage_events`

## Environment Variables

### Required

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY` — для Gemini (primary) и guide-chat
- `DEEPSEEK_API_KEY` — для fallback и chat-роутов

### Optional / Feature-Specific

- `TRAVELPAYOUTS_TOKEN` (Flights)
- `GOOGLE_PLACES_API_KEY` (Reviews/Photos)
- `OPENWEATHER_API_KEY`

## Notes

- **Styling**: Global CSS uses `@theme inline` from Tailwind v4.
- **Deployment**: `output: 'standalone'` in `next.config.mjs` для Docker/Coolify.
- **Language**: Оптимизация промптов под русский язык.
- **TypeScript errors**: `ignoreBuildErrors: true` в next.config.mjs — ошибки TS не блокируют билд.
- **Admin**: Защита через subdomain middleware (`admin.*`) + проверка роли в Supabase.
