import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type AppEmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  className?: string
  /** e.g. small accent badge on the icon (Sparkles) */
  badge?: ReactNode
  children?: ReactNode
}

/**
 * Shared empty state: trips, filters, secondary lists — roadmap «пустые состояния».
 */
export function AppEmptyState({ icon: Icon, title, description, className, badge, children }: AppEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-14 sm:py-20 text-center px-4",
        className
      )}
    >
      <div className="relative mb-5 sm:mb-6">
        {badge ? (
          <div className="absolute -right-1 -top-1 z-[1] flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/15">
            {badge}
          </div>
        ) : null}
        <div
          className={cn(
            "flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl",
            "border border-primary/20 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          )}
        >
          <Icon className="h-9 w-9 sm:h-10 sm:w-10 text-primary" strokeWidth={1.5} aria-hidden />
        </div>
      </div>
      <h3 className="mb-2 text-xl font-black tracking-tight text-foreground sm:text-2xl">{title}</h3>
      {description ? (
        <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground sm:mb-8 sm:text-base">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  )
}
