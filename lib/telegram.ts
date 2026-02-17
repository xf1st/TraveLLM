import crypto from 'crypto'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const BOT_SECRET = process.env.TELEGRAM_BOT_SECRET || crypto.randomBytes(32).toString('hex')
if (!process.env.TELEGRAM_BOT_SECRET) {
    console.warn("[SECURITY] TELEGRAM_BOT_SECRET is not set — generated random fallback. Tokens will not persist across restarts!");
}

export const TG_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`

/**
 * Send a message to a Telegram chat
 */
export async function sendTelegramMessage(
    chatId: string | number,
    text: string,
    parseMode: 'Markdown' | 'HTML' = 'HTML',
    replyMarkup?: object,
    token?: string
) {
    const activeToken = token || BOT_TOKEN
    if (!activeToken) {
        console.warn('TELEGRAM_BOT_TOKEN is not set')
        return null
    }

    try {
        const body: any = {
            chat_id: chatId,
            text,
            parse_mode: parseMode
        }

        if (replyMarkup) {
            body.reply_markup = replyMarkup
        }

        const res = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        const data = await res.json()
        if (!data.ok) {
            console.error('Telegram API Error:', data)
        }
        return data
    } catch (error) {
        console.error('Failed to send Telegram message:', error)
        return null
    }
}

/**
 * Generate a secure signature for connecting a user
 * This prevents users from connecting someone else's telegram by guessing the ID
 * Returns Base64URL encoded string safe for Telegram start param
 */
export function generateConnectToken(userId: string): string {
    const hmac = crypto.createHmac('sha256', BOT_SECRET)
    hmac.update(userId)
    const signature = hmac.digest('hex')
    // Token format: userId:signature
    const rawToken = `${userId}:${signature}`
    // Encode to Base64URL (A-Za-z0-9_-)
    return Buffer.from(rawToken).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

/**
 * Verify the connect token
 */
export function verifyConnectToken(token: string): string | null {
    try {
        // Decode Base64URL
        let base64 = token.replace(/-/g, '+').replace(/_/g, '/')
        // Add padding if needed
        while (base64.length % 4) {
            base64 += '='
        }

        const decoded = Buffer.from(base64, 'base64').toString('utf-8')
        const [userId, signature] = decoded.split(':')

        if (!userId || !signature) return null

        const hmac = crypto.createHmac('sha256', BOT_SECRET)
        hmac.update(userId)
        const expectedSignature = hmac.digest('hex')

        // Simple string comparison usually enough here, but timingSafeEqual is better
        // However, invalid signature length might throw in timingSafeEqual
        if (signature.length !== expectedSignature.length) return null

        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            return userId
        }
        return null
    } catch (e) {
        console.error("Token verification error:", e)
        return null
    }
}
