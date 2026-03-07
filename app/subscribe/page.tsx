"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Heart, Zap, Crown, ArrowRight, Copy, CheckCheck, Mail, Send } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const TIERS = [
  {
    name: "Free",
    price: null,
    description: "Попробуй бесплатно",
    gen: 25,
    chat: 10,
    features: [
      "Нейросеть DeepSeek-V3",
      "25 генераций маршрутов/месяц",
      "10 сообщений AI-ассистента на маршрут",
      "Базовые карты и экспорт",
    ],
    highlight: false,
    badge: null,
    buttonDisabled: true,
    buttonText: "Текущий план",
    colorClass: "border-border/50",
    icon: null,
    planKey: null,
  },
  {
    name: "Pro",
    price: "399 ₽/мес",
    description: "Для активных путешественников",
    gen: 50,
    chat: 25,
    features: [
      "Нейросеть Gemini 2.5 Flash / Pro",
      "50 генераций маршрутов/месяц",
      "25 сообщений AI-ассистента на маршрут",
      "Значок Pro в профиле",
    ],
    highlight: true,
    badge: { label: "Pro", colorClass: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
    buttonDisabled: false,
    buttonText: "Поддержать",
    colorClass: "border-yellow-400/40",
    icon: Zap,
    planKey: "Pro",
  },
  {
    name: "Max",
    price: "TBD",
    description: "Скоро — для профессионалов",
    gen: 100,
    chat: 50,
    features: [
      "Все нейросети (Gemini, ChatGPT и др.)",
      "100 генераций маршрутов/месяц",
      "50 сообщений AI-ассистента на маршрут",
      "Ранний доступ к новым функциям",
      "Значок Max в профиле",
    ],
    highlight: false,
    badge: { label: "Max", colorClass: "text-purple-400 bg-purple-400/10 border-purple-400/30" },
    buttonDisabled: true,
    buttonText: "Скоро",
    buttonHref: "https://t.me/TraveLLM_AI",
    colorClass: "border-purple-400/30",
    icon: Crown,
    planKey: "Max",
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Скопировано!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Не удалось скопировать")
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors shrink-0"
    >
      {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Скопировано" : "Копировать"}
    </button>
  )
}

export default function SubscribePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>("Pro")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null)
    })
  }, [])

  // Pre-formatted donation message
  const donationMessage = userEmail
    ? `TraveLLM ${selectedPlan} - ${userEmail}`
    : `TraveLLM ${selectedPlan} - ваш@email.ru`

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Premium Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 45, 0],
            x: [-100, 100, -100],
            y: [-50, 50, -50],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-rose-500/10 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -45, 0],
            x: [100, -100, 100],
            y: [50, -50, 50],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [0.8, 1.2, 0.8],
            x: [0, 150, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] left-[20%] w-[40%] h-[40%] rounded-full bg-orange-400/5 blur-[100px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(var(--background-rgb),0.4)_100%)]" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-border/40 px-6 py-4 flex items-center gap-4 bg-background/20 backdrop-blur-md">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-all hover:translate-x-[-2px] flex items-center gap-1">
          <span className="text-lg">←</span> Назад
        </Link>
        <span className="text-sm font-bold tracking-tight">TraveLLM</span>
      </div>

      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold mb-8 shadow-lg shadow-rose-500/5"
          >
            <Heart className="h-4 w-4 fill-current" />
            Поддержи проект
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
            TraveLLM работает<br />
            <span className="bg-gradient-to-r from-primary via-orange-400 to-rose-400 bg-clip-text text-transparent">
              на пожертвованиях
            </span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
            Мы не показываем рекламу и не продаём данные. <br className="hidden sm:block" />
            Ваша поддержка помогает оплачивать AI и серверы.
          </p>
        </motion.div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "relative rounded-2xl border p-6 bg-card/30 backdrop-blur-md md:backdrop-blur-xl flex flex-col transition-all duration-300 hover:bg-card/40 hover:translate-y-[-4px]",
                tier.colorClass,
                tier.highlight && "ring-1 ring-yellow-400/30 shadow-md md:shadow-2xl shadow-yellow-400/10",
                !tier.buttonDisabled && selectedPlan === tier.planKey && "ring-2 ring-primary/40"
              )}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-yellow-400 text-black text-xs font-bold px-3">Популярный</Badge>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {tier.icon && <tier.icon className="h-5 w-5 text-yellow-400" />}
                  <span className="text-lg font-bold">{tier.name}</span>
                  {tier.badge && (
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border leading-none",
                      tier.badge.colorClass
                    )}>
                      {tier.badge.label}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{tier.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-black">{tier.price ?? "Бесплатно"}</span>
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {!tier.buttonDisabled ? (
                <button
                  onClick={() => tier.planKey && setSelectedPlan(tier.planKey)}
                  className={cn(
                    "w-full rounded-xl py-2.5 text-sm font-semibold transition-all border",
                    selectedPlan === tier.planKey
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-foreground border-border/50 hover:bg-muted/60"
                  )}
                >
                  {selectedPlan === tier.planKey ? "✓ Выбрано" : "Выбрать"}
                </button>
              ) : tier.buttonHref ? (
                <a
                  href={tier.buttonHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border border-purple-400/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  {tier.buttonText}
                </a>
              ) : (
                <Button disabled className="w-full rounded-xl opacity-40 text-sm">
                  {tier.buttonText}
                </Button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Payment Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md md:backdrop-blur-xl p-6 md:p-8 space-y-6 shadow-md md:shadow-xl"
        >
          <div>
            <h2 className="text-lg font-bold mb-1">Как оплатить</h2>
            <p className="text-sm text-muted-foreground">Следуй инструкции — 3 простых шага</p>
          </div>

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="shrink-0 h-7 w-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">1</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-2">
                Скопируй сообщение для доната — в нём твой email для активации подписки
              </p>
              {/* Email display */}
              {userEmail ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/50">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <code className="text-sm font-mono flex-1 truncate">{donationMessage}</code>
                  <CopyButton text={donationMessage} />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/50">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1">
                    <Link href="/auth" className="text-primary hover:underline">Войди в аккаунт</Link>
                    {" "}чтобы увидеть email для доната
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Это сообщение нужно вставить в поле <strong>«Сообщение»</strong> при оплате
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="shrink-0 h-7 w-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">2</div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-3">Выбери платёжную систему и оплати</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="https://www.donationalerts.com/r/xf1st"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold bg-yellow-400 text-black hover:bg-yellow-300 transition-colors"
                >
                  DonationAlerts
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="https://new.donatepay.ru/@xf1st"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-medium border border-border/50 hover:bg-accent transition-colors"
                >
                  DonatePay
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="shrink-0 h-7 w-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">3</div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Подожди активации — до 24 часов</p>
              <p className="text-sm text-muted-foreground">
                После оплаты мы видим твой email из сообщения и вручную выдаём подписку.
                Если прошло больше 24 часов — напиши в{" "}
                <a
                  href="https://t.me/myszf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Telegram @myszf
                </a>
                .
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
