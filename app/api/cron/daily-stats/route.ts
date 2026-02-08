
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram'

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

        // 2. Get Statistics (Last 24h)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        const { data: trips, error: tripsError } = await supabase
            .from('trips')
            .select('token_usage, created_at')
            .gte('created_at', yesterday.toISOString())

        if (tripsError) throw tripsError

        let totalTokens = 0
        let totalCostRub = 0
        let tripCount = trips?.length || 0
        let tripsWithUsage = 0

        trips?.forEach(trip => {
            if (trip.token_usage) {
                tripsWithUsage++
                totalTokens += trip.token_usage.totalTokens || 0
                totalCostRub += trip.token_usage.costRub || 0
            }
        })

        if (tripCount === 0) {
            // Optional: Don't send report if no activity? Or send "No activity".
            // Let's send "No activity" so admin knows bot is alive.
        }

        const message = `
📊 <b>Daily AI Report</b> (${new Date().toLocaleDateString('ru-RU')})

<b>Activity:</b>
• New Trips: ${tripCount}
• AI Usage: ${tripsWithUsage} trips

<b>Resources:</b>
• Tokens: ${totalTokens.toLocaleString('ru-RU')}
• Cost: ${totalCostRub.toFixed(2)} ₽

<i>Report generated automatically.</i>
`

        // 3. Get Admins with Telegram
        const { data: admins, error: adminsError } = await supabase
            .from('profiles')
            .select('telegram_chat_id')
            .in('role', ['admin', 'super_admin'])
            .not('telegram_chat_id', 'is', null)

        if (adminsError) throw adminsError

        // 4. Send Messages
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
