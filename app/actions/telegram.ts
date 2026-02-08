'use server'

import { generateConnectToken } from '@/lib/telegram'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function connectTelegram() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    // No-op for read-only actions
                },
                remove(name: string, options: CookieOptions) {
                    // No-op
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    const token = generateConnectToken(user.id)

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) throw new Error('Bot token not set')

    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const data = await res.json()

    if (!data.ok) throw new Error('Failed to get bot info')

    const botUsername = data.result.username

    redirect(`https://t.me/${botUsername}?start=${token}`)
}
