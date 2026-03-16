"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, AlertTriangle } from "lucide-react"

interface UserAccessGuardProps {
  children: React.ReactNode
  allowAiBlocked?: boolean // If true, allow viewing even when ai_blocked
}

export function UserAccessGuard({ children, allowAiBlocked = false }: UserAccessGuardProps) {
  const [loading, setLoading] = useState(true)
  const [accessMode, setAccessMode] = useState<string | null>(null)
  const [blockReason, setBlockReason] = useState<string | null>(null)
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isAdminRoute = pathname?.startsWith('/admin')

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('access_mode, block_reason, blocked_until')
          .eq('id', user.id)
          .single()

        const mode = profile?.access_mode || 'active'
        setAccessMode(mode)
        setBlockReason(profile?.block_reason || null)

        // Check if temporary block expired
        if (profile?.blocked_until) {
          const blockedUntil = new Date(profile.blocked_until)
          if (blockedUntil < new Date()) {
            // Block expired, reset to active
            await supabase
              .from('profiles')
              .update({ access_mode: 'active', block_reason: null, blocked_until: null })
              .eq('id', user.id)
            setAccessMode('active')
          }
        }
      } catch (error) {
        console.error('Access check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [])

  useEffect(() => {
    // Sync with sidebar state
    const checkSidebarState = () => {
      try {
        const saved = localStorage.getItem('sidebar-collapsed') === 'true'
        setSidebarCollapsed(saved)
      } catch (e) {}
    }

    checkSidebarState()
    window.addEventListener('sidebar-change', checkSidebarState)
    return () => window.removeEventListener('sidebar-change', checkSidebarState)
  }, [])

  // While loading: render children immediately so the page isn't a black screen.
  // If the user is blocked, the blocking overlay will appear after the check completes.
  if (loading) {
    return <>{children}</>
  }

  // Full block: show fullscreen message
  if (accessMode === 'full_blocked') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 text-white">
        <Card className="max-w-md w-full mx-4 border-red-500/50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <Shield className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold">Доступ отключён</h1>
            {blockReason && (
              <p className="text-muted-foreground">{blockReason}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Если вы считаете, что это ошибка, свяжитесь с поддержкой.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // AI block: show banner but allow viewing
  if (accessMode === 'ai_blocked' && !allowAiBlocked) {
    return (
      <>
        <div className={`sticky top-0 z-40 w-full bg-blue-500/10 border-b border-blue-500/30 px-4 py-2.5 backdrop-blur-md transition-all duration-300 ${
          isAdminRoute 
            ? 'lg:pl-64' // Admin sidebar is roughly 60 units (240px)
            : isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}>
          <div className="flex items-center gap-2 text-blue-300 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            <span>Генерация маршрутов временно недоступна для вашего аккаунта.</span>
            {blockReason && <span className="opacity-70 ml-1">({blockReason})</span>}
          </div>
        </div>
        {children}
      </>
    )
  }

  return <>{children}</>
}
