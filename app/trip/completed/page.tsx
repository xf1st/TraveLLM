"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TripFeedbackDialog, type TripFeedbackRecord } from "@/components/travel/TripFeedbackDialog"

export default function TripCompletedPage() {
  const searchParams = useSearchParams()
  const tripId = String(searchParams.get("tripId") || "").trim()
  const [feedback, setFeedback] = useState<TripFeedbackRecord | null>(null)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  useEffect(() => {
    if (!tripId) return
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(`/api/trip-feedback?tripId=${encodeURIComponent(tripId)}`)
        if (!response.ok) return
        const payload = await response.json()
        if (!cancelled) {
          setFeedback(payload?.feedback || null)
          if (!payload?.feedback) {
            setTimeout(() => {
              if (!cancelled) setIsFeedbackOpen(true)
            }, 500)
          }
        }
      } catch {
        // no-op
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [tripId])

  const ratingText = useMemo(() => {
    const value = Number(feedback?.rating || 0)
    if (!value) return null
    return `${value}/5`
  }, [feedback?.rating])

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-xl w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>

        <h1 className="text-3xl font-bold mb-3">Спасибо, что путешествовали с нами</h1>
        <p className="text-white/70 mb-5">Ваше путешествие отмечено как завершённое. Надеемся, TraveLM сделал поездку проще и приятнее.</p>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-zinc-300">Помогите нам улучшить сервис</div>
          <div className="text-xs text-zinc-500 mt-1 mb-3">Оцените поездку и оставьте короткий комментарий.</div>
          <Button onClick={() => setIsFeedbackOpen(true)} className="bg-emerald-500 text-black hover:bg-emerald-400">
            <Star className="h-4 w-4 mr-2" />
            {ratingText ? `Изменить отзыв (${ratingText})` : "Оценить поездку"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold">
            <Link href="/results">К маршрутам</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Link href="/">Главная</Link>
          </Button>
        </div>
      </div>

      {tripId && (
        <TripFeedbackDialog
          open={isFeedbackOpen}
          onOpenChange={setIsFeedbackOpen}
          tripId={tripId}
          tripTitle="Завершённая поездка"
          source="completed_page"
          initialFeedback={feedback}
          onSubmitted={(saved) => setFeedback(saved)}
        />
      )}
    </main>
  )
}
