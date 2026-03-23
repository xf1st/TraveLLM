import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { getRequestUserId } from "@/lib/ai-usage-events"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DiaryPostSchema = z.object({
  tripId: z.string().regex(UUID_REGEX, "Invalid tripId"),
  dayIndex: z.number().int().min(0).max(365),
  activityIndex: z.number().int().min(0).max(99),
  content: z.string().max(10000).default(""),
})

const createServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequestUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const client = createServiceClient()
    if (!client) return NextResponse.json({ error: "Server is not configured" }, { status: 500 })

    const tripId = String(req.nextUrl.searchParams.get("tripId") || "").trim()

    if (!tripId || !UUID_REGEX.test(tripId)) {
      return NextResponse.json({ error: "Invalid tripId" }, { status: 400 })
    }

    const { data, error } = await client
      .from("trip_diary")
      .select("*")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .order("day_index", { ascending: true })
      .order("activity_index", { ascending: true })

    if (error) throw error
    return NextResponse.json({ entries: data || [] })
  } catch (error: any) {
    console.error("[trip-diary][GET] failed:", error)
    return NextResponse.json({ error: "Failed to load diary" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequestUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const client = createServiceClient()
    if (!client) return NextResponse.json({ error: "Server is not configured" }, { status: 500 })

    const body = await req.json()
    const parsed = DiaryPostSchema.safeParse({
      tripId: body?.tripId,
      dayIndex: Number(body?.dayIndex),
      activityIndex: Number(body?.activityIndex),
      content: body?.content,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { tripId, dayIndex, activityIndex, content } = parsed.data

    // Verify user owns or is member of the trip before writing
    const { data: trip } = await client
      .from("trips")
      .select("id, user_id")
      .eq("id", tripId)
      .maybeSingle()

    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 })

    if (trip.user_id !== userId) {
      const { data: member } = await client
        .from("trip_members")
        .select("id")
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .maybeSingle()
      if (!member) return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const payload = {
      trip_id: tripId,
      user_id: userId,
      day_index: dayIndex,
      activity_index: activityIndex,
      content,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await client
      .from("trip_diary")
      .upsert(payload, { onConflict: "trip_id,day_index,activity_index" })
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ entry: data })
  } catch (error: any) {
    console.error("[trip-diary][POST] failed:", error)
    return NextResponse.json({ error: "Failed to save diary entry" }, { status: 500 })
  }
}
