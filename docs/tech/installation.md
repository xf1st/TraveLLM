# 💻 Установка и Запуск

Инструкция по развертыванию проекта локально для разработки.

## Требования

*   **Node.js** версии 18 или выше.
*   **npm** или **yarn** / **pnpm**.
*   Аккаунт **Supabase**.
*   API ключ от **Groq**.
*   (Опционально) API ключ для сервиса картинок (Unsplash/Pexels), если настроено.

## Шаги установки

1.  **Клонируйте репозиторий:**

    ```bash
    git clone https://github.com/your-username/travelmind-ai.git
    cd travelmind-ai
    ```

2.  **Установите зависимости:**

    ```bash
    npm install
    # или
    yarn install
    ```

3.  **Настройте переменные окружения:**

    Создайте файл `.env.local` в корне проекта и скопируйте в него содержимое `.env.example` (или используйте шаблон ниже):

    ```env
    # Supabase (База данных и Аутентификация)
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    
    # Groq (AI Генерация)
    GROQ_API_KEY=your_groq_api_key
    
    # Опционально: URL сайта для редиректов
    NEXT_PUBLIC_SITE_URL=http://localhost:3000
    ```

4.  **Запустите сервер разработки:**

    ```bash
    npm run dev
    ```

    Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

## Сборка для продакшена

Для создания оптимизированной версии приложения выполните:

```bash
npm run build
npm start
```

## Структура проекта

*   `/app` — Страницы и роутинг (App Router).
*   `/components` — Переиспользуемые UI компоненты.
*   `/lib` — Утилиты, хуки и конфигурации (Supabase клиент, Groq клиент).
*   `/docs` — Документация проекта (GitBook).
*   `/public` — Статические файлы (изображения, иконки).
