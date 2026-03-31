import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRequestUserId } from "@/lib/ai-usage-events"
import { enforceFullSiteAccess } from "@/lib/server/user-access"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const sanitizeText = (value: unknown, maxLength: number) => String(value || "").trim().slice(0, maxLength)

const splitList = (value: string) =>
  value
    .split(/[,;\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)

const normalizeForSearch = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim()

function parseFeedback(params: { rating: number; comment: string; liked: string; disliked: string }) {
  const text = normalizeForSearch([params.comment, params.liked, params.disliked].filter(Boolean).join(" "))

  const tagMatchers: Array<{ tag: string; pattern: RegExp }> = [
    { tag: "map", pattern: /(map|route|point|navigation|nav|poi)/i },
    { tag: "ui", pattern: /(ui|interface|design|layout|screen)/i },
    { tag: "performance", pattern: /(slow|lag|fast|speed|performance)/i },
    { tag: "content", pattern: /(content|description|recommendation|poi|activity)/i },
    { tag: "pricing", pattern: /(price|cost|budget|expensive|cheap)/i },
    { tag: "support", pattern: /(support|help|chat|bot|assistant)/i },
  ]

  const matchedTags = tagMatchers.filter((item) => item.pattern.test(text)).map((item) => item.tag)
  const positives = splitList(params.liked)
  const negatives = splitList(params.disliked)

  let sentiment: "positive" | "mixed" | "negative" | "neutral" = "neutral"
  if (params.rating >= 4) sentiment = negatives.length > 0 ? "mixed" : "positive"
  if (params.rating === 3) sentiment = positives.length > 0 || negatives.length > 0 ? "mixed" : "neutral"
  if (params.rating <= 2) sentiment = positives.length > 0 ? "mixed" : "negative"

  return {
    sentiment,
    tags: matchedTags,
    positives,
    negatives,
    ratingBand: params.rating >= 4 ? "high" : params.rating <= 2 ? "low" : "medium",
    language: /[\u0400-\u04FF]/.test(text) ? "ru" : "en",
  }
}

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

    if (tripId) {
      if (!UUID_REGEX.test(tripId)) {
        return NextResponse.json({ error: "Invalid tripId" }, { status: 400 })
      }

      const { data, error } = await client
        .from("trip_feedback")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .maybeSingle()

      if (error && error.code !== "PGRST116") throw error
      return NextResponse.json({ feedback: data || null })
    }

    const { data, error } = await client.from("trip_feedback").select("*").eq("user_id", userId).order("updated_at", { ascending: false })
    if (error) throw error

    const byTripId: Record<string, any> = {}
    ;(data || []).forEach((row: any) => {
      if (row?.trip_id) byTripId[String(row.trip_id)] = row
    })

    return NextResponse.json({ feedback: data || [], byTripId })
  } catch (error: any) {
    console.error("[trip-feedback][GET] failed:", error)
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[trip-feedback][POST] step 1: getRequestUserId")
    const userId = await getRequestUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    console.log("[trip-feedback][POST] step 2: enforceFullSiteAccess", userId)

    const accessErr = await enforceFullSiteAccess(userId)
    if (accessErr) return accessErr
    console.log("[trip-feedback][POST] step 3: parseBody")

    const client = createServiceClient()
    if (!client) return NextResponse.json({ error: "Server is not configured" }, { status: 500 })

    const body = await req.json()
    const tripId = String(body?.tripId || "").trim()
    const rating = Number(body?.rating)
    const source = String(body?.source || "profile").trim() === "completed_page" ? "completed_page" : "profile"
    const comment = sanitizeText(body?.comment, 4000)
    const liked = sanitizeText(body?.liked, 1000)
    const disliked = sanitizeText(body?.disliked, 1000)
    console.log("[trip-feedback][POST] step 4: validated body", { tripId, rating })

    if (!UUID_REGEX.test(tripId)) {
      return NextResponse.json({ error: "Invalid tripId" }, { status: 400 })
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be from 1 to 5" }, { status: 400 })
    }

    const { data: trip, error: tripError } = await client.from("trips").select("id,user_id").eq("id", tripId).maybeSingle()
    if (tripError) throw tripError
    if (!trip?.id) return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    console.log("[trip-feedback][POST] step 5: trip found, checking ownership")

    if (String(trip.user_id || "") !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const parsed = parseFeedback({ rating, comment, liked, disliked })
    const payload = {
      trip_id: tripId,
      user_id: userId,
      rating,
      comment: comment || null,
      liked: liked || null,
      disliked: disliked || null,
      source,
      parsed,
      updated_at: new Date().toISOString(),
    }
    console.log("[trip-feedback][POST] step 6: upsert")

    const { data, error } = await client.from("trip_feedback").upsert(payload, { onConflict: "trip_id,user_id" }).select("*").single()
    console.log("[trip-feedback][POST] step 7: upsert done", { error })
    if (error) throw error

    return NextResponse.json({ feedback: data })
  } catch (error: any) {
    console.error("[trip-feedback][POST] failed:", error)
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 })
  }
}
