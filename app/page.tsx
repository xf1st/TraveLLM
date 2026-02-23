"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Users, ArrowRight, Plane, Check, Heart, Zap, Crown } from "lucide-react"
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
import { BentoInsights } from "@/components/itinerary/BentoInsights"
import { TravelJournal } from "@/components/itinerary/TravelJournal"

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

        </section>

        {/* ===== NEW STYLISH BLOCKS ===== */}
        <section className="w-full max-w-7xl mx-auto px-4 py-24 border-t border-black/5 dark:border-white/5 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-violet-500/50 text-violet-500 bg-violet-500/10 uppercase tracking-widest">Инсайты AI</Badge>
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter">Спроектировано для <span className="text-blue-600 dark:text-primary italic">впечатлений</span></h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Мы превращаем сухие данные в живой сценарий вашего отпуска</p>
          </div>
          
          <BentoInsights 
            tripData={{
              tags: ["Футуристичный тур", "Гастрономия"],
              destination: "Токио",
              mainImageUrl: "https://yandex-images.clstorage.net/ZTsL50184/39b513dEG/nL8QE5nkMrJqZ9P2x4OjLQ9k_-nTyqJfeSCZSB6_Tw1yJ7jkFgx0U3GuqnquBkXsmPGrTs_RckJ1u0x5rd3Zb9WGdSL88UuuanOC2u6zyx1PMc-c35-qO2k9_XgHJ77ctr9RBY6hjbqp0-cb23dthYXAGu6TcP_fZbJtNfWosHZ4j9gfJZBTGrY3Sh5Hux8Ju0Ff-cOnIkJJiFil-_ueMCKnnZ0aZbWSgbvnN3PLQCF5oDKDO9BXn8FWnXVJ2LTSFEMwH4F0Tx7q337299ez2Qcxm4Hvr472YWzcLYNnnoCa43k13t2hWrU_2zefZyyNKVDu37-gV-9t4t05AaCkhjijKBOJnGuWiucy2veTO2mfAQf5zzf-qh08LHHnG0ZwqitxnXqpgV49C0sDQ1ecIYFw4ndLzEebYaK9tc2ocO6oz6wDAXBnvkLXzg7jr8vVcxV7mZ87slrZXKh1V38iTCrXfbGKlVFWtVPHD4OLHCkRhA47p2h_s73-KfFtsASmMGPMh5mkMw76WxbGEyPPDaOpw7VvA4ryoUy4EZdT2lCeg_Wlfm0BDjVnM6-Dg0S5xTx-r69Ikwcl8j2JecyEjgTXWCNRsO8GAldaxncvxzEXKQ99ry8Gvm2wgJGHC2pQWnvh2coB-YKJO4vjny-YcUlMWlsbaFtvEZ6ZPf00aJqs9xzPAezfUpJnLibnD9fpj23_HfP_ilbNnJjpj29ybOJvxSEimQ0CLfdTS3tPTHGJLP67G2ybLz3y3f0RRFymuP9UoxEwax62y17qL2cz9Ye967F7gzZWyZBgOWvTIjyS-6khnh1dxnX7S-9HK5SxGVSyz8tojwdpKrUFNbAIpojj3NMtFPs2umvafvO7jxU3XZs584dW0uE81JH7-wbQdhNtfW6dsaLVIy-3e7cs7X0EetMnIBOjGQYlrXFcTF6gA6wnhSDzwjbzipJ7V_OZo51P4VsvOprJwKy1k-PQ",
              foodImageUrl: "https://avatars.mds.yandex.net/i?id=c9a5f9228f5fcad01c627efab3a64e48_l-11907031-images-thumbs&n=13",
              itinerary: [
                { day: 1, tips: "Посетите район Акихабара вечером — неоновые огни создают атмосферу киберпанка." },
                { day: 2 }, { day: 3 }, { day: 4 }, { day: 5 }, { day: 6 }, { day: 7 }
              ]
            }}
            className="mb-20"
          />

          <TravelJournal 
            moments={[
              { 
                day: 1, 
                title: "Shibuya Crossing Tokyo", 
                description: "Самый оживленный перекресток мира встретил нас неоновыми огнями и бесконечным потоком людей. Настоящее сердце Токио!",
                imageQuery: "shibuya crossing",
                imageUrl: "https://as2.ftcdn.net/jpg/00/85/60/39/1000_F_85603973_vx8wY7kfLc0do3OGSbg24seYDy8GRi9D.jpg"
              },
              { 
                day: 2, 
                title: "Ueno Park Cherry Blossom", 
                description: "Утренний туман над озером Синобадзу и цветение сакуры — моменты абсолютного спокойствия в мегаполисе.",
                imageQuery: "ueno park sakura",
                imageUrl: "https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&q=80&w=1000"
              },
              { 
                day: 3, 
                title: "Tsukiji Outer Market", 
                description: "Запах свежей рыбы и вкус лучшего суши в нашей жизни. Гастрономический экстаз.",
                imageQuery: "tsukiji market food",
                imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fb/Tsukiji_Outer_Market.jpg"
              }
            ]}
          />
        </section>
        {/* ===== ABOUT / FEATURES SECTION ===== */}
        <section className="w-full max-w-7xl mx-auto px-4 py-32 relative z-20">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-6 border-primary/40 text-blue-600 dark:text-primary bg-primary/5 px-4 py-1 rounded-full uppercase tracking-[0.2em] text-[10px] font-bold">О технологии TraveLLM</Badge>
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 dark:from-white dark:to-white/60">
              Путешествия, созданные <br />
            </h2>
            <div className="h-20 mb-4">
              <MorphingText className="text-4xl md:text-6xl font-black" texts={["Интеллектом", "Нейросетями", "Алгоритмами", "Для вас"]} />
            </div>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
              Мы объединили мощь DeepSeek и реальные данные, чтобы ваше планирование стало искусством, а не рутиной.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="relative h-[450px] overflow-hidden group bg-transparent border-white/10 rounded-[3rem] shadow-2xl hover:shadow-primary/20 transition-all duration-500 border-none">
                <div className="absolute inset-0 z-0">
                  <TripImage 
                    src="https://i.pinimg.com/736x/33/49/e9/3349e98f2f8465a6e037f71803890018.jpg"
                    alt="AI Intelligence" 
                    query="futuristic neural network city abstract" 
                    className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700 opacity-40 dark:opacity-30" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                </div>
                
                <div className="relative z-10 h-full p-10 flex flex-col justify-end">
                   <div className="h-16 w-16 rounded-3xl bg-violet-500/20 backdrop-blur-xl border border-violet-500/30 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                     <span className="text-3xl">🧠</span>
                   </div>
                   <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase italic">Когнитивный Интеллект</h3>
                   <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                     Наш ИИ не просто предлагает места — он понимает контекст, сезонность и ваши личные пожелания, создавая симфонию впечатлений.
                   </p>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="relative h-[450px] overflow-hidden group bg-transparent border-white/10 rounded-[3rem] shadow-2xl hover:shadow-sky-500/20 transition-all duration-500 border-none">
                <div className="absolute inset-0 z-0">
                  <TripImage 
                    src="https://vestikavkaza.ru/upload/2025-12-29/17670342006952cd580923a3.94791965.jpg"
                    alt="Real Data" 
                    query="cinematic airplane wing above clouds sunset" 
                    className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700 opacity-40 dark:opacity-30" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                </div>
                
                <div className="relative z-10 h-full p-10 flex flex-col justify-end">
                   <div className="h-16 w-16 rounded-3xl bg-sky-500/20 backdrop-blur-xl border border-sky-500/30 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                     <span className="text-3xl">✈️</span>
                   </div>
                   <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase italic">Абсолютная Точность</h3>
                   <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                     Интеграция с крупнейшими агрегаторами авиабилетов и отелей для получения самых актуальных цен в режиме реального времени.
                   </p>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="relative h-[450px] overflow-hidden group bg-transparent border-white/10 rounded-[3rem] shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 border-none">
                <div className="absolute inset-0 z-0">
                  <TripImage 
                    src="https://i.pinimg.com/originals/e0/ac/79/e0ac79661d184e8615b142d7e988e300.jpg"
                    alt="Detailed Itinerary" 
                    query="minimalist aesthetic map travel pin landscape" 
                    className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700 opacity-40 dark:opacity-30" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                </div>
                
                <div className="relative z-10 h-full p-10 flex flex-col justify-end">
                   <div className="h-16 w-16 rounded-3xl bg-rose-500/20 backdrop-blur-xl border border-rose-500/30 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                     <span className="text-3xl">📍</span>
                   </div>
                   <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase italic">Бесшовный Маршрут</h3>
                   <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                     Консистентный план передвижений, оптимизированный под ваш темп жизни, чтобы вы наслаждались каждой минутой своего отдыха.
                   </p>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

       

        {/* ===== PRICING SECTION ===== */}
        <section className="w-full max-w-5xl mx-auto px-4 py-24 relative z-20">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 border-rose-500/50 text-rose-400 bg-rose-500/10 uppercase tracking-widest text-[10px]">
              <Heart className="h-3 w-3 mr-1" /> Поддержать проект
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">Планы и цены</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">TraveLLM работает на пожертвованиях. Подписка помогает оплачивать AI-сервисы и серверы.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Free",
                price: "Бесплатно",
                gen: 25,
                chat: 10,
                badge: null,
                icon: null,
                highlight: false,
                colorClass: "border-border/50",
                cta: null,
              },
              {
                name: "Pro",
                price: "399 ₽/мес",
                gen: 50,
                chat: 25,
                badge: { label: "Pro", colorClass: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
                icon: Zap,
                highlight: true,
                colorClass: "border-yellow-400/40",
                cta: "/subscribe",
              },
              {
                name: "Max",
                price: "Скоро",
                gen: 100,
                chat: 50,
                badge: { label: "Max", colorClass: "text-purple-400 bg-purple-400/10 border-purple-400/30" },
                icon: Crown,
                highlight: false,
                colorClass: "border-purple-400/30",
                cta: null,
              },
            ].map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-6 bg-card/40 backdrop-blur-sm flex flex-col smooth-transition hover-lift ${tier.colorClass} ${tier.highlight ? 'ring-1 ring-yellow-400/40 shadow-lg shadow-yellow-400/5' : ''}`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-yellow-400 text-black text-xs font-bold px-3">Популярный</Badge>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  {tier.icon && <tier.icon className="h-5 w-5 text-yellow-400" />}
                  <span className="font-bold text-lg">{tier.name}</span>
                  {tier.badge && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border leading-none ${tier.badge.colorClass}`}>
                      {tier.badge.label}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-black mb-5">{tier.price}</div>
                <ul className="space-y-2 mb-6 flex-1 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 shrink-0" />{tier.gen} генераций/месяц</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 shrink-0" />{tier.chat} сообщений AI на маршрут</li>
                </ul>
                {tier.cta ? (
                  <Link href={tier.cta}>
                    <Button className="w-full rounded-xl bg-yellow-400 text-black hover:bg-yellow-300">
                      Поддержать <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="w-full rounded-xl opacity-40">
                    {tier.name === 'Free' ? 'Базовый план' : 'Скоро'}
                  </Button>
                )}
              </motion.div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground/60 mt-8">
            После оплаты напишите в{" "}
            <a href="https://t.me/myszf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Telegram @myszf
            </a>{" "}
            — активируем вручную в течение 24 часов.
          </p>
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
