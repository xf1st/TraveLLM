"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import { MapPin, Globe, Lock, ArrowLeft, Calendar, Users, User, Share2, Check, Link2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TripImage } from "@/components/TripImage"
import { AppLayout } from "@/components/app-layout"
import { cn } from "@/lib/utils"

// Interest categories with Russian labels and unique colors
const INTEREST_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nature: { label: "Природа", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800" },
  history: { label: "История", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800" },
  local: { label: "Местная культура", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800" },
  photo: { label: "Фотография", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800" },
  tech: { label: "Технологии", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" },
  nightlife: { label: "Ночная жизнь", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800" },
  shopping: { label: "Шоппинг", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800" },
  spiritual: { label: "Духовное", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800" },
  food: { label: "Гастрономия", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800" },
  museums: { label: "Музеи", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800" },
}

// Profile background presets
const PROFILE_BACKGROUNDS = [
  { id: "avatar", label: "Аватар", gradient: "" },
  { id: "aurora", label: "Северное сияние", gradient: "from-emerald-500/30 via-cyan-500/20 to-purple-500/30" },
  { id: "sunset", label: "Закат", gradient: "from-orange-500/30 via-rose-500/20 to-pink-500/30" },
  { id: "ocean", label: "Океан", gradient: "from-blue-500/30 via-cyan-500/20 to-teal-500/30" },
  { id: "forest", label: "Лес", gradient: "from-green-500/30 via-emerald-500/20 to-lime-500/30" },
  { id: "galaxy", label: "Космос", gradient: "from-purple-600/30 via-indigo-500/20 to-blue-600/30" },
  { id: "mountains", label: "Горы", gradient: "from-slate-500/30 via-zinc-500/20 to-gray-500/30" },
  { id: "desert", label: "Пустыня", gradient: "from-amber-500/30 via-orange-500/20 to-yellow-500/30" },
  { id: "abstract", label: "Абстракция", gradient: "from-fuchsia-500/30 via-violet-500/20 to-indigo-500/30" },
]

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string

  const [profile, setProfile] = useState<any>(null)
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : `https://travellm.ru/profile/${username}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.full_name || username} — TraveLLM`,
          text: `Смотри профиль путешественника @${username} на TraveLLM`,
          url,
        })
      } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return
      setLoading(true)

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Fetch public profile by username
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username, bio, public_profile, preferences, created_at")
        .eq("username", username)
        .eq("public_profile", true)
        .maybeSingle()

      if (error || !profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(profileData)

      // Fetch their public trips
      const { data: tripsData } = await supabase
        .from("trips")
        .select("id, title, destination, description, tags, cover_image, total_cost, start_date, end_date, created_at, travelers")
        .eq("user_id", profileData.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20)

      setTrips(tripsData || [])
      setLoading(false)
    }

    fetchProfile()
  }, [username])

  const profileBackground = profile?.preferences?.profileBackground || "ocean"
  const avatarUrl = profile?.avatar_url
  const interests = profile?.preferences?.interestsDetailed || profile?.preferences?.interests || []
  const tripCount = trips.length
  const currentBg = PROFILE_BACKGROUNDS.find(b => b.id === profileBackground)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-center px-4">
        <Lock className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Профиль недоступен</h1>
        <p className="text-muted-foreground max-w-sm">
          Пользователь @{username} не существует или его профиль закрыт.
        </p>
        <Button variant="outline" onClick={() => router.push("/")} className="rounded-full px-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> На главную
        </Button>
      </div>
    )
  }

  return (
    <AppLayout className="bg-background">
      {/* Back button fixed top-left */}
      <div className="fixed top-4 left-4 z-50 lg:left-72">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-[calc(100vh-4rem)] pb-20">
        <div className="max-w-4xl mx-auto px-4 pt-8">

          {/* ===== PROFILE HERO ===== */}
          <div className="mb-8">
            {/* Banner */}
            <div className="relative rounded-[2rem] overflow-hidden h-32 mb-[-48px]">
              {profileBackground === "avatar" && avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-md opacity-60 scale-110"
                />
              ) : (
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br",
                  currentBg?.gradient || "from-blue-500/40 via-cyan-500/30 to-purple-500/40"
                )} />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/60" />
            </div>

            {/* Identity bar overlapping banner */}
            <div className="relative px-6 pb-4 flex items-end gap-4">
              {/* Avatar */}
              <div className="shrink-0">
                <div className="h-24 w-24 rounded-full ring-4 ring-background bg-muted overflow-hidden shadow-md md:shadow-2xl">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile.full_name || username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                      <User className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name + username */}
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-xl font-black truncate text-foreground leading-tight">
                  {profile.full_name || "Путешественник"}
                </h1>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">@{username}</p>
              </div>

              {/* Share button */}
              <button
                onClick={handleShare}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                  copied
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-white/10 border-white/20 text-muted-foreground hover:text-foreground hover:bg-white/20 backdrop-blur-sm"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Скопировано</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Поделиться</span>
                  </>
                )}
              </button>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="px-6 text-sm text-muted-foreground mt-1 mb-3 max-w-lg">{profile.bio}</p>
            )}

            {/* Stats strip */}
            <div className="px-6 mt-3">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  { value: tripCount, label: "маршрутов" },
                  {
                    value: new Date(profile.created_at).toLocaleDateString('ru-RU', { year: 'numeric' }),
                    label: "год регистрации"
                  },
                  ...(interests.length > 0 ? [{ value: interests.length, label: "интересов" }] : []),
                ].map((chip, i) => (
                  <div
                    key={i}
                    className="shrink-0 flex items-center gap-1.5 bg-white/10 dark:bg-white/5 border border-white/15 rounded-full px-3 py-1.5 text-sm font-medium"
                  >
                    <span className="font-bold text-foreground">{chip.value}</span>
                    <span className="text-muted-foreground">{chip.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interests */}
            {interests.length > 0 && (
              <div className="px-6 mt-3 flex flex-wrap gap-2">
                {interests.map((interest: string) => {
                  const key = interest.toLowerCase()
                  const config = INTEREST_CONFIG[key]
                  return (
                    <Badge
                      key={interest}
                      variant="outline"
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium border transition-all",
                        config ? `${config.bg} ${config.color}` : "border-border text-foreground"
                      )}
                    >
                      {config?.label || interest}
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>

          {/* ===== TRIPS SECTION ===== */}
          <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold">Публичные маршруты</h2>
              <Badge variant="secondary" className="rounded-full text-xs">
                {tripCount}
              </Badge>
            </div>

            {/* Trips grid */}
            {trips.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-border/50 bg-card/30">
                <Globe className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">У пользователя пока нет публичных маршрутов</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trips.map((trip) => (
                  <Link key={trip.id} href={`/trip/${trip.id}`} className="group block">
                    <div className="rounded-2xl border border-border/50 bg-card/30 hover:bg-card/50 overflow-hidden transition-all hover:shadow-lg hover:border-border/80 hover:-translate-y-0.5 duration-300">
                      {/* Trip image */}
                      <div className="relative aspect-video overflow-hidden">
                        <TripImage
                          src={trip.cover_image}
                          query={trip.destination}
                          alt={trip.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Tags overlay */}
                        {trip.tags && trip.tags.length > 0 && (
                          <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
                            {trip.tags.slice(0, 2).map((tag: string) => (
                              <Badge
                                key={tag}
                                className="bg-black/50 backdrop-blur-sm border border-white/20 text-[10px] uppercase tracking-tight rounded-full text-white/90 px-2 py-0.5"
                              >
                                {tag.replace("#", "")}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Destination bottom-left */}
                        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-white/90 text-xs">
                          <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="font-medium line-clamp-1">{trip.destination}</span>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="p-4 space-y-2">
                        <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {trip.title}
                        </h3>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 text-primary/50" />
                            <span>
                              {new Date(trip.created_at).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          {trip.travelers && trip.travelers.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{trip.travelers.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
