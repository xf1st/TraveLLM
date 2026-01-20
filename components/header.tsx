"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Map, User, LogOut, Settings } from "lucide-react"
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
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
    { href: "/results", label: "Маршруты" },
    { href: "/news", label: "Лента" },
    { href: "/plan", label: "Спланировать" },
  ]

  if (floating) {
    return (
      <div className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6">
        <header className="mx-auto max-w-5xl flex h-14 items-center justify-between px-6 rounded-full border border-border/50 bg-background/80 backdrop-blur-xl shadow-lg">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Map className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight hidden sm:block">TraveLM</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${pathname === link.href
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ModeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {user.email?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-xl" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.user_metadata?.full_name || "Путешественник"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                      <Link href="/profile" className="w-full flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Мой профиль
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                      <Link href="/my-trips" className="w-full flex items-center">
                        <Map className="mr-2 h-4 w-4" />
                        Мои маршруты
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="rounded-lg text-destructive cursor-pointer" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="rounded-full h-9 px-5">
                <Link href="/auth">Войти</Link>
              </Button>
            )}
          </div>
        </header>
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto w-full max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Map className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">TraveLM</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${pathname === link.href
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="flex items-center gap-2 ml-2">
            <ModeToggle />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-xl p-0">
                    <Avatar className="h-9 w-9 rounded-lg">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-sm font-medium">
                        {user.email?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 rounded-xl p-2" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || "Путешественник"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="mx-2" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                      <Link href="/profile?tab=profile" className="w-full flex items-center p-2">
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
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="mx-2" />
                  <DropdownMenuItem
                    className="rounded-lg text-destructive focus:bg-destructive/10 cursor-pointer p-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="rounded-xl ml-1">
                <Link href="/auth">Войти</Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
