import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRequestUserId } from "@/lib/ai-usage-events"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: Request) {
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rl = await checkRateLimit(userId, "favorites-toggle", 30)
  if (!rl.allowed) return rateLimitResponse(rl)

  const { tripId } = await req.json()
  if (!tripId || typeof tripId !== "string") {
    return NextResponse.json({ error: "Missing tripId" }, { status: 400 })
  }

  const client = getServiceClient()
  if (!client) return NextResponse.json({ error: "Server configuration error" }, { status: 500 })

  // Check if already favorited
  const { data: existing } = await client
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("trip_id", tripId)
    .maybeSingle()

  if (existing) {
    await client.from("favorites").delete().eq("user_id", userId).eq("trip_id", tripId)
    return NextResponse.json({ favorited: false })
  } else {
    await client.from("favorites").insert({ user_id: userId, trip_id: tripId })
    return NextResponse.json({ favorited: true })
  }
}
