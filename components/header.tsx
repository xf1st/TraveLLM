"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Map, User, LogOut, Settings, Menu, Shield, History, X, Compass } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
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
import { SubscriptionBadge } from "@/components/SubscriptionBadge"

interface HeaderProps {
  /** Floating pill-shaped header style for landing pages */
  floating?: boolean
}

export function Header({ floating = false }: HeaderProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [userData, setUserData] = useState<{ full_name?: string, avatar_url?: string } | null>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free")
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
          .select('role, full_name, avatar_url, subscription_tier')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          // console.log("Header: Profile loaded", profile)
          setIsAdmin(profile.role === 'admin' || profile.role === 'super_admin')
          setSubscriptionTier(profile.subscription_tier || 'free')
          setUserData({
            full_name: profile.full_name || user.user_metadata?.full_name,
            avatar_url: profile.avatar_url || user.user_metadata?.avatar_url
          })
        } else {
          console.log("Header: No profile found for user")
          // Fallback to metadata if no profile row
          setUserData({
            full_name: user.user_metadata?.full_name,
            avatar_url: user.user_metadata?.avatar_url
          })
        }
      } else {
        setIsAdmin(false)
        setUserData(null)
      }
    }

    loadUserData()

    // Listen for profile updates
    const handleProfileUpdate = () => {
      loadUserData()
    }
    window.addEventListener('profile_updated', handleProfileUpdate)

    // Global Ctrl+K / Cmd+K search shortcut
    const handleSearchKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleSearchKey)

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
      document.removeEventListener("keydown", handleSearchKey)
    }
  }, [user])

  const handleLogout = async () => {
    try {
      const { error } = await signOut()

      if (error && !error.message?.includes('Auth session missing')) {
        toast.error("Ошибка при выходе: " + error.message)
        return
      }

      localStorage.removeItem("user")
      // Auth state will be updated by AuthProvider via onAuthStateChange

      toast.success("Вы успешно вышли из аккаунта")

      setTimeout(() => {
        window.location.href = "/"
      }, 1000)
    } catch (error) {
      toast.error("Произошла ошибка при выходе")
      console.error("Logout error:", error)
    }
  }

  const navLinks = [
    { href: "/trips", label: "Маршруты" },
    { href: "/dashboard", label: "3D Карта β" },
    { href: "/plan", label: "Спланировать" },
  ]

  // Hide on auth pages
  if (pathname === "/auth" || pathname === "/landing") return null

  if (floating) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none">
        <header className="pointer-events-auto mx-auto max-w-3xl flex h-12 items-center justify-between px-5 rounded-2xl bg-card/95 dark:bg-neutral-900/90 backdrop-blur-md md:backdrop-blur-xl border border-border/50 dark:border-white/10 shadow-md md:shadow-2xl">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Logo size={28} />
            <span className="text-sm font-semibold tracking-tight hidden sm:block">TraveLLM</span>
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
          <div className="flex items-center gap-2">
            {/* Search triggers */}
            <SearchTriggerDesktop onClick={() => setSearchOpen(true)} />
            <SearchTriggerMobile onClick={() => setSearchOpen(true)} />

            {/* Mobile Navigation Menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-1 h-8 w-8" aria-label="Открыть меню">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                  <DropdownMenuLabel>Меню</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {navLinks.map((link) => {
                    const isCreateTrip = link.href === '/plan'
                    return (
                      <DropdownMenuItem key={link.href} asChild className="rounded-lg">
                        <Link href={link.href} className={cn(
                          "w-full cursor-pointer flex items-center justify-between group transition-all duration-300",
                          isCreateTrip 
                            ? "relative hover:bg-accent/50 shadow-sm" 
                            : (pathname === link.href ? "bg-accent/50 font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground font-medium")
                        )}>
                          {isCreateTrip && (
                            <>
                              <div className="absolute inset-0 rounded-[inherit] pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-300" 
                                   style={{ padding: '1.5px', background: 'linear-gradient(to right, #3b82f6, #6366f1, #a855f7)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' } as React.CSSProperties} />
                            </>
                          )}
                          <span className={cn(
                            "z-10 relative",
                            isCreateTrip && "bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent font-bold"
                          )}>
                            {link.label}
                          </span>
                          {isCreateTrip && <Compass className="w-4 h-4 z-10 relative text-indigo-500 animate-pulse" />}
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ModeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 hover:bg-accent" aria-label="Меню пользователя">
                    <Avatar className="h-7 w-7">
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
                        <p className="text-sm font-medium">{userData?.full_name || user.user_metadata?.full_name || "Путешественник"}</p>
                        <SubscriptionBadge tier={subscriptionTier} />
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                      <Link href="/profile" className="w-full flex items-center p-2">
                        <User className="mr-3 h-4 w-4" />
                        <span>Мой профиль</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                      <Link href="/profile?tab=history" className="w-full flex items-center p-2">
                        <History className="mr-3 h-4 w-4" />
                        <span>История генераций</span>
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                        <Link href="/admin" className="w-full flex items-center p-2">
                          <Shield className="mr-3 h-4 w-4" />
                          <span>Админ-панель</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="rounded-lg text-destructive cursor-pointer p-2" onClick={handleLogout}>
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="rounded-lg h-8 px-4">
                <Link href="/auth">Войти</Link>
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
      <div className="sticky top-0 z-50 w-full p-3 md:p-4 opacity-0">
        <header className="mx-auto max-w-5xl flex h-12 items-center justify-between px-5 rounded-2xl bg-card/95 border border-border/50 shadow-md md:shadow-2xl">
          {/* Skeleton or empty header to prefer layout shift over hydration error */}
        </header>
      </div>
    )
  }

  return (
    <div className={cn(
      "z-50 w-full transition-all duration-500",
      pathname === "/" 
        ? (isScrolled ? "fixed top-0 p-2 sm:p-3 md:p-4" : "absolute top-0 p-4 sm:p-6 md:p-8") 
        : "sticky top-0 p-2 sm:p-3 md:p-4"
    )}>
      <header className={cn(
        "mx-auto max-w-5xl flex h-12 items-center justify-between px-3 sm:px-5 rounded-2xl transition-all duration-500",
        pathname === "/"
          ? (isScrolled ? "trip-glass shadow-md md:shadow-2xl" : "bg-transparent border-none shadow-none")
          : "trip-glass shadow-md md:shadow-2xl"
      )}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 shrink-0">
          <Logo size={pathname === "/" && !isScrolled ? 28 : 24} />
          <span className={cn(
            "text-sm font-semibold tracking-tight transition-colors duration-500",
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
        <div className="flex items-center gap-2">
          {/* Search triggers */}
          <SearchTriggerDesktop onClick={() => setSearchOpen(true)} />
          <SearchTriggerMobile onClick={() => setSearchOpen(true)} />

          {/* Mobile Navigation Trigger */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-1 h-9 w-9 min-h-[44px] min-w-[44px]" aria-label="Открыть меню">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl">
                <DropdownMenuLabel>Меню</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {navLinks.map((link) => {
                  const isCreateTrip = link.href === '/plan'
                  return (
                    <DropdownMenuItem key={link.href} asChild className="rounded-lg">
                      <Link href={link.href} className={cn(
                        "w-full cursor-pointer flex items-center justify-between group transition-all duration-300 py-2.5",
                        isCreateTrip
                          ? "relative hover:bg-accent/50 shadow-sm"
                          : (pathname === link.href ? "bg-accent/50 font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground font-medium")
                      )}>
                        {isCreateTrip && (
                          <>
                            <div className="absolute inset-0 rounded-[inherit] pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-300" 
                                 style={{ padding: '1.5px', background: 'linear-gradient(to right, #3b82f6, #6366f1, #a855f7)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' } as React.CSSProperties} />
                          </>
                        )}
                        <span className={cn(
                          "z-10 relative",
                          isCreateTrip && "bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent font-bold"
                        )}>
                          {link.label}
                        </span>
                        {isCreateTrip && <Compass className="w-4 h-4 z-10 relative text-indigo-500 animate-pulse" />}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ModeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 hover:bg-accent" aria-label="Меню пользователя">
                  <Avatar className="h-7 w-7">
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
                      <p className="text-sm font-medium">{userData?.full_name || user.user_metadata?.full_name || "Путешественник"}</p>
                      <SubscriptionBadge tier={subscriptionTier} />
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/profile" className="w-full flex items-center p-2">
                      <User className="mr-3 h-4 w-4" />
                      <span>Мой профиль</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/profile?tab=history" className="w-full flex items-center p-2">
                      <History className="mr-3 h-4 w-4" />
                      <span>История генераций</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/profile?tab=settings" className="w-full flex items-center p-2">
                      <Settings className="mr-3 h-4 w-4" />
                      <span>Настройки</span>
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                      <Link href="/admin" className="w-full flex items-center p-2">
                        <Shield className="mr-3 h-4 w-4" />
                        <span>Админ-панель</span>
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
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="rounded-lg h-8 px-4">
              <Link href="/auth">Войти</Link>
            </Button>
          )}
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}


