"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ArrowRight, Bookmark, Share2, RefreshCw, TrendingUp, MapPin, Calendar } from "lucide-react"
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
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main Feed */}
        <div className="space-y-6">
          {/* Personalization Info */}
          {userInterests.length > 0 && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Подборка на основе ваших интересов:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {userInterests.slice(0, 5).map(interest => (
                        <Badge key={interest} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={generatePersonalizedFeed} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Обновить
                </Button>
              </div>
            </Card>
          )}

          {loading ? (
            <div className="flex justify-center p-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {feed.map((post, idx) => (
                <Link key={post.id} href={`/news/${post.id}`}>
                  <Card
                    className="overflow-hidden group hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 cursor-pointer"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="grid md:grid-cols-2">
                      <div className="relative h-56 md:h-auto overflow-hidden">
                        <Image
                          src={post.image}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-105 duration-500"
                        />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <Badge className="bg-primary hover:bg-primary shadow-lg border-2 border-background">
                            {post.match}% для вас
                          </Badge>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {post.tags.map((tag: string) => (
                              <span key={tag} className="text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <h2 className="text-xl font-bold mb-2 leading-tight group-hover:text-primary transition-colors">
                            {post.title}
                          </h2>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                            {post.excerpt}
                          </p>
                        </div>
                        <div className="flex items-center justify-between border-t border-border pt-4">
                          <span className="text-xs text-muted-foreground">{post.readTime}</span>
                          <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                            Читать
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}

              {/* End Card */}
              <Card className="p-10 text-center bg-muted/30 border-dashed">
                <Sparkles className="h-10 w-10 text-primary/40 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Это всё на сегодня</h3>
                <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                  Хотите больше персонализированного контента? Обновите интересы в профиле.
                </p>
                <div className="flex gap-3 justify-center mt-6">
                  <Button asChild variant="outline">
                    <Link href="/profile">Настроить интересы</Link>
                  </Button>
                  <Button asChild>
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
          <Card className="p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Популярные направления
            </h3>
            <div className="space-y-3">
              {trendingDestinations.map((dest) => (
                <div
                  key={dest.name}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{dest.flag}</span>
                    <span className="font-medium text-sm">{dest.name}</span>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-xs">
                    {dest.growth}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="link" className="w-full mt-4 text-primary" asChild>
              <Link href="/results">Смотреть все маршруты →</Link>
            </Button>
          </Card>

          {/* Quick Actions */}
          <Card className="p-5 bg-gradient-to-br from-primary/10 to-background border-primary/20">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Быстрые действия
            </h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl" asChild>
                <Link href="/plan">
                  <Calendar className="h-4 w-4" />
                  Спланировать поездку
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl" asChild>
                <Link href="/profile">
                  <Sparkles className="h-4 w-4" />
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
