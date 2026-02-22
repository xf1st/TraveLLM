// Subscription system helpers — server-side only (uses service role client)
import { createClient } from "@supabase/supabase-js"
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/subscription-config"

// Re-export for convenience
export { TIER_LIMITS, TIER_BADGE_CONFIG } from "@/lib/subscription-config"
export type { SubscriptionTier, TierLimits, TierBadgeConfig } from "@/lib/subscription-config"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase service role credentials")
  return createClient(url, key)
}

export interface UserSubscription {
  tier: SubscriptionTier
  siteAccess: boolean
  genUsed: number
  genLimit: number
  chatLimit: number
  expiresAt: string | null
}

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_expires_at, site_access, monthly_gen_used, gen_reset_at, gen_limit_override, chat_limit_override")
    .eq("id", userId)
    .single()

  if (error || !data) {
    return {
      tier: "free",
      siteAccess: false,
      genUsed: 0,
      genLimit: TIER_LIMITS.free.genPerMonth,
      chatLimit: TIER_LIMITS.free.chatPerTrip,
      expiresAt: null,
    }
  }

  const tier = (data.subscription_tier as SubscriptionTier) || "free"
  const baseLimits = TIER_LIMITS[tier]

  return {
    tier,
    siteAccess: Boolean(data.site_access),
    genUsed: data.monthly_gen_used ?? 0,
    genLimit: data.gen_limit_override ?? (baseLimits.genPerMonth === Infinity ? 999999 : baseLimits.genPerMonth),
    chatLimit: data.chat_limit_override ?? (baseLimits.chatPerTrip === Infinity ? 999999 : baseLimits.chatPerTrip),
    expiresAt: data.subscription_expires_at ?? null,
  }
}

export async function checkGenerationLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_tier, monthly_gen_used, gen_reset_at, gen_limit_override")
    .eq("id", userId)
    .single()

  if (error || !data) {
    return { allowed: true, used: 0, limit: TIER_LIMITS.free.genPerMonth }
  }

  const tier = (data.subscription_tier as SubscriptionTier) || "free"

  // Dev tier: unlimited
  if (tier === "dev") {
    return { allowed: true, used: data.monthly_gen_used ?? 0, limit: 999999 }
  }

  // Auto-reset if gen_reset_at is before the start of the current month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const resetAt = data.gen_reset_at ? new Date(data.gen_reset_at) : startOfMonth

  let genUsed = data.monthly_gen_used ?? 0

  if (resetAt < startOfMonth) {
    // Reset usage
    await supabase
      .from("profiles")
      .update({ monthly_gen_used: 0, gen_reset_at: startOfMonth.toISOString() })
      .eq("id", userId)
    genUsed = 0
  }

  const baseLimit = TIER_LIMITS[tier].genPerMonth
  const limit = data.gen_limit_override ?? baseLimit

  return {
    allowed: genUsed < limit,
    used: genUsed,
    limit,
  }
}

export async function incrementGenerationCount(userId: string): Promise<void> {
  const supabase = getServiceClient()

  const { data } = await supabase
    .from("profiles")
    .select("monthly_gen_used")
    .eq("id", userId)
    .single()

  const current = data?.monthly_gen_used ?? 0

  await supabase
    .from("profiles")
    .update({ monthly_gen_used: current + 1 })
    .eq("id", userId)
}

export async function checkChatLimit(userId: string, tripId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabase = getServiceClient()

  const { data: profileData } = await supabase
    .from("profiles")
    .select("subscription_tier, chat_limit_override")
    .eq("id", userId)
    .single()

  const tier = (profileData?.subscription_tier as SubscriptionTier) || "free"

  // Dev tier: unlimited
  if (tier === "dev") {
    return { allowed: true, used: 0, limit: 999999 }
  }

  const baseLimit = TIER_LIMITS[tier].chatPerTrip
  const limit = profileData?.chat_limit_override ?? baseLimit

  // Count messages for this trip
  const { count } = await supabase
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("trip_id", tripId)
    .eq("source", "trip-assistant")

  const used = count ?? 0

  return {
    allowed: used < limit,
    used,
    limit,
  }
}
