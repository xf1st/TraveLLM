import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { z } from "zod"
import { requireAdmin, getServiceRoleKey } from "@/lib/admin-auth"
import { generateOneReelCard, type ReelAvoidRow } from "@/lib/reel-generation"
import { getGeminiSessionUsage, resetGeminiSessionUsage } from "@/lib/gemini"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

/** Several LLM + gallery round-trips per request */
export const maxDuration = 120

const BatchBodySchema = z.object({
  action: z.enum(["status", "generate"]).default("status"),
  count: z.number().int().min(1).max(5).optional(),
  locale: z.enum(["ru", "en"]).optional(),
  published: z.boolean().optional(),
  /** 0–100, см. lib/reel-creativity.ts */
  creativity: z.number().min(0).max(100).optional(),
})

export async function POST(request: Request) {
  const authErr = await requireAdmin()
  if (authErr) return authErr

  // Identify admin for per-user rate limiting
  const cookieStore = await cookies()
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } },
  )
  const { data: { user: adminUser } } = await anonClient.auth.getUser()
  const adminId = adminUser?.id ?? "unknown"

  // Max 20 reels per hour per admin (4 requests × count=5) to prevent cost runaway
  const rl = checkRateLimit(adminId, "admin-reels-batch", 20, 60 * 60 * 1000)
  if (!rl.allowed) return rateLimitResponse(rl)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabase = createClient(url, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const raw = await request.json().catch(() => ({}))
  const parsed = BatchBodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 })
  }

  const body = parsed.data

  const { data: settings, error: sErr } = await supabase
    .from("app_settings")
    .select("reels_generation_enabled")
    .limit(1)
    .maybeSingle()

  if (sErr) {
    console.error("[admin/reels/batch] settings error:", sErr)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  const { count: totalReels, error: cErr } = await supabase
    .from("discovery_reels")
    .select("id", { count: "exact", head: true })

  if (cErr) {
    console.error("[admin/reels/batch] count error:", cErr)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  const enabled = !!(settings as { reels_generation_enabled?: boolean } | null)?.reels_generation_enabled

  if (body.action === "status") {
    return NextResponse.json({
      reels_generation_enabled: enabled,
      total_reels: totalReels ?? 0,
      message: enabled
        ? 'Включено: { "action": "generate", "count": 1–5, "locale": "ru"|"en", "published": false, "creativity": 0–100 }.'
        : "Выключено: включите «батч-наполнение рилсов» в Настройках админки.",
    })
  }

  if (!enabled) {
    return NextResponse.json(
      {
        error: "reels_generation_enabled is false",
        reels_generation_enabled: false,
        total_reels: totalReels ?? 0,
      },
      { status: 403 },
    )
  }

  const count = body.count ?? 1
  const locale = body.locale ?? "ru"
  const published = body.published ?? false
  const creativity = body.creativity

  resetGeminiSessionUsage()

  const { data: recentAvoid, error: avoidErr } = await supabase
    .from("discovery_reels")
    .select("title, country, city")
    .eq("locale", locale)
    .order("created_at", { ascending: false })
    .limit(45)

  if (avoidErr) {
    console.error("[admin/reels/batch] avoidList error:", avoidErr)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  const avoidList: ReelAvoidRow[] = (recentAvoid ?? [])
    .map((r) => ({
      title: (r.title ?? "").trim(),
      country: (r.country ?? "").trim(),
      city: r.city?.trim() || null,
    }))
    .filter((r) => r.title.length > 0 && r.country.length > 0)

  const created: unknown[] = []
  const errors: { index: number; message: string }[] = []

  for (let i = 0; i < count; i++) {
    try {
      const payload = await generateOneReelCard(locale, {
        creativity,
        avoidRows: avoidList.slice(0, 40),
      })
      const row = {
        title: payload.title,
        country: payload.country,
        city: payload.city,
        price_label: payload.price_label,
        price_amount: payload.price_amount,
        price_currency: payload.price_currency,
        suggested_start_date: payload.suggested_start_date,
        suggested_end_date: payload.suggested_end_date,
        anchor_day: payload.anchor_day,
        images: payload.images,
        activity_anchor: payload.activity_anchor,
        music_url: payload.music_url,
        locale: payload.locale,
        published,
      }
      const { data, error } = await supabase.from("discovery_reels").insert(row).select("*").single()
      if (error) throw new Error(error.message)
      if (data) {
        created.push(data)
        avoidList.unshift({
          title: payload.title,
          country: payload.country,
          city: payload.city ?? null,
        })
      }
    } catch (e) {
      errors.push({ index: i, message: e instanceof Error ? e.message : String(e) })
    }
  }

  return NextResponse.json({
    reels_generation_enabled: true,
    total_reels_before: totalReels ?? 0,
    created_count: created.length,
    requested_count: count,
    created,
    errors,
    gemini_usage: getGeminiSessionUsage(),
  })
}
