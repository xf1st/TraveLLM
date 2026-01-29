'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Map, Settings, Activity, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/users', label: 'Пользователи', icon: Users },
  { href: '/admin/trips', label: 'Маршруты', icon: Map },
  { href: '/admin/settings', label: 'Настройки', icon: Settings },
  { href: '/admin/health', label: 'Health', icon: Activity },
]

export function AdminHeader() {
  const pathname = usePathname()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/admin" className="text-xl font-bold text-white">
            TraveLM Admin
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  pathname === href
                    ? 'text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white/60 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
          <Avatar className="w-8 h-8">
            <AvatarImage src="" />
            <AvatarFallback className="bg-white/10 text-white text-xs">
              A
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
