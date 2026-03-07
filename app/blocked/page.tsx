"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ShieldAlert, LogOut, Send, MessageCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function BlockedPage() {
  const [reason, setReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchBlockReason = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('block_reason, access_mode')
            .eq('id', user.id)
            .single()

          if (profile?.access_mode !== 'full_blocked') {
            // If not blocked anymore, redirect back
            router.push('/')
            return
          }
          setReason(profile.block_reason)
        }
      } catch (error) {
        console.error('Failed to fetch block reason:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBlockReason()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Animated Background (Serious Red/Dark Theme) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 20, 0],
            x: [-50, 50, -50],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-rose-600/10 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            rotate: [0, -20, 0],
            x: [50, -50, 50],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[100px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(var(--background-rgb),0.6)_100%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-rose-500/20 bg-card/40 backdrop-blur-md md:backdrop-blur-2xl shadow-md md:shadow-2xl shadow-rose-500/5">
          <CardContent className="pt-12 pb-8 px-8 text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500">
              <ShieldAlert className="h-10 w-10" />
            </div>

            <h1 className="text-3xl font-black tracking-tight mb-3">Доступ заблокирован</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Ваш аккаунт был ограничен администрацией TraveLLM за нарушение правил использования сервиса.
            </p>

            {loading ? (
              <div className="h-24 flex items-center justify-center">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="mb-10 text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
                  Причина блокировки
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50 text-sm italic font-medium">
                  {reason || "Причина не указана администратором."}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <Button asChild variant="outline" className="h-12 border-rose-500/20 hover:bg-rose-500/5 hover:text-rose-500 transition-all gap-2">
                <a href="https://t.me/myszf" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Связаться с поддержкой
                </a>
              </Button>
              <Button onClick={handleLogout} variant="ghost" className="h-12 gap-2 text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
                Выйти из аккаунта
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground/50">
          TraveLLM Security Systems • ID: {reason ? "SECURE_RESTRICT_P1" : "GEN_RESTRICT"}
        </p>
      </motion.div>
    </div>
  )
}
