
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram'

// --- Support Logic ---

async function getSupportChatId(supabase: any) {
    const { data } = await supabase.from('app_settings').select('telegram_support_chat_id').single()
    return data?.telegram_support_chat_id
}

async function forwardToSupport(msg: any, supabase: any) {
    const supportChatId = await getSupportChatId(supabase)
    const token = process.env.TELEGRAM_BOT_TOKEN_SUPPORT
    
    if (!supportChatId) {
        await sendTelegramMessage(msg.chat.id, "😔 Поддержка временно недоступна (не настроен чат операторов).", 'HTML', undefined, token)
        return
    }

    const senderName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ')
    const username = msg.from.username ? `@${msg.from.username}` : 'No username'
    const text = msg.text || '(Без текста)'

    // Format for easy parsing later
    const forwardText = `#SUPPORT\nUser ID: ${msg.chat.id}\nName: ${senderName}\nUsername: ${username}\n\n${text}`

    // Send to Admin Group
    await sendTelegramMessage(supportChatId, forwardText, 'HTML', undefined, token)
    
    // Ack to User
    await sendTelegramMessage(msg.chat.id, "✅ Сообщение отправлено в поддержку. Мы скоро ответим.", 'HTML', undefined, token)
}

async function handleSupportReply(message: any) {
    const replyTo = message.reply_to_message
    if (!replyTo || !replyTo.text) return false

    // Check if it's a support ticket
    const isSupportTicket = replyTo.text.startsWith('#SUPPORT')
    if (!isSupportTicket) return false

    // Extract User ID
    const match = replyTo.text.match(/User ID: (\d+)/)
    if (!match || !match[1]) return false

    const targetUserId = match[1]
    const replyText = message.text
    const token = process.env.TELEGRAM_BOT_TOKEN_SUPPORT

    await sendTelegramMessage(targetUserId, `👨‍💻 <b>Ответ поддержки:</b>\n\n${replyText}`, 'HTML', undefined, token)
    return true
}

// --- Webhook ---

export async function POST(req: Request) {
    let chatId = 0;
    try {
        // NOTE: We rely on the path being hidden/secure or we can add a secret check if needed.
        // For simplicity now, we trust the update if structure is valid. 
        // Ideally: verify optional secret token if set on webhook.

        const update = await req.json()

        if (!update.message || !update.message.text) {
            return NextResponse.json({ ok: true })
        }

        chatId = update.message.chat.id
        const text = (update.message.text as string).trim()
        const message = update.message
        const token = process.env.TELEGRAM_BOT_TOKEN_SUPPORT

        console.log(`[SupportBot] Msg from ${chatId}: ${text}`)

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

        // 0. Check if it's a REPLY from Admin (Support Agent)
        // This monitors the ADMIN CHAT where the bot is added
        const isReplyHandled = await handleSupportReply(message)
        if (isReplyHandled) {
            return NextResponse.json({ ok: true })
        }

        // 1. /start
        if (text === '/start') {
            await sendTelegramMessage(chatId, '👋 Привет! Я бот поддержки TraveLLM.\n\nНапишите сюда любой вопрос, и мы ответим вам.', 'HTML', undefined, token)
            return NextResponse.json({ ok: true })
        }

        // 2. Forward everything else to support
        // This is from USER to BOT
        await forwardToSupport(message, supabase)

        return NextResponse.json({ ok: true })
    } catch (error: any) {
        console.error('Webhook Error:', error)
        if (chatId) {
             const token = process.env.TELEGRAM_BOT_TOKEN_SUPPORT
            await sendTelegramMessage(chatId, `❌ Произошла ошибка: ${error.message || 'Unknown error'}`, 'HTML', undefined, token)
        }
        return NextResponse.json({ ok: true }) 
    }
}

export async function GET(req: Request) {
    return NextResponse.json({
        status: 'active',
        bot: 'support'
    })
}
