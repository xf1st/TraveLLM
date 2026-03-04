# 🛠️ Технологический Стек

TraveLLM построен на современном стеке технологий, обеспечивающем высокую производительность, SEO-оптимизацию и отличный пользовательский опыт.

## Frontend

- **[Next.js 16](https://nextjs.org/) (App Router):** Фреймворк React для server-side rendering (SSR), статической генерации и API-роутов. Используется архитектура App Router.
- **[React 19](https://react.dev/):** Библиотека для построения пользовательских интерфейсов.
- **[TypeScript](https://www.typescriptlang.org/):** Строгая типизация для надежности кода.
- **[Tailwind CSS v4](https://tailwindcss.com/):** Утилитарный CSS-фреймворк для быстрой и гибкой стилизации.
- **[Leaflet](https://leafletjs.com/) & [MapLibre GL](https://maplibre.org/):** Интерактивные и 3D карты.
- **[Three.js](https://threejs.org/) & [React Three Fiber](https://docs.pmnd.rs/react-three-fiber):** Отображение 3D объектов на картах (через `@paper-design/shaders-react`).
- **[Lucide React](https://lucide.dev/):** Красивые и легковесные иконки.
- **[Radix UI](https://www.radix-ui.com/):** Доступные "headless" компоненты (Dialog, Popover, Slot и др.) для построения надежного UI (дополняется shadcn/ui).
- **[Framer Motion](https://www.framer.com/motion/):** Плавные анимации и переходы интерфейса.

## Backend & Services

- **[Supabase](https://supabase.com/):** Backend-as-a-Service (BaaS).
  - **PostgreSQL:** Основная база данных.
  - **Auth:** Аутентификация пользователей (Email/Password, OAuth).
  - **Storage:** Хранение медиафайлов (аватарок и т.д.).
- **[Gemini API](https://deepmind.google/technologies/gemini/):** Провайдер AI-инференса от Google. Используется как основной движок для генерации сложных многодневных маршрутов, парсинга запросов и умных помощников-гидов.

## API Integration

- **Wikimedia API:** Используется для подбора релевантных фотографий мест (альтернатива закрытым платным API).
- **Travelpayouts API:** Интеграция данных об авиарейсах в режиме реального времени, валидация закрытых аэропортов, IATA-коды.

## Инструменты разработки

- **ESLint & Prettier:** Линтинг и форматирование кода.
- **Git:** Контроль версий.
