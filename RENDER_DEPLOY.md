# TraveLM - Render Deployment Guide

## 🚀 Деплой на Render.com

Render отлично подходит для Next.js с API функциями, в отличие от Netlify.

### 1. Подготовка репозитория
✅ Уже готово - код на GitHub

### 2. Создание Web Service на Render

1. **Зайдите в [Render Dashboard](https://dashboard.render.com/)**
2. **New → Web Service**
3. **Connect GitHub** и выберите репозиторий `xf1st/v0-travelmind-ai-guide`

### 3. Настройки сборки

**Build Settings:**
- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Runtime:** `Node 18` или `Node 20`

**Environment Variables:**
```
GROQ_API_KEY=your_groq_api_key_here
HUGGING_FACE_TOKEN=your_huggingface_token_here
NEXT_PUBLIC_SUPABASE_URL=https://gsmdgtopofvklvkninfl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbWRndG9wb2Z2a2x2a25pbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5OTUwNjMsImV4cCI6MjA4MzU3MTA2M30.YBHU74Z1riS8nUTb-ewVBVvfK6TiVGsHuAcuQVJcy6c
NODE_ENV=production
```

### 4. План Render
- **Free Plan:** 
  - Всегда включен (no sleep)
  - Пользовательский домен: `your-app.onrender.com`
  - Поддержка API функций
  - SSL сертификат

### 5. Преимущества над Netlify
✅ **API функции работают нормально**  
✅ **Нет проблем с timeout**  
✅ **Full-stack поддержка**  
✅ **Больше лимитов**  
✅ **Стабильнее работает**

### 6. После деплоя
1. Дождитесь окончания сборки (5-10 минут)
2. Откройте ваш домен `*.onrender.com`
3. Проверьте `/all-api` для статуса
4. Протестируйте генерацию маршрутов

### 7. Домен (опционально)
В настройках Web Service можно добавить свой домен:
- Настройте DNS `A` запись на IP Render
- Автоматически выпустится SSL сертификат

---

**Готово!** Render должен решить все проблемы с API функциями.
