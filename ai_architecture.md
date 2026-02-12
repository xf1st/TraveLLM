# 🧠 TraveLM AI Architecture — Обновлённая документация

> **Последнее обновление:** 21 января 2026

## 📊 Текущая конфигурация

```
┌────────────────────────────────────────────────────────────┐
│  ❌ GLM-4.7 via Cerebras (DISABLED)                        │
│     zai-org/GLM-4.7:cerebras | 358B параметров             │
├────────────────────────────────────────────────────────────┤
│  ❌ Llama-3.3-70B via Cerebras (DISABLED)                  │
│     meta-llama/Llama-3.3-70B-Instruct:cerebras | 70B       │
├────────────────────────────────────────────────────────────┤
│  ✅ Llama-3.1-8B via HuggingFace (ACTIVE)                  │
│     meta-llama/Llama-3.1-8B-Instruct:ovhcloud              │
│     Бесплатная, быстрая, экономит free tier                │
└────────────────────────────────────────────────────────────┘
```

> ⚠️ **Cerebras модели отключены** для экономии бесплатного тарифа HuggingFace.
> Чтобы включить — раскомментируй код в [/app/api/deepseek/route.ts](file:///d:/sites/travelmind-ai-guide/app/api/deepseek/route.ts) (строки 198-217).

---

## 📁 Структура файлов

```
app/
  api/deepseek/route.ts      ← Главный API для генерации маршрутов
    image/route.ts     ← Прокси API для изображений (Wikimedia)
lib/
  cerebras.ts          ← GLM-4.7 + Llama-3.3-70B через HF Router (DISABLED)
  huggingface.ts       ← Llama-3.1-8B напрямую (ACTIVE)
  images.ts            ← Поиск изображений (Wikimedia Commons)
```

---

## 🤖 Доступные AI провайдеры

### 1. HuggingFace Inference (АКТИВЕН)
**Файл:** [lib/huggingface.ts](file:///d:/sites/travelmind-ai-guide/lib/huggingface.ts)

```typescript
export const HUGGINGFACE_MODEL = "meta-llama/Llama-3.1-8B-Instruct:ovhcloud";

// Прямой вызов HF Chat API
const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        model: HUGGINGFACE_MODEL,
        messages: [...],
        max_tokens: 16384,
        temperature: 0.7,
    }),
});
```

| Параметр | Значение |
|----------|----------|
| Модель | Llama-3.1-8B-Instruct |
| Провайдер | OVHcloud |
| Max tokens | 16,384 |
| Скорость | Быстрая |
| Качество | Среднее (достаточно для маршрутов) |

---

### 2. Cerebras Models (ОТКЛЮЧЕНЫ)
**Файл:** [lib/cerebras.ts](file:///d:/sites/travelmind-ai-guide/lib/cerebras.ts)

Содержит две функции для мощных моделей через HuggingFace Router:

```typescript
// GLM-4.7 (358B) - Новейшая, мощная
export const GLM_MODEL = "zai-org/GLM-4.7:cerebras";
export async function glmInference(messages, options) { ... }

// Llama-3.3-70B - Надёжная, проверенная
export const LLAMA_MODEL = "meta-llama/Llama-3.3-70B-Instruct:cerebras";
export async function llamaInference(messages, options) { ... }
```

| Модель | Размер | Качество | Скорость | Статус |
|--------|--------|----------|----------|--------|
| GLM-4.7 | 358B | ⭐⭐⭐⭐⭐ | Быстрая (Cerebras) | ❌ Disabled |
| Llama-3.3-70B | 70B | ⭐⭐⭐⭐ | Быстрая (Cerebras) | ❌ Disabled |
| Llama-3.1-8B | 8B | ⭐⭐⭐ | Очень быстрая | ✅ Active |

---

## 🔄 Flow генерации маршрута

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                            │
│  /plan → PlanPage.tsx                                                │
│    ↓                                                                 │
│  Пользователь заполняет форму                                        │
│    ↓                                                                 │
│  POST /api/deepseek с данными формы                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND — /api/deepseek/route.ts                                        │
│    ↓                                                                 │
│  1. Формируем промпт с данными пользователя                          │
│    ↓                                                                 │
│  2. HuggingFace API (Llama-3.1-8B)                                   │
│     [GLM-4.7 и Llama-3.3-70B отключены]                              │
│    ↓                                                                 │
│  3. Парсим JSON, repair если обрезан                                 │
│    ↓                                                                 │
│  4. Wikimedia API → coverImage                                       │
│    ↓                                                                 │
│  5. Return JSON маршрута                                             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                            │
│    ↓                                                                 │
│  Сохранение в Supabase (trips table)                                 │
│    ↓                                                                 │
│  Redirect → /trip/[id]                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Environment Variables

```env
# HuggingFace (Primary AI + Cerebras Router)
HUGGING_FACE_TOKEN=hf_xxx_replace_with_real_token

# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=https://gsmdgtopofvklvkninfl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Groq (не используется, ключ заблокирован)
# GROQ_API_KEY=gsk_...
```

---

## 🚀 Как включить мощные модели

Если нужно лучшее качество генерации, раскомментируй в файле [app/api/deepseek/route.ts](file:///d:/sites/travelmind-ai-guide/app/api/deepseek/route.ts):

```typescript
// Строки 198-217 — убери /* и */ вокруг этого блока:

try {
    // 1. Try GLM-4.7 first (358B, newest)
    const routeData = await generateAndParse("GLM")
    console.log("Success with GLM-4.7")
    return NextResponse.json(routeData)
} catch (glmError: any) {
    console.error("GLM-4.7 failed:", glmError.message)
    try {
        // 2. Try Llama-3.3-70B (reliable)
        const routeData = await generateAndParse("Llama")
        ...
    }
}
```

> ⚠️ **Внимание:** Cerebras модели через HF Router быстро съедают бесплатный тариф!

---

## 🖼️ Система изображений

Без изменений — использует **Wikimedia Commons API**:

1. **Primary:** Поиск по Wikimedia Commons (работает в России)
2. **Fallback:** Статические URL для популярных направлений

```typescript
// lib/images.ts
export async function getDestinationImage(query: string) {
    const wikiImage = await searchWikimedia(query);
    if (wikiImage) return wikiImage;
    return getStaticFallback(query);
}
```

---

## 📋 Промпт (без изменений)

Полный промпт находится в [app/api/deepseek/route.ts](file:///d:/sites/travelmind-ai-guide/app/api/deepseek/route.ts) (строки 46-140).

Ключевые инструкции:
- Строгая длительность: `STRICT: Generate exactly N days`
- Бюджетный лимит: `STRICT CAP: 150000 RUB`
- Реальные названия мест (ban generic names)
- Google Maps ссылки для каждой активности
- Ответ строго на русском языке
- Вывод только JSON
