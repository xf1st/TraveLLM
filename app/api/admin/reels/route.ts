import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { requireAdmin, getServiceRoleKey } from "@/lib/admin-auth"

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return createClient(url, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET() {
  const authErr = await requireAdmin()
  if (authErr) return authErr

  const supabase = adminClient()
  const { data, error } = await supabase
    .from("discovery_reels")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[admin/reels GET]", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
  return NextResponse.json({ reels: data ?? [] })
}

const CreateSchema = z.object({
  title: z.string().min(1).max(300),
  country: z.string().min(1).max(200),
  city: z.string().max(200).optional().nullable(),
  anchor_day: z.number().int().min(1).max(60).optional(),
  locale: z.enum(["ru", "en"]).optional(),
  published: z.boolean().optional(),
  price_label: z.string().max(500).optional().nullable(),
  price_amount: z.number().optional().nullable(),
  price_currency: z.string().max(8).optional(),
  suggested_start_date: z.string().optional().nullable(),
  suggested_end_date: z.string().optional().nullable(),
  music_url: z.string().url().max(2000).optional().nullable(),
  images: z.array(z.string()).optional(),
  activity_anchor: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: Request) {
  const authErr = await requireAdmin()
  if (authErr) return authErr

  const raw = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 })
  }

  const b = parsed.data
  const supabase = adminClient()
  const row = {
    title: b.title,
    country: b.country,
    city: b.city ?? null,
    anchor_day: b.anchor_day ?? 1,
    locale: b.locale ?? "ru",
    published: b.published ?? false,
    price_label: b.price_label ?? null,
    price_amount: b.price_amount ?? null,
    price_currency: b.price_currency ?? "RUB",
    suggested_start_date: b.suggested_start_date || null,
    suggested_end_date: b.suggested_end_date || null,
    music_url: b.music_url || null,
    images: b.images ?? [],
    activity_anchor: b.activity_anchor ?? {},
  }

  const { data, error } = await supabase.from("discovery_reels").insert(row).select("*").single()
  if (error) {
    console.error("[admin/reels POST]", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
  return NextResponse.json({ reel: data })
}
