"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Map, User, LogOut, Settings, Mail } from "lucide-react"
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

export function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      const { error } = await signOut()
      
      // Игнорируем ошибку "Auth session missing!" - это нормальное поведение
      if (error && !error.message?.includes('Auth session missing')) {
        toast.error("Ошибка при выходе: " + error.message)
        return
      }
      
      localStorage.removeItem("user")
      setUser(null) // Явно обновляем состояние
      
      // Дополнительная очистка сессии Supabase
      await supabase.auth.signOut({ scope: 'local' })
      
      toast.success("Вы успешно вышли из аккаунта")
      
      // Небольшая задержка перед редиректом для показа toast
      setTimeout(() => {
        window.location.href = "/"
      }, 1000)
    } catch (error) {
      toast.error("Произошла ошибка при выходе")
      console.error("Logout error:", error)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-all duration-300">
      <div className="mx-auto w-full max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition-transform hover:rotate-12">
            <Map className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">TraveLM</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-6">
          <Link
            href="/results"
            className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/results" ? "text-primary" : "text-muted-foreground"}`}
          >
            Маршруты
          </Link>

          <Link
            href="/news"
            className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/news" ? "text-primary" : "text-muted-foreground"}`}
          >
            Лента
          </Link>

          <Link
            href="/plan"
            className={`text-sm font-medium transition-colors hover:text-primary ${pathname === "/plan" ? "text-primary" : "text-muted-foreground"}`}
          >
            Спланировать
          </Link>

          <div className="flex items-center gap-2">
            <ModeToggle />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                      <AvatarFallback className="bg-primary/5 text-primary text-xs">
                        {user.email?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || "Путешественник"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=profile" className="cursor-pointer w-full flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Мой профиль</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=routes" className="cursor-pointer w-full flex items-center">
                        <Map className="mr-2 h-4 w-4" />
                        <span>Мои маршруты</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=settings" className="cursor-pointer w-full flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Настройки</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="ml-2 transition-all hover:scale-105">
                <Link href="/auth">Войти</Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
