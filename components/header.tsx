"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Map, User, LogOut, Settings, Shield, History, Compass } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { GlobalSearch, SearchTriggerDesktop, SearchTriggerMobile } from "@/components/GlobalSearch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase, signOut } from "@/lib/supabase"
import { useState, useEffect } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { appToast as toast } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
interface HeaderProps {
  /** Floating pill-shaped header style for landing pages */
  floating?: boolean
}

export function Header({ floating = false }: HeaderProps) {
  const t = useTranslations("nav")
  const pathname = usePathname()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [userData, setUserData] = useState<{ full_name?: string, avatar_url?: string } | null>(null)
  const [genUsage, setGenUsage] = useState<{ used: number; limit: number } | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  // -- Fix: Hydration Mismatch --
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Check admin role when user changes
  useEffect(() => {
    setIsMounted(true)

    const loadUserData = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name, avatar_url, gen_limit_override')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          setIsAdmin(profile.role === 'admin' || profile.role === 'super_admin')
          setUserData({
            full_name: profile.full_name || user.user_metadata?.full_name,
            avatar_url: profile.avatar_url || user.user_metadata?.avatar_url
          })
          const now = new Date()
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          const { count } = await supabase
            .from('ai_usage_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('source', 'route-generation')
            .gte('created_at', monthStart)
          const limit = profile.gen_limit_override ?? 10
          setGenUsage({ used: count ?? 0, limit })
        } else {
          setUserData({
            full_name: user.user_metadata?.full_name,
            avatar_url: user.user_metadata?.avatar_url
          })
          setGenUsage({ used: 0, limit: 10 })
        }
      } else {
        setIsAdmin(false)
        setUserData(null)
        setGenUsage(null)
      }
    }

    loadUserData()

    // Listen for profile updates
    const handleProfileUpdate = () => {
      loadUserData()
    }
    window.addEventListener('profile_updated', handleProfileUpdate)

    // Debounced scroll handler for better mobile performance
    let scrollTimer: NodeJS.Timeout
    const handleScroll = () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        setIsScrolled(window.scrollY > 10)
      }, 50)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      clearTimeout(scrollTimer)
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener('profile_updated', handleProfileUpdate)
    }
  }, [user])

  const userMenuGenUsage =
    genUsage && user ? (
      <div className="mt-2.5 pt-2 border-t border-border/30">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">{t("generationsMonth")}</span>
          <span
            className={
              genUsage.used >= genUsage.limit ? "text-destructive font-semibold" : "font-medium"
            }
          >
            {genUsage.used}/{genUsage.limit}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${genUsage.used >= genUsage.limit ? "bg-destructive" : genUsage.used >= genUsage.limit * 0.8 ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${Math.min(100, (genUsage.used / genUsage.limit) * 100)}%` }}
          />
        </div>
      </div>
    ) : null

  const handleLogout = async () => {
    try {
      const { error } = await signOut()

      if (error && !error.message?.includes('Auth session missing')) {
        toast.error(t("signOut") + ": " + error.message)
        return
      }

      localStorage.removeItem("user")
      // Auth state will be updated by AuthProvider via onAuthStateChange

      toast.success(t("signOut"))

      setTimeout(() => {
        window.location.href = "/"
      }, 1000)
    } catch (error) {
      toast.error(t("signOutError"))
      console.error("Logout error:", error)
    }
  }

  const navLinks = [
    { href: "/trips", label: t("routes") },
    { href: "/reels", label: t("reels") },
    ...(isAdmin ? [{ href: "/admin", label: t("adminPanel") }] : []),
    { href: "/plan", label: t("plan") },
  ]

  // Hide on auth pages
  if (pathname === "/auth" || pathname === "/landing") return null

  if (floating) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] md:px-6 md:pb-6 md:pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
        <header className="pointer-events-auto mx-auto max-w-3xl flex h-12 min-w-0 items-center justify-between px-3 sm:px-5 rounded-2xl bg-card/95 dark:bg-neutral-900/90 backdrop-blur-md md:backdrop-blur-xl border border-border/50 dark:border-white/10 shadow-md md:shadow-2xl">
          {/* Logo */}
          <Link href="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2 transition-opacity hover:opacity-80">
            <Logo size={28} />
            <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:block truncate">
              TraveLLM
            </span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isCreateTrip = link.href === '/plan'
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 group",
                    isCreateTrip
                      ? "relative hover:scale-[1.05] hover:bg-accent/50 shadow-sm flex items-center gap-2"
                      : pathname === link.href
                        ? "text-foreground bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {isCreateTrip && (
                    <>
                      <div className="absolute inset-0 rounded-lg pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-300" 
                           style={{ padding: '2px', background: 'linear-gradient(to right, #3b82f6, #6366f1, #a855f7)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' } as React.CSSProperties} />
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 blur-md opacity-10 group-hover:opacity-30 transition-opacity duration-300 -z-10 pointer-events-none" />
                    </>
                  )}
                  {isCreateTrip && <Compass className="w-4 h-4 z-10 relative text-indigo-500 animate-pulse" />}
                  <span className={cn(
                    "z-10 relative",
                    isCreateTrip && "bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent font-bold"
                  )}>
                    {link.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {/* Search triggers */}
            <SearchTriggerDesktop onClick={() => setSearchOpen(true)} />
            <SearchTriggerMobile onClick={() => setSearchOpen(true)} />

            <ModeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 md:h-8 md:w-8 rounded-full p-0 hover:bg-accent touch-manipulation" aria-label={t("userMenu")}>
                    <Avatar className="h-8 w-8 md:h-7 md:w-7">
                      <AvatarImage src={userData?.avatar_url || user.user_metadata?.avatar_url} alt={user.email} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                        {user.email?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-xl p-2" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{userData?.full_name || user.user_metadata?.full_name || t("traveler", { ns: "common" })}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-[10px] font-mono text-muted-foreground/40 mt-1 select-none font-bold tracking-widest">TraveLLM AI V: 2.07b</p>
                    </div>
                    {userMenuGenUsage}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                      <Link href="/profile" className="w-full flex items-center p-2">
                        <User className="mr-3 h-4 w-4" />
                        <span>{t("myProfile")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                      <Link href="/profile?tab=history" className="w-full flex items-center p-2">
                        <History className="mr-3 h-4 w-4" />
                        <span>{t("generationHistory")}</span>
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                        <Link href="/admin" className="w-full flex items-center p-2">
                          <Shield className="mr-3 h-4 w-4" />
                          <span>{t("adminPanel")}</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="rounded-lg text-destructive cursor-pointer p-2" onClick={handleLogout}>
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>{t("signOut")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="rounded-lg h-9 px-3 sm:px-4 md:h-8 touch-manipulation">
                <Link href="/auth">{t("signIn")}</Link>
              </Button>
            )}
          </div>
        </header>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    )
  }

  // Ensure hydration match for main menu (prevents ID mismatches on SSR)
  if (!isMounted) {
    return (
      <div className={cn(
        "z-50 w-full sticky top-0 px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))]",
        "md:px-3 md:pb-3 md:pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:px-4 lg:pb-4 lg:pt-[calc(1rem+env(safe-area-inset-top,0px))]"
      )}>
        <header className="mx-auto max-w-5xl flex h-12 min-w-0 items-center justify-between px-2.5 sm:px-5 rounded-2xl trip-glass shadow-md">
          <Link href="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2 shrink-0">
            <Logo size={24} />
            <span className="text-sm font-semibold tracking-tight text-foreground max-[380px]:hidden">TraveLLM</span>
          </Link>
          <div className="h-8 w-24 rounded-lg bg-muted/20 animate-pulse" />
        </header>
      </div>
    )
  }

  return (
    <div className={cn(
      "z-50 w-full transition-all duration-500",
      "sticky top-0 px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))]",
      pathname === "/"
        ? isScrolled
          ? "md:fixed md:top-0 md:px-3 md:pb-3 md:pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:px-4 lg:pb-4 lg:pt-[calc(1rem+env(safe-area-inset-top,0px))]"
          : "md:absolute md:top-0 md:px-6 md:pb-6 md:pt-[calc(1.5rem+env(safe-area-inset-top,0px))] lg:px-8 lg:pb-8 lg:pt-[calc(2rem+env(safe-area-inset-top,0px))]"
        : "md:sticky md:top-0 md:px-3 md:pb-3 md:pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:px-4 lg:pb-4 lg:pt-[calc(1rem+env(safe-area-inset-top,0px))]"
    )}>
      <header className={cn(
        "mx-auto max-w-5xl flex h-12 min-w-0 items-center justify-between px-2.5 sm:px-5 rounded-2xl transition-all duration-500",
        // Mobile: always glass
        "trip-glass shadow-md",
        // md+: transparent on landing before scroll
        pathname === "/"
          ? (isScrolled ? "md:trip-glass md:shadow-2xl" : "md:bg-transparent md:border-none md:shadow-none")
          : "md:trip-glass md:shadow-2xl"
      )}>
        {/* Logo */}
        <Link href="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2 transition-opacity hover:opacity-80 shrink-0">
          <Logo size={pathname === "/" && !isScrolled ? 28 : 24} />
          <span className={cn(
            "text-sm font-semibold tracking-tight transition-colors duration-500 max-[380px]:hidden",
            pathname === "/" && !isScrolled ? "text-white text-base" : "text-foreground"
          )}>TraveLLM</span>
        </Link>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isCreateTrip = link.href === '/plan'
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 group",
                  isCreateTrip
                    ? "relative hover:scale-[1.05] hover:bg-accent/50 shadow-sm flex items-center gap-2"
                    : pathname === link.href
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {isCreateTrip && (
                  <>
                    <div className="absolute inset-0 rounded-lg pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-300" 
                         style={{ padding: '2px', background: 'linear-gradient(to right, #3b82f6, #6366f1, #a855f7)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' } as React.CSSProperties} />
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 blur-md opacity-10 group-hover:opacity-30 transition-opacity duration-300 -z-10 pointer-events-none" />
                  </>
                )}
                {isCreateTrip && <Compass className="w-4 h-4 z-10 relative text-indigo-500 animate-pulse" />}
                <span className={cn(
                  "z-10 relative",
                  isCreateTrip && "bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent font-bold"
                )}>
                  {link.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Actions & Mobile Menu */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Search triggers */}
          <SearchTriggerDesktop onClick={() => setSearchOpen(true)} />
          <SearchTriggerMobile onClick={() => setSearchOpen(true)} />

          <ModeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 md:h-8 md:w-8 rounded-full p-0 hover:bg-accent touch-manipulation" aria-label={t("userMenu")}>
                  <Avatar className="h-8 w-8 md:h-7 md:w-7">
                    <AvatarImage src={userData?.avatar_url || user.user_metadata?.avatar_url} alt={user.email} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                      {user.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl p-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{userData?.full_name || user.user_metadata?.full_name || t("traveler", { ns: "common" })}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/40 mt-1 select-none font-bold tracking-widest">TraveLLM AI V: 2.08b</p>
                  </div>
                  {userMenuGenUsage}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/profile" className="w-full flex items-center p-2">
                      <User className="mr-3 h-4 w-4" />
                      <span>{t("myProfile")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/profile?tab=history" className="w-full flex items-center p-2">
                      <History className="mr-3 h-4 w-4" />
                      <span>{t("generationHistory")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/profile?tab=settings" className="w-full flex items-center p-2">
                      <Settings className="mr-3 h-4 w-4" />
                      <span>{t("settings")}</span>
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                      <Link href="/admin" className="w-full flex items-center p-2">
                        <Shield className="mr-3 h-4 w-4" />
                        <span>{t("adminPanel")}</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-lg text-destructive cursor-pointer p-2"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>{t("signOut")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="rounded-lg h-9 px-3 sm:px-4 md:h-8 touch-manipulation">
              <Link href="/auth">{t("signIn")}</Link>
            </Button>
          )}
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}


