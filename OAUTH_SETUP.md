# Настройка Google OAuth для TraveLM

## ❗️ ВАЖНО: Исправление ошибки redirect_uri_mismatch

Если вы видите ошибку `redirect_uri_mismatch`, то:

### Вариант 1: Вы на localhost (разработка)
В **Google Cloud Console** → **Credentials** → **OAuth Client ID** добавьте:

**Authorized JavaScript origins:**
```
http://localhost:3000
https://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:3000/auth/callback
https://localhost:3000/auth/callback
```

### Вариант 2: Вы на production (Vercel)
В **Google Cloud Console** → **Credentials** → **OAuth Client ID** добавьте:

**Authorized JavaScript origins:**
```
https://travelmind-ai-guide.vercel.app
```

**Authorized redirect URIs:**
```
https://travelmind-ai-guide.vercel.app/auth/callback
```

## Шаг 1: Создание OAuth Client ID в Google Cloud Console

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите или создайте новый проект
3. В меню слева выберите **APIs & Services** → **Credentials**
4. Найдите ваш OAuth Client ID и нажмите **Edit** (карандаш)

## Шаг 2: Настройка OAuth Client

### Application Type
- Выберите **Web application**

### Name
- Введите название: `TraveLM Web Client`

### Authorized JavaScript origins
**Для разработки:**
```
http://localhost:3000
https://localhost:3000
```

**Для production:**
```
https://travelmind-ai-guide.vercel.app
```

### Authorized redirect URIs
**Для разработки:**
```
http://localhost:3000/auth/callback
https://localhost:3000/auth/callback
```

**Для production:**
```
https://travelmind-ai-guide.vercel.app/auth/callback
```

## Шаг 3: Настройка Supabase

1. Перейдите в ваш [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. В меню слева выберите **Authentication** → **Providers**
4. Найдите **Google** и включите его
5. Вставьте **Client ID** и **Client Secret** из Google Cloud Console
6. В поле **Redirect URL** добавьте: `https://gsmdgtopofvklvkninfl.supabase.co/auth/v1/callback`

## Шаг 4: Обновление переменных окружения

Создайте файл `.env.local` в корне проекта:

```env
NEXT_PUBLIC_SUPABASE_URL=https://gsmdgtopofvklvkninfl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbWRndG9wb2Z2a2x2a25pbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5OTUwNjMsImV4cCI6MjA4MzU3MTA2M30.YBHU74Z1riS8nUTb-ewVBVvfK6TiVGsHuAcuQVJcy6c

# Google OAuth (добавьте в Supabase, не в .env)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Шаг 5: Настройка OAuth Consent Screen

1. В Google Cloud Console перейдите **APIs & Services** → **OAuth consent screen**
2. Выберите **External** и нажмите **Create**
3. Заполните обязательные поля:
   - **App name**: TraveLM
   - **User support email**: ваш email
   - **Developer contact information**: ваш email
4. В разделе **Scopes** добавьте:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
5. В разделе **Test users** добавьте ваш email для тестирования
6. Нажмите **Save and Continue**

## Шаг 6: Тестирование

1. Перезапустите приложение: `npm run dev`
2. Перейдите на `http://localhost:3000`
3. Нажмите "Войти через Google"
4. Проверьте, что редирект работает корректно

## ❗️ Частые проблемы

### Ошибка "redirect_uri_mismatch"
**Причина:** Google OAuth настроен на другой домен
**Решение:** Добавьте правильный домен в Authorized redirect URIs

**Для localhost:** `http://localhost:3000/auth/callback`
**Для production:** `https://travelmind-ai-guide.vercel.app/auth/callback`

### Ошибка "invalid_client"
**Причина:** Неправильный Client ID или Secret
**Решение:** Проверьте данные в Supabase Authentication → Providers

### Ошибка "access_denied"
**Причина:** Пользователь не добавлен в Test users
**Решение:** Добавьте email в Test users в OAuth consent screen

## Важные замечания

- Для production замените `localhost:3000` на ваш домен
- Убедитесь, что домены в Google OAuth и Supabase совпадают
- OAuth настройки могут занимать до 5 минут для применения
- Для тестирования добавьте свой email в Test users
- **ВСЕГДА** добавляйте и http:// и https:// версии доменов

## Проверка конфигурации

Запустите скрипт для проверки правильных URL:
```bash
node scripts/get-oauth-urls.js
```

Это покажет точные URL для вашей текущей среды.
