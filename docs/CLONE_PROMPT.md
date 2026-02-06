# Промпт для создания клона TraveLM — AI Travel Planner

---

Создай полноценное веб-приложение — AI-планировщик путешествий на русском языке. Это премиум-приложение с dark/light темой, glassmorphism-эффектами, WebGL-анимациями, реальным поиском перелётов/отелей и AI-генерацией маршрутов.

## Стек технологий

- **Next.js 15+ (App Router)**, React 19, TypeScript 5
- **Tailwind CSS 4** + CSS variables (OKLch цвета), **shadcn/ui** (Radix UI + Lucide icons)
- **Supabase** — PostgreSQL, Auth (Google OAuth + email), Real-time subscriptions, Row-Level Security
- **AI**: DeepSeek API (`deepseek-chat` для коротких трипов ≤7 дней, `deepseek-reasoner` для 8+). Fallback: OpenRouter (Gemini Flash, Perplexity/Sonar для веб-поиска)
- **Карты**: Leaflet + React-Leaflet (CARTO Dark тайлы)
- **Анимации**: Framer Motion, Three.js / OGL (WebGL шейдеры для Aurora/MeshGradient/LightRays)
- **Формы**: React Hook Form + Zod
- **Графики**: Recharts
- **Тосты**: Sonner
- **Шрифты**: Rubik (основной, кириллица), JetBrains Mono (моноширинный)

---

## Цветовая палитра

### Light Mode
```
background: oklch(0.99 0.005 85) — тёплый бежевый #F8F5F0
foreground: oklch(0.3 0.01 280) — тёмный #2A2A3E
card: pure white
primary: oklch(0.82 0.08 225) — бледно-голубой #B3E5FC
muted: oklch(0.97 0.01 225) — светло-серый
border: oklch(0.9 0.02 225)
destructive: oklch(0.6 0.18 25) — красно-оранжевый
glass-bg: rgba(255,255,255,0.7), glass-border: rgba(255,255,255,0.3), blur: 20px
```

### Dark Mode
```
background: oklch(0.11 0.005 280) — глубокий navy #1A1A2E
card: oklch(0.14 0.005 280) — #242440
primary: oklch(0.985 0 0) — белый
border: oklch(0.22 0.005 280)
glass-bg: rgba(255,255,255,0.03), glass-border: rgba(255,255,255,0.06), blur: 24px
sidebar: oklch(0.14 0.005 280), sidebar-primary: oklch(0.488 0.243 264.376) — фиолетовый акцент
```

### Теги (цветовая система)
- пляж: Sky #0EA5E9, еда: Orange #EA580C, природа: Green #22C55E
- культура: Amber #B45309, активный: Lime #84CC16, релакс: Teal #14B8A6
- вино: Violet #7C3AED, шопинг: Pink #EC4899, развлечения: Rose #F43F5E

---

## Структура страниц и дизайн

### 1. Landing Page (/)
**Hero Section** — полноэкранный min-h-[90vh]:
- Фоновый WebGL-эффект: MeshGradient (жидкий анимированный градиент, цвета: ["#000000", "#1e1e1e", "#111111", "#3b0764"], speed: 0.2, opacity: 30%)
- Заголовок: огромный text-5xl md:text-7xl с **GradientText** компонентом (анимированный градиент цветов ["#a855f7", "#3b82f6", "#06b6d4"], 6s цикл)
- Текст: "TraveLM: Откройте свое следующее приключение" (русский)
- 4 плавающих изображения путешествий (float animation: y: [0, -20, 0], duration: 5s, loop, stagger: 1.2s между ними, opacity: 0.6, border-white/10, rounded-3xl)

**Поисковая капсула:**
- rounded-full border-white/10 bg-white/5 backdrop-blur-xl
- 3 поля внутри: Куда? / Даты / Путешественники
- Разделители: border-r border-white/10
- Кнопка поиска: h-12 w-12 rounded-full bg-primary с иконкой Search
- Hover: bg-white/10 shadow-2xl shadow-primary/20, scale-105

**Секции ниже:**
- Популярные направления (3 карточки 1:1 с overlay текстом)
- Фичи (3 карточки с emoji-иконками, hover: -translate-y-2)
- Готовые маршруты (3x3 grid trip cards)
- CTA секция (градиентный фон, большая кнопка)
- Каждая секция: max-w-7xl mx-auto py-24, border-t border-white/5

### 2. Plan Page (/plan) — Создание поездки
**Фон**: Aurora WebGL эффект (цвета: ["#ab66ff", "#4b7cdd", "#8df7a2"], speed: 0.4)

**Форма** — Card-based, glassmorphism backdrop:
1. **Откуда + Компания** — 75%/25% layout: Input (rounded-2xl h-14) + Select
2. **Даты** — Calendar popover, dual month, range selection, disabled past dates
3. **Тип направления** — Radio group, 3-column grid: "По России" / "За границу" / "Конкретное место" (при выборе "Конкретное" — показать поле ввода города)
4. **Бюджет** — 3 больших radio-карточки с иконками (Эконом / Комфорт / Премиум), + кастомный ввод суммы ниже
5. **Стиль путешествия** — 3x3 grid checkbox-кнопок (Культура, Еда, Природа, Активный, Релакс, Ночная жизнь, Шопинг, Фото, Приключения)
6. **Способ оплаты** — 4 карточки (Наличные, Мир, UnionPay, Крипто)

**Кнопка генерации**: gradient bg-gradient-to-r from-primary to-blue-600, rounded-full, h-16, text-xl

**Модальное окно генерации (GeneratingModal)**:
- Полноэкранный overlay bg-black/70 backdrop-blur-sm
- Lottie-анимация самолёта в центре
- MeshGradient фон
- Animated progress bar (0→98%): gradient from-emerald-500 via-blue-500 to-emerald-500, animate-[gradient_2s_linear_infinite], glow shadow
- 5 шагов: "Ищем перелёты..." → "Подбираем отели..." → "Строим маршрут..." → "Добавляем рестораны..." → "Проверяем достопримечательности..."
- Таймер ожидания

### 3. Trip Detail (/trip/[id]) — Маршрут
**Layout**: grid lg:grid-cols-[1fr_380px]

**Левая колонка — Маршрут:**
- Hero-изображение с бейджами (безопасность: emerald, бюджет: wallet icon)
- Заголовок + теги + описание

**Маршрут по дням — Accordion:**
Каждый день — Card с кнопкой разворачивания:
- Круглый номер дня (h-14 w-14 rounded-full)
- Заголовок дня (text-xl md:text-2xl font-bold)
- Бейджи на свёрнутых днях: "Перелёт" (синий) / "Отель" (янтарный)
- ChevronRight с rotate-90 при раскрытии

**При развороте дня:**
- **Logistics Bar**: иконка транспорта + маршрут "Откуда → Куда" + расстояние + время
- **Booking buttons**: "Найти билеты" (sky), "Отели" (emerald) — rounded-full
- **Timeline активностей** (border-l-2 с кружками на timeline):
  - Утро (☀️ Clock) / День (🍽️ Utensils) / Вечер (🏨 Hotel)
  - Название места (font-semibold), описание, стоимость
  - Кнопки: "На карте" (MapPin), "Купить билеты" (ExternalLink)
  - PlaceGallery (5 фото через Unsplash/Wikimedia)
- **Совет дня**: bg-amber-50 dark:bg-amber-900/20, иконка Compass

**Спецкарточки (ОТДЕЛЬНЫЕ ОТ АКТИВНОСТЕЙ!):**

**FlightCard** — синяя тема:
- border-2 border-blue-500/30, gradient from-blue-50 to-sky-50, dark: from-blue-950/30
- Синяя акцентная полоска h-1 сверху
- Иконка ✈️ в круглой blue-500/10 подложке
- Название авиакомпании + номер рейса
- Бейдж даты (Calendar icon) + бейдж "Прямой" (emerald) / "С пересадкой" (amber)
- **Визуализация маршрута**: IATA код + время → линия с самолётиком → IATA код + время
- При пересадке: разделённая линия с блоком "Пересадка" (amber bg, город + время)
- Багаж: ручная + регистрируемый (иконки Luggage/Package)
- Пассажиры (Users icon), цена за всех + за человека
- Кнопка "Купить билеты" (bg-blue-600, rounded-xl, ExternalLink icon) → ссылка на Aviasales

**HotelCard** — янтарная/оранжевая тема:
- border-2 border-amber-500/30, gradient from-amber-50 to-orange-50
- Янтарная акцентная полоска сверху
- Layout: grid md:grid-cols-[280px_1fr]
- **Левая часть — Фото-карусель**: стрелки навигации + dots внизу, hover:scale-105
  - Бейдж звёзд (bg-amber-400/90, Star icon)
  - Gradient overlay внизу фото
- **Правая часть**: название отеля + адрес (MapPin), рейтинг (цветной блок: ≥9 emerald, ≥8 emerald-600, ≥7 sky, ≥6 amber), кол-во отзывов
  - Amenities с иконками: WiFi, Завтрак(UtensilsCrossed), Бассейн(Waves), Спа(Sparkles), Фитнес(Dumbbell), Парковка(Car), Кондиционер(Wind), ТВ(Tv)
  - Детали: даты, ночи, гости
  - Цена за ночь (text-2xl font-black amber-600) + итого
  - Кнопка "Забронировать" (bg-amber-600, rounded-xl) → Ostrovok

**Правая колонка:**
- **ItineraryChatWidget**: AI-чат для модификации маршрута. Сообщения пользователя и AI, auto-scroll, loading spinner, ввод с кнопкой Send
- **Важная информация**: Visa, Платёжные средства, Безопасность (Collapsible секции)
- **TripMap**: интерактивная карта Leaflet с маркерами городов

### 4. Results Page (/results) — Мои поездки
- Toggle: "Популярные" / "Мои маршруты"
- Поисковая строка
- 3-column grid карточек маршрутов
- **Карточка маршрута:**
  - Полное изображение h-48 md:h-72, rounded-t-[2rem]
  - Gradient overlay: from-card via-card/80 to-transparent
  - Бейдж безопасности (absolute top-3 right-3)
  - Content: название, направление, длительность, теги (цветные rounded-full), бюджет (Wallet icon)
  - Кнопка "Открыть маршрут" (rounded-full, bg-primary, hover:scale-105)
- Infinite scroll на "Мои маршруты"
- Empty state: иконка + CTA

### 5. Profile Page (/profile)
- MeshGradient фон
- Tabs: Обзор / Маршруты / Настройки
- Аватар с upload, имя, email
- Предпочтения: темп, религия, языки, диета, интересы
- Список маршрутов (из DB + localStorage)

### 6. Sidebar (AppSidebar)
- Collapsible: w-64 ↔ w-[72px]
- Лого в header
- Навигация: Главная, Планирование, Мои маршруты, AI Гид, Профиль (с иконками Lucide)
- Последние поездки (список)
- Участники группы (аватары)
- Theme toggle (3 кнопки: light/system/dark с иконками Sun/Laptop/Moon)
- User dropdown (avatar + имя + logout)

---

## Архитектура Backend (API Routes)

### /api/deepseek (POST) — Генерация маршрута
**Pipeline:**
1. Получить параметры (departureCity, destinations, dates, budget, style, companions)
2. Валидация: визы, закрытые аэропорты, минимальный бюджет (`real-time-validation.ts`)
3. Параллельно: собрать динамический контекст (перелёты через Travelpayouts API, события, цены, тренды)
4. Построить обогащённый промпт (`prompt-builder.ts`) с контекстом + strict rules
5. Для ≤7 дней: один запрос DeepSeek. Для 8+: чанки по 4 дня + метаданные
6. **Параллельно с генерацией**: `fetchLogistics` — веб-поиск через Perplexity/Sonar для реальных билетов и отелей
7. Мерж: прикрепить flights[] и hotels[] к маршруту
8. Сохранить в Supabase

**fetchLogistics — КРИТИЧЕСКИ ВАЖНО:**
- Получает `cities: string[]` — РЕАЛЬНЫЕ имена городов (не description-строку!)
- Для мульти-городов: flight legs A→B, B→C, C→A
- Для каждого города: отдельный поиск отелей с правильными датами check-in/check-out
- Booking URLs: Aviasales с корректными IATA кодами, Ostrovok для отелей
- Если пользователь не указал города (AI выбирает): извлечь города из `routeData.countries` после генерации, затем искать логистику

### /api/search/travel (POST) — Веб-поиск перелётов/отелей
- Input: departureCity, destinationCity, startDate, endDate, passengers
- Использует Perplexity/Sonar через OpenRouter для веб-поиска
- Output: { flights: [...], hotels: [...] } с реальными названиями, ценами, IATA кодами

### /api/trip-assistant (POST) — Чат-модификация маршрута
- Intent classification: MODIFY / QUESTION
- Для MODIFY: парсинг типа (edit_activity, add_activity, redistribute), генерация замены через DeepSeek
- Output: modifications[] + reply message

### /api/flights/prices (GET) — Travelpayouts API
- Actions: cheap, calendar, matrix, special, popular
- Кеширование, форматирование цен в ₽

### /api/gallery (GET) — Поиск фото (Unsplash/Wikimedia)
### /api/reviews (GET) — Отзывы о местах
### /api/guide-chat (POST) — Локальный AI-гид

---

## База данных (Supabase PostgreSQL)

### Таблицы:
```sql
trips: id, user_id, title, description, destination, start_date, end_date,
       total_cost, budget_range, itinerary (JSONB), flights (JSONB), hotels (JSONB),
       visa_advice, payment_advice, safety_info, budget_analysis,
       cover_image, tags (text[]), countries (JSONB), viral_spots (JSONB),
       token_usage (JSONB), invite_code, created_at

trip_members: id, trip_id, user_id, role (owner/editor/viewer), joined_at

budget_expenses: id, trip_id, category, amount, description, day_number

voting_polls: id, trip_id, question, options (JSONB), votes (JSONB), created_by

profiles: id (= auth.uid), full_name, avatar_url, preferences (JSONB)

app_settings: key, value (для maintenance mode и т.д.)
```

**RLS**: Все таблицы защищены Row-Level Security. trips видны только owner и trip_members.

---

## AI Pipeline (lib/)

### prompt-builder.ts
- Объединяет: system prompt + strict rules + travel style + dynamic context + validation warnings
- Динамический контекст: перелёты (Travelpayouts), события, цены (regional DB), тренды

### grounding.ts — Ground Truth 2026
- Закрытые аэропорты (Краснодар KRR, Анапа AAQ, и т.д.)
- Визовые правила по странам для РФ граждан
- Flight connectivity (прямые: Турция, ОАЭ, Сербия, Китай; с пересадкой: Европа через IST/DXB)
- Trending locations по городам

### strict-rules.ts — Правила генерации
- Реалистичное время (перелёт 5+ часов = день потерян)
- Нет телепортации между городами
- Логистика обязательна для каждого дня
- JSON output строго структурированный

### travelpayouts.ts — Партнёрские ссылки
- IATA коды для 50+ городов (Москва→MOW, Белград→BEG, Стамбул→IST...)
- getFlightSearchLink → aviasales.ru с marker, IATA, датами
- getHotelSearchLink → ostrovok.ru с marker, city, датами
- getCheapestTickets, getPriceCalendar, getWeekMatrix — Travelpayouts Data API

---

## Ключевые UX-фичи

1. **Realtime шаринг**: invite codes, trip_members с ролями, Supabase subscriptions для группового чата
2. **AI Chat**: модификация маршрута через чат ("Замени музей на кафе в день 2")
3. **Dark/Light тема**: next-themes, attribute="class", system по умолчанию
4. **Glassmorphism**: backdrop-blur + полупрозрачные фоны везде
5. **WebGL-эффекты**: Aurora, MeshGradient, LightRays (lazy load, client-only)
6. **Responsive**: mobile-first, sidebar скрывается на mobile, hamburger menu
7. **Maintenance mode**: через app_settings в Supabase, bypass для admins
8. **Admin panel**: субдомен admin.*, role check в middleware

---

## Анимации (Framer Motion)

```
Hero text: initial={opacity:0, y:20} animate={opacity:1, y:0} duration=0.8
Search capsule: initial={opacity:0, scale:0.95} animate={opacity:1, scale:1} delay=0.4
Floating images: animate={y:[0,-20,0]} duration=5s infinite stagger=1.2s
Cards stagger: delay=idx*0.1, y:20→0
Card hover: -translate-y-2, shadow increase
Modal: scale:0.9→1, spring damping=25 stiffness=300
Day expand: slide-in-from-top-2 duration-300
Progress bar: animate-[gradient_2s_linear_infinite] bg-size-200%
Loading spinner: animate-spin border-2 border-white/30 border-t-white
```

---

## Финальные детали

- `next.config.mjs`: output='standalone', ignoreBuildErrors=true, unoptimized images
- Path alias: `@/*` → project root
- Все компоненты: `"use client"`, named exports, PascalCase
- UI язык: **русский** (все надписи, тосты, ошибки)
- `cn()` утилита из `clsx` + `tailwind-merge` для className
- Print styles: скрыть UI, показать только маршрут
- Custom scrollbar: 8px, rounded, foreground/10 цвет
- Selection color: primary с opacity 30%
