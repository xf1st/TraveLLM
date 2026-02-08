"use client"

import { useState, useEffect } from "react"
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface Review {
  author: string
  rating: number
  text: string
  date: string
  source: "google" | "yandex" | "ai"
  avatar?: string
}

interface PlaceReviewsData {
  placeName: string
  overallRating: number
  totalReviews: number
  reviews: Review[]
  pros: string[]
  cons: string[]
  source: "google" | "ai"
}

interface PlaceReviewsProps {
  placeName: string
  city?: string
  compact?: boolean // Компактный режим для карточек
  className?: string
}

export function PlaceReviews({ placeName, city, compact = false, className }: PlaceReviewsProps) {
  const [data, setData] = useState<PlaceReviewsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function fetchReviews() {
      try {
        setLoading(true)
        const response = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeName, city })
        })

        if (!response.ok) {
          throw new Error("Failed to fetch reviews")
        }

        const result = await response.json()
        setData(result)
      } catch (e) {
        console.error("Reviews fetch error:", e)
        setError("Не удалось загрузить отзывы")
      } finally {
        setLoading(false)
      }
    }

    if (placeName) {
      fetchReviews()
    }
  }, [placeName, city])

  // Компактный вид - только рейтинг и кол-во отзывов
  if (compact) {
    if (loading) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      )
    }

    if (!data) return null

    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-1.5 text-xs transition-colors hover:text-foreground",
          className
        )}
      >
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        <span className="font-medium">{data.overallRating.toFixed(1)}</span>
        <span className="text-muted-foreground">({data.totalReviews})</span>
        {data.source === "ai" && (
          <Sparkles className="h-3 w-3 text-purple-400" />
        )}
      </button>
    )
  }

  // Полный вид
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Загрузка отзывов...</span>
      </div>
    )
  }

  if (error || !data) {
    return null // Молча скрываем при ошибке
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header с рейтингом */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "h-4 w-4",
                  star <= Math.round(data.overallRating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted"
                )}
              />
            ))}
          </div>
          <span className="font-bold">{data.overallRating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">
            ({data.totalReviews} отзывов)
          </span>
        </div>
        {data.source === "ai" && (
          <Badge variant="outline" className="text-xs gap-1 text-purple-400 border-purple-400/30">
            <Sparkles className="h-3 w-3" />
            AI
          </Badge>
        )}
      </div>

      {/* Плюсы и минусы */}
      {(data.pros.length > 0 || data.cons.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {data.pros.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                <ThumbsUp className="h-3.5 w-3.5" />
                Плюсы
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {data.pros.slice(0, 3).map((pro, i) => (
                  <li key={i} className="truncate">+ {pro}</li>
                ))}
              </ul>
            </div>
          )}
          {data.cons.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                <ThumbsDown className="h-3.5 w-3.5" />
                Минусы
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {data.cons.slice(0, 2).map((con, i) => (
                  <li key={i} className="truncate">- {con}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Отзывы */}
      {data.reviews.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <MessageSquare className="h-3.5 w-3.5" />
            Отзывы
          </div>
          <div className="space-y-2">
            {data.reviews.slice(0, expanded ? undefined : 2).map((review, i) => (
              <div
                key={i}
                className="bg-muted/30 rounded-lg p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-primary/10">
                        {review.author.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{review.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>{review.rating}</span>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {review.text}
                </p>
                <div className="text-[10px] text-muted-foreground/60">
                  {review.date}
                </div>
              </div>
            ))}
          </div>
          {data.reviews.length > 2 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline"
            >
              {expanded ? "Скрыть" : `Показать все ${data.reviews.length} отзывов`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Компактный виджет рейтинга для использования в карточках
 */
export function PlaceRating({
  placeName,
  city,
  className
}: {
  placeName: string
  city?: string
  className?: string
}) {
  return <PlaceReviews placeName={placeName} city={city} compact className={className} />
}
