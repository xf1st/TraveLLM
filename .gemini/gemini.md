# TraveLLM Project Context (Gemini)

## Текущий стек и настройки
- **Framework**: Next.js 16.1.6 (Turbopack)
- **AI**: Gemini 2.5 Flash Lite (OpenRouter) + DeepSeek (Fallback)
- **Database**: Supabase
- **Image Proxy**: Все внешние запросы (Unsplash, Pexels, Wiki, Weather, Geocode) ОБЯЗАТЕЛЬНО проходят через `proxiedFetch` или диспетчер `undici` с использованием `HTTP_PROXY`.

## Важные правила разработки

### 1. Работа с изображениями
- **Компонент**: Использовать `TripImage` для всех одиночных фото.
- **Поиск**: Все запросы в `lib/images.ts` должны проходить через `translateToEnglish`.
- **Запреты**: НИКОГДА не искать фото для аэропортов/вокзалов (использовать заглушку).
- **Блокировки**: Домены `wikimedia.org` на клиенте должны принудительно проксироваться через `/api/proxy-image`.

### 2. Уведомления (Toasts)
- Используется библиотека `sonner`, но с кастомным рендером `TicketToast`.
- Импортировать только как: `import { appToast as toast } from "@/components/ui/sonner"`.
- Не использовать стандартные `toast.success/error`, так как они обернуты в логику билетов.

### 3. Логистика и Аэропорты
- При проверке статуса аэропорта (`checkAirportLiveStatus`) всегда игнорировать коды городов (MOW, PAR, LON и т.д.) — они всегда `isOpen: true`.
- Не блокировать генерацию при отсутствии данных от RapidAPI (AeroDataBox).

### 4. Тарифные лимиты (Лендинг)
- Free: 1 генерация
- Pro: 25 генераций
- Max: 50 генераций
