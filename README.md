# 🌍 TraveLLM: Your AI Travel Compass

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Powered_by-Gemini_AI-1E88E5?style=for-the-badge)](https://deepmind.google/technologies/gemini/)

**TraveLLM** — это умный планировщик путешествий, который превращает ваши мечты в готовый маршрут за считанные секунды. Используя мощь Gemini API и данные в реальном времени, мы создаем персонализированные поездки с детальным таймингом, билетами, логистикой, картами и бюджетом.

---

## 📚 Документация

Полная документация проекта доступна в формате GitBook. Вы можете найти исходные файлы в папке `docs/` или перейти к навигации:

### 👉 **[Открыть Документацию (GitBook)](docs/SUMMARY.md)**

В документации вы найдете:

- **[Начало работы](docs/getting-started.md)**: Как запустить проект.
- **[Возможности](docs/features/planning.md)**: Создание маршрутов, карты, AI-гид.
- **[Технологии](docs/tech/stack.md)**: Подробный обзор стека.

---

## ✨ Возможности

### 🗺️ Генерация маршрутов

Создавайте многодневные планы поездок простым запросом. Укажите бюджет, компанию и интересы — AI сделает остальное, включая поиск актуальных авиарейсов через Travelpayouts.

### 🤖 Личный AI Гид

Два режима общения с помощником:

- **О месте:** Спросите про историю, часы работы или меню конкретной локации.
- **О маршруте:** Планируйте логистику и следите за бюджетом всей поездки.

### 📍 Интерактивная Карта

Визуализируйте свой путь. Карта (Leaflet) синхронизируется с маршрутом: кликните на место в списке, и карта перелетит к нему с показом 3D-моделей.

### ✅ Умные Чек-листы

Следите за бронированием билетов, отелей и страховок.

---

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- Supabase Account
- Gemini API Key
- Travelpayouts API Key

### Установка

1.  **Клонируйте репозиторий:**

    ```bash
    git clone https://github.com/xf1st/TraveLLM.git
    ```

2.  **Установите зависимости:**

    ```bash
    npm install
    ```

3.  **Настройте окружение (.env.local):**

    ```env
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    GEMINI_API_KEY=...
    TRAVELPAYOUTS_API_TOKEN=...
    NEXT_PUBLIC_TRAVELPAYOUTS_MARKER=...
    ```

4.  **Запустите:**
    ```bash
    npm run dev
    ```

Приложение доступно по адресу [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Стек технологий

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Maps:** Leaflet, React-Leaflet, MapLibre GL
- **UI Components:** Radix UI, Lucide React, Custom Glassmorphism Theme
- **Backend:** Supabase (Auth, DB, Realtime)
- **AI Inference:** Gemini API
- **3D / Animations:** Three.js, React Three Fiber, Framer Motion

---

Built with ❤️ by TraveLLM Team
