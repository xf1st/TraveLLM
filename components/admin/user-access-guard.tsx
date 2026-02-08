"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()

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

  if (loading) {
    return null
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
        <div className="sticky top-0 z-40 w-full bg-yellow-500/20 border-b border-yellow-500/50 px-4 py-2">
          <div className="flex items-center gap-2 text-yellow-200 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Генерация маршрутов временно недоступна для вашего аккаунта.</span>
            {blockReason && <span className="ml-2">({blockReason})</span>}
          </div>
        </div>
        {children}
      </>
    )
  }

  return <>{children}</>
}
