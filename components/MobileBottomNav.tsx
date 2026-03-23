"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass, Map, User, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const navItems = [
  {
    label: "Планировать",
    href: "/plan",
    icon: Compass,
    color: "text-indigo-500",
  },
  {
    label: "Маршруты",
    href: "/trips",
    icon: Map,
    color: "text-emerald-500",
  },
  {
    label: "Профиль",
    href: "/profile",
    icon: User,
    color: "text-sky-500",
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  // Hide on auth/landing pages
  if (pathname === "/auth" || pathname === "/landing" || pathname === "/") return null

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
      <nav className="pointer-events-auto mx-auto max-w-md h-16 flex items-center justify-around px-2 rounded-2xl trip-glass border border-white/10 shadow-2xl overflow-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-300",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-x-2 inset-y-1 bg-white/5 dark:bg-white/10 rounded-xl -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
