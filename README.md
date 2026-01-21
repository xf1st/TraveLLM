# 🌍 TraveLM: Your AI Travel Compass

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Groq AI](https://img.shields.io/badge/Powered_by-Groq_AI-f55036?style=for-the-badge)](https://groq.com/)

**TraveLM** — это умный планировщик путешествий, который превращает ваши мечты в готовый маршрут за считанные секунды. Используя мощь LLM (Llama 3 / Mixtral) и данные в реальном времени, мы создаем персонализированные поездки с детальным таймингом, картами и бюджетом.

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
Создавайте многодневные планы поездок простым запросом. Укажите бюджет, компанию и интересы — AI сделает остальное.

### 🤖 Личный AI Гид
Два режима общения с помощником:
*   **О месте:** Спросите про историю, часы работы или меню конкретной локации.
*   **О маршруте:** Планируйте логистику и следите за бюджетом всей поездки.

### 📍 Интерактивная Карта
Визуализируйте свой путь. Карта синхронизируется с маршрутом: кликните на место в списке, и карта перелетит к нему.

### ✅ Умные Чек-листы
Следите за бронированием билетов, отелей и страховок.

---

## 🚀 Быстрый старт

### Требования
*   Node.js 18+
*   Supabase Account
*   Groq API Key

### Установка

1.  **Клонируйте репозиторий:**
    ```bash
    git clone https://github.com/your-username/travelmind-ai.git
    ```

2.  **Установите зависимости:**
    ```bash
    npm install
    ```

3.  **Настройте окружение (.env.local):**
    ```env
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    GROQ_API_KEY=...
    ```

4.  **Запустите:**
    ```bash
    npm run dev
    ```

Приложение доступно по адресу [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Стек технологий

*   **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS v4
*   **Maps:** Leaflet, React-Leaflet
*   **UI Components:** Radix UI, Lucide React, Custom Glassmorphism Theme
*   **Backend:** Supabase (Auth, DB, Realtime)
*   **AI Inference:** Groq SDK (Llama 3-70b, Mixtral 8x7b)

---

Built with ❤️ by [Your Team]