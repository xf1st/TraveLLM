"use client"

import { cn } from "@/lib/utils"
import { TIER_BADGE_CONFIG, type SubscriptionTier } from "@/lib/subscription-config"

interface SubscriptionBadgeProps {
  tier: string
  className?: string
}

export function SubscriptionBadge({ tier, className }: SubscriptionBadgeProps) {
  const config = TIER_BADGE_CONFIG[tier as SubscriptionTier]
  if (!config) return null

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border leading-none",
        config.colorClass,
        className
      )}
    >
      {config.label}
    </span>
  )
}
