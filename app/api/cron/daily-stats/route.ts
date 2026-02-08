
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram'
import { getStatsForPeriod } from '@/lib/admin-stats'

export async function GET(req: Request) {
    // 1. Verify Secret
    const { searchParams } = new URL(req.url)
    const secret = req.headers.get('Authorization')?.split(' ')[1] || searchParams.get('secret')

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 2. Calculate Dates
        const now = new Date()

        // Yesterday (00:00 - 23:59)
        const yesterdayStart = new Date(now)
        yesterdayStart.setDate(yesterdayStart.getDate() - 1)
        yesterdayStart.setHours(0, 0, 0, 0)

        const yesterdayEnd = new Date(yesterdayStart)
        yesterdayEnd.setHours(23, 59, 59, 999)

        // Current Month (1st - Now)
        const monthStart = new Date(now)
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        // 3. Fetch Stats
        const [dayStats, monthStats] = await Promise.all([
            getStatsForPeriod(yesterdayStart, yesterdayEnd),
            getStatsForPeriod(monthStart, now)
        ])

        // 4. Format Message
        const message = `
🔔 <b>Ежедневный отчет (${yesterdayStart.toLocaleDateString('ru-RU')})</b>

📅 <b>За вчера:</b>
👤 Новых пользователей: <b>${dayStats.users}</b>
🪙 Расход токенов: <b>${dayStats.tokens.toLocaleString()}</b>
💵 Стоимость: <b>${dayStats.costRub.toFixed(2)} ₽</b> ($${dayStats.costUsd.toFixed(2)})
🗺 Создано маршрутов: <b>${dayStats.trips}</b>

🗓 <b>В этом месяце:</b>
👤 Пользователей: <b>${monthStats.users}</b>
🪙 Токенов: <b>${monthStats.tokens.toLocaleString()}</b>
💵 Стоимость: <b>${monthStats.costRub.toFixed(2)} ₽</b>
`.trim()

        // 5. Send to Admins
        const { data: admins } = await supabase
            .from('profiles')
            .select('telegram_chat_id')
            .eq('role', 'admin') // Or check logic for admins
            .not('telegram_chat_id', 'is', null)

        let sentCount = 0
        if (admins) {
            for (const admin of admins) {
                if (admin.telegram_chat_id) {
                    await sendTelegramMessage(admin.telegram_chat_id, message)
                    sentCount++
                }
            }
        }

        return NextResponse.json({ success: true, sent_to: sentCount })
    } catch (error: any) {
        console.error('Cron Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
