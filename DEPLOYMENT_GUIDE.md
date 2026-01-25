# 🚀 Инструкция по деплою TravelMind AI на Timeweb Cloud

Timeweb Cloud предлагает два удобных способа размещения приложений Next.js. Мы рекомендуем способ №1 (Apps) для простоты, или №2 (Docker) для гибкости.

## Способ 1: Timeweb Apps (Самый простой)
Это аналог Vercel. Вы просто подключаете GitHub, и всё работает само.

### Шаги:
1.  **Запушить код на GitHub**: Убедитесь, что ваш актуальный код находится в репозитории на GitHub.
2.  В панели Timeweb Cloud перейдите в раздел **Apps**.
3.  Нажмите **"Создать приложение"**.
4.  Выберите **GitHub** и найдите ваш репозиторий.
5.  Timeweb автоматически определит **Next.js**.
6.  **Настройка переменных (Environment Variables)**:
    *   В разделе "Переменные окружения" пропишите всё из вашего `.env` файла:
        *   `NEXT_PUBLIC_SUPABASE_URL`
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7.  Нажмите **"Деплой"**.

**Плюсы:** Автоматические обновления при пуше в GitHub, SSL сертификат бесплатно.

---

## Способ 2: Docker / Деплой образа (Для профи)
Мы подготовили файл `Dockerfile` для создания оптимизированного образа.

### Локальная сборка и отправка (если есть Docker):
1.  Соберите образ:
    ```bash
    docker build -t travelmind-app .
    ```
2.  Если вы используете Docker Hub или Container Registry:
    ```bash
    docker tag travelmind-app your-user/travelmind-app
    docker push your-user/travelmind-app
    ```
3.  В Timeweb Cloud выберите **"Контейнеры"** (или Kubernetes) и укажите ваш образ.

### Сборка внутри Timeweb (через Apps -> Dockerfile):
1.  В разделе **Apps** выберите источник **GitHub**.
2.  В настройках сборки выберите **Dockerfile**.
3.  Укажите путь к Dockerfile (обычно корневая папка).
4.  Добавьте переменные окружения (см. Способ 1).
5.  Запустите деплой. Timeweb сам соберет образ по нашей инструкции.

## Способ 3: Классический VDS (Ubuntu)
Если вы арендовали пустой сервер (VDS).

1.  Установите Node.js 18+ и PM2:
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    sudo npm install -g pm2
    ```
2.  Клонируйте репозиторий:
    ```bash
    git clone https://github.com/your-repo/travelmind.git /var/www/travelmind
    cd /var/www/travelmind
    ```
3.  Установите зависимости и соберите:
    ```bash
    npm install
    # Создайте файл .env.local с переменными
    npm run build
    ```
4.  Запустите через PM2:
    ```bash
    pm2 start npm --name "travelmind" -- start
    pm2 save
    ```
5.  Настройте Nginx как прокси (для привязки домена).

---

## 💡 Рекомендация
Для старта используйте **Способ 1 (Timeweb Apps)**. Это сэкономит время на настройке сервера, Nginx и SSL. Просто подключите репозиторий, добавьте ключи Supabase и нажмите "Start".
