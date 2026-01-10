"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ArrowRight, Bookmark, Share2, Eye } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { supabase } from "@/lib/supabase"

export default function NewsFeedPage() {
  const [feed, setFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const generateFeed = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      let preferences = {}

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (profile) preferences = profile.preferences || {}
      } else {
        preferences = JSON.parse(localStorage.getItem("userPreferences") || "{}")
      }

      const mockFeed = [
        {
          id: 1,
          title: "Топ-5 скрытых мечетей Стамбула для ценителей тишины",
          excerpt: "Если вам важен халяль и спокойствие, эти места в районе Фатих покорят ваше сердце...",
          tags: ["#халяль", "#тишина", "#Стамбул"],
          image: "https://images.unsplash.com/photo-1541432901042-2dad8bd9c791?auto=format&fit=crop&q=80&w=800",
          match: 98,
          relevantInterest: "spiritual"
        },
        {
          id: 2,
          title: "Почему Алтай — лучшее место для фотографа в этом году",
          excerpt: "Золотые лиственницы, зеркальные озера и советы по выбору объектива для горных пейзажей...",
          tags: ["#фото", "#горы", "#природа"],
          image: "https://images.unsplash.com/photo-1544457070-4cd773b0d778?auto=format&fit=crop&q=80&w=800",
          match: 95,
          relevantInterest: "photo"
        },
        {
          id: 3,
          title: "Где найти самый аутентичный плов в Ташкенте",
          excerpt: "Мы собрали 3 места, куда ходят только местные. Никаких туристических наценок.",
          tags: ["#еда", "#аутентично", "#Узбекистан"],
          image: "https://images.unsplash.com/photo-1619623602162-819754b51841?auto=format&fit=crop&q=80&w=800",
          match: 92,
          relevantInterest: "food"
        }
      ]

      setFeed(mockFeed)
      setLoading(false)
    }

    generateFeed()
  }, [])

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header />

      <main className="container max-w-4xl px-4 py-8">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Ваш персональный дайджест
          </div>
          <h1 className="text-4xl font-bold">Лента вдохновения</h1>
          <p className="text-muted-foreground mt-2">Новости и идеи, подобранные ИИ именно для вас</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-8">
            {feed.map((post) => (
              <Card key={post.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="grid md:grid-cols-2">
                  <div className="relative h-64 md:h-auto overflow-hidden">
                    <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover transition-transform group-hover:scale-105 duration-500" />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary hover:bg-primary shadow-lg border-2 border-background">
                        {post.match}% совпадение
                      </Badge>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map((tag: string) => (
                          <span key={tag} className="text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h2 className="text-2xl font-bold mb-3 leading-tight group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-muted-foreground mb-6 line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-6">
                      <div className="flex gap-4">
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <Bookmark className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="outline" className="gap-2 group/btn">
                        Читать полностью
                        <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <Card className="p-12 text-center bg-muted/30 border-dashed">
              <Sparkles className="h-10 w-10 text-primary/40 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Это всё на сегодня</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Хотите больше? Создайте новый маршрут, чтобы ИИ узнал о ваших новых интересах.
              </p>
              <Button asChild className="mt-6">
                <Link href="/plan">Спланировать поездку</Link>
              </Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
