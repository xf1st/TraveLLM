"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Map, History, User } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all">
      <div className="mx-auto w-full max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition-transform hover:rotate-12">
            <Map className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">TravelMind</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/news"
            className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-primary hover:scale-105 ${
              pathname === "/news" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="hidden sm:inline">Новости</span>
          </Link>

          <Link
            href="/demo"
            className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-primary hover:scale-105 ${
              pathname === "/demo" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="hidden sm:inline">Демо</span>
          </Link>

          <Link
            href="/my-trips"
            className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-primary hover:scale-105 ${
              pathname === "/my-trips" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Мои поездки</span>
          </Link>

          <Link
            href="/profile"
            className={`flex items-center gap-2 text-sm font-medium transition-all hover:text-primary hover:scale-105 ${
              pathname === "/profile" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Профиль</span>
          </Link>

          <Button asChild variant="ghost" size="sm" className="transition-all hover:scale-105">
            <Link href="/auth">Войти</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
