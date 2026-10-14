import { NextResponse } from "next/server"
import { createServiceRoleClient, getServerUser } from "@/lib/server/supabase-server"
import { summarizeProfileTrips } from "@/lib/profile-trip-summary"

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

  const [profileRes, usageRes, recentTripsRes, tripsRes] = await Promise.all([
    admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle(),
    includeProfilePage ? Promise.resolve({ count: null, error: null }) : admin
      .from("ai_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("source", "route-generation")
      .gte("created_at", monthStart),
    includeProfilePage ? Promise.resolve({ data: null, error: null }) : admin
      .from("trips")
      .select("id, title, destination")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    includeProfilePage
      ? admin
          .from("trips")
          .select("id,title,destination,created_at,status,countries,itinerary")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
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

  // A failed read must not look like a new profile or an empty trip history.
  if (profileRes.error || (includeProfilePage && tripsRes.error)) {
    return NextResponse.json({ error: "Profile data is temporarily unavailable" }, { status: 503 })
  }

  const profile = profileRes.data
  const genLimit =
    typeof profile?.gen_limit_override === "number" ? profile.gen_limit_override : 10

  return NextResponse.json({
    user,
    profile: profile || null,
    recentTrips: recentTripsRes.data || (tripsRes.data || []).slice(0, 5).map(({ id, title, destination }) => ({ id, title, destination })),
    trips: summarizeProfileTrips(tripsRes.data || []),
    ...(!includeProfilePage && {
      genUsage: usageRes.error ? null : { used: usageRes.count ?? 0, limit: genLimit },
    }),
  }, { headers: { "Cache-Control": "private, no-store" } })
}
