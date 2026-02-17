"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModeToggle } from "@/components/mode-toggle"
import { ArrowRight, Loader2, Mail, Lock, User } from "lucide-react"
import { supabase, signInWithGoogle } from "@/lib/supabase"
import { toast } from "sonner"
import { motion } from "framer-motion"

const DESTINATIONS = [
  { flag: "🗼", name: "Париж" },
  { flag: "🏔", name: "Алтай" },
  { flag: "🌴", name: "Мальдивы" },
  { flag: "🕌", name: "Стамбул" },
  { flag: "⛩️", name: "Токио" },
  { flag: "🏛️", name: "Рим" },
  { flag: "🌅", name: "Бали" },
  { flag: "🎡", name: "Дубай" },
]

const FLOAT_POSITIONS = [
  { x: 8, y: 12, delay: 0.2 },
  { x: 58, y: 8, delay: 0.7 },
  { x: 20, y: 55, delay: 1.1 },
  { x: 62, y: 48, delay: 0.4 },
  { x: 40, y: 78, delay: 0.9 },
  { x: 72, y: 72, delay: 1.4 },
]

function FloatingChip({ dest, pos }: { dest: typeof DESTINATIONS[0]; pos: typeof FLOAT_POSITIONS[0] }) {
  return (
    <motion.div
      className="absolute flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-sm font-medium shadow-lg select-none pointer-events-none"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0, 1, 1, 0.85, 1],
        y: [0, -10, 0, -6, 0],
      }}
      transition={{
        opacity: { delay: pos.delay, duration: 0.8 },
        y: { delay: pos.delay, duration: 4 + pos.delay, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <span className="text-base">{dest.flag}</span>
      <span className="text-sm">{dest.name}</span>
    </motion.div>
  )
}

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "login")

  const isAdminSubdomain = typeof window !== "undefined" && window.location.host.startsWith("admin.")
  const defaultRedirect = isAdminSubdomain ? "/admin" : "/plan"

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.push(defaultRedirect)
    })
  }, [router, defaultRedirect])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("preferences").eq("id", user.id).single()
        router.push(profile?.preferences ? defaultRedirect : "/onboarding")
      } else {
        router.push("/onboarding")
      }
      localStorage.setItem("user", JSON.stringify({ email, name: "Пользователь" }))
    }
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Регистрация успешна! Проверьте вашу почту.")
      localStorage.setItem("user", JSON.stringify({ email, name }))
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle()
    if (error) toast.error(error.message)
  }

  const passwordStrength = (p: string) =>
    p.length > 8 ? (/[A-Z]/.test(p) && /[0-9]/.test(p) ? 4 : 3) : p.length > 5 ? 2 : 1

  const strengthLabel = (s: number) =>
    s === 4 ? "Отличный пароль" : s === 3 ? "Хороший пароль" : s === 2 ? "Средний пароль" : "Слабый пароль"

  const strengthColor = (s: number) =>
    s === 1 ? "bg-red-500" : s === 2 ? "bg-orange-400" : s === 3 ? "bg-yellow-400" : "bg-emerald-500"

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL — always dark, branded ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden flex-col bg-[#060612]">
        {/* Gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-700/25 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-5%] right-[5%] w-[400px] h-[400px] bg-violet-700/20 rounded-full blur-[100px]" />
          <div className="absolute top-[55%] left-[30%] w-[300px] h-[300px] bg-blue-600/15 rounded-full blur-[80px]" />
        </div>

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-30 pointer-events-none [background-image:radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:32px_32px]" />

        {/* Floating destination chips */}
        {FLOAT_POSITIONS.map((pos, i) => (
          <FloatingChip key={i} dest={DESTINATIONS[i]} pos={pos} />
        ))}

        {/* Main content */}
        <div className="relative z-10 flex flex-col justify-center flex-1 px-12 xl:px-20">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-semibold mb-10 tracking-wide uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              AI Travel Assistant
            </div>

            {/* Heading */}
            <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.08] tracking-tight mb-6">
              Откройте мир<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-violet-400 to-indigo-300">
                с AI‑гидом
              </span>
            </h1>
            <p className="text-lg xl:text-xl text-white/55 leading-relaxed mb-14 max-w-sm">
              Персональные маршруты с реальными ценами на авиабилеты и отели — за секунды.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 max-w-xs">
              {[
                { num: "10K+", label: "маршрутов" },
                { num: "50+", label: "стран" },
                { num: "4.9★", label: "рейтинг" },
              ].map((s) => (
                <div key={s.num} className="text-center p-4 rounded-2xl bg-white/5 border border-white/8 backdrop-blur-sm">
                  <div className="text-xl font-black text-white">{s.num}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom brand */}
        <div className="relative z-10 px-12 xl:px-20 pb-8 flex items-center gap-3">
          <Logo size={24} />
          <span className="text-white/30 text-xs">TravelLM · ваш AI-путеводитель</span>
        </div>
      </div>

      {/* ── RIGHT PANEL — theme-aware ── */}
      <div className="flex-1 flex flex-col bg-background min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 sm:px-10 pt-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo size={28} />
            <span className="font-black text-lg text-foreground">TravelLM</span>
          </div>
          <div className="lg:ml-auto">
            <ModeToggle />
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-8">
          <div className="w-full max-w-[400px]">
            {/* Logo on desktop */}
            <div className="hidden lg:flex items-center gap-2.5 mb-8">
              <Logo size={32} />
              <span className="font-black text-xl text-foreground">TravelLM</span>
            </div>

            {/* Dynamic heading */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                {activeTab === "login" ? "С возвращением!" : "Добро пожаловать!"}
              </h2>
              <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
                {activeTab === "login"
                  ? "Продолжите путешествие там, где остановились"
                  : "Создайте аккаунт и спланируйте первый маршрут"}
              </p>
            </motion.div>

            {/* Google button */}
            <Button
              variant="outline"
              className="w-full h-11 gap-3 font-semibold rounded-xl border-border hover:bg-accent transition-all mb-5"
              onClick={handleGoogleLogin}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Войти через Google
            </Button>

            {/* Divider */}
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
                  или через email
                </span>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-5 h-10 rounded-xl bg-muted p-1">
                <TabsTrigger
                  value="login"
                  className="rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Войти
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Регистрация
                </TabsTrigger>
              </TabsList>

              {/* Login */}
              <TabsContent value="login" className="space-y-4 mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm font-medium">Email адрес</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-11 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm font-medium">Пароль</Label>
                      <Link href="/auth/reset-password" className="text-xs text-primary hover:underline underline-offset-4">
                        Забыли пароль?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 h-11 rounded-xl"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Войти <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup */}
              <TabsContent value="signup" className="space-y-4 mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-sm font-medium">Как вас зовут?</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="signup-name"
                        placeholder="Иван"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-10 h-11 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-sm font-medium">Email адрес</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-11 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 h-11 rounded-xl"
                      />
                    </div>
                    {password && (
                      <div className="space-y-1 pt-1">
                        <div className="flex gap-1 h-1">
                          {[1, 2, 3, 4].map((level) => {
                            const s = passwordStrength(password)
                            return (
                              <div
                                key={level}
                                className={`flex-1 rounded-full transition-all duration-300 ${s >= level ? strengthColor(s) : "bg-muted"}`}
                              />
                            )
                          })}
                        </div>
                        <p className="text-xs text-right text-muted-foreground">
                          {strengthLabel(passwordStrength(password))}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Создать аккаунт <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Продолжая, вы соглашаетесь с{" "}
              <Link href="#" className="underline underline-offset-4 hover:text-foreground transition-colors">
                условиями использования
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-muted-foreground/60">Privacy Policy · Terms of Service</p>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  )
}
