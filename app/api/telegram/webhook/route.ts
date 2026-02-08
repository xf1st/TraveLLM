
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyConnectToken, sendTelegramMessage } from '@/lib/telegram'
import { getStatsForPeriod, getTopSpenders } from '@/lib/admin-stats'

// --- Keyboards ---

const MAIN_MENU = {
    keyboard: [
        [{ text: "📊 Статистика" }, { text: "👥 Пользователи" }],
        [{ text: "🔙 Главное меню" }] // Or just rely on "Start"
    ],
    resize_keyboard: true
}

const STATS_MENU = {
    keyboard: [
        [{ text: "📅 Сегодня" }, { text: "🗓 Вчера" }],
        [{ text: "📆 Неделя" }, { text: "🗓 Месяц" }],
        [{ text: "♾ Все время" }, { text: "🔙 Назад" }]
    ],
    resize_keyboard: true
}

const USERS_MENU = {
    keyboard: [
        [{ text: "🏆 Топ транжир" }, { text: "🔙 Назад" }]
    ],
    resize_keyboard: true
}

// --- Logic ---

async function handlePeriodStats(chatId: number, period: 'today' | 'yesterday' | 'week' | 'month' | 'all') {
    const now = new Date()
    let start = new Date()
    let end = new Date()

    switch (period) {
        case 'today':
            start.setHours(0, 0, 0, 0)
            break
        case 'yesterday':
            start.setDate(start.getDate() - 1)
            start.setHours(0, 0, 0, 0)
            end = new Date(start)
            end.setHours(23, 59, 59, 999)
            break
        case 'week':
            start.setDate(start.getDate() - 7)
            start.setHours(0, 0, 0, 0)
            break
        case 'month':
            start.setDate(1) // 1st of current month? Or last 30 days? User said "Month".
            // Morning report "for month" usually means "current month".
            start.setDate(1)
            start.setHours(0, 0, 0, 0)
            break
        case 'all':
            start = new Date(0) // Epoch
            break
    }

    const stats = await getStatsForPeriod(start, end)

    // Title mapping
    const titles: Record<string, string> = {
        today: 'Сегодня',
        yesterday: 'Вчера',
        week: 'Неделю',
        month: 'Месяц (с 1-го числа)',
        all: 'Все время'
    }

    const msg = `
<b>📊 Статистика: ${titles[period]}</b>

👤 Новых пользователей: <b>${stats.users}</b>
🗺 Маршрутов: <b>${stats.trips}</b>
🪙 Токенов: <b>${stats.tokens.toLocaleString()}</b>
💵 Стоимость: <b>${stats.costRub.toFixed(2)} ₽</b> ($${stats.costUsd.toFixed(2)})
`.trim()

    await sendTelegramMessage(chatId, msg)
}

async function handleTopSpenders(chatId: number) {
    await sendTelegramMessage(chatId, "🔍 Ищем транжир...", USERS_MENU)

    // Top 10 users last 30 days
    const spenders = await getTopSpenders(10, 30)

    if (!spenders.length) {
        await sendTelegramMessage(chatId, "Нет данных о расходах за 30 дней.")
        return
    }

    let msg = "<b>🏆 Топ-10 по расходам (30 дней):</b>\n\n"

    spenders.forEach((u, i) => {
        const name = u.name || 'Без имени'
        const email = u.email || 'Нет email'
        // Escape HTML in name/email if needed (omitted for brevity, be careful)
        msg += `${i + 1}. <b>${name}</b> (${email})\n`
        msg += `   💸 <b>${u.costRub.toFixed(1)} ₽</b> | 🪙 ${(u.tokens / 1000).toFixed(1)}k\n\n`
    })

    await sendTelegramMessage(chatId, msg)
}

// --- Webhook ---

export async function POST(req: Request) {
    try {
        const update = await req.json()

        if (!update.message || !update.message.text) {
            return NextResponse.json({ ok: true })
        }

        const chatId = update.message.chat.id
        const text = (update.message.text as string).trim()

        // 1. Connection (Raw Token)
        if (!text.startsWith('/') && text.length > 20 && text.includes('-')) {
            const userId = verifyConnectToken(text)
            if (userId) {
                // Connect Logic
                const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
                await supabase.from('profiles').update({ telegram_chat_id: chatId.toString() }).eq('id', userId)
                await sendTelegramMessage(chatId, '✅ <b>Успешно!</b> Вы администратор.', MAIN_MENU)
                return NextResponse.json({ ok: true })
            }
        }

        // 2. Admin Check
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('telegram_chat_id', chatId.toString())
            .single()

        if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
            // Not admin logic here
            return NextResponse.json({ ok: true })
        }

        // 3. Command Routing
        switch (text) {
            case '/start':
            case '🔙 Главное меню':
            case '🔙 Назад': // Simple back logic
                await sendTelegramMessage(chatId, '🤖 <b>Меню</b>', MAIN_MENU)
                break

            // Stats
            case '📊 Статистика':
                await sendTelegramMessage(chatId, 'Выберите период:', STATS_MENU)
                break
            case '📅 Сегодня': await handlePeriodStats(chatId, 'today'); break
            case '🗓 Вчера': await handlePeriodStats(chatId, 'yesterday'); break
            case '📆 Неделя': await handlePeriodStats(chatId, 'week'); break
            case '🗓 Месяц': await handlePeriodStats(chatId, 'month'); break
            case '♾ Все время': await handlePeriodStats(chatId, 'all'); break

            // Users
            case '👥 Пользователи':
                await sendTelegramMessage(chatId, 'Управление пользователями:', USERS_MENU)
                break
            case '🏆 Топ транжир':
                await handleTopSpenders(chatId)
                break

            default:
                // Silent fail or help?
                break
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ ok: true })
    }
}
