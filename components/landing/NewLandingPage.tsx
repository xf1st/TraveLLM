"use client"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Compass, Mountain, PlaneTakeoff, Hotel, Landmark, Ticket,
  Building, Plane, MessageSquare, Wand2, Film, PlayCircle,
  PiggyBank, Users, Thermometer, Car, ArrowRight, Check, ChevronDown
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"

// Убираем дерганность: более плавные параметры появления
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.1, ease: "easeOut" } }),
}

// Плавная анимация наведения
const hoverScale = {
  scale: 1.01,
  transition: { type: "tween", ease: "easeOut", duration: 0.2 }
}

export default function NewLandingPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-900 text-slate-50 font-sans selection:bg-blue-500/30 selection:text-blue-500">
      <Header />

      <main>
        {/* --- HERO SECTION --- */}
        <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden pt-28 pb-20 px-4 md:px-8 text-white">
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/vidforland.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-transparent to-slate-900/90" />
            <div className="absolute inset-0 backdrop-blur-[1px]" />
          </div>

          <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}
             className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
          >
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/20 blur-[120px]" style={{ borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" }} />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 blur-[120px]" style={{ borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" }} />
          </motion.div>

          <div className="max-w-7xl mx-auto w-full relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left side: Text */}
            <div className="space-y-8 md:space-y-10">
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
                <div className="inline-block px-6 py-2.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold text-sm tracking-wider uppercase backdrop-blur-md">
                  Твой личный AI-друг
                </div>
              </motion.div>
              
              <motion.h1 
                variants={fadeUp} initial="hidden" animate="show" custom={1}
                className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tighter leading-[1.05]"
              >
                Целый маршрут за <br />
                <span className="text-blue-500 inline-block relative">
                   60 секунд
                </span>
              </motion.h1>

              <motion.p 
                 variants={fadeUp} initial="hidden" animate="show" custom={2}
                 className="text-xl md:text-2xl text-slate-300 max-w-lg leading-relaxed font-medium"
              >
                Планируй идеальное приключение без лишней суеты. Наш дружелюбный AI подскажет лучшие места, учитывая всё, что ты любишь.
              </motion.p>

              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <Link href="/plan" className="w-full sm:w-auto">
                  <motion.button 
                     whileHover={hoverScale} whileTap={{ scale: 0.98 }}
                     className="w-full sm:w-auto bg-blue-500 text-white px-10 py-5 rounded-xl font-bold text-lg md:text-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]"
                  >
                    Создать маршрут
                  </motion.button>
                </Link>
                <Link href="/auth" className="w-full sm:w-auto">
                  <motion.button 
                     whileHover={hoverScale} whileTap={{ scale: 0.98 }}
                     className="w-full sm:w-auto border-2 border-white/20 bg-white/5 hover:bg-white/10 hover:border-blue-500 px-10 py-5 rounded-xl font-bold text-lg md:text-xl transition-all backdrop-blur-sm"
                  >
                    Войти
                  </motion.button>
                </Link>
              </motion.div>
              
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex flex-wrap gap-10 md:gap-16 pt-10 border-t border-white/20 text-center sm:text-left">
                {[ { v: "50k+", l: "Маршрутов", c: "text-blue-500" }, { v: "120+", l: "Стран", c: "text-blue-300" }, { v: "4.9/5", l: "Рейтинг", c: "text-indigo-300" }].map((stat, i) => (
                  <div key={i}>
                    <div className={`text-3xl md:text-4xl font-bold ${stat.c}`}>{stat.v}</div>
                    <div className="text-xs md:text-sm font-semibold uppercase tracking-widest text-slate-400 mt-2">{stat.l}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right side: Card element over hero */}
            <motion.div 
               variants={fadeUp} initial="hidden" animate="show" custom={2}
               className="relative hidden lg:block"
            >
              <div className="bg-slate-800/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] rotate-3">
                <div className="aspect-[4/3] bg-blue-500/10 rounded-xl flex items-center justify-center mb-8 overflow-hidden relative group">
                  <Mountain className="text-blue-500 w-[140px] h-[140px] opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="font-bold text-3xl mb-2 text-white">Приключение в Исландии</h3>
                    <p className="text-slate-400 text-lg">7 дней • Сделано с любовью AI</p>
                  </div>
                  <div className="bg-blue-500/20 p-5 rounded-xl">
                    <Compass className="text-blue-500 w-10 h-10" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- PARTNERS SECTION --- */}
        <section className="py-24 md:py-32 px-4 md:px-8 bg-slate-900 border-t border-white/5">
          <div className="max-w-7xl mx-auto space-y-12 md:space-y-16">
            <motion.div 
               variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}
               className="flex flex-col justify-center items-center gap-6 text-center"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-50">Наши надежные партнеры</h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl">
                Мы сотрудничаем с лучшими сервисами, чтобы ваш маршрут был максимально комфортным и выгодным.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              <PartnerCard
                 title="Яндекс Путешествия" 
                 desc="Поиск билетов и отелей для ваших идеальных поездок. ✈️🏨"
                 icon={<PlaneTakeoff className="w-24 h-24" />}
                 hoverColor="hover:border-[#FFCC00]"
                 iconColor="text-[#FFCC00]"
                 delay={0}
              />
              <PartnerCard
                 title="Островок" 
                 desc="Удобное бронирование отелей, апартаментов и хостелов в любой точке планеты. 🏨🌍"
                 icon={<Hotel className="w-24 h-24" />}
                 hoverColor="hover:border-[#FF5A19]"
                 iconColor="text-[#FF5A19]"
                 delay={1}
              />
              <PartnerCard
                 title="Tripster" 
                 desc="Уникальные авторские экскурсии от местных жителей для глубокого погружения в культуру. 🗺️🤝"
                 icon={<Landmark className="w-24 h-24" />}
                 hoverColor="hover:border-[#FF8C00]"
                 iconColor="text-[#FF8C00]"
                 delay={2}
              />
              <PartnerCard
                 title="Sputnik8" 
                 desc="Бронирование популярных экскурсий и билетов в музеи без очередей. 🏛️🎟️"
                 icon={<Ticket className="w-24 h-24" />}
                 hoverColor="hover:border-[#00A3FF]"
                 iconColor="text-[#00A3FF]"
                 delay={3}
              />
              <PartnerCard
                 title="Суточно.ру" 
                 desc="Краткосрочная аренда жилья: от уютных студий до просторных апартаментов. 🏠🔑"
                 icon={<Building className="w-24 h-24" />}
                 hoverColor="hover:border-[#E61EAD]"
                 iconColor="text-[#E61EAD]"
                 delay={4}
              />
              <PartnerCard
                 title="Aviasales" 
                 desc="Самый быстрый и удобный поиск дешевых авиабилетов по всему миру. 🛫💙"
                 icon={<Plane className="w-24 h-24" />}
                 hoverColor="hover:border-[#00B1FF]"
                 iconColor="text-[#00B1FF]"
                 delay={5}
              />
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS --- */}
        <section className="py-24 md:py-40 px-4 md:px-8 bg-[#0B0F1A]">
          <div className="max-w-7xl mx-auto space-y-24 md:space-y-40">
            <div className="text-center space-y-6">
              <motion.h2 
                 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-50"
              >
                Всё очень просто!
              </motion.h2>
              <motion.p 
                 variants={fadeUp} initial="hidden" whileInView="show" custom={1} viewport={{ once: true }}
                 className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto"
              >
                Мы заботимся о деталях, чтобы ты мог просто наслаждаться моментом.
              </motion.p>
              
              <div className="grid md:grid-cols-3 gap-16 pt-20">
                <motion.div variants={fadeUp} initial="hidden" whileInView="show" custom={1} viewport={{ once: true }} className="space-y-8 flex flex-col items-center">
                  <div className="w-36 h-36 bg-blue-500/10 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]" style={{ borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" }}>
                    <MessageSquare className="w-14 h-14 text-blue-500" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white">Расскажи о мечте</h3>
                    <p className="text-slate-400 leading-relaxed px-4">Напиши нам в свободной форме, куда хочешь и что тебе нравится. Мы всё поймем!</p>
                  </div>
                </motion.div>
                <motion.div variants={fadeUp} initial="hidden" whileInView="show" custom={2} viewport={{ once: true }} className="space-y-8 flex flex-col items-center">
                  <div className="w-36 h-36 bg-indigo-500/10 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(99,102,241,0.2)]" style={{ borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" }}>
                    <Wand2 className="w-14 h-14 text-indigo-500" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white">Немного магии AI</h3>
                    <p className="text-slate-400 leading-relaxed px-4">Наш умный помощник прочешет тысячи отзывов и цен, чтобы найти для тебя бриллианты.</p>
                  </div>
                </motion.div>
                <motion.div variants={fadeUp} initial="hidden" whileInView="show" custom={3} viewport={{ once: true }} className="space-y-8 flex flex-col items-center">
                  <div className="w-36 h-36 bg-slate-500/10 flex items-center justify-center" style={{ borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" }}>
                    <Ticket className="w-14 h-14 text-slate-300" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white">Готово к вылету</h3>
                    <p className="text-slate-400 leading-relaxed px-4">Получи план с таймингами, картами и билетами. Осталось только собрать чемодан!</p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* --- ACCURATE REELS SECTION --- */}
            <motion.div 
               variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
               className="relative bg-[#131B2B] rounded-[2.5rem] p-8 md:p-12 lg:py-24 lg:pl-24 lg:pr-0 overflow-visible shadow-2xl flex flex-col lg:flex-row items-center border border-white/5"
            >
              {/* Text on Left */}
              <div className="relative z-20 w-full lg:w-[50%] space-y-6 md:space-y-8 text-center lg:text-left pt-10 lg:pt-0">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-400 font-bold text-[11px] md:text-xs uppercase tracking-widest border border-rose-500/20">
                  <Film className="w-3 h-3 md:w-4 md:h-4" /> В тренде
                </div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-white tracking-tight">Reels с активностями</h2>
                <p className="text-lg md:text-xl text-slate-400 leading-relaxed font-medium relative z-30">
                  Лучше один раз увидеть! Смотри короткие увлекательные видео о том, чем можно заняться в твоем путешествии. Живые эмоции, проверенные локации и никакой скуки.
                </p>
                <div className="flex flex-wrap gap-4 pt-4 justify-center lg:justify-start relative z-30">
                  <motion.button 
                     whileHover={hoverScale} whileTap={{ scale: 0.98 }}
                     className="bg-white text-slate-900 px-8 py-3.5 md:px-10 md:py-4 rounded-full font-bold flex items-center gap-3 transition-colors hover:bg-slate-200"
                  >
                    <PlayCircle className="w-5 h-5 fill-slate-900 text-white" /> Смотреть подборку
                  </motion.button>
                </div>
              </div>

              {/* Tilted Phone Image on Right */}
              <div className="lg:absolute lg:right-[-2%] lg:top-1/2 lg:-translate-y-1/2 w-full lg:w-auto h-[400px] lg:h-auto mt-12 lg:mt-0 flex items-center justify-center lg:justify-end pointer-events-none z-10">
                <motion.img 
                  initial={{ y: 50, opacity: 0 }} 
                  whileInView={{ y: 0, opacity: 1 }} 
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  src="/phone_reels_ads.png" 
                  alt="Reels with activities" 
                  className="w-[350px] lg:w-[750px] xl:w-[950px] 2xl:w-[1150px] max-w-none object-contain drop-shadow-[20px_40px_80px_rgba(0,0,0,0.6)] origin-center"
                  style={{ transform: "rotate(16deg) translateY(5%)" }}
                />
              </div>
            </motion.div>

            {/* --- FEATURES GRID --- */}
            <div className="grid lg:grid-cols-2 gap-16 md:gap-32 items-center">
              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="relative order-2 lg:order-1">
                <div className="bg-slate-800/40 border border-white/5 rounded-[3rem] p-6 md:p-12 aspect-square flex items-center justify-center relative shadow-xl">
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full" />
                  <div className="grid grid-cols-2 gap-6 md:gap-10 relative z-10 w-full">
                    {/* Floating Feature 1 */}
                    <div className="bg-[#1f2937]/80 backdrop-blur-md border border-white/5 p-6 md:p-10 rounded-2xl text-center shadow-lg transition-colors">
                      <PiggyBank className="w-10 h-10 md:w-12 md:h-12 text-blue-500 mb-4 mx-auto opacity-90" />
                      <div className="font-bold text-base md:text-lg">Умный бюджет</div>
                    </div>
                    {/* Floating Feature 2 */}
                    <div className="bg-[#1f2937]/80 backdrop-blur-md border border-white/5 p-6 md:p-10 rounded-2xl text-center translate-y-6 md:translate-y-10 shadow-lg transition-colors">
                      <Users className="w-10 h-10 md:w-12 md:h-12 text-indigo-500 mb-4 mx-auto opacity-90" />
                      <div className="font-bold text-base md:text-lg">Друзья рядом</div>
                    </div>
                    {/* Floating Feature 3 */}
                    <div className="bg-[#1f2937]/80 backdrop-blur-md border border-white/5 p-6 md:p-10 rounded-2xl text-center -translate-y-6 md:-translate-y-10 shadow-lg transition-colors">
                      <Thermometer className="w-10 h-10 md:w-12 md:h-12 text-blue-400 mb-4 mx-auto opacity-90" />
                      <div className="font-bold text-base md:text-lg">Погода на лету</div>
                    </div>
                    {/* Floating Feature 4 */}
                    <div className="bg-[#1f2937]/80 backdrop-blur-md border border-white/5 p-6 md:p-10 rounded-2xl text-center shadow-lg transition-colors">
                      <Car className="w-10 h-10 md:w-12 md:h-12 text-slate-300 mb-4 mx-auto opacity-90" />
                      <div className="font-bold text-base md:text-lg">Умный транспорт</div>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              <div className="space-y-8 md:space-y-10 order-1 lg:order-2">
                <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                  Всё, что нужно, <br/><span className="text-blue-500">в одном месте</span>
                </motion.h2>
                <motion.p variants={fadeUp} initial="hidden" whileInView="show" custom={1} viewport={{ once: true }} className="text-lg md:text-xl text-slate-400 leading-relaxed font-medium">
                  Больше никаких 20 открытых вкладок. Твой идеальный отпуск — это одна ссылка и море удовольствия.
                </motion.p>
                <ul className="space-y-4 md:space-y-6 text-slate-300">
                  {["Доступ к секретным локациям только для своих", "Бронирование билетов в один клик", "Поддержка 24/7 по любым вопросам"].map((t, i) => (
                    <motion.li key={i} variants={fadeUp} initial="hidden" whileInView="show" custom={i+2} viewport={{ once: true }}>
                      <FeatureListItem text={t} />
                    </motion.li>
                  ))}
                </ul>
                <motion.div variants={fadeUp} initial="hidden" whileInView="show" custom={5} viewport={{ once: true }}>
                  <motion.button 
                     whileHover={hoverScale} whileTap={{ scale: 0.98 }}
                     className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold transition-colors hover:bg-blue-500 hover:text-white"
                  >
                    Узнать больше о сервисе
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* --- FAQ SECTION --- */}
        <section className="py-24 md:py-40 px-4 md:px-8 bg-slate-900 border-t border-white/5">
          <div className="max-w-4xl mx-auto space-y-16 md:space-y-24">
            <div className="text-center space-y-8">
              <motion.h2 variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-50">Твои вопросы — наши ответы</motion.h2>
              <div className="space-y-4 md:space-y-5 pt-10 text-left">
                {[ 
                  { q: "Как это работает на самом деле?", a: "Мы используем передовые AI-модели для анализа тысяч вариантов билетов, отелей и активностей. Вы просто описываете желаемое — остальное делает сервис!" },
                  { q: "Это правда бесплатно?", a: "Да! Базовый функционал построения маршрутов всегда будет бесплатным. Для продвинутых путешественников мы предлагаем Pro-подписку с дополнительными фичами." },
                  { q: "Могу я изменить маршрут?", a: "Конечно. Вы можете редактировать любые дни, исключать локации, добавлять свои и перестраивать логистику одним кликом." }
                ].map((faq, i) => (
                  <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" custom={i} viewport={{ once: true }}>
                    <FaqItem title={faq.q} answer={faq.a} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="py-24 md:py-40 px-4 md:px-8 bg-slate-900">
          <motion.div 
             variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
             className="max-w-6xl mx-auto bg-slate-900 border border-white/10 rounded-[3rem] p-10 md:p-16 lg:p-28 text-center relative overflow-hidden text-white shadow-[0_0_80px_rgba(59,130,246,0.1)]"
          >
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full" />
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full" />
            
            <div className="relative z-10 space-y-8 md:space-y-12">
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] max-w-4xl mx-auto tracking-tight">
                Приключение ждёт, <br/>а ты ещё нет?
              </h2>
              <p className="text-lg md:text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
                Присоединяйся к сообществу счастливых путешественников. Мы сделаем твою следующую поездку незабываемой.
              </p>
              <Link href="/plan" className="block w-full max-w-sm mx-auto">
                <motion.button 
                   whileHover={hoverScale} whileTap={{ scale: 0.98 }}
                   className="bg-blue-500 text-white w-full px-10 py-5 mx-auto md:px-16 md:py-6 rounded-xl font-bold text-xl transition-all shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_40px_rgba(59,130,246,0.4)] border-none"
                >
                  Создать маршрут
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </section>

      </main>

      <Footer />
    </div>
  )
}

function PartnerCard({ title, desc, icon, hoverColor, iconColor, delay }: { title: string, desc: string, icon: React.ReactNode, hoverColor: string, iconColor: string, delay: number }) {
  return (
    <motion.div 
       variants={fadeUp} initial="hidden" whileInView="show" custom={delay} viewport={{ once: true }}
       whileHover={{ scale: 1.01 }}
       className={`group relative bg-[#1E293B] rounded-xl p-8 overflow-hidden border border-white/5 ${hoverColor} transition-all duration-300 h-64 flex flex-col justify-end cursor-pointer shadow-sm`}
    >
      <div className={`absolute top-4 right-4 ${iconColor} opacity-10 transition-opacity duration-300`}>
        {icon}
      </div>
      <div className="relative z-10 pointer-events-none">
        <h4 className="text-2xl font-bold mb-2 text-white">{title}</h4>
        <p className="text-slate-400 leading-relaxed font-medium">{desc}</p>
      </div>
    </motion.div>
  )
}

function FeatureListItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4 text-lg text-slate-300 font-medium">
      <div className="bg-blue-500/10 p-2 rounded-xl text-blue-500">
        <Check className="w-5 h-5" />
      </div>
      <span>{text}</span>
    </div>
  )
}

function FaqItem({ title, answer }: { title: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div 
       className="bg-slate-800 rounded-xl border border-white/5 hover:border-blue-500/50 transition-colors overflow-hidden cursor-pointer shadow-sm"
       onClick={() => setIsOpen(!isOpen)}
    >
      <div className="p-6 md:p-8 flex justify-between items-center bg-transparent">
        <h4 className="text-lg md:text-xl font-bold text-white pr-6">{title}</h4>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown className="w-6 h-6 text-blue-500 flex-shrink-0" />
        </motion.div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-6 md:px-8 pb-6 md:pb-8 text-slate-400 leading-relaxed"
          >
            {answer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
