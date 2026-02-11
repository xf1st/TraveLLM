"use client"

import React from "react"
import { useParams, useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Bookmark, Share2, Clock, Calendar, ChevronRight } from "lucide-react"
import Link from "next/link"
import { getArticleById, articlesLibrary } from "@/lib/articles"
import { TripImage } from "@/components/TripImage"

export default function ArticlePage() {
  const params = useParams()
  const router = useRouter()
  const articleId = params.id as string

  const article = getArticleById(articleId)

  if (!article) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Статья не найдена</h1>
          <p className="text-muted-foreground mb-8">
            Возможно, она была удалена или ссылка неверна.
          </p>
          <Button onClick={() => router.push('/news')}>
            Вернуться к ленте
          </Button>
        </div>
      </AppLayout>
    )
  }

  // Get related articles (same category, excluding current)
  const relatedArticles = articlesLibrary
    .filter(a => a.category === article.category && a.id !== article.id)
    .slice(0, 3)

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.trim().split('\n')
    const elements: React.JSX.Element[] = []
    let listItems: string[] = []
    let inList = false
    let listType: 'ul' | 'ol' = 'ul'
    let listStartIdx = -1

    const flushList = () => {
      if (listItems.length > 0 && listStartIdx !== -1) {
        const ListTag = listType
        elements.push(
          <ListTag key={`list-${listStartIdx}`} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-6 mb-4 space-y-1`}>
            {listItems.map((item, i) => <li key={`item-${listStartIdx}-${i}`} className="leading-relaxed">{item}</li>)}
          </ListTag>
        )
        listItems = []
        listStartIdx = -1
      }
      inList = false
    }

    lines.forEach((line, idx) => {
      const trimmed = line.trim()

      if (!trimmed) {
        flushList()
        return
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        flushList()
        elements.push(<h1 key={`h1-${idx}`} className="text-3xl font-bold mt-8 mb-4">{trimmed.slice(2)}</h1>)
      } else if (trimmed.startsWith('## ')) {
        flushList()
        elements.push(<h2 key={`h2-${idx}`} className="text-2xl font-bold mt-8 mb-4">{trimmed.slice(3)}</h2>)
      } else if (trimmed.startsWith('### ')) {
        flushList()
        elements.push(<h3 key={`h3-${idx}`} className="text-xl font-semibold mt-6 mb-3">{trimmed.slice(4)}</h3>)
      }
      // Blockquote
      else if (trimmed.startsWith('> ')) {
        flushList()
        elements.push(
          <blockquote key={`quote-${idx}`} className="border-l-4 border-primary pl-4 italic my-6 text-muted-foreground">
            {trimmed.slice(2)}
          </blockquote>
        )
      }
      // Horizontal rule
      else if (trimmed === '---') {
        flushList()
        elements.push(<hr key={`hr-${idx}`} className="my-8 border-border" />)
      }
      // Unordered list
      else if (trimmed.startsWith('- ')) {
        if (!inList || listType !== 'ul') {
          flushList()
          inList = true
          listType = 'ul'
          listStartIdx = idx
        }
        listItems.push(trimmed.slice(2))
      }
      // Ordered list
      else if (/^\d+\.\s/.test(trimmed)) {
        if (!inList || listType !== 'ol') {
          flushList()
          inList = true
          listType = 'ol'
          listStartIdx = idx
        }
        listItems.push(trimmed.replace(/^\d+\.\s/, ''))
      }
      // Bold text handling in paragraphs
      else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        flushList()
        elements.push(
          <p key={`p-bold-${idx}`} className="mb-2">
            <strong className="font-semibold">{trimmed.slice(2, -2)}</strong>
          </p>
        )
      }
      // Regular paragraph
      else {
        flushList()
        // Replace **text** with bold
        const formattedText = trimmed.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`strong-${idx}-${i}`} className="font-semibold">{part.slice(2, -2)}</strong>
          }
          return part
        })
        elements.push(<p key={`p-${idx}`} className="mb-4 leading-relaxed">{formattedText}</p>)
      }
    })

    flushList()
    return elements
  }

  return (
    <AppLayout>
      <article className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-6 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Button>

        {/* Hero Image */}
        <div className="relative h-[300px] md:h-[400px] rounded-2xl overflow-hidden mb-8">
          <TripImage
            src={article.image}
            query={article.title}
            alt={article.title}
            className="w-full h-full object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Tags on image */}
          <div className="absolute bottom-6 left-6 flex flex-wrap gap-2">
            {article.tags.map(tag => (
              <Badge key={tag} className="bg-white/20 backdrop-blur text-white border-0">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
          {article.title}
        </h1>

        {/* Author & Meta */}
        <div className="flex flex-wrap items-center gap-6 mb-8 pb-8 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{article.author.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{article.author.name}</p>
              <p className="text-xs text-muted-foreground">Автор</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {article.readTime}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(article.publishedAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon" className="rounded-xl">
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Article Content */}
        <div className="prose-content mb-12">
          {renderContent(article.content)}
        </div>

        {/* Author Card */}
        <Card className="p-6 mb-12 bg-muted/30">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{article.author.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-bold text-lg">{article.author.name}</p>
              <p className="text-sm text-muted-foreground mb-3">
                Автор статей о путешествиях, исследователь новых направлений
              </p>
              <Button variant="outline" size="sm" className="rounded-xl">
                Все статьи автора
              </Button>
            </div>
          </div>
        </Card>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-6">Похожие статьи</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedArticles.map(related => (
                <Link key={related.id} href={`/news/${related.id}`}>
                  <Card className="overflow-hidden group hover:shadow-lg transition-all h-full">
                    <div className="relative h-32">
                      <TripImage
                        src={related.image}
                        query={related.title}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {related.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2">{related.readTime}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-background border-primary/20">
          <h3 className="text-xl font-bold mb-2">Вдохновились?</h3>
          <p className="text-muted-foreground mb-6">
            Создайте персональный маршрут на основе этой статьи
          </p>
          <Button asChild size="lg" className="rounded-xl gap-2">
            <Link href="/plan">
              Спланировать поездку
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </article>
    </AppLayout>
  )
}
