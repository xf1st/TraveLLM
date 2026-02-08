import crypto from 'crypto'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const BOT_SECRET = process.env.TELEGRAM_BOT_SECRET || 'default_secret'

export const TG_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`

/**
 * Send a message to a Telegram chat
 */
export async function sendTelegramMessage(chatId: string | number, text: string, parseMode: 'Markdown' | 'HTML' = 'HTML') {
    if (!BOT_TOKEN) {
        console.warn('TELEGRAM_BOT_TOKEN is not set')
        return null
    }

    try {
        const res = await fetch(`${TG_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: parseMode
            })
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
 */
export function generateConnectToken(userId: string): string {
    const hmac = crypto.createHmac('sha256', BOT_SECRET)
    hmac.update(userId)
    const signature = hmac.digest('hex')
    // Token format: userId:signature
    return `${userId}:${signature}`
}

/**
 * Verify the connect token
 */
export function verifyConnectToken(token: string): string | null {
    try {
        const [userId, signature] = token.split(':')
        if (!userId || !signature) return null

        const hmac = crypto.createHmac('sha256', BOT_SECRET)
        hmac.update(userId)
        const expectedSignature = hmac.digest('hex')

        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            return userId
        }
        return null
    } catch (e) {
        return null
    }
}
