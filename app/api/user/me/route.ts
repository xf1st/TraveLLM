import { NextResponse } from "next/server"
import { createServiceRoleClient, getServerUser } from "@/lib/server/supabase-server"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { user, error } = await getServerUser()
  if (error || !user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 500 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const url = new URL(request.url)
  const includeProfilePage = url.searchParams.get("include") === "profile-page"

  const [profileRes, usageRes, recentTripsRes, tripsRes, feedbackRes] = await Promise.all([
    admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("ai_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("source", "route-generation")
      .gte("created_at", monthStart),
    admin
      .from("trips")
      .select("id, title, destination")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    includeProfilePage
      ? admin
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    includeProfilePage
      ? admin
          .from("trip_feedback")
          .select("trip_id,rating,comment,liked,disliked,source,updated_at")
          .eq("user_id", user.id)
      : Promise.resolve({ data: null, error: null }),
  ])

  if (profileRes.error) {
    console.error("[api/user/me] profile", profileRes.error.message)
  }
  if (usageRes.error) {
    console.error("[api/user/me] usage", usageRes.error.message)
  }
  if (recentTripsRes.error) {
    console.error("[api/user/me] recent trips", recentTripsRes.error.message)
  }
  if (tripsRes.error) {
    console.error("[api/user/me] trips", tripsRes.error.message)
  }
  if (feedbackRes.error && feedbackRes.error.code !== "42P01") {
    console.error("[api/user/me] feedback", feedbackRes.error.message)
  }

  const profile = profileRes.data
  const genLimit =
    typeof profile?.gen_limit_override === "number" ? profile.gen_limit_override : 10

  return NextResponse.json({
    user,
    profile: profile || null,
    recentTrips: recentTripsRes.data || [],
    trips: tripsRes.data || [],
    feedback: feedbackRes.data || [],
    genUsage: {
      used: usageRes.count || 0,
      limit: genLimit,
    },
  })
}
