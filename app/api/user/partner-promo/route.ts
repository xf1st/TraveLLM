import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export const runtime = "nodejs"

const CODE_RE = /^[A-Za-z0-9_.\-]{2,64}$/

function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const t = raw.trim()
  if (!CODE_RE.test(t)) return null
  return t
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 })
    }

    const cookieStore = await cookies()
    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rl = checkRateLimit(user.id, "partner-promo-apply", 30, 60 * 60 * 1000)
    if (!rl.allowed) return rateLimitResponse(rl)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const code = normalizeCode(
      typeof body === "object" && body !== null && "code" in body ? (body as { code: unknown }).code : null
    )
    if (!code) {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: row, error: selErr } = await admin
      .from("profiles")
      .select("id, partner_promo_code")
      .eq("id", user.id)
      .maybeSingle()

    if (selErr) {
      console.error("[user/partner-promo] select", selErr)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!row) {
      const meta = user.user_metadata as Record<string, unknown> | undefined
      const { error: insErr } = await admin.from("profiles").insert({
        id: user.id,
        email: user.email ?? null,
        full_name: (typeof meta?.full_name === "string" ? meta.full_name : null) ?? null,
        partner_promo_code: code,
      })
      if (insErr && insErr.code !== "23505") {
        console.error("[user/partner-promo] insert", insErr)
        return NextResponse.json({ error: "Could not create profile" }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    const existing = row.partner_promo_code
    if (existing != null && String(existing).trim() !== "") {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const { error: upErr } = await admin.from("profiles").update({ partner_promo_code: code }).eq("id", user.id)

    if (upErr) {
      console.error("[user/partner-promo] update", upErr)
      return NextResponse.json({ error: "Update failed" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error("[user/partner-promo]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
