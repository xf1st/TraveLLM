import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { normalizePartnerPromo } from "@/lib/partner-promo-client"

export const runtime = "nodejs"

const CODE_RE = /^[A-Za-z0-9]{4,32}$/

type RpcResult = { ok?: boolean; error?: string; new_limit?: number }

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

    const rl = checkRateLimit(user.id, "referral-apply", 20, 60 * 60 * 1000)
    if (!rl.allowed) return rateLimitResponse(rl)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const codeRaw =
      typeof body === "object" && body !== null && "code" in body && typeof (body as { code: unknown }).code === "string"
        ? (body as { code: string }).code
        : ""
    const code = codeRaw.trim()
    if (!CODE_RE.test(code)) {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: rowExists } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle()
    if (!rowExists) {
      const meta = user.user_metadata as Record<string, unknown> | undefined
      const promoRaw = meta?.partner_promo_code
      const partnerPromo =
        typeof promoRaw === "string" ? normalizePartnerPromo(promoRaw) : null
      const { error: insErr } = await admin.from("profiles").insert({
        id: user.id,
        email: user.email ?? null,
        full_name: (typeof meta?.full_name === "string" ? meta.full_name : null) ?? null,
        ...(partnerPromo ? { partner_promo_code: partnerPromo } : {}),
      })
      if (insErr && insErr.code !== "23505") {
        console.error("[referral/apply] insert profile", insErr)
        return NextResponse.json({ error: "Could not create profile" }, { status: 500 })
      }
    }

    const { data: rpcData, error: rpcErr } = await authClient.rpc("apply_my_referral", {
      p_code: code,
    })

    if (rpcErr) {
      console.error("[referral/apply] rpc", rpcErr)
      return NextResponse.json({ error: "rpc_failed" }, { status: 500 })
    }

    const r = rpcData as RpcResult | null
    if (!r || r.ok !== true) {
      const err = typeof r?.error === "string" ? r.error : "unknown"
      const status: Record<string, number> = {
        unauthorized: 401,
        invalid_code: 400,
        no_profile: 404,
        already_referred: 409,
        already_rewarded: 409,
        code_not_found: 404,
        self: 400,
      }
      return NextResponse.json({ error: err }, { status: status[err] ?? 400 })
    }

    return NextResponse.json({ ok: true, newLimit: r.new_limit })
  } catch (e: unknown) {
    console.error("[referral/apply]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
