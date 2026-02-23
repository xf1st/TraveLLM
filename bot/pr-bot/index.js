require('dotenv').config({ path: '../../.env' });

const { Telegraf } = require('telegraf');
const axios = require('axios');

// ─── Config ──────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PR;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Только эти юзернеймы могут управлять ботом
const ALLOWED_USERNAMES = ['myszf', 'xf1st', 'jellDii'];

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN_PR не найден в .env');
  process.exit(1);
}
if (!DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY не найден в .env');
  process.exit(1);
}

// ─── Bot init ────────────────────────────────────────────────────────────────

const bot = new Telegraf(BOT_TOKEN);

// Буфер для медиагрупп (альбомы фотографий)
// Map<mediaGroupId, { chatId, photos, description, replyToId, timer }>
const mediaGroupBuffer = new Map();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAuthorized(username) {
  return username && ALLOWED_USERNAMES.includes(username);
}

function stripCommand(text, command) {
  return text
    .replace(new RegExp(`^\\/${command}(@\\w+)?\\s*`, 'i'), '')
    .trim();
}

// ─── DeepSeek post generation ─────────────────────────────────────────────────

async function generatePost(description, hasPhotos) {
  const systemPrompt = `Ты SMM-копирайтер сервиса TraveLM.

TraveLM — это AI-сервис для планирования путешествий. Пользователь описывает куда хочет поехать, сервис генерирует готовый маршрут по дням с активностями, отелями, едой и советами. Есть интерактивные карты, AI-чат с гидом, совместное планирование с друзьями.

Твоя задача — написать живой пост для Telegram-группы по краткому описанию от команды.

Строгие правила форматирования:
- Никакого markdown: без **жирного**, без __курсива__, без # заголовков, без --- разделителей
- Только обычный текст и эмодзи
- 2-4 эмодзи максимум, не больше
- Длина поста: 80-180 слов

Стиль и тон:
- Живо, по-человечески, без корпоративного официоза
- Можно использовать разговорные обороты
- Для обновлений: объясни что появилось и почему это удобно пользователю
- Заканчивай вопросом к аудитории или лёгким призывом к действию
- Только русский язык`;

  const userPrompt = hasPhotos
    ? `Напиши пост по этому описанию (к посту будут прикреплены фотографии):\n\n${description}`
    : `Напиши пост по этому описанию:\n\n${description}`;

  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.85,
    },
    {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data.choices[0].message.content.trim();
}

// ─── Post sender ─────────────────────────────────────────────────────────────

async function sendPost(telegram, chatId, postText, photoIds = []) {
  if (photoIds.length === 0) {
    await telegram.sendMessage(chatId, postText);
  } else if (photoIds.length === 1) {
    await telegram.sendPhoto(chatId, photoIds[0], { caption: postText });
  } else {
    // Медиагруппа: текст в caption первого фото
    const media = photoIds.map((fileId, i) => ({
      type: 'photo',
      media: fileId,
      ...(i === 0 ? { caption: postText } : {}),
    }));
    await telegram.sendMediaGroup(chatId, media);
  }
}

async function processPost(telegram, chatId, description, photoIds, statusMsgId) {
  try {
    const postText = await generatePost(description, photoIds.length > 0);

    // Удаляем "Генерирую..." если успели отправить
    if (statusMsgId) {
      await telegram.deleteMessage(chatId, statusMsgId).catch(() => {});
    }

    await sendPost(telegram, chatId, postText, photoIds);
  } catch (err) {
    console.error('Ошибка генерации поста:', err?.response?.data || err.message);
    const errText = 'Ошибка при генерации поста. Попробуй ещё раз.';
    if (statusMsgId) {
      await telegram
        .editMessageText(chatId, statusMsgId, undefined, errText)
        .catch(() => telegram.sendMessage(chatId, errText));
    } else {
      await telegram.sendMessage(chatId, errText);
    }
  }
}

// ─── Command: /post ───────────────────────────────────────────────────────────

bot.command('post', async (ctx) => {
  if (!isAuthorized(ctx.from?.username)) return;

  const description = stripCommand(ctx.message.text, 'post');

  if (!description) {
    return ctx.reply(
      'Укажи описание: /post <краткое описание>\n\nПример: /post Запустили 3D-режим карты — теперь маршрут можно крутить как глобус'
    );
  }

  const statusMsg = await ctx.reply('Генерирую пост...').catch(() => null);
  await processPost(ctx.telegram, ctx.chat.id, description, [], statusMsg?.message_id);
});

// ─── Photos with /post caption ────────────────────────────────────────────────

bot.on(['photo'], async (ctx) => {
  if (!isAuthorized(ctx.from?.username)) return;

  const caption = ctx.message.caption || '';

  // Реагируем только если в подписи есть /post
  if (!/^\/post(@\w+)?\s*/i.test(caption)) return;

  const description = caption.replace(/^\/post(@\w+)?\s*/i, '').trim();

  if (!description) {
    return ctx.reply('Добавь описание в подпись: /post <описание>');
  }

  const photoFileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  const mediaGroupId = ctx.message.media_group_id;

  if (mediaGroupId) {
    // Альбом — буфферизируем все фото
    if (!mediaGroupBuffer.has(mediaGroupId)) {
      const statusMsg = await ctx.reply('Генерирую пост...').catch(() => null);
      mediaGroupBuffer.set(mediaGroupId, {
        chatId: ctx.chat.id,
        photos: [],
        description,
        statusMsgId: statusMsg?.message_id,
        timer: null,
      });
    }

    const group = mediaGroupBuffer.get(mediaGroupId);
    group.photos.push(photoFileId);

    // Обновляем таймер — ждём последнего фото в альбоме
    clearTimeout(group.timer);
    group.timer = setTimeout(async () => {
      mediaGroupBuffer.delete(mediaGroupId);
      await processPost(
        ctx.telegram,
        group.chatId,
        group.description,
        group.photos,
        group.statusMsgId
      );
    }, 1500);
  } else {
    // Одиночное фото
    const statusMsg = await ctx.reply('Генерирую пост...').catch(() => null);
    await processPost(ctx.telegram, ctx.chat.id, description, [photoFileId], statusMsg?.message_id);
  }
});

// ─── Command: /help ───────────────────────────────────────────────────────────

bot.command('help', (ctx) => {
  if (!isAuthorized(ctx.from?.username)) return;

  ctx.reply(
    'TraveLM PR-бот\n\n' +
      'Команды:\n\n' +
      '/post <описание> — сгенерировать и опубликовать пост\n\n' +
      'Чтобы добавить фото к посту — отправь фото(архив) с подписью /post <описание>\n\n' +
      'Примеры:\n' +
      '/post Запустили 3D-карты, теперь маршрут можно смотреть как глобус\n\n' +
      '/post Обновили AI-гида: теперь он знает актуальные цены и отвечает быстрее\n\n' +
      'Доступ: только авторизованные пользователи.'
  );
});

// ─── Command: /start ─────────────────────────────────────────────────────────

bot.command('start', (ctx) => {
  if (!isAuthorized(ctx.from?.username)) return;
  ctx.reply('Привет! Используй /post <описание> чтобы создать пост. /help — справка.');
});

// ─── Ignore everything else ───────────────────────────────────────────────────

bot.catch((err, ctx) => {
  console.error(`Ошибка в обработчике [${ctx.updateType}]:`, err.message);
});

// ─── Launch ───────────────────────────────────────────────────────────────────

bot
  .launch()
  .then(() => {
    console.log('TraveLM PR-бот запущен');
    console.log('Авторизованные пользователи:', ALLOWED_USERNAMES.join(', '));
  })
  .catch((err) => {
    console.error('Ошибка запуска бота:', err.message);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
