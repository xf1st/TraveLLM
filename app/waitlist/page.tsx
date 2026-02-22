"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Lock, MessageCircle, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function WaitlistPage() {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success("Вы вышли из аккаунта")
    setTimeout(() => { window.location.href = "/" }, 500)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tight mb-3">
          Закрытое бета-тестирование
        </h1>

        <p className="text-muted-foreground text-base mb-8 leading-relaxed">
          TraveLLM сейчас работает в режиме закрытой беты. Доступ предоставляется вручную.
          Подайте заявку и мы напишем, как только откроем новые места.
        </p>

        <div className="space-y-3 mb-8">
          <a
            href="https://t.me/myszf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="h-5 w-5" />
            Подать заявку в Telegram
            <ArrowRight className="h-4 w-4" />
          </a>

          <Button
            variant="ghost"
            className="w-full rounded-xl text-muted-foreground"
            onClick={handleSignOut}
          >
            Выйти из аккаунта
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/60">
          Уже есть доступ?{" "}
          <Link href="/plan" className="text-primary hover:underline">
            Перейти к планированию
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
