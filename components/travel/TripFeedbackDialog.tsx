"use client"

import { useEffect, useMemo, useState } from "react"
import { Star } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type TripFeedbackRecord = {
  trip_id: string
  rating: number
  comment?: string | null
  liked?: string | null
  disliked?: string | null
  source?: string | null
  updated_at?: string | null
}

interface TripFeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  tripTitle?: string
  source?: "profile" | "completed_page"
  initialFeedback?: TripFeedbackRecord | null
  onSubmitted?: (feedback: TripFeedbackRecord) => void
}

export function TripFeedbackDialog({
  open,
  onOpenChange,
  tripId,
  tripTitle,
  source = "profile",
  initialFeedback,
  onSubmitted,
}: TripFeedbackDialogProps) {
  const [rating, setRating] = useState<number>(0)
  const [liked, setLiked] = useState("")
  const [disliked, setDisliked] = useState("")
  const [comment, setComment] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setRating(Number(initialFeedback?.rating) || 0)
    setLiked(String(initialFeedback?.liked || ""))
    setDisliked(String(initialFeedback?.disliked || ""))
    setComment(String(initialFeedback?.comment || ""))
  }, [open, initialFeedback?.rating, initialFeedback?.liked, initialFeedback?.disliked, initialFeedback?.comment])

  const updatedLabel = useMemo(() => {
    if (!initialFeedback?.updated_at) return null
    const parsed = new Date(initialFeedback.updated_at)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
  }, [initialFeedback?.updated_at])

  const handleSubmit = async () => {
    if (!tripId) {
      toast.error("Не найден идентификатор поездки")
      return
    }
    if (!rating) {
      toast.error("Поставьте оценку от 1 до 5")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/trip-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          rating,
          liked,
          disliked,
          comment,
          source,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(String(payload?.error || "Не удалось сохранить отзыв"))
      }

      const saved = payload?.feedback as TripFeedbackRecord
      if (saved) onSubmitted?.(saved)
      toast.success("Спасибо за отзыв")
      onOpenChange(false)
    } catch (error: any) {
      toast.error(String(error?.message || "Не удалось сохранить отзыв"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl border-white/10 bg-zinc-950 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Оцените поездку</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {tripTitle ? `Маршрут: ${tripTitle}` : "Нам важно ваше мнение о маршруте и карте."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-zinc-200 mb-2">Оценка</div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= rating
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={cn("h-10 w-10 rounded-full border transition-colors", active ? "border-amber-400/70 bg-amber-500/15" : "border-white/15 bg-white/5 hover:bg-white/10")}
                    aria-label={`Оценка ${star}`}
                  >
                    <Star className={cn("mx-auto h-5 w-5", active ? "fill-amber-400 text-amber-400" : "text-zinc-400")} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-zinc-200">Что понравилось</div>
            <Textarea
              value={liked}
              onChange={(event) => setLiked(event.target.value)}
              placeholder="Например: удобный маршрут, хорошие рекомендации..."
              className="min-h-[74px] border-white/15 bg-white/5 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-zinc-200">Что не понравилось</div>
            <Textarea
              value={disliked}
              onChange={(event) => setDisliked(event.target.value)}
              placeholder="Например: точки на карте, скорость, описание..."
              className="min-h-[74px] border-white/15 bg-white/5 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-zinc-200">Комментарий</div>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Любые детали, которые помогут нам улучшить сервис."
              className="min-h-[92px] border-white/15 bg-white/5 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{updatedLabel ? `Последнее обновление: ${updatedLabel}` : "Отзыв можно изменить позже"}</span>
            <span>{rating ? `${rating}/5` : "Без оценки"}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-300 hover:text-white">
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !rating} className="bg-emerald-500 text-black hover:bg-emerald-400">
            {isSaving ? "Сохраняем..." : "Отправить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
