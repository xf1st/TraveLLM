import { NextRequest, NextResponse } from 'next/server'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PR!
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!
const WEBHOOK_SECRET = process.env.TELEGRAM_PR_WEBHOOK_SECRET ?? 'travellm_pr_secret'

const ALLOWED_USERNAMES = new Set(['myszf', 'xf1st', 'jellDii'])

// ─── In-memory buffer для альбомов фото ──────────────────────────────────────
// Работает т.к. Next.js standalone — постоянный процесс

interface MediaGroup {
  chatId: number
  photos: string[]
  description: string
  statusMsgId?: number
  timer: ReturnType<typeof setTimeout> | null
}

const mediaGroupBuffer = new Map<string, MediaGroup>()

// ─── Telegram API ─────────────────────────────────────────────────────────────

const TG = (method: string) => `https://api.telegram.org/bot${BOT_TOKEN}/${method}`

async function tg(method: string, body: object) {
  const res = await fetch(TG(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return data.result
}

const sendMessage = (chatId: number, text: string) =>
  tg('sendMessage', { chat_id: chatId, text })

const editMessage = (chatId: number, messageId: number, text: string) =>
  tg('editMessageText', { chat_id: chatId, message_id: messageId, text }).catch(() => null)

const deleteMessage = (chatId: number, messageId: number) =>
  tg('deleteMessage', { chat_id: chatId, message_id: messageId }).catch(() => null)

const sendPhoto = (chatId: number, fileId: string, caption: string) =>
  tg('sendPhoto', { chat_id: chatId, photo: fileId, caption })

const sendMediaGroup = (chatId: number, photos: string[], caption: string) =>
  tg('sendMediaGroup', {
    chat_id: chatId,
    media: photos.map((fileId, i) => ({
      type: 'photo',
      media: fileId,
      ...(i === 0 ? { caption } : {}),
    })),
  })

// ─── DeepSeek генерация ───────────────────────────────────────────────────────

async function generatePost(description: string, hasPhotos: boolean): Promise<string> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `Ты SMM-копирайтер сервиса TraveLM.

TraveLM — AI-сервис для планирования путешествий. Пользователь описывает куда хочет поехать, сервис генерирует готовый маршрут по дням с активностями, отелями, едой и советами. Есть интерактивные карты, AI-чат с гидом, совместное планирование с друзьями. Сайт: travellm.ru

Твоя задача — написать живой пост для Telegram-группы по краткому описанию от команды.

Правила форматирования — строго:
- Никакого markdown: без **жирного**, без __курсива__, без # заголовков, без --- разделителей
- Только обычный текст и эмодзи
- 2-4 эмодзи, не больше
- Длина: 80-180 слов

Стиль:
- Живо и по-человечески, без корпоративного официоза
- Для обновлений: объясни что появилось и почему это удобно
- Заканчивай вопросом к читателям или лёгким призывом к действию
- Только русский язык`,
        },
        {
          role: 'user',
          content: hasPhotos
            ? `Напиши пост по этому описанию (к посту будут прикреплены фотографии):\n\n${description}`
            : `Напиши пост по этому описанию:\n\n${description}`,
        },
      ],
      max_tokens: 600,
      temperature: 0.85,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content.trim()
}

// ─── Публикация поста ─────────────────────────────────────────────────────────

async function processPost(
  chatId: number,
  description: string,
  photoIds: string[],
  statusMsgId?: number
) {
  try {
    const postText = await generatePost(description, photoIds.length > 0)

    if (statusMsgId) await deleteMessage(chatId, statusMsgId)

    if (photoIds.length === 0) {
      await sendMessage(chatId, postText)
    } else if (photoIds.length === 1) {
      await sendPhoto(chatId, photoIds[0], postText)
    } else {
      await sendMediaGroup(chatId, photoIds, postText)
    }
  } catch (err: any) {
    console.error('[PR-bot] Ошибка генерации:', err?.message)
    const errText = 'Ошибка при генерации поста. Попробуй ещё раз.'
    if (statusMsgId) {
      await editMessage(chatId, statusMsgId, errText)
    } else {
      await sendMessage(chatId, errText)
    }
  }
}

// ─── Обработка обновлений ─────────────────────────────────────────────────────

async function handleUpdate(update: any) {
  const message = update.message
  if (!message) return

  const username: string = message.from?.username ?? ''
  if (!ALLOWED_USERNAMES.has(username)) return

  const chatId: number = message.chat.id
  const text: string = message.text ?? ''
  const caption: string = message.caption ?? ''
  const photos: any[] = message.photo ?? []
  const mediaGroupId: string | undefined = message.media_group_id

  // /start
  if (text.startsWith('/start')) {
    await sendMessage(chatId, 'Привет! Используй /post <описание> чтобы создать пост. /help — справка.')
    return
  }

  // /help
  if (text.startsWith('/help')) {
    await sendMessage(
      chatId,
      'TraveLM PR-бот\n\n' +
        '/post <описание> — сгенерировать и опубликовать пост\n\n' +
        'С фото: отправь фото(альбом) с подписью /post <описание>\n\n' +
        'Пример:\n/post Запустили 3D-карты — теперь маршрут можно крутить как глобус\n\n' +
        'Доступ: @myszf, @xf1st, @jellDii'
    )
    return
  }

  // /post (только текст)
  if (text.startsWith('/post')) {
    const description = text.replace(/^\/post(@\w+)?\s*/i, '').trim()
    if (!description) {
      await sendMessage(chatId, 'Укажи описание: /post <краткое описание>')
      return
    }
    const statusMsg = await sendMessage(chatId, 'Генерирую пост...')
    await processPost(chatId, description, [], statusMsg?.message_id)
    return
  }

  // Фото с /post в подписи
  if (photos.length > 0 && /^\/post(@\w+)?\s*/i.test(caption)) {
    const description = caption.replace(/^\/post(@\w+)?\s*/i, '').trim()
    if (!description) {
      await sendMessage(chatId, 'Добавь описание в подпись: /post <описание>')
      return
    }

    const photoFileId: string = photos[photos.length - 1].file_id

    if (mediaGroupId) {
      // Буферизируем — ждём все фото альбома
      if (!mediaGroupBuffer.has(mediaGroupId)) {
        const statusMsg = await sendMessage(chatId, 'Генерирую пост...')
        mediaGroupBuffer.set(mediaGroupId, {
          chatId,
          photos: [],
          description,
          statusMsgId: statusMsg?.message_id,
          timer: null,
        })
      }

      const group = mediaGroupBuffer.get(mediaGroupId)!
      group.photos.push(photoFileId)

      if (group.timer) clearTimeout(group.timer)
      group.timer = setTimeout(() => {
        mediaGroupBuffer.delete(mediaGroupId)
        processPost(group.chatId, group.description, group.photos, group.statusMsgId).catch(
          console.error
        )
      }, 1500)
    } else {
      const statusMsg = await sendMessage(chatId, 'Генерирую пост...')
      await processPost(chatId, description, [photoFileId], statusMsg?.message_id)
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  try {
    const update = await req.json()
    // Отвечаем Telegram сразу, обработку делаем асинхронно
    handleUpdate(update).catch(console.error)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
