# TraveLM - Vercel Deployment Guide

## 🚀 Деплой на Vercel.com

Vercel - лучшая платформа для Next.js с родной поддержкой API функций.

### 1. Подготовка репозитория
✅ Уже готово - код на GitHub и настроен `vercel.json`

### 2. Создание проекта на Vercel

1. **Зайдите в [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Add New → Project**
3. **Import Git Repository** → выберите `xf1st/v0-travelmind-ai-guide`
4. Vercel автоматически определит Next.js

### 3. Настройки Environment Variables

В настройках проекта → **Environment Variables** добавьте:

```
GROQ_API_KEY=your_groq_api_key_here
HUGGING_FACE_TOKEN=your_huggingface_token_here
NEXT_PUBLIC_SUPABASE_URL=https://gsmdgtopofvklvkninfl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbWRndG9wb2Z2a2x2a25pbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5OTUwNjMsImV4cCI6MjA4MzU3MTA2M30.YBHU74Z1riS8nUTb-ewVBVvfK6TiVGsHuAcuQVJcy6c
NODE_ENV=production
```

### 4. Преимущества Vercel

✅ **Native Next.js поддержка**  
✅ **API функции работают идеально**  
✅ **Автоматическое масштабирование**  
✅ **Edge Network**  
✅ **Больше лимитов timeout**  
✅ **Простая настройка**  
✅ **Бесплатный SSL и домен**

### 5. Конфигурация (vercel.json)

- **maxDuration: 30s** для API функций
- **regions: iad1** (США Восток)
- **Next.js оптимизация**

### 6. После деплоя

1. Дождитесь сборки (2-5 минут)
2. Откройте домен `*.vercel.app`
3. Проверьте `/all-api` для статуса
4. Протестируйте генерацию маршрутов

### 7. Домен (опционально)

В настройках проекта можно добавить:
- Свой домен
- Автоматически выпустится SSL
- Настройте DNS `CNAME` на `cname.vercel-dns.com`

---

**Vercel должен решить все проблемы с API!**
