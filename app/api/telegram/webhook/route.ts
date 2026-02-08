
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyConnectToken } from '@/lib/telegram'

// Helper for sending messages back to user
async function sendTelegramMessage(chatId: number, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        })
    })
}

// Logic to link account
async function processConnection(chatId: number, userId: string) {
    // Initialize Supabase with Service Role Key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        await sendTelegramMessage(chatId, '❌ Server configuration error (missing keys).')
        return
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update profile with telegram_chat_id
    const { error } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: chatId.toString() })
        .eq('id', userId)

    if (error) {
        console.error('[Telegram Webhook] DB Error:', error)
        await sendTelegramMessage(chatId, '❌ Database error. Could not link account.')
    } else {
        await sendTelegramMessage(chatId, '✅ <b>Success!</b> Your Telegram account is now connected.\n\nYou will receive daily reports here.')
    }
}

export async function POST(req: Request) {
    try {
        const update = await req.json()
        console.log('[Telegram Webhook] Received:', JSON.stringify(update, null, 2))

        if (!update.message || !update.message.text) {
            return NextResponse.json({ ok: true })
        }

        const chatId = update.message.chat.id
        const text = (update.message.text as string).trim()

        // 1. Handle /start command with token parameter
        if (text.startsWith('/start ') && text.split(' ').length > 1) {
            const token = text.split(' ')[1]
            const userId = verifyConnectToken(token)

            if (userId) {
                await processConnection(chatId, userId)
            } else {
                await sendTelegramMessage(chatId, '⚠️ Invalid or expired connection token. Please get a new one from the Admin Dashboard.')
            }
            return NextResponse.json({ ok: true })
        }

        // 2. Try to treat the entire message as a token (for manual copy-paste)
        const potentialUserId = verifyConnectToken(text)
        if (potentialUserId) {
            await processConnection(chatId, potentialUserId)
            return NextResponse.json({ ok: true })
        }

        // 3. Default response
        await sendTelegramMessage(chatId, '👋 Hi! Please use the connect link from your Admin Dashboard.\n\nOR copy-paste the <b>connection code</b> here if the link does not work.')

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[Telegram Webhook] Error:', error)
        return NextResponse.json({ ok: true }) // Always return 200 to Telegram
    }
}
