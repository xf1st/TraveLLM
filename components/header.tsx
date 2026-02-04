"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Map, User, LogOut, Settings, Menu, Shield } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
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
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface HeaderProps {
  /** Floating pill-shaped header style for landing pages */
  floating?: boolean
}

export function Header({ floating = false }: HeaderProps) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // -- Fix: Hydration Mismatch --
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user || null)
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        setIsAdmin(profile?.role === 'admin' || profile?.role === 'super_admin')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const handleLogout = async () => {
    try {
      const { error } = await signOut()

      if (error && !error.message?.includes('Auth session missing')) {
        toast.error("Ошибка при выходе: " + error.message)
        return
      }

      localStorage.removeItem("user")
      setUser(null)
      await supabase.auth.signOut({ scope: 'local' })

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
    // { href: "/guide", label: "AI Гид" }, // Hidden - preserved for future mobile app
    { href: "/results", label: "Маршруты" },
    { href: "/news", label: "Лента" },
    { href: "/plan", label: "Спланировать" },
  ]

  // Hide on auth pages
  if (pathname === "/auth" || pathname === "/landing") return null

  if (floating) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none">
        <header className="pointer-events-auto mx-auto max-w-3xl flex h-12 items-center justify-between px-5 rounded-2xl bg-card/95 dark:bg-neutral-900/90 backdrop-blur-xl border border-border/50 dark:border-white/10 shadow-2xl">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Logo size={28} />
            <span className="text-sm font-semibold tracking-tight hidden sm:block">TraveLM</span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  pathname === link.href
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Navigation Menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-1 h-8 w-8">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                  <DropdownMenuLabel>Меню</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {navLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild className="rounded-lg">
                      <Link href={link.href} className={cn("w-full cursor-pointer", pathname === link.href && "bg-accent/50")}>
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ModeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 hover:bg-accent">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                        {user.email?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-xl p-2" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.user_metadata?.full_name || "Путешественник"}</p>
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
                      <Link href="/profile?tab=routes" className="w-full flex items-center p-2">
                        <Map className="mr-3 h-4 w-4" />
                        <span>Мои маршруты</span>
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
      </div>
    )
  }

  // Ensure hydration match for main menu (prevents ID mismatches on SSR)
  if (!isMounted) {
    return (
      <div className="sticky top-0 z-50 w-full p-3 md:p-4 opacity-0">
        <header className="mx-auto max-w-5xl flex h-12 items-center justify-between px-5 rounded-2xl bg-card/95 border border-border/50 shadow-2xl">
          {/* Skeleton or empty header to prefer layout shift over hydration error */}
        </header>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-50 w-full p-3 md:p-4">
      <header className="mx-auto max-w-5xl flex h-12 items-center justify-between px-5 rounded-2xl bg-card/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-border/50 dark:border-white/10 shadow-2xl">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 shrink-0">
          <Logo size={24} />
          <span className="text-sm font-semibold tracking-tight">TraveLM</span>
        </Link>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                pathname === link.href
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions & Mobile Menu */}
        <div className="flex items-center gap-2">
          {/* Mobile Navigation Trigger */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-1">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                <DropdownMenuLabel>Меню</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {navLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild className="rounded-lg">
                    <Link href={link.href} className={cn("w-full cursor-pointer", pathname === link.href && "bg-accent/50")}>
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ModeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 hover:bg-accent">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                      {user.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl p-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.user_metadata?.full_name || "Путешественник"}</p>
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
                    <Link href="/profile?tab=routes" className="w-full flex items-center p-2">
                      <Map className="mr-3 h-4 w-4" />
                      <span>Мои маршруты</span>
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
    </div>
  )
}
