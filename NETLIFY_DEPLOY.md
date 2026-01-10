# Инструкция по деплою TraveLM на Netlify 🚀

TraveLM построен на Next.js, что позволяет легко развернуть его на Netlify. Следуйте этим шагам:

## 1. Подготовка репозитория
1. Загрузите ваш код на **GitHub**, **GitLab** или **Bitbucket**.

## 2. Создание сайта в Netlify
1. Зайдите в [Netlify Dashboard](https://app.netlify.com/).
2. Нажмите **"Add new site"** -> **"Import an existing project"**.
3. Выберите ваш провайдер (например, GitHub) и нужный репозиторий.

## 3. Настройки сборки (Build Settings)
Netlify должен автоматически определить Next.js, но проверьте:
- **Build command:** `npm run build`
- **Publish directory:** `.next`

## 4. Переменные окружения (Environment Variables) 🔑
Это **самый важный шаг**. Перейдите в раздел **"Site configuration"** -> **"Environment variables"** и добавьте следующие ключи:

| Key | Value |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Ваш URL из Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ваш Anon Key из Supabase |
| `GROQ_API_KEY` | Ваш API ключ от Groq |

> [!IMPORTANT]
> Если вы используете Hugging Face вместо Groq, замените ключ на соответствующий.

## 5. Дополнительные настройки для Next.js
Netlify использует плагин **Essential Next.js**, который устанавливается автоматически. Он обеспечит работу API роутов и динамического рендеринга.

## 6. Как обновить сайт?
Просто сделайте `git push` в вашу основную ветку (`main` или `master`), и Netlify автоматически пересоберет и обновит сайт.

---

### Рекомендации по домену:
- В разделе **"Domain management"** вы можете привязать свой домен или изменить бесплатный поддомен от Netlify (например, `travelm.netlify.app`).

## 🛑 Решение проблем с деплоем

### Ошибка `ERR_PNPM_OUTDATED_LOCKFILE`
Если Netlify выдает ошибку о том, что `pnpm-lock.yaml` устарел, у вас есть два варианта решения:

#### Вариант А: Обновить локально (Рекомендуется)
Выполните команду в терминале вашего компьютера и закоммитьте изменения:
```bash
pnpm install
```
Это синхронизирует файл блокировки с `package.json`.

#### Вариант Б: Отключить "Frozen Lockfile" в Netlify
Если вы не хотите устанавливать `pnpm` локально:
1. Перейдите в **Site settings** -> **Build & deploy** -> **Environment variables**.
2. Добавьте новую переменную:
   - **Key:** `PNPM_FLAGS`
   - **Value:** `--no-frozen-lockfile`
3. Запустите деплой заново.

#### Вариант В: Использовать NPM вместо PNPM
Если вы предпочитаете стандартный `npm`, просто удалите файл `pnpm-lock.yaml` из проекта и сделайте `git push`. Netlify автоматически переключится на `npm`.
