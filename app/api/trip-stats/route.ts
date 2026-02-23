import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRequestUserId, recordAiUsageEvent } from "@/lib/ai-usage-events"
import { deepseekInferenceWithUsage } from "@/lib/deepseek"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const createServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequestUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const client = createServiceClient()
    if (!client) return NextResponse.json({ error: "Server is not configured" }, { status: 500 })

    const tripId = String(req.nextUrl.searchParams.get("tripId") || "").trim()
    if (!tripId || !UUID_REGEX.test(tripId)) {
      return NextResponse.json({ error: "Invalid tripId" }, { status: 400 })
    }

    // 1. Fetch trip details (itinerary)
    const { data: trip, error: tripError } = await client
      .from("trips")
      .select("destination, itinerary")
      .eq("id", tripId)
      .eq("user_id", userId)
      .single()

    if (tripError) throw tripError
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 })

    // 2. Fetch diary entries
    const { data: entries, error: diaryError } = await client
      .from("trip_diary")
      .select("content, day_index, activity_index")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .not("content", "is", null)
      .neq("content", "")

    if (diaryError) throw diaryError

    // 3. Prepare context for AI
    const itineraryContext = Array.isArray(trip.itinerary) 
      ? trip.itinerary.map((day: any, idx: number) => {
          const acts = day.activities?.map((a: any) => `- ${a.title} (${a.type || 'activity'})`).join("\n")
          return `День ${idx + 1}:\n${acts}`
        }).join("\n\n")
      : "Данные маршрута отсутствуют."

    const diaryContext = entries && entries.length > 0
      ? entries.map(e => `День ${e.day_index}, активность ${e.activity_index}: ${e.content}`).join("\n")
      : "Записи в дневнике отсутствуют."
    
    const prompt = `Вы — эксперт-аналитик путешествий. Проанализируйте маршрут поездки и записи из дневника (если есть), чтобы составить психологический и тематический профиль путешественника.
Баллы должны быть от 0 до 100 по категориям: Еда, Природа, Культура, Шоппинг, Жизнь, Отдых.

Маршрут (План):
Локация: ${trip.destination || "Неизвестно"}
${itineraryContext}

Записи дневника (Впечатления):
${diaryContext}

Инструкции:
1. Если записей в дневнике нет, делайте вывод на основе ТИПОВ активностей в маршруте (например, музеи -> культура, парки -> природа).
2. Если записи есть, они имеют приоритет, так как отражают реальный опыт.
3. Категория "Жизнь" соответствует ритму города, ночным развлечениям или социальной активности.

Верните JSON строго в следующем формате:
{
  "profile": [еда, природа, культура, шоппинг, жизнь, отдых],
  "personality": "Тип личности (2-3 слова)",
  "description": "Описание стиля путешествия (2 предложения)",
  "bestQuote": "Самая яркая цитата из дневника (если есть, иначе null)"
}
Используйте русский язык. Выдавайте ТОЛЬКО JSON.`

    // 3. Call AI
    const { content: raw, usage } = await deepseekInferenceWithUsage(
      [
        { role: "system", content: "You output valid JSON only. No markdown." },
        { role: "user", content: prompt },
      ],
      {
        maxTokens: 1000,
        temperature: 0.7,
        tripDays: 1,
      }
    )

    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
    const jsonCandidate = cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned
    let parsed = {
      profile: [50, 50, 50, 50, 50, 50],
      personality: "Исследователь",
      description: "Анализ завершен.",
      bestQuote: null
    }
    
    try {
      parsed = JSON.parse(jsonCandidate)
    } catch (e) {
      console.warn("Failed to parse AI response:", cleaned)
    }

    // Log usage
    if (usage) {
      await recordAiUsageEvent({
        userId,
        tripId,
        source: "memory-board.stats",
        usage,
        metadata: { 
          entriesCount: entries?.length || 0,
          hasItinerary: !!itineraryContext 
        }
      })
    }

    return NextResponse.json({ stats: parsed })
  } catch (error: any) {
    console.error("[trip-stats][GET] failed:", error)
    return NextResponse.json({ error: "Failed to generate stats" }, { status: 500 })
  }
}
