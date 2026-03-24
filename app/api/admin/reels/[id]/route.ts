import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { requireAdmin, getServiceRoleKey } from "@/lib/admin-auth"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const PatchSchema = z
  .object({
    published: z.boolean().optional(),
    title: z.string().min(1).max(300).optional(),
    country: z.string().min(1).max(200).optional(),
    city: z.string().max(200).nullable().optional(),
    anchor_day: z.number().int().min(1).max(60).optional(),
    locale: z.enum(["ru", "en"]).optional(),
    price_label: z.string().max(500).nullable().optional(),
    price_amount: z.number().nullable().optional(),
    price_currency: z.string().max(8).optional(),
    suggested_start_date: z.string().nullable().optional(),
    suggested_end_date: z.string().nullable().optional(),
    music_url: z.string().url().max(2000).nullable().optional(),
    images: z.array(z.string()).optional(),
    activity_anchor: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return createClient(url, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin()
  if (authErr) return authErr

  const { id } = await context.params
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const raw = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 })
  }

  const patch = parsed.data
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Empty patch" }, { status: 400 })
  }

  const supabase = adminClient()
  const { data, error } = await supabase
    .from("discovery_reels")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    console.error("[admin/reels PATCH]", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ reel: data })
}
