# 🛠️ Технологический Стек

TraveLM AI построен на современном стеке технологий, обеспечивающем высокую производительность, SEO-оптимизацию и отличный пользовательский опыт.

## Frontend

*   **[Next.js 15](https://nextjs.org/) (App Router):** Фреймворк React для server-side rendering (SSR), статической генерации и API-роутов. Используется новейшая архитектура App Router.
*   **[React 19](https://react.dev/):** Библиотека для построения пользовательских интерфейсов.
*   **[TypeScript](https://www.typescriptlang.org/):** Строгая типизация для надежности кода.
*   **[Tailwind CSS v4](https://tailwindcss.com/):** Утилитарный CSS-фреймворк для быстрой и гибкой стилизации.
*   **[Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/):** Интерактивные карты (OpenStreetMap).
*   **[Lucide React](https://lucide.dev/):** Красивые и легковесные иконки.
*   **[Radix UI](https://www.radix-ui.com/):** Доступные "headless" компоненты (Dialog, Popover, Slot и др.) для построения надежного UI.
*   **[Framer Motion](https://www.framer.com/motion/)** (опционально): Использовался для некоторых анимаций (если применимо).

## Backend & Services

*   **[Supabase](https://supabase.com/):** Backend-as-a-Service (BaaS).
    *   **PostgreSQL:** Основная база данных.
    *   **Auth:** Аутентификация пользователей (Email/Password, OAuth).
    *   **Storage:** Хранение медиафайлов (аватарок и т.д.).
*   **[Groq](https://groq.com/):** Провайдер AI-инференса. Используется для генерации маршрутов и чата благодаря невероятно высокой скорости токенов в секунду (LPU Inference Engine).
    *   **Модели:** Llama 3, Mixtral 8x7b.

## API Integration

*   **Unsplash / Pexels API:** (Если используется) Для подбора красивых фотографий мест.
*   **OpenStreetMap:** Данные для карт.

## Инструменты разработки

*   **ESLint & Prettier:** Линтинг и форматирование кода.
*   **Git:** Контроль версий.
