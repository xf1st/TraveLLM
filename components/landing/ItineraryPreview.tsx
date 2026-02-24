"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Ticket, ChevronLeft, ChevronRight, CloudSun, Cloud, Sun, Wallet, Bot, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/* ─── Types ──────────────────────────────────────────────────── */

type Activity = {
  time: string
  placeName: string
  desc: string
  cost: string
  ticketsRequired: boolean
  category: "food" | "culture" | "transport" | "nature" | "night"
  emoji: string
  mapLink: string
  imageUrl: string
}

type Day = {
  day: number
  title: string
  subtitle: string
  dayTotal: string
  coverImage: string
  weather: { icon: "sun" | "cloud" | "partly"; temp: string }
  activities: Activity[]
  aiTip: string
}

/* ─── Data ───────────────────────────────────────────────────── */

const TOKYO: Day[] = [
  {
    day: 1,
    title: "Токио: Прибытие и Синдзюку",
    subtitle: "Первое погружение в мегаполис",
    dayTotal: "8 400 ₽",
    coverImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=900&auto=format&fit=crop",
    weather: { icon: "sun", temp: "+18°C" },
    aiTip: "В первый вечер советую просто погулять по Кабукитё — ночной Синдзюку особенно впечатляет после долгого перелёта.",
    activities: [
      {
        time: "Полдень", placeName: "Аэропорт Нарита → Синдзюку",
        desc: "Экспресс Narita Express за 35 минут. Купите IC-карту Suica на месте — пригодится на всю поездку.",
        cost: "2 100 ₽", ticketsRequired: true, category: "transport", emoji: "🚄",
        mapLink: "https://maps.google.com/?q=Narita+Airport",
        imageUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "День", placeName: "Токийский правительственный квартал",
        desc: "Бесплатная смотровая на 45-м этаже — панорама Токио с видом на Фудзи в ясную погоду.",
        cost: "Бесплатно", ticketsRequired: false, category: "culture", emoji: "🏙️",
        mapLink: "https://maps.google.com/?q=Tokyo+Metropolitan+Government+Building",
        imageUrl: "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "Вечер", placeName: "Ужин в Ichiran Ramen",
        desc: "Легендарный рамен в кабинках — каждый ест за перегородкой, полное погружение во вкус.",
        cost: "950 ₽", ticketsRequired: false, category: "food", emoji: "🍜",
        mapLink: "https://maps.google.com/?q=Ichiran+Ramen+Shinjuku",
        imageUrl: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "Ночь", placeName: "Кабукитё — Прогулка",
        desc: "Самый яркий квартал Токио: неон, уличная еда, Game-центры Sega. Атмосфера киберпанка.",
        cost: "1 500 ₽", ticketsRequired: false, category: "night", emoji: "🌃",
        mapLink: "https://maps.google.com/?q=Kabukicho+Shinjuku",
        imageUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?q=80&w=200&auto=format&fit=crop",
      },
    ]
  },
  {
    day: 2,
    title: "Токио: Асакуса и Уэно",
    subtitle: "Старый Токио и культурный центр",
    dayTotal: "6 200 ₽",
    coverImage: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?q=80&w=900&auto=format&fit=crop",
    weather: { icon: "partly", temp: "+16°C" },
    aiTip: "Храм Сэнсо-дзи открывается в 6 утра — приходите до 8:00 без толп туристов и в красивом утреннем свете.",
    activities: [
      {
        time: "Утро", placeName: "Храм Сэнсо-дзи, Асакуса",
        desc: "Старейший буддийский храм Токио (628 г.). Ворота Каминаримон с огромным красным фонарём.",
        cost: "Бесплатно", ticketsRequired: false, category: "culture", emoji: "⛩️",
        mapLink: "https://maps.google.com/?q=Senso-ji+Temple+Asakusa",
        imageUrl: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "День", placeName: "Национальный музей Токио, Уэно",
        desc: "Крупнейший музей Японии: 89 000 экспонатов. Галерея самурайских доспехов и мечей.",
        cost: "1 500 ₽", ticketsRequired: true, category: "culture", emoji: "🏛️",
        mapLink: "https://maps.google.com/?q=Tokyo+National+Museum+Ueno",
        imageUrl: "https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "День", placeName: "Парк Уэно — обед",
        desc: "Уличная еда у парка: такояки, якисоба, жареные каштаны. Отличное место для пикника.",
        cost: "800 ₽", ticketsRequired: false, category: "food", emoji: "🐙",
        mapLink: "https://maps.google.com/?q=Ueno+Park+Tokyo",
        imageUrl: "https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "Вечер", placeName: "Акихабара — Электронный город",
        desc: "Мекка аниме, манги и электроники. Многоэтажные магазины, ретро-игры, кафе с горничными.",
        cost: "2 000 ₽", ticketsRequired: false, category: "night", emoji: "🎮",
        mapLink: "https://maps.google.com/?q=Akihabara+Tokyo",
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=200&auto=format&fit=crop",
      },
    ]
  },
  {
    day: 3,
    title: "Токио: Сибуя и Харадзюку",
    subtitle: "Поп-культура и молодёжный Токио",
    dayTotal: "9 800 ₽",
    coverImage: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=900&auto=format&fit=crop",
    weather: { icon: "sun", temp: "+20°C" },
    aiTip: "Перекрёсток Сибуя лучше всего смотрится из кафе Starbucks на втором этаже — садитесь у окна заранее.",
    activities: [
      {
        time: "Утро", placeName: "Перекрёсток Сибуя",
        desc: "Самый оживлённый перекрёсток в мире: 3000+ пешеходов за один сигнал светофора.",
        cost: "Бесплатно", ticketsRequired: false, category: "culture", emoji: "🚦",
        mapLink: "https://maps.google.com/?q=Shibuya+Crossing+Tokyo",
        imageUrl: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "День", placeName: "Мемориальный парк Ёёги",
        desc: "Огромный парк в сердце города: велодорожки, уличные музыканты, местные с собаками.",
        cost: "500 ₽", ticketsRequired: false, category: "nature", emoji: "🌿",
        mapLink: "https://maps.google.com/?q=Yoyogi+Park+Tokyo",
        imageUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "День", placeName: "Такэсита-дори, Харадзюку",
        desc: "Улица японской моды: готик-лолита, кавай, стимпанк. Радужная вата — иконичный снимок.",
        cost: "1 500 ₽", ticketsRequired: false, category: "culture", emoji: "🛍️",
        mapLink: "https://maps.google.com/?q=Takeshita+Street+Harajuku",
        imageUrl: "https://images.unsplash.com/photo-1563906267088-b029e7101114?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "Вечер", placeName: "Ужин в Gonpachi Nishi-Azabu",
        desc: "Ресторан-прообраз сцены из «Убить Билла». Многоуровневый интерьер, якитори.",
        cost: "4 500 ₽", ticketsRequired: false, category: "food", emoji: "🍢",
        mapLink: "https://maps.google.com/?q=Gonpachi+Nishi-Azabu+Tokyo",
        imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=200&auto=format&fit=crop",
      },
    ]
  },
  {
    day: 4,
    title: "День-trip: Никко",
    subtitle: "Горный храмовый комплекс UNESCO",
    dayTotal: "7 600 ₽",
    coverImage: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=900&auto=format&fit=crop",
    weather: { icon: "cloud", temp: "+12°C" },
    aiTip: "Возьмите Nikko Pass (3 200 ₽) — включает поезд туда-обратно и все автобусы по городу.",
    activities: [
      {
        time: "Утро", placeName: "Поезд Токио → Никко",
        desc: "Tobu Spacia с Асакусы — 2 часа в комфортном экспрессе через горы.",
        cost: "3 200 ₽", ticketsRequired: true, category: "transport", emoji: "🚃",
        mapLink: "https://maps.google.com/?q=Asakusa+Station+Tokyo",
        imageUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "День", placeName: "Тосёгу — Мавзолей Токугавы",
        desc: "Богатейший синтоистский храм (1617 г.). 5000 скульптур, золотые ворота Ёмэймон.",
        cost: "1 400 ₽", ticketsRequired: true, category: "culture", emoji: "🏯",
        mapLink: "https://maps.google.com/?q=Toshogu+Shrine+Nikko",
        imageUrl: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "День", placeName: "Водопад Кэгон — 97 метров",
        desc: "Один из трёх великих водопадов Японии. Лифт открывает вид на низовые потоки.",
        cost: "600 ₽", ticketsRequired: false, category: "nature", emoji: "💧",
        mapLink: "https://maps.google.com/?q=Kegon+Falls+Nikko",
        imageUrl: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "Вечер", placeName: "Возвращение — прогулка по Гинзе",
        desc: "Пешеходная зона Гинзы: витрины люкс-брендов, уличные художники, кафе с неоном.",
        cost: "1 200 ₽", ticketsRequired: false, category: "night", emoji: "✨",
        mapLink: "https://maps.google.com/?q=Ginza+Tokyo",
        imageUrl: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?q=80&w=200&auto=format&fit=crop",
      },
    ]
  },
  {
    day: 5,
    title: "Токио: Одайба и прощание",
    subtitle: "Будущее Японии на острове в заливе",
    dayTotal: "5 900 ₽",
    coverImage: "https://images.unsplash.com/photo-1567386699854-3b655a55aff5?q=80&w=900&auto=format&fit=crop",
    weather: { icon: "sun", temp: "+19°C" },
    aiTip: "Оставьте вещи в камере хранения на вокзале (300 ₽/день) и наслаждайтесь последним днём налегке.",
    activities: [
      {
        time: "Утро", placeName: "Одайба — TeamLab Borderless",
        desc: "Иммерсивное цифровое искусство на острове будущего. Вид на Радужный мост и мини-Статую Свободы.",
        cost: "3 000 ₽", ticketsRequired: true, category: "culture", emoji: "🤖",
        mapLink: "https://maps.google.com/?q=teamLab+Borderless+Odaiba",
        imageUrl: "https://images.unsplash.com/photo-1535016120720-40c646be5580?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "День", placeName: "Toyota Mega Web",
        desc: "Интерактивный музей Toyota с концептами. Бесплатная поездка на электромобиле по треку.",
        cost: "Бесплатно", ticketsRequired: false, category: "culture", emoji: "🚗",
        mapLink: "https://maps.google.com/?q=Toyota+Mega+Web+Odaiba",
        imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "День", placeName: "Морской вокзал — обед",
        desc: "Фуд-корт с видом на залив: свежие суши, рамен, уни прямо у причала.",
        cost: "1 500 ₽", ticketsRequired: false, category: "food", emoji: "🍱",
        mapLink: "https://maps.google.com/?q=Daiba+Station+Odaiba",
        imageUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=200&auto=format&fit=crop",
      },
      {
        time: "Вечер", placeName: "Вылет из аэропорта Ханэда",
        desc: "30 мин от центра на монорельсе. Duty-free: чай матча KitKat, саке — идеальные подарки.",
        cost: "800 ₽", ticketsRequired: true, category: "transport", emoji: "✈️",
        mapLink: "https://maps.google.com/?q=Haneda+Airport+Tokyo",
        imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=200&auto=format&fit=crop",
      },
    ]
  },
]

/* ─── Helpers ─────────────────────────────────────────────────── */

const CATEGORY_STYLE: Record<Activity["category"], { bg: string; border: string; dot: string; timeBg: string; timeText: string }> = {
  food:      { bg: "bg-orange-500/10",  border: "border-orange-400/25",  dot: "bg-orange-400",  timeBg: "bg-orange-500/15", timeText: "text-orange-600 dark:text-orange-300" },
  culture:   { bg: "bg-violet-500/10",  border: "border-violet-400/25",  dot: "bg-violet-400",  timeBg: "bg-violet-500/15", timeText: "text-violet-600 dark:text-violet-300" },
  transport: { bg: "bg-sky-500/10",     border: "border-sky-400/25",     dot: "bg-sky-400",     timeBg: "bg-sky-500/15",    timeText: "text-sky-600 dark:text-sky-300" },
  nature:    { bg: "bg-emerald-500/10", border: "border-emerald-400/25", dot: "bg-emerald-400", timeBg: "bg-emerald-500/15",timeText: "text-emerald-600 dark:text-emerald-300" },
  night:     { bg: "bg-indigo-500/10",  border: "border-indigo-400/25",  dot: "bg-indigo-400",  timeBg: "bg-indigo-500/15", timeText: "text-indigo-600 dark:text-indigo-300" },
}

function WeatherIcon({ type, className }: { type: Day["weather"]["icon"]; className?: string }) {
  if (type === "sun")   return <Sun className={cn("text-yellow-400", className)} />
  if (type === "cloud") return <Cloud className={cn("text-slate-400", className)} />
  return <CloudSun className={cn("text-amber-400", className)} />
}

/* ─── Activity card ───────────────────────────────────────────── */

function ActivityRow({ act, index }: { act: Activity; index: number }) {
  const s = CATEGORY_STYLE[act.category]
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={cn(
        "flex gap-3 rounded-2xl border overflow-hidden transition-all hover:border-white/20 group",
        s.bg, s.border
      )}
    >
      {/* Photo thumbnail */}
      <div className="w-[72px] shrink-0 relative overflow-hidden">
        <img
          src={act.imageUrl}
          alt={act.placeName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-foreground/10" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-3 pr-3">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", s.timeBg, s.timeText)}>
            {act.time}
          </span>
          {act.ticketsRequired && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 flex items-center gap-0.5">
              <Ticket className="w-2 h-2" /> Билеты
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm leading-none">{act.emoji}</span>
          <span className="font-bold text-[13px] text-foreground leading-snug line-clamp-1">{act.placeName}</span>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-1.5">{act.desc}</p>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground/70 flex items-center gap-1">
            <Wallet className="w-2.5 h-2.5 text-emerald-400" /> {act.cost}
          </span>
          <a
            href={act.mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary/50 hover:text-primary flex items-center gap-0.5 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <MapPin className="w-2.5 h-2.5" /> Карта
          </a>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Main component ─────────────────────────────────────────── */

export function ItineraryPreview() {
  const [activeDay, setActiveDay] = useState(0)
  const day = TOKYO[activeDay]

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Browser chrome */}
      <div className="rounded-3xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl shadow-foreground/10 overflow-hidden">

        {/* Fake browser bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/60">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-rose-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-muted rounded-lg px-4 py-1 text-[11px] text-muted-foreground/70 font-mono flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              travellm.ru/trip/tokyo-5-days
            </div>
          </div>
          <Badge variant="outline" className="border-primary/20 text-primary/60 bg-primary/5 text-[9px] gap-1 shrink-0">
            <Sparkles className="w-2.5 h-2.5" /> AI
          </Badge>
        </div>

        {/* Cover image + trip header */}
        <div className="relative h-[120px] sm:h-[150px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={`cover-${activeDay}`}
              src={day.coverImage}
              alt={day.title}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-card/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-card/80 via-transparent to-transparent" />

          {/* Trip meta */}
          <div className="absolute bottom-0 left-0 right-0 px-5 py-4 flex items-end justify-between">
            <div>
              <div className="text-[10px] text-foreground/50 uppercase tracking-widest font-bold mb-0.5">🇯🇵 Токио — 5 дней</div>
              <h3 className="font-black text-foreground text-base leading-tight drop-shadow">{day.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{day.subtitle}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-background/70 backdrop-blur-md border border-border/60 rounded-xl px-3 py-1.5">
                <WeatherIcon type={day.weather.icon} className="w-4 h-4" />
                <span className="text-xs font-bold text-foreground">{day.weather.temp}</span>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white/40">День</div>
                <div className="text-sm font-black text-emerald-400">{day.dayTotal}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Day tabs + activities */}
        <div className="flex flex-col sm:flex-row">

          {/* Day selector sidebar */}
          <div className="flex sm:flex-col gap-1 p-3 sm:w-[110px] border-b sm:border-b-0 sm:border-r border-border/50 overflow-x-auto sm:overflow-visible">
            {TOKYO.map((d, i) => (
              <button
                key={d.day}
                onClick={() => setActiveDay(i)}
                className={cn(
                  "shrink-0 flex sm:flex-col items-center sm:items-start gap-1 sm:gap-0 px-3 py-2 rounded-xl text-left transition-all duration-200",
                  activeDay === i
                    ? "bg-primary/15 border border-primary/25 text-primary"
                    : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("text-[9px] font-black uppercase tracking-widest hidden sm:block", activeDay === i ? "text-primary/50" : "text-muted-foreground/40")}>
                  День
                </span>
                <span className={cn("text-xl font-black leading-none", activeDay === i ? "text-primary" : "")}>
                  {d.day}
                </span>
                <WeatherIcon type={d.weather.icon} className="w-3 h-3 shrink-0 sm:mt-1.5" />
              </button>
            ))}
          </div>

          {/* Activities */}
          <div className="flex-1 flex flex-col min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeDay}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="flex-1 flex flex-col"
              >
                {/* Activity list */}
                <div className="p-3 space-y-2 overflow-y-auto max-h-[340px]">
                  {day.activities.map((act, i) => (
                    <ActivityRow key={act.placeName} act={act} index={i} />
                  ))}
                </div>

                {/* AI tip */}
                <div className="px-3 pb-3">
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-primary/8 border border-primary/12">
                    <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-0.5">Совет AI-гида</div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{day.aiTip}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-muted/30">
          <button
            onClick={() => setActiveDay(d => Math.max(0, d - 1))}
            disabled={activeDay === 0}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Пред.
          </button>

          <div className="flex gap-1.5 items-center">
            {TOKYO.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  activeDay === i ? "bg-primary w-5" : "bg-foreground/20 hover:bg-foreground/40 w-1.5"
                )}
              />
            ))}
          </div>

          <button
            onClick={() => setActiveDay(d => Math.min(TOKYO.length - 1, d + 1))}
            disabled={activeDay === TOKYO.length - 1}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
          >
            След. <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground/50 mt-4 font-medium">
        Реальный пример маршрута — именно так выглядит план в TraveLLM
      </p>
    </div>
  )
}
