'use server'

import { generateConnectToken } from '@/lib/telegram'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function connectTelegram() {
    try {
        const cookieStore = await cookies()

        // Check if we can even access cookies (sometimes missing in build/static generation)
        if (!cookieStore) {
            return { error: 'Cookie store unavailable' }
        }

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                    },
                    remove(name: string, options: CookieOptions) {
                    },
                },
            }
        )

        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            console.error("Connect Telegram Auth Error:", error)
            return { error: 'Not authenticated. Please log in.' }
        }

        const token = generateConnectToken(user.id)

        const botToken = process.env.TELEGRAM_BOT_TOKEN
        if (!botToken) return { error: 'Bot configuration missing' }

        const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
        const data = await res.json()

        if (!data.ok) return { error: 'Failed to contact Telegram API' }

        const botUsername = data.result.username

        return {
            success: true,
            token,
            botUsername
        }

    } catch (e: any) {
        if (e.message === 'NEXT_REDIRECT') throw e; // Let redirect pass
        if (e.digest?.startsWith('NEXT_REDIRECT')) throw e; // Next.js 14/15 redirect

        console.error("Connect Telegram Action Error:", e)
        return { error: e.message || 'Unknown error' }
    }
}
