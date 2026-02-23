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

    // 1. Fetch trip details and expenses
    const [tripResult, expensesResult] = await Promise.all([
      client
        .from("trips")
        .select("destination, start_date, end_date, total_cost, budget_range")
        .eq("id", tripId)
        .eq("user_id", userId)
        .single(),
      client
        .from("budget_expenses")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true })
    ])

    if (tripResult.error) throw tripResult.error
    if (!tripResult.data) return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    
    const trip = tripResult.data
    const expenses = expensesResult.data || []

    // 2. Prepare context for AI
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const expensesContext = expenses.length > 0
      ? expenses.map(e => `- ${e.description}: ${e.amount} ${e.currency} (${e.category})`).join("\n")
      : "Расходы пока не записаны."

    const startDate = trip.start_date ? new Date(trip.start_date) : null
    const endDate = trip.end_date ? new Date(trip.end_date) : null
    const durationDays = startDate && endDate 
      ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 7 // Default

    const prompt = `Вы — профессиональный финансовый консультант для путешественников (AI Economist). 
Ваша задача: проанализировать текущие расходы пользователя в поездке и дать краткий, но полезный совет.

Контекст поездки:
Локация: ${trip.destination || "Неизвестно"}
Длительность: ${durationDays} дней
Планируемый бюджет: ${trip.total_cost || trip.budget_range || "Не указан"}
Всего потрачено: ${totalSpent} RUB (примерно)

Список расходов:
${expensesContext}

Инструкции:
1. Оцените темп трат (burn rate) относительно длительности поездки.
2. Выделите основную категорию расходов.
3. Дайте один практический совет, как оптимизировать бюджет или на что обратить внимание.
4. Будьте вежливы, используйте легкий юмор, если уместно.
5. Ответ должен быть на русском языке.

Верните JSON строго в следующем формате:
{
  "status": "warning" | "ok" | "critical",
  "message": "Краткий заголовок совета (4-5 слов)",
  "advice": "Подробный совет (2-3 предложения)",
  "burnRate": "Описание темпа трат (например, 'Вы тратите быстрее плана')"
}
Выдавайте ТОЛЬКО JSON.`

    // 3. Call AI
    const { content: raw, usage } = await deepseekInferenceWithUsage(
      [
        { role: "system", content: "You are a professional travel economist. You output valid JSON only. No markdown." },
        { role: "user", content: prompt },
      ],
      {
        maxTokens: 500,
        temperature: 0.7,
        tripDays: durationDays,
      }
    )

    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
    const jsonCandidate = cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned
    let parsed = {
      status: "ok",
      message: "Бюджет в норме",
      advice: "Продолжайте следить за расходами.",
      burnRate: "Стабильный темп"
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
        source: "budget.economist",
        usage,
        metadata: { 
          expensesCount: expenses.length,
          totalSpent
        }
      })
    }

    return NextResponse.json({ economist: parsed })
  } catch (error: any) {
    console.error("[budget-ai][GET] failed:", error)
    return NextResponse.json({ error: "Failed to generate budget advice" }, { status: 500 })
  }
}
