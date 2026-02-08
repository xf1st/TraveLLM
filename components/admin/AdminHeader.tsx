'use client'

import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'Пользователи',
  '/admin/trips': 'Маршруты',
  '/admin/settings': 'Настройки',
  '/admin/health': 'Health Check',
}

export function AdminHeader() {
  const pathname = usePathname()
  const pageTitle = pageTitles[pathname] || 'Админ-панель'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  return (
    <header className="h-16 border-b border-white/10 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-white/60 hover:text-white hover:bg-white/5"
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
    </header>
  )
}
