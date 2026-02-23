import { NextRequest, NextResponse } from 'next/server'

// Регистрация вебхука для PR-бота.
// Вызвать один раз после деплоя:
// GET https://travellm.ru/api/telegram/setup-pr?secret=<TELEGRAM_PR_WEBHOOK_SECRET>

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')

  if (!secret || secret !== process.env.TELEGRAM_PR_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PR
  const WEBHOOK_SECRET = process.env.TELEGRAM_PR_WEBHOOK_SECRET

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN_PR not set' }, { status: 500 })
  }

  const webhookUrl = `https://travellm.ru/api/telegram/webhook-pr`

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message'],
    }),
  })

  const data = await res.json()
  return NextResponse.json({ webhook_url: webhookUrl, telegram_response: data })
}
