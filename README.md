# 🌍 TraveLLM: Your AI Travel Compass

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![OpenRouter](https://img.shields.io/badge/AI-OpenRouter%20%7C%20Gemini%20%7C%20DeepSeek-7C3AED?style=for-the-badge)](https://openrouter.ai/)

**TraveLLM** — двуязычный (RU/EN) AI-сервис для планирования путешествий. Сервис генерирует детализированные многодневные маршруты с таймингом по дням, логистикой, билетами, бюджетом, советами по безопасности и визам, а также предоставляет интерактивного AI-ассистента для модификации плана на лету.

---

## 🌐 Продакшен-домены

- 🇷🇺 [https://travellm.ru](https://travellm.ru) — русскоязычная версия по умолчанию
- 🌍 [https://travellm.world](https://travellm.world) — англоязычная версия по умолчанию

---

## ✨ Ключевые возможности

### 🗺️ Генерация маршрутов на базе ИИ
- **Мультимодальный и чанковый пайплайн:** генерация через Gemini 3.1 Flash Lite (через OpenRouter) с надежным фоллбэком на DeepSeek (`deepseek-chat` / `deepseek-reasoner`).
- **Длинные маршруты (>7 дней):** разбивка на последовательные 4-дневные чанки с контекстом и отдельной генерацией метаданных.
- **Гибкие параметры:** выбор типа транспорта (*flight / train / car*), стиля отдыха, темпа, бюджета (RUB / USD) и состава компании.

### 🤖 Интерактивный AI-ассистент поездки (`/trip/[id]`)
- Умный чат-помощник с поддержкой контекста конкретной поездки.
- Редактирование отдельных активностей или переписывание сегментов дней (`startDay` – `endDay`) в один клик.
- Поддержка изображений (Vision) и мультимодальных вопросов.
- Автосохранение правок маршрута с дебаунсом в базу данных.

### 💰 Бюджет и аналитика расходов
- Детализированный расчет бюджета по категориям: жилье, еда, транспорт, развлечения.
- Подбор авиабилетов в реальном времени через TravelPayouts API (Aviasales).
- Валидация актуальных логистических ограничений и закрытых аэропортов.

### 🔒 Безопасность, профили и контроль доступа
- Авторизация через Supabase Auth (Email / Magic Link, Google, GitHub).
- Поддержка ролей пользователей (`user`, `admin`, `super_admin`) и админ-панель (`/admin`).
- Ежемесячные квоты на генерации маршрутов и использование AI-чата.

---

## 🛠️ Стек технологий

### Frontend
- **Фреймворк:** [Next.js 16](https://nextjs.org/) (App Router, React 19, standalone-сборка)
- **Стилизация:** [Tailwind CSS 4](https://tailwindcss.com/) (`@theme inline`), [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **Иконки:** Lucide React, Material Symbols
- **Интернационализация (i18n):** [next-intl](https://next-intl-docs.vercel.app/) v4.8+ (RU/EN, cookie `NEXT_LOCALE`, доменная маршрутизация)
- **Анимации и 3D:** Framer Motion 12, Three.js, `@react-three/fiber`, OGL, Lottie React
- **UI-компоненты:** Sonner (тосты), Vaul (шторки/drawers), CMDK (командная строка), Embla Carousel, Recharts

### Backend & AI
- **BaaS / База данных:** [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Storage, Auth)
- **Основной AI-пайплайн:** Gemini 3.1 Flash Lite через [OpenRouter](https://openrouter.ai/)
- **Фоллбэк AI:** [DeepSeek](https://platform.deepseek.com/) (`deepseek-chat`, `deepseek-reasoner`)
- **Внешние API:** TravelPayouts (авиабилеты), OpenWeather (погода), Google Places (отзывы)

---

## 🚀 Быстрый старт

### Требования
- **Node.js** 20+ (или Node.js 18+)
- **npm** 10+
- Аккаунт **Supabase**
- API-ключ **OpenRouter** или **DeepSeek**

### 1. Клонирование репозитория
```bash
git clone https://github.com/xf1st/TraveLLM.git
cd TraveLLM
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка переменных окружения
Создайте файл `.env.local` в корне проекта (на основе `.env.example`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Providers (OpenRouter рекомендуется как primary)
OPENROUTER_API_KEY=sk-or-your-openrouter-key
DEEPSEEK_API_KEY=sk-your-deepseek-key

# TravelPayouts (Авиабилеты)
TRAVELPAYOUTS_API_TOKEN=your_token_here
NEXT_PUBLIC_TRAVELPAYOUTS_MARKER=123456

# Опционально: исходящий прокси для внешних AI-запросов
# HTTP_PROXY=http://username:password@host:port
```

### 4. Запуск в режиме разработки
```bash
npm run dev
```
Приложение откроется по адресу [http://localhost:3000](http://localhost:3000).

---

## 📜 Доступные скрипты

| Команда | Описание |
|---|---|
| `npm run dev` | Запуск сервера разработки (порт 3000) |
| `npm run build` | Сборка проекта для продакшена (standalone) |
| `npm run start` | Запуск собранного продакшен-сервера |
| `npm run lint` | Проверка кода линтером ESLint |
| `npm run typecheck` | Проверка типов TypeScript (`tsc --noEmit`) |
| `npm run test` | Запуск тестов Node.js |
| `npm run check` | Комплексная проверка: типы, линтинг и сборка |

---

## 📚 Документация проекта

Подробные руководства и документация:
- **[AGENTS.md](AGENTS.md)** — полное руководство по архитектуре, AI-пайплайну, лимитам и структуре приложения для AI-ассистентов и разработчиков.
- **[docs/SUMMARY.md](docs/SUMMARY.md)** — общая документация проекта.
- **[docs/ADMIN_SETUP.md](docs/ADMIN_SETUP.md)** — настройка админ-панели и прав доступа.
- **[docs/rkn-compliance-checklist.md](docs/rkn-compliance-checklist.md)** — чеклист соответствия юридическим требованиям.

---

Built with ❤️ by TraveLLM Team

## Проверка секретов перед коммитом

После клонирования включите локальную проверку:

```bash
git config core.hooksPath .githooks
npm run check:secrets
```

Проверка перед коммитом читает подготовленные к коммиту файлы и блокирует известные форматы приватных ключей, Telegram-токенов, URL с учётными данными и совпадения с локальными секретами. Она выводит только имя файла, номер строки и тип совпадения. Это дополнительная защита, а не гарантия обнаружения любых чувствительных данных. Отчёты и диагностику с личными данными храните только в игнорируемом каталоге `.local-audits/`; `.env` и отладочные логи не публикуйте. Уже опубликованные ключи необходимо отозвать и заменить — удаления файла недостаточно.
