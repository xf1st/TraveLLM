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
import { FloatingIcons } from "@/components/FloatingIcons"
import { VideoText } from "@/components/ui/video-text"
import { MorphingText } from "@/components/ui/morphing-text"

// Dynamic imports for WebGL components (client-side only)
const MapLibreView = dynamic(() => import("@/components/travel/MapLibreView"), { 
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-black/5 animate-pulse rounded-[3rem]" />
})

// Sample points for the globe
const globePoints = [
  { id: 1, title: "Paris", lat: 48.8566, lng: 2.3522, type: "attraction" },
  { id: 2, title: "New York", lat: 40.7128, lng: -74.0060, type: "attraction" },
  { id: 3, title: "Tokyo", lat: 35.6762, lng: 139.6503, type: "attraction" },
  { id: 4, title: "Dubai", lat: 25.2048, lng: 55.2708, type: "attraction" },
  { id: 5, title: "Sydney", lat: -33.8688, lng: 151.2093, type: "attraction" },
  { id: 6, title: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, type: "attraction" },
  { id: 7, title: "Cape Town", lat: -33.9249, lng: 18.4241, type: "attraction" },
  { id: 8, title: "London", lat: 51.5074, lng: -0.1278, type: "attraction" },
]

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
    <div className="flex min-h-screen flex-col trip-bg overflow-x-hidden">
      <Header />

      <main className="flex-1 relative flex flex-col justify-center min-h-[90vh]">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0 opacity-100 pointer-events-none">
          <FloatingIcons />
        </div>

        <section className="relative z-10 w-full max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8 relative z-20 flex flex-col items-center"
          >
            <div className="relative w-full max-w-4xl h-[120px] md:h-[180px] overflow-hidden rounded-2xl">
              <VideoText
                src="https://cdn.magicui.design/ocean-small.webm"
                className="font-black"
                fontSize={15}
              >
                TraveLLM
              </VideoText>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mt-6">
              Откройте свое <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-rose-400 bg-clip-text text-transparent">следующее приключение</span>
            </h1>
          </motion.div>



          {/* Floating Images (Decorative) */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {floatingImages.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, y: [0, -20, 0] }}
                transition={{
                  opacity: { duration: 1 },
                  scale: { duration: 1 },
                  y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: i * 1.2 }
                }}
                className={`absolute ${img.className} rounded-3xl overflow-hidden shadow-2xl`}
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
              <div className="relative overflow-hidden rounded-full border border-white/20 trip-glass hover:bg-white/40 dark:hover:bg-black/40 transition-all duration-300 search-glow p-2 pl-6 flex items-center justify-between gap-4">

                {/* Inputs Visual Mockup */}
                <div className="flex items-center gap-6 flex-1 overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0 flex-1 border-r border-black/10 dark:border-white/10 pr-4">
                    <MapPin className="h-5 w-5 text-slate-500 dark:text-slate-400 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-slate-800 dark:text-white">Куда?</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">Поиск направлений</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 hidden sm:flex border-r border-black/10 dark:border-white/10 pr-4">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-slate-800 dark:text-white">Даты</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Добавить даты</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 hidden sm:flex">
                    <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-slate-800 dark:text-white">Гости</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Добавить</span>
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
            <h3 className="text-center text-lg font-medium text-muted-foreground mb-4 pl-1">Популярные направления:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {popularDestinations.map((dest, i) => (
                <Link href={`/results?source=popular#${dest.slug}`} key={i} className="block group">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + (i * 0.1) }}
                    className="relative h-24 rounded-2xl overflow-hidden border border-white/20 trip-glass group-hover:border-primary/50 transition-colors shadow-lg"
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
        <section className="w-full max-w-7xl mx-auto px-4 py-24 relative z-20 border-t border-black/5 dark:border-white/5">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-4 border-primary/50 text-primary bg-primary/10">О проекте</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 dark:from-white dark:to-white/60">
              Путешествия, созданные <br />
            </h2>
            <div className="h-24">
              <MorphingText className="text-3xl md:text-5xl" texts={["AI", "нейросетями", "алгоритмами", "с любовью"]} />
            </div>
            <p className="text-muted-foreground text-lg">
              TraveLLM анализирует тысячи вариантов и создаёт идеальный маршрут за секунды
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="trip-glass border-white/20 p-6 hover:border-primary/50 transition-all hover:-translate-y-1 group rounded-[2rem] shadow-lg shadow-primary/5">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 dark:bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-2xl">🧠</div>
              <h3 className="text-xl font-bold mb-2">Умное планирование</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">ИИ учитывает ваш стиль путешествия, интересы, бюджет и даже темп прогулок.</p>
            </Card>
            <Card className="trip-glass border-white/20 p-6 hover:border-blue-500/50 transition-all hover:-translate-y-1 group rounded-[2rem] shadow-lg shadow-blue-500/5">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 dark:bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-2xl">✈️</div>
              <h3 className="text-xl font-bold mb-2">Реальные данные</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Актуальные цены на билеты и отели, ссылки на бронирование напрямую.</p>
            </Card>
            <Card className="trip-glass border-white/20 p-6 hover:border-pink-500/50 transition-all hover:-translate-y-1 group rounded-[2rem] shadow-lg shadow-rose-500/5">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 dark:bg-pink-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-2xl">📍</div>
              <h3 className="text-xl font-bold mb-2">Детальные маршруты</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Почасовой план на каждый день с адресами, временем работы и секретными местами.</p>
            </Card>
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
