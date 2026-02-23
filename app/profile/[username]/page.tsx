"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import { MapPin, Globe, Lock, ArrowLeft, Calendar, Users, User, Heart, Clock, Camera, Check, MapIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TripImage } from "@/components/TripImage"
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"
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
  { id: "avatar", label: "Аватар", gradient: "" }, // Special: uses blurred avatar
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background trip-bg">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-center px-4 trip-bg">
        <Lock className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Профиль недоступен</h1>
        <p className="text-muted-foreground max-w-sm">
          Пользователь @{username} не существует или его профиль закрыт.
        </p>
        <Button variant="outline" onClick={() => router.push("/")} className="rounded-full px-6 backdrop-blur-md">
          <ArrowLeft className="w-4 h-4 mr-2" /> На главную
        </Button>
      </div>
    )
  }

  return (
    <AppLayout className="trip-bg">
      <div className="relative min-h-[calc(100vh-4rem)] pb-20">
        
        {/* Dynamic Profile Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {profileBackground === "avatar" && avatarUrl ? (
            <>
              <img
                src={avatarUrl}
                alt=""
                className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[100vw] h-[80vh] object-cover blur-[80px] opacity-30 dark:opacity-40 scale-150"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
            </>
          ) : (
            <div className={`absolute top-[-10%] left-1/2 -translate-x-1/2 w-[100vw] h-[70vh] bg-gradient-to-br ${PROFILE_BACKGROUNDS.find(b => b.id === profileBackground)?.gradient || "from-blue-500/20 via-cyan-500/15 to-purple-500/20"
              } blur-[80px] rounded-full`} />
          )}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-12">
          
          {/* Back button */}
          <div className="absolute top-0 left-6">
             <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Centered Header */}
          <div className="flex flex-col items-center text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="relative mb-6">
              <div className="h-32 w-32 rounded-full p-1 bg-gradient-to-br from-white/20 to-white/5 dark:from-white/20 dark:to-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden">
                <div className="h-full w-full rounded-full overflow-hidden bg-muted/50 dark:bg-black/40 relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile.full_name || username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                      <User className="h-12 w-12 text-muted-foreground/50 dark:text-white/50" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 dark:from-white dark:to-white/60 mb-2">
              {profile.full_name || "Путешественник"}
            </h1>
            <p className="text-lg text-muted-foreground mb-4 font-light flex items-center gap-1 opacity-80">
              <Globe className="w-4 h-4" /> @{username}
            </p>

            {profile.bio && (
              <p className="mt-2 text-base leading-relaxed text-muted-foreground max-w-lg italic">
                "{profile.bio}"
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm font-medium">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-foreground">{tripCount}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-widest">Поездки</span>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-foreground">
                   {new Date(profile.created_at).toLocaleDateString('ru-RU', { year: 'numeric' })}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-widest">С нами с</span>
              </div>
            </div>

            {/* Interests */}
            {interests.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-8">
                {interests.map((interest: string) => {
                  const config = INTEREST_CONFIG[interest] || { label: interest, color: "text-muted-foreground", bg: "bg-muted" }
                  return (
                    <Badge 
                      key={interest} 
                      className={cn(
                        "rounded-full px-4 py-1 text-xs font-medium border transition-all hover:scale-105",
                        config.bg,
                        config.color
                      )}
                    >
                      {config.label}
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>

          {/* Content Grid */}
          <div className="grid gap-8">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Публичные поездки</h2>
             </div>

             {trips.length === 0 ? (
                <Card className="p-16 flex flex-col items-center justify-center text-center trip-glass border-dashed border-white/20">
                  <Globe className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
                  <p className="text-muted-foreground">У пользователя пока нет публичных маршрутов</p>
                </Card>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  {trips.map((trip) => (
                    <Link key={trip.id} href={`/trip/${trip.id}`} className="group">
                      <Card className="h-full overflow-hidden trip-glass border-white/10 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 group-hover:-translate-y-1">
                        <div className="relative aspect-[16/10] overflow-hidden">
                           <TripImage
                            src={trip.cover_image}
                            query={trip.destination}
                            alt={trip.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                          
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                             {trip.tags?.slice(0, 2).map((tag: string) => (
                                <Badge key={tag} className="bg-black/40 backdrop-blur-md border border-white/20 text-[10px] uppercase tracking-tighter rounded-full text-white/90">
                                  {tag.replace("#", "")}
                                </Badge>
                             ))}
                          </div>

                          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                            <div className="flex items-center gap-1.5 text-white/90 text-xs">
                               <MapPin className="w-3 h-3 text-red-400" />
                               <span className="font-medium line-clamp-1">{trip.destination}</span>
                            </div>
                            {trip.total_cost && (
                              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-2 py-1 text-white text-[10px] font-bold">
                                {trip.total_cost}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-4 space-y-2">
                          <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {trip.title}
                          </h3>
                          
                          <div className="flex items-center justify-between pt-2">
                             <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                <Calendar className="w-3 h-3 text-primary/60" />
                                <span>
                                  {new Date(trip.created_at).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}
                                </span>
                             </div>
                             <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                                <Users className="w-3 h-3" />
                                <span>{trip.travelers?.length || 1}</span>
                             </div>
                          </div>
                        </div>
                      </Card>
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
