"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Compass, Map, User, Sparkles, Clapperboard } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileBottomNav() {
  const pathname = usePathname()
  const t = useTranslations("nav")

  const navItems = [
    {
      label: t("plan"),
      href: "/plan",
      icon: Compass,
      color: "text-indigo-500",
    },
    {
      label: t("reels"),
      href: "/reels",
      icon: Clapperboard,
      color: "text-fuchsia-500",
    },
    {
      label: t("routes"),
      href: "/trips",
      icon: Map,
      color: "text-emerald-500",
    },
    {
      label: t("myProfile"),
      href: "/profile",
      icon: User,
      color: "text-sky-500",
    },
  ]

  // Hide on auth/landing pages
  if (pathname === "/auth" || pathname === "/landing" || pathname === "/") return null

  return (
    <div
      className="lg:hidden fixed inset-x-0 bottom-0 z-50 flex justify-center pt-2 pointer-events-none"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <nav className="pointer-events-auto h-14 w-[min(100%,28rem)] shrink-0 mx-3 flex items-center justify-around rounded-2xl trip-glass border border-white/10 shadow-2xl overflow-hidden px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 min-w-0 h-full gap-0.5 transition-colors duration-300",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <div
                  className="absolute inset-x-1 inset-y-1 bg-white/5 dark:bg-white/10 rounded-xl -z-10"
                  aria-hidden
                />
              )}

              <div className="relative">
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    isActive && "scale-110 " + item.color
                  )} 
                />
                {isActive && item.href === '/plan' && (
                  <Sparkles className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 text-indigo-400 animate-pulse" />
                )}
              </div>
              
              <span className={cn(
                "text-[9px] sm:text-[10px] font-bold uppercase tracking-tight transition-all",
                isActive ? "opacity-100 translate-y-0" : "opacity-60 translate-y-0.5"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
