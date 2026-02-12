
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyConnectToken, sendTelegramMessage } from '@/lib/telegram'
import { getStatsForPeriod, getTopSpenders } from '@/lib/admin-stats'

// --- Keyboards ---

const MAIN_MENU = {
    keyboard: [
        [{ text: "📊 Статистика" }, { text: "👥 Пользователи" }],
        [{ text: "🔙 Главное меню" }]
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
            start.setDate(1)
            start.setHours(0, 0, 0, 0)
            break
        case 'all':
            start = new Date(0)
            break
    }

    const stats = await getStatsForPeriod(start, end)

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
    await sendTelegramMessage(chatId, "🔍 Ищем транжир...", 'HTML', USERS_MENU)
    const spenders = await getTopSpenders(10, 30)

    if (!spenders.length) {
        await sendTelegramMessage(chatId, "Нет данных о расходах за 30 дней.")
        return
    }

    let msg = "<b>🏆 Топ-10 по расходам (30 дней):</b>\n\n"
    spenders.forEach((u, i) => {
        const name = u.name || 'Без имени'
        const email = u.email || 'Нет email'
        msg += `${i + 1}. <b>${name}</b> (${email})\n`
        msg += `   💸 <b>${u.costRub.toFixed(1)} ₽</b> | 🪙 ${(u.tokens / 1000).toFixed(1)}k\n\n`
    })

    await sendTelegramMessage(chatId, msg)
}

// --- Webhook ---

export async function POST(req: Request) {
    let chatId = 0;
    try {
        const expectedSecret = process.env.TELEGRAM_BOT_SECRET
        const receivedSecret = req.headers.get('x-telegram-bot-api-secret-token')
        if (!expectedSecret || receivedSecret !== expectedSecret) {
            return NextResponse.json({ ok: true })
        }

        const update = await req.json()

        if (!update.message || !update.message.text) {
            return NextResponse.json({ ok: true })
        }

        chatId = update.message.chat.id
        const text = (update.message.text as string).trim()

        console.log(`[Telegram] Msg from ${chatId}: ${text}`)

        // 1. Check for Token (Deep Link OR Raw Message)
        let potentialToken: string | null = null

        if (text.startsWith('/start ') && text.split(' ').length > 1) {
            potentialToken = text.split(' ')[1]
        } else if (!text.startsWith('/') && text.length > 20) {
            // Assume raw token
            potentialToken = text
        }

        // 2. Try to Connect if Token Present
        if (potentialToken) {
            const userId = verifyConnectToken(potentialToken)
            if (userId) {
                // Connect Logic
                const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

                // Unlink old if exists? No, just update.
                const { error } = await supabase.from('profiles').update({ telegram_chat_id: chatId.toString() }).eq('id', userId)

                if (error) {
                    await sendTelegramMessage(chatId, '❌ Ошибка базы данных при подключении.')
                } else {
                    await sendTelegramMessage(chatId, '✅ <b>Успешно!</b> Вы подключены как администратор.', 'HTML', MAIN_MENU)
                }
                return NextResponse.json({ ok: true })
            } else {
                // Invalid token
                await sendTelegramMessage(chatId, '⚠️ Неверный или устаревший код подключения.')
                // Don't return, users might be trying commands
            }
        }

        // 3. Admin Check
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('telegram_chat_id', chatId.toString())
            .single()

        const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

        if (!isAdmin) {
            // Avoid spamming if it was a failed token attempt above, but otherwise say hello
            if (!potentialToken) {
                await sendTelegramMessage(chatId, '🔒 Доступ запрещен. Подключите аккаунт через админ-панель сайта.')
            }
            return NextResponse.json({ ok: true })
        }

        // 4. Command Routing (Admins Only)
        switch (text) {
            case '/start':
            case '🔙 Главное меню':
            case '🔙 Назад':
                await sendTelegramMessage(chatId, '🤖 <b>Меню администратора</b>', 'HTML', MAIN_MENU)
                break

            // Stats
            case '📊 Статистика':
                await sendTelegramMessage(chatId, 'Выберите период:', 'HTML', STATS_MENU)
                break
            case '📅 Сегодня': await handlePeriodStats(chatId, 'today'); break
            case '🗓 Вчера': await handlePeriodStats(chatId, 'yesterday'); break
            case '📆 Неделя': await handlePeriodStats(chatId, 'week'); break
            case '🗓 Месяц': await handlePeriodStats(chatId, 'month'); break
            case '♾ Все время': await handlePeriodStats(chatId, 'all'); break

            // Users
            case '👥 Пользователи':
                await sendTelegramMessage(chatId, 'Управление пользователями:', 'HTML', USERS_MENU)
                break
            case '🏆 Топ транжир':
                await handleTopSpenders(chatId)
                break

            default:
                // Don't respond to unknown text to allow other bot uses if any, or say "Unknown"
                // await sendTelegramMessage(chatId, 'Неизвестная команда', 'HTML', MAIN_MENU)
                break
        }

        return NextResponse.json({ ok: true })
    } catch (error: any) {
        console.error('Webhook Error:', error)
        if (chatId) {
            await sendTelegramMessage(chatId, `❌ Произошла ошибка: ${error.message || 'Unknown error'}`)
        }
        return NextResponse.json({ ok: true }) // Always 200 to Telegram
    }
}

export async function GET(req: Request) {
    return NextResponse.json({
        status: 'active',
        timestamp: new Date().toISOString()
    })
}
