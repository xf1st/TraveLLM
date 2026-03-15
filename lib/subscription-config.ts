// Client-safe subscription constants — safe to import in client components

export type SubscriptionTier = "free" | "pro" | "max" | "dev"

export interface TierLimits {
  genPerMonth: number
  chatPerTrip: number
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: { genPerMonth: 3, chatPerTrip: 10 },
  pro:  { genPerMonth: 25, chatPerTrip: 25 },
  max:  { genPerMonth: 50, chatPerTrip: 50 },
  dev:  { genPerMonth: Infinity, chatPerTrip: Infinity },
}

export interface TierBadgeConfig {
  label: string
  colorClass: string
}

export const TIER_BADGE_CONFIG: Record<SubscriptionTier, TierBadgeConfig | null> = {
  free: null,
  pro:  { label: "Pro", colorClass: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  max:  { label: "Max", colorClass: "text-purple-400 bg-purple-400/10 border-purple-400/30" },
  dev:  { label: "Dev", colorClass: "text-red-500 bg-red-500/10 border-red-500/30" },
}
