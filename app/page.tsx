"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Users, ArrowRight, Search, Sparkles, Plane, Map as MapIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { motion } from "framer-motion"
import GradientText from "@/components/GradientText"
import { Footer } from "@/components/footer"
import { TripImage } from "@/components/TripImage"

// Dynamic imports for WebGL components (client-side only)
const LightRays = dynamic(() => import('@/components/LightRays'), { ssr: false })
const MeshGradient = dynamic(() => import('@paper-design/shaders-react').then(m => ({ default: m.MeshGradient })), { ssr: false })

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })

    // Check mobile
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Popular destinations data - 3 most popular real routes
  const popularDestinations = [
    {
      title: "Ялта: 7 дней у моря",
      desc: "Ласточкино гнездо, пляжи, вино",
      image: "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=800",
      slug: "pop-1"
    },
    {
      title: "Анталья: всё включено",
      desc: "10 дней пляжного отдыха",
      image: "https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&q=80&w=800",
      slug: "pop-3"
    },
    {
      title: "Тбилиси: Гастро-тур",
      desc: "Вино, хинкали, серные бани",
      image: "https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&q=80&w=800",
      slug: "pop-5"
    }
  ]

  // Floating cards data
  const floatingImages = [
    { src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=400&auto=format&fit=crop", query: "beautiful nature mountain landscape", className: "top-20 -left-20 w-48 h-64 -rotate-6 hidden lg:block" },
    { src: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=400&auto=format&fit=crop", query: "scenic road trip view", className: "bottom-40 -left-10 w-40 h-40 rotate-3 hidden lg:block" },
    { src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=400&auto=format&fit=crop", query: "paris eiffel tower street", className: "top-20 -right-20 w-48 h-64 rotate-6 hidden lg:block" },
    { src: "https://images.unsplash.com/photo-1504609773096-104ff1058705?q=80&w=400&auto=format&fit=crop", query: "tropical beach paradise", className: "bottom-40 -right-10 w-40 h-40 -rotate-3 hidden lg:block" }
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
      <Header />

      <main className="flex-1 relative flex flex-col justify-center min-h-[90vh]">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0 opacity-100 pointer-events-none">
          {/* Liquid Background */}
          <div className="absolute inset-0 opacity-30 dark:opacity-20 animate-in fade-in duration-1000">
            <MeshGradient
              colors={["#000000", "#1e1e1e", "#111111", "#3b0764"]}
              speed={0.1}
            />
          </div>
          <LightRays
            raysOrigin="top-center"
            raysColor="#ffffff"
            raysSpeed={0.5}
            lightSpread={0.6}
            rayLength={4}
            followMouse={true}
            mouseInfluence={0.2}
            className="custom-rays"
            pulsating={true}
          />
        </div>

        <section className="relative z-10 w-full max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8 relative z-20"
          >
            <GradientText
              colors={["#a855f7", "#3b82f6", "#06b6d4", "#a855f7"]}
              animationSpeed={6}
              showBorder={false}
              className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4"
            >
              TraveLM:
            </GradientText>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mt-2">
              Откройте свое <br className="hidden md:block" />
              <span className="text-muted-foreground/80">следующее приключение</span>
            </h1>
          </motion.div>



          {/* Floating Images (Decorative) */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {floatingImages.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.6, scale: 1, y: [0, -20, 0] }}
                transition={{
                  opacity: { duration: 1 },
                  scale: { duration: 1 },
                  y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: i * 1.2 }
                }}
                className={`absolute ${img.className} rounded-3xl overflow-hidden border border-white/10 shadow-2xl`}
              >
                <TripImage
                  src={img.src}
                  query={img.query}
                  alt="Travel"
                  className="w-full h-full object-cover opacity-80"
                />
              </motion.div>
            ))}
          </div>

          {/* Search Bar Capsule */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-full max-w-2xl relative z-30 mb-20"
          >
            <Link href="/plan" className="block group">
              <div className="relative overflow-hidden rounded-full border border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 shadow-2xl shadow-primary/10 group-hover:shadow-primary/20 p-2 pl-6 flex items-center justify-between gap-4">

                {/* Inputs Visual Mockup */}
                <div className="flex items-center gap-6 flex-1 overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0 flex-1 border-r border-white/10 pr-4">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-foreground">Куда?</span>
                      <span className="text-xs text-muted-foreground truncate">Поиск направлений</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 hidden sm:flex border-r border-white/10 pr-4">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-foreground">Даты</span>
                      <span className="text-xs text-muted-foreground">Добавить даты</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 hidden sm:flex">
                    <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-foreground">Гости</span>
                      <span className="text-xs text-muted-foreground">Добавить</span>
                    </div>
                  </div>
                </div>

                {/* Search Button */}
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                  <ArrowRight className="h-6 w-6 text-primary-foreground" />
                </div>

              </div>
            </Link>
          </motion.div>

          {/* Popular Destinations Cards */}
          <div className="w-full relative z-20">
            <h3 className="text-left text-lg font-medium text-muted-foreground mb-4 pl-1">Популярные направления:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {popularDestinations.map((dest, i) => (
                <Link href={`/results?source=popular#${dest.slug}`} key={i} className="block group">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + (i * 0.1) }}
                    className="relative h-24 rounded-2xl overflow-hidden border border-white/10 group-hover:border-primary/50 transition-colors"
                  >
                    {/* Background Image */}
                    <TripImage
                      src={dest.image}
                      query={dest.title}
                      alt={dest.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />

                    {/* Content */}
                    <div className="absolute inset-0 p-4 flex flex-col justify-center text-left">
                      <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{dest.title}</h4>
                      <p className="text-xs text-gray-400 max-w-[80%] truncate">{dest.desc}</p>
                    </div>

                    {/* Arrow Icon */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

        </section>

        {/* ===== ABOUT / FEATURES SECTION ===== */}
        <section className="w-full max-w-7xl mx-auto px-4 py-24 relative z-20 border-t border-white/5">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-4 border-primary/50 text-primary bg-primary/10">О проекте</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              Путешествия, созданные <br /><span className="text-primary">искусственным интеллектом</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              TraveLM анализирует тысячи вариантов и создаёт идеальный маршрут за секунды
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/5 border-white/10 p-6 hover:border-primary/50 transition-all hover:-translate-y-1 group rounded-[2rem]">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-2xl">🧠</div>
              <h3 className="text-xl font-bold mb-2">Умное планирование</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">ИИ учитывает ваш стиль путешествия, интересы, бюджет и даже темп прогулок.</p>
            </Card>
            <Card className="bg-white/5 border-white/10 p-6 hover:border-blue-500/50 transition-all hover:-translate-y-1 group rounded-[2rem]">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-2xl">✈️</div>
              <h3 className="text-xl font-bold mb-2">Реальные данные</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Актуальные цены на билеты и отели, ссылки на бронирование напрямую.</p>
            </Card>
            <Card className="bg-white/5 border-white/10 p-6 hover:border-pink-500/50 transition-all hover:-translate-y-1 group rounded-[2rem]">
              <div className="h-14 w-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-2xl">📍</div>
              <h3 className="text-xl font-bold mb-2">Детальные маршруты</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Почасовой план на каждый день с адресами, временем работы и секретными местами.</p>
            </Card>
          </div>
        </section>

        {/* ===== FEATURED ROUTES SECTION ===== */}
        <section className="w-full max-w-7xl mx-auto px-4 py-24 relative z-20">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-emerald-500/50 text-emerald-400 bg-emerald-500/10">Популярные маршруты</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Вдохновитесь путешествиями</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Лучшие направления, отобранные нашими экспертами и пользователями</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { id: "pop-1", title: "Неделя в Ялте: Крымская классика", destination: "Крым, Россия", duration: "7 дней", tags: ["море", "пляж", "культура"], safetyLevel: 10, budget: "55 000 ₽", image: "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=800", description: "Ласточкино гнездо, Ливадийский дворец, Массандра. Идеальный пляжный отдых с историей." },
              { id: "pop-3", title: "Турция: Анталья всё включено", destination: "Анталья, Турция", duration: "10 дней", tags: ["пляж", "релакс", "аквапарк"], safetyLevel: 9, budget: "120 000 ₽", image: "https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&q=80&w=800", description: "All-inclusive отели 5*, пляжи, экскурсия в Памуккале и Каппадокию." },
              { id: "pop-5", title: "Тбилиси и Кахетия", destination: "Грузия", duration: "7 дней", tags: ["гастрономия", "культура", "вино"], safetyLevel: 9, budget: "75 000 ₽", image: "https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&q=80&w=800", description: "Хинкали, хачапури, вино в Кахетии. Серные бани и ночной Тбилиси." },
              { id: "pop-6", title: "Алтай: Дикий и прекрасный", destination: "Алтай, Россия", duration: "10 дней", tags: ["природа", "активный", "горы"], safetyLevel: 9, budget: "110 000 ₽", image: "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&q=80&w=800", description: "Чуйский тракт, Телецкое озеро, Марсианские пейзажи. Для любителей природы." },
              { id: "pop-7", title: "Узбекистан: Шёлковый путь", destination: "Узбекистан", duration: "8 дней", tags: ["история", "культура", "еда"], safetyLevel: 9, budget: "70 000 ₽", image: "https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&q=80&w=800", description: "Самарканд, Бухара, Хива. Плов каждый день, мечети и медресе." },
              { id: "pop-8", title: "ОАЭ: Дубай за 5 дней", destination: "Дубай, ОАЭ", duration: "5 дней", tags: ["шопинг", "развлечения", "пляж"], safetyLevel: 10, budget: "150 000 ₽", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800", description: "Бурдж Халифа, Palm Jumeirah, Dubai Mall. Прямой рейс 5ч." }
            ].map((trip, index) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="group relative flex flex-col h-full overflow-hidden border border-border/50 dark:border-white/5 bg-card dark:bg-zinc-900 shadow-xl backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-primary/10 rounded-[2rem]">
                  {/* Image */}
                  <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-t-[2rem]">
                    <TripImage
                      src={trip.image}
                      query={trip.destination}
                      alt={trip.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card via-card/80 to-transparent dark:from-zinc-900 dark:via-zinc-900/80" />
                    {/* Safety Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-emerald-500/90 text-white px-2 py-0.5 shadow-lg border border-emerald-400/30">
                      <Sparkles className="h-3 w-3" />
                      <span className="text-[10px] font-bold">{trip.safetyLevel}/10</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-5 pt-0 relative z-10 -mt-10">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {trip.destination}
                      <span className="h-1 w-1 rounded-full bg-border dark:bg-white/20" />
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      {trip.duration}
                    </div>

                    <h3 className="text-lg font-bold text-foreground dark:text-white mb-2 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {trip.title}
                    </h3>

                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground dark:text-zinc-400 line-clamp-2">
                      {trip.description}
                    </p>

                    <div className="mb-4 flex flex-wrap gap-1.5 mt-auto">
                      {trip.tags.map((tag) => (
                        <span key={tag} className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-white/10 text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-0 mt-auto">
                      <span className="text-lg font-black text-foreground dark:text-white tracking-tight">
                        {trip.budget}
                      </span>
                      <Button asChild className="rounded-full bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-primary/90 dark:hover:bg-white/90 font-bold px-6 h-10 shadow-lg transition-all hover:scale-105 group/btn">
                        <Link href={`/trip/${trip.id}`}>
                          Открыть
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/results">
              <Button variant="outline" className="rounded-full px-8 py-6 text-lg border-white/20 hover:bg-white/10">
                Посмотреть все маршруты <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="w-full relative py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative z-10 text-center max-w-3xl mx-auto px-4"
          >
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
              Готовы к путешествию?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-lg mx-auto">
              Создайте свой идеальный маршрут за минуту — бесплатно
            </p>
            <Link href="/plan">
              <Button size="lg" className="rounded-full px-12 py-8 text-xl shadow-2xl shadow-primary/30 hover:scale-105 transition-transform bg-gradient-to-r from-primary to-orange-500 border-none">
                Создать маршрут <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-6 opacity-70">
              Без регистрации карты · 100% бесплатно
            </p>
          </motion.div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
