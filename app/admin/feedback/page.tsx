"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Star } from "lucide-react"

interface TripFeedback {
  id: string
  trip_id: string
  user_id: string
  rating: number
  comment: string | null
  liked: string | null
  disliked: string | null
  source: string | null
  updated_at: string
  trip_title?: string | null
  user_name?: string | null
  user_email?: string | null
}

// Types based on the feedback table
interface Feedback {
  id: string
  created_at: string
  rating_overall: number | null
  rating_places: string | null
  budget_accuracy: string | null
  ui_rating: number | null
  bugs_encountered: string | null
  missing_features: string | null
  visa_info_rating: number | null
  would_use_again: string | null
  generation_speed: string | null
  map_convenience: number | null
  subscription_price: string | null
  usage_frequency: string | null
  additional_ideas: string | null
  profiles?: {
    email?: string
    full_name?: string
  } | null
}

function getAverage(arr: (number | null)[]) {
  const valid = arr.filter(n => typeof n === 'number') as number[];
  if (valid.length === 0) return "0";
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
}

function getFrequency(arr: (string | null)[]) {
  const valid = arr.filter(n => typeof n === 'string' && n.trim() !== "") as string[];
  const freq: Record<string, number> = {};
  valid.forEach(v => {
    freq[v] = (freq[v] || 0) + 1;
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]);
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tripFeedbacks, setTripFeedbacks] = useState<TripFeedback[]>([])
  const [isLoadingTrip, setIsLoadingTrip] = useState(true)

  useEffect(() => {
    async function loadTripFeedbacks() {
      try {
        const res = await fetch("/api/admin/trip-feedback")
        if (!res.ok) throw new Error(await res.text())
        const payload = await res.json()
        setTripFeedbacks(payload.feedback || [])
      } catch (e: any) {
        console.error("trip feedbacks load error", e)
      } finally {
        setIsLoadingTrip(false)
      }
    }
    loadTripFeedbacks()
  }, [])

  useEffect(() => {
    async function loadFeedbacks() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Supabase credentials not found")
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: feedbacksData, error: feedbacksError } = await supabase
          .from("beta_feedback")
          .select("*")
          .order("created_at", { ascending: false })

        if (feedbacksError) throw feedbacksError

        // Fetch profiles separately to avoid schema relationship errors
        const userIds = feedbacksData
          .map(f => f.user_id)
          .filter(id => id != null)

        let profilesData: any[] = []
        if (userIds.length > 0) {
          const { data: pData, error: pError } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .in("id", userIds)
          
          if (!pError && pData) {
            profilesData = pData
          }
        }

        // Merge data
        const mergedData = feedbacksData.map(fb => {
          const profile = profilesData.find(p => p.id === fb.user_id)
          return {
            ...fb,
            profiles: profile || null
          }
        })

        setFeedbacks(mergedData as Feedback[])
      } catch (err: any) {
        console.error("Error loading feedbacks:", err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadFeedbacks()
  }, [])

  const avgTripRating = tripFeedbacks.length
    ? (tripFeedbacks.reduce((s, f) => s + f.rating, 0) / tripFeedbacks.length).toFixed(2)
    : "—"

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
        <h3 className="font-bold text-lg mb-2">Ошибка загрузки отзывов</h3>
        <p>{error}</p>
        <p className="mt-4 text-sm opacity-80">
          Убедитесь, что таблица <code>beta_feedback</code> создана в Supabase с нужными колонками, включая новые: <code>map_convenience</code> (int), <code>subscription_price</code> (text) и <code>usage_frequency</code> (text).
        </p>
      </div>
    )
  }

  // Calculate Statistics
  const stats = {
    avgOverall: getAverage(feedbacks.map(f => f.rating_overall)),
    avgUI: getAverage(feedbacks.map(f => f.ui_rating)),
    avgMap: getAverage(feedbacks.map(f => f.map_convenience)),
    avgVisa: getAverage(feedbacks.map(f => f.visa_info_rating)),
    
    placesFreq: getFrequency(feedbacks.map(f => f.rating_places)),
    budgetFreq: getFrequency(feedbacks.map(f => f.budget_accuracy)),
    useFreq: getFrequency(feedbacks.map(f => f.would_use_again)),
    speedFreq: getFrequency(feedbacks.map(f => f.generation_speed)),
    priceFreq: getFrequency(feedbacks.map(f => f.subscription_price)),
    usageRateFreq: getFrequency(feedbacks.map(f => f.usage_frequency)),
  }

  const renderCategoricalStat = (title: string, freqArray: [string, number][]) => {
    if (freqArray.length === 0) return null;
    const mostPopular = freqArray[0];
    const leastPopular = freqArray[freqArray.length - 1];

    return (
      <Card className="bg-zinc-900 border-white/10 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-blue-400">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-sm text-gray-400">Самый популярный ответ:</span>
            <p className="font-medium text-emerald-400 mt-1">
              {mostPopular[0]} <span className="text-gray-500 text-sm">({mostPopular[1]} голосов)</span>
            </p>
          </div>
          {freqArray.length > 1 && (
            <div>
              <span className="text-sm text-gray-400">Самый редкий ответ:</span>
              <p className="font-medium text-amber-400 mt-1">
                {leastPopular[0]} <span className="text-gray-500 text-sm">({leastPopular[1]} голосов)</span>
              </p>
            </div>
          )}
          
          <div className="pt-2 border-t border-white/10">
            <span className="text-sm text-gray-400 block mb-2">Все варианты:</span>
            <ul className="text-sm space-y-1">
              {freqArray.map(([val, count]) => (
                <li key={val} className="flex justify-between">
                  <span className="text-gray-300 truncate pr-2">{val}</span>
                  <span className="text-gray-500">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Helper to render answers for a specific question
  const renderAnswersByQuestion = (title: string, dataKey: keyof Feedback) => {
    const validAnswers = feedbacks.filter(f => {
      const val = f[dataKey];
      return typeof val === 'string' && val.trim() !== "";
    });

    if (validAnswers.length === 0) return null;

    return (
      <div className="space-y-3 mb-8">
        <h3 className="text-xl font-semibold text-emerald-400">{title}</h3>
        <div className="grid gap-3">
          {validAnswers.map(fb => (
            <div key={fb.id} className="bg-zinc-900/80 p-4 rounded-lg border border-white/10">
              <div className="text-sm text-gray-400 mb-2 font-medium">
                {fb.profiles?.full_name || fb.profiles?.email || "Анонимный"} 
                <span className="ml-2 text-gray-600 font-normal">{new Date(fb.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="text-gray-200 whitespace-pre-wrap">
                {String(fb[dataKey] || "")}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const hasTextAnswers = feedbacks.some(f => 
    (typeof f.bugs_encountered === 'string' && f.bugs_encountered.trim() !== "") ||
    (typeof f.missing_features === 'string' && f.missing_features.trim() !== "") ||
    (typeof f.additional_ideas === 'string' && f.additional_ideas.trim() !== "")
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
        Аналитика Отзывов ({feedbacks.length})
      </h1>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="bg-zinc-900 border border-white/10 mb-6">
          <TabsTrigger value="stats">Статистика</TabsTrigger>
          <TabsTrigger value="by_question">Ответы по вопросам</TabsTrigger>
          <TabsTrigger value="feedbacks">Карточки пользователей</TabsTrigger>
          <TabsTrigger value="trip_ratings">Оценки маршрутов</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6">
          {feedbacks.length === 0 ? (
            <div className="p-8 text-center text-gray-400 bg-zinc-900/50 rounded-xl border border-white/5">
              <p>Пока нет ни одного отзыва от бета-тестеров.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-zinc-900 border-white/10">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-gray-400">Общая оценка (из 10)</CardDescription>
                    <CardTitle className="text-4xl text-blue-400">{stats.avgOverall}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-gray-400">Удобство интерфейса (из 10)</CardDescription>
                    <CardTitle className="text-4xl text-emerald-400">{stats.avgUI}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-gray-400">3D-Карта (из 10)</CardDescription>
                    <CardTitle className="text-4xl text-purple-400">{stats.avgMap}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-gray-400">Оценка виз. инфо (из 5)</CardDescription>
                    <CardTitle className="text-4xl text-amber-400">{stats.avgVisa}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <h2 className="text-2xl font-semibold mt-8 mb-4 border-b border-white/10 pb-2 text-white">Популярные ответы</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderCategoricalStat("Релевантность мест", stats.placesFreq)}
                {renderCategoricalStat("Точность бюджета", stats.budgetFreq)}
                {renderCategoricalStat("Готовность использовать снова", stats.useFreq)}
                {renderCategoricalStat("Оценка скорости", stats.speedFreq)}
                {renderCategoricalStat("Справедливая цена", stats.priceFreq)}
                {renderCategoricalStat("Частота использования", stats.usageRateFreq)}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="by_question" className="bg-black/20 p-6 rounded-xl border border-white/10">
          {!hasTextAnswers ? (
            <div className="text-center py-8 text-gray-400">
              Пользователи пока не оставляли развернутых текстовых комментариев.
            </div>
          ) : (
            <>
              {renderAnswersByQuestion("Баги и ошибки (Q5)", "bugs_encountered")}
              {renderAnswersByQuestion("Чего не хватает (Q6)", "missing_features")}
              {renderAnswersByQuestion("Идеи и предложения (Q13)", "additional_ideas")}
            </>
          )}
        </TabsContent>

        <TabsContent value="feedbacks">
          <div className="grid gap-6">
            {feedbacks.map((fb) => (
              <Card key={fb.id} className="bg-zinc-900 border-white/10 text-white overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/10 pb-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-xl text-emerald-400">
                        {fb.profiles?.full_name || fb.profiles?.email || "Анонимный пользователь"}
                      </CardTitle>
                      {fb.profiles?.email && fb.profiles.full_name && (
                        <p className="text-sm text-gray-400">{fb.profiles.email}</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 whitespace-nowrap">
                      {new Date(fb.created_at).toLocaleString("ru-RU")}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableCell className="w-1/3 font-medium text-gray-300">Общая оценка (1-10)</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold">
                            {fb.rating_overall || "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-gray-300">UX/UI Оценка (1-10)</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                            {fb.ui_rating || "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-gray-300">Оценка 3D-карты (1-10)</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-bold">
                            {fb.map_convenience || "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-gray-300">Релевантность мест</TableCell>
                        <TableCell>{fb.rating_places || "-"}</TableCell>
                      </TableRow>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-gray-300">Точность бюджета</TableCell>
                        <TableCell>{fb.budget_accuracy || "-"}</TableCell>
                      </TableRow>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-gray-300">Оценка информации о визах (1-5)</TableCell>
                        <TableCell>{fb.visa_info_rating || "-"}</TableCell>
                      </TableRow>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-gray-300">Готовность использовать снова</TableCell>
                        <TableCell>{fb.would_use_again || "-"}</TableCell>
                      </TableRow>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-gray-300">Оценка скорости генерации</TableCell>
                        <TableCell>{fb.generation_speed || "-"}</TableCell>
                      </TableRow>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-gray-300">Цена подписки</TableCell>
                        <TableCell className="text-emerald-400 font-medium">{fb.subscription_price || "-"}</TableCell>
                      </TableRow>
                      <TableRow className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-gray-300">Частота использования</TableCell>
                        <TableCell className="text-blue-400">{fb.usage_frequency || "-"}</TableCell>
                      </TableRow>
                      
                      {fb.bugs_encountered && (
                        <TableRow className="border-white/5 hover:bg-white/5">
                          <TableCell className="font-medium text-red-400 align-top pt-4">Баги и ошибки</TableCell>
                          <TableCell className="text-gray-300 whitespace-pre-wrap pt-4">
                            {fb.bugs_encountered}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {fb.missing_features && (
                        <TableRow className="border-white/5 hover:bg-white/5">
                          <TableCell className="font-medium text-amber-400 align-top pt-4">Чего не хватает</TableCell>
                          <TableCell className="text-gray-300 whitespace-pre-wrap pt-4">
                            {fb.missing_features}
                          </TableCell>
                        </TableRow>
                      )}

                      {fb.additional_ideas && (
                        <TableRow className="border-white/5 hover:bg-white/5">
                          <TableCell className="font-medium text-blue-400 align-top pt-4">Идеи и предложения</TableCell>
                          <TableCell className="text-gray-300 whitespace-pre-wrap pt-4">
                            {fb.additional_ideas}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trip_ratings" className="space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Card className="bg-zinc-900 border-white/10 flex-1 min-w-[160px]">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Всего оценок</CardDescription>
                <CardTitle className="text-4xl text-violet-400">{tripFeedbacks.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-zinc-900 border-white/10 flex-1 min-w-[160px]">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Средний балл (из 5)</CardDescription>
                <CardTitle className="text-4xl text-amber-400">{avgTripRating}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {isLoadingTrip ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
          ) : tripFeedbacks.length === 0 ? (
            <div className="p-8 text-center text-gray-400 bg-zinc-900/50 rounded-xl border border-white/5">
              Пока нет ни одной оценки маршрута.
            </div>
          ) : (
            <div className="grid gap-4">
              {tripFeedbacks.map((fb) => (
                <Card key={fb.id} className="bg-zinc-900 border-white/10 text-white">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{fb.trip_title || fb.trip_id}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fb.user_name || fb.user_email || fb.user_id}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= fb.rating ? "fill-amber-400 text-amber-400" : "text-zinc-600"}`} />
                        ))}
                        <span className="ml-1 text-sm font-bold text-amber-400">{fb.rating}/5</span>
                        <span className="ml-3 text-xs text-gray-500">{new Date(fb.updated_at).toLocaleDateString("ru-RU")}</span>
                      </div>
                    </div>
                    {fb.liked && <p className="text-sm text-emerald-300"><span className="text-gray-400 mr-1">👍</span>{fb.liked}</p>}
                    {fb.disliked && <p className="text-sm text-red-300"><span className="text-gray-400 mr-1">👎</span>{fb.disliked}</p>}
                    {fb.comment && <p className="text-sm text-gray-300 border-t border-white/5 pt-2">{fb.comment}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
