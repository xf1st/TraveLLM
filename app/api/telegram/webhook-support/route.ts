
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram'

// --- Support Logic ---

async function getSupportChatId(supabase: any) {
    const { data } = await supabase.from('app_settings').select('telegram_support_chat_id').single()
    return data?.telegram_support_chat_id
}


import { SUPPORT_KNOWLEDGE_BASE } from '@/lib/support-knowledge'
import { deepseekInference } from '@/lib/deepseek'

// ... (existing imports)

async function forwardToSupport(msg: any, supabase: any) {
    const supportChatId = await getSupportChatId(supabase)
    const token = process.env.TELEGRAM_BOT_TOKEN_SUPPORT
    
    // 1. Send to Admin Group (Human Oversight)
    if (supportChatId) {
        const senderName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ')
        const username = msg.from.username ? `@${msg.from.username}` : 'No username'
        const text = msg.text || '(Без текста)'
        const forwardText = `#SUPPORT\nUser ID: ${msg.chat.id}\nName: ${senderName}\nUsername: ${username}\n\n${text}`
        
        // Fire and forget to admin group to not delay AI reply
        sendTelegramMessage(supportChatId, forwardText, 'HTML', undefined, token).catch(e => console.error('Failed to forward to admin:', e))
    }

    // 2. AI Auto-Reply
    try {
        const userText = msg.text || ''
        if (!userText) return // Don't reply to stickers/etc for now

        // Show "typing" action (optional, but good UX - Telegram API needed or just wait)
        
        const aiResponse = await deepseekInference([
            { role: 'system', content: `Ты — полезный бот поддержки сервиса TraveLLM. Твоя задача — отвечать на вопросы пользователей, используя базу знаний.
            
База знаний:
${SUPPORT_KNOWLEDGE_BASE}

Инструкции:
- Отвечай вежливо и кратко.
- Если ответа нет в базе, ответь: "Я пока не уверен, передал твой вопрос оператору."
- Не придумывай функции, которых нет.` },
            { role: 'user', content: userText }
        ], { maxTokens: 1000, temperature: 0.5 })

        await sendTelegramMessage(msg.chat.id, aiResponse, undefined, undefined, token)
        
        // Optional: Send the AI reply to Admin too so they know what was answered?
        // Let's keep it simple for now. Admin sees the User Q in group. If they see no Human A, they assume AI handled it.
        
    } catch (error) {
        console.error('AI Support Error:', error)
        // Fallback message if AI fails
        await sendTelegramMessage(msg.chat.id, "Сообщение получено. Оператор скоро ответит.", undefined, undefined, token)
    }
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
