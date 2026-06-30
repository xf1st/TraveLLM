import { NextResponse } from "next/server"
import { createCookieAuthClient } from "@/lib/server/supabase-server"

export const runtime = "nodejs"

const SERVICE_UNAVAILABLE_MESSAGE = "Сервис временно недоступен, попробуйте позже"

// Сетевой сбой / недоступность бэкенда Supabase (в т.ч. ограничение проекта по квоте
// с ответом 402, либо "fetch failed" при недоступности Auth-сервера). Такие ошибки
// не должны утекать в UI сырой строкой — отдаём понятное 503.
function isServiceUnavailable(error: { message?: string; status?: number; name?: string }): boolean {
  const message = (error?.message || "").toLowerCase()
  const status = error?.status
  return (
    error?.name === "AuthRetryableFetchError" ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    status === 0 ||
    status === 402 ||
    status === 503 ||
    status === 504
  )
}

export async function POST(request: Request) {
  const authClient = await createCookieAuthClient()
  if (!authClient) {
    return NextResponse.json({ error: "Auth is not configured" }, { status: 500 })
  }

  let body: { action?: string; email?: string; password?: string; name?: string; metadata?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = String(body.email || "").trim()
  const password = String(body.password || "")
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }

  try {
    if (body.action === "signup") {
      const metadata = {
        full_name: String(body.name || "").trim(),
        ...(body.metadata || {}),
      }

      const { data, error } = await authClient.auth.signUp({
        email,
        password,
        options: { data: metadata },
      })

      if (error) {
        if (isServiceUnavailable(error)) {
          return NextResponse.json({ error: SERVICE_UNAVAILABLE_MESSAGE }, { status: 503 })
        }
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({
        ok: true,
        user: data.user,
        hasSession: Boolean(data.session),
        needsEmailVerification: !data.session,
      })
    }

    const { data, error } = await authClient.auth.signInWithPassword({ email, password })
    if (error) {
      if (isServiceUnavailable(error)) {
        return NextResponse.json({ error: SERVICE_UNAVAILABLE_MESSAGE }, { status: 503 })
      }
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    return NextResponse.json({ ok: true, user: data.user })
  } catch {
    // Сюда попадаем, если клиент Supabase бросил исключение (сетевой сбой и т.п.)
    return NextResponse.json({ error: SERVICE_UNAVAILABLE_MESSAGE }, { status: 503 })
  }
}
