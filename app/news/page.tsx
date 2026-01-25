"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ArrowRight, Bookmark, Share2, RefreshCw, TrendingUp, MapPin, Calendar, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { supabase } from "@/lib/supabase"
import { articlesLibrary, getPersonalizedArticles, Article } from "@/lib/articles"

// Trending destinations for sidebar
const trendingDestinations = [
  { name: "Грузия", growth: "+45%", flag: "🇬🇪" },
  { name: "Турция", growth: "+32%", flag: "🇹🇷" },
  { name: "ОАЭ", growth: "+28%", flag: "🇦🇪" },
  { name: "Таиланд", growth: "+25%", flag: "🇹🇭" },
  { name: "Армения", growth: "+22%", flag: "🇦🇲" },
]

export default function NewsFeedPage() {
  const [feed, setFeed] = useState<(Article & { match: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [userInterests, setUserInterests] = useState<string[]>([])

  useEffect(() => {
    generatePersonalizedFeed()
  }, [])

  const generatePersonalizedFeed = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    let interests: string[] = []

    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profile?.preferences?.interestsDetailed) {
        interests = profile.preferences.interestsDetailed
      }
    } else {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}")
      interests = prefs.interests || []
    }

    setUserInterests(interests)

    // Get personalized articles from library
    const articles = getPersonalizedArticles(interests, 8)

    // Add match percentage
    const withMatch = articles.map(article => ({
      ...article,
      match: Math.floor(Math.random() * 15) + 85 // 85-100%
    }))

    setFeed(withMatch)
    setLoading(false)
  }

  return (
    <AppLayout title="Лента вдохновения" description="Новости и идеи, подобранные ИИ именно для вас">
      {/* Premium Background */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-900 to-black pointer-events-none" />

      <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main Feed */}
        <div className="space-y-8">
          {/* Personalization Info */}
          {userInterests.length > 0 && (
            <Card className="p-4 bg-zinc-900/50 border-white/5 backdrop-blur-md rounded-2xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Подборка на основе ваших интересов:</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {userInterests.slice(0, 5).map(interest => (
                        <Badge key={interest} variant="secondary" className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-300 border-0">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={generatePersonalizedFeed} className="gap-2 text-muted-foreground hover:text-white rounded-full">
                  <RefreshCw className="h-4 w-4" />
                  Обновить
                </Button>
              </div>
            </Card>
          )}

          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8">
              {feed.map((post, idx) => (
                <Link key={post.id} href={`/news/${post.id}`}>
                  <Card
                    className="group relative overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-primary/10 rounded-[2rem] cursor-pointer"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="grid md:grid-cols-2 gap-0">
                      {/* Image Section */}
                      <div className="relative h-64 md:h-full overflow-hidden">
                        <Image
                          src={post.image}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {/* Seamless Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-zinc-900 via-zinc-900/40 to-transparent" />

                        {/* Match Badge */}
                        <div className="absolute top-4 left-4">
                          <div className="flex items-center gap-1.5 rounded-full bg-[#22c55e] text-white px-2.5 py-1 shadow-lg border-2 border-green-400/20">
                            <Sparkles className="h-3.5 w-3.5 fill-white text-[#22c55e]" />
                            <div className="flex flex-col leading-none">
                              <span className="text-[9px] uppercase font-bold opacity-90">Совпадение</span>
                              <span className="text-xs font-black text-white">{post.match}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-8 flex flex-col justify-between relative z-10">
                        <div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.map((tag: string) => {
                              // Simple hash to pick color
                              const colors = [
                                "bg-sky-200 text-sky-900", "bg-pink-200 text-pink-900",
                                "bg-emerald-200 text-emerald-900", "bg-amber-200 text-amber-900"
                              ];
                              const color = colors[tag.length % colors.length];

                              return (
                                <span key={tag} className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${color}`}>
                                  {tag}
                                </span>
                              )
                            })}
                          </div>
                          <h2 className="text-2xl font-bold mb-3 leading-tight text-white group-hover:text-primary transition-colors">
                            {post.title}
                          </h2>
                          <p className="text-zinc-400 text-sm mb-6 line-clamp-3 leading-relaxed font-medium">
                            {post.excerpt}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                          <span className="text-xs font-medium text-zinc-500 flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            {post.readTime}
                          </span>
                          <Button size="sm" className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-5 h-9 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all group-hover:scale-105">
                            Читать <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}

              {/* End Card */}
              <Card className="p-10 text-center bg-zinc-900/50 border-white/5 border-dashed rounded-[2rem]">
                <div className="h-12 w-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-5 w-5 text-zinc-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">Это всё на сегодня</h3>
                <p className="text-zinc-400 max-w-sm mx-auto text-sm mb-6">
                  Хотите больше персонализированного контента? Обновите интересы в профиле.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button asChild variant="outline" className="rounded-full border-white/10 hover:bg-white/5 text-zinc-300">
                    <Link href="/profile">Настроить интересы</Link>
                  </Button>
                  <Button asChild className="rounded-full bg-white text-black hover:bg-white/90 font-bold">
                    <Link href="/plan">Создать маршрут</Link>
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trending Destinations */}
          <Card className="p-6 bg-zinc-900/80 border-white/5 backdrop-blur-xl rounded-[2rem] shadow-2xl">
            <h3 className="font-bold mb-5 flex items-center gap-2 text-white">
              <div className="bg-amber-500/10 p-1.5 rounded-lg">
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              Популярные направления
            </h3>
            <div className="space-y-2">
              {trendingDestinations.map((dest) => (
                <div
                  key={dest.name}
                  className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl group-hover:scale-110 transition-transform">{dest.flag}</span>
                    <span className="font-bold text-sm text-zinc-300 group-hover:text-white">{dest.name}</span>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px] font-bold px-2">
                    {dest.growth}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-6 rounded-full border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white" asChild>
              <Link href="/results">Смотреть все маршруты</Link>
            </Button>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-zinc-900 border-primary/20 backdrop-blur-xl rounded-[2rem]">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-white">
              <div className="bg-primary/20 p-1.5 rounded-lg">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              Быстрые действия
            </h3>
            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-12 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-200 font-medium" asChild>
                <Link href="/plan">
                  <Calendar className="h-4 w-4 text-sky-400" />
                  Спланировать поездку
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-12 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-200 font-medium" asChild>
                <Link href="/profile">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Обновить интересы
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
