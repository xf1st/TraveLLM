import { NextResponse } from "next/server"
import { createCookieAuthClient } from "@/lib/server/supabase-server"

export const runtime = "nodejs"

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

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({
      ok: true,
      user: data.user,
      hasSession: Boolean(data.session),
      needsEmailVerification: !data.session,
    })
  }

  const { data, error } = await authClient.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ error: error.message }, { status: 401 })

  return NextResponse.json({ ok: true, user: data.user })
}
