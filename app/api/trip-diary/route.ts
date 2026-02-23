import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRequestUserId } from "@/lib/ai-usage-events"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
    const tripId = String(body?.tripId || "").trim()
    const dayIndex = Number(body?.dayIndex)
    const activityIndex = Number(body?.activityIndex)
    const content = String(body?.content || "").trim()

    if (!UUID_REGEX.test(tripId)) {
      return NextResponse.json({ error: "Invalid tripId" }, { status: 400 })
    }
    if (isNaN(dayIndex) || isNaN(activityIndex)) {
      return NextResponse.json({ error: "Invalid day or activity index" }, { status: 400 })
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
