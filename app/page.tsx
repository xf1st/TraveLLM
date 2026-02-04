"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin, Calendar, Users, ArrowRight, Search, Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { motion } from "framer-motion"
import GradientText from "@/components/GradientText"
import { Footer } from "@/components/footer"
import { MeshGradient } from "@paper-design/shaders-react"
import { TripImage } from "@/components/TripImage"

// Dynamic import for WebGL component (client-side only)
const LightRays = dynamic(() => import('@/components/LightRays'), { ssr: false })

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
      </main>

      <Footer />
    </div>
  )
}
