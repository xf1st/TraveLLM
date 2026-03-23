import { NextResponse } from "next/server"
import { deepseekInference } from "@/lib/deepseek"
import { getRequestUserId } from "@/lib/ai-usage-events"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

/**
 * API для получения отзывов о местах
 *
 * Стратегия:
 * 1. Google Places API (если есть ключ) - реальные отзывы
 * 2. Fallback: AI-генерированные описания на основе знаний модели
 *
 * Pricing (Google Places):
 * - Place Details (Advanced) = $20/1000 запросов
 * - Только 5 отзывов на место
 *
 * Альтернативы (рассмотреть в будущем):
 * - TripAdvisor Content API (платный)
 * - Yelp Fusion API (ограничен регионами)
 * - SerpAPI Google Reviews ($50/5000)
 */

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

interface Review {
  author: string
  rating: number
  text: string
  date: string
  source: "google" | "yandex" | "ai"
  avatar?: string
}

interface PlaceReviews {
  placeName: string
  overallRating: number
  totalReviews: number
  reviews: Review[]
  pros: string[]
  cons: string[]
  source: "google" | "ai"
}

// Генерация AI-отзывов через DeepSeek
async function generateAIReviews(placeName: string, city: string): Promise<PlaceReviews> {
  const prompt = `Ты эксперт по путешествиям. Создай реалистичную сводку отзывов для места "${placeName}" в городе ${city}.

ВАЖНО: Основывайся на своих знаниях о реальных отзывах и характеристиках этого места. Если не знаешь конкретное место - создай правдоподобную оценку на основе типа заведения.

Верни JSON:
{
  "overallRating": 4.5,
  "totalReviews": 1250,
  "reviews": [
    {
      "author": "Анна К.",
      "rating": 5,
      "text": "Краткий отзыв 1-2 предложения",
      "date": "Декабрь 2024"
    },
    {
      "author": "Михаил П.",
      "rating": 4,
      "text": "Краткий отзыв 1-2 предложения",
      "date": "Ноябрь 2024"
    },
    {
      "author": "Elena S.",
      "rating": 4,
      "text": "Short review in English",
      "date": "October 2024"
    }
  ],
  "pros": ["Плюс 1", "Плюс 2", "Плюс 3"],
  "cons": ["Минус 1", "Минус 2"]
}

Правила:
- overallRating: реалистичный рейтинг 3.5-5.0
- totalReviews: реалистичное количество (для популярных мест 500-5000, для менее известных 50-500)
- reviews: 3 разных отзыва (2 на русском, 1 на английском)
- pros/cons: конкретные, основанные на типичных отзывах
- Даты: последние 3-6 месяцев

Верни ТОЛЬКО JSON без markdown.`

  try {
    const content = await deepseekInference([
        { role: "system", content: "Генератор отзывов." },
        { role: "user", content: prompt }
    ], { maxTokens: 1000, temperature: 0.7 })

    // Парсим JSON из ответа
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON in response")

    const data = JSON.parse(jsonMatch[0])

    return {
      placeName,
      overallRating: data.overallRating || 4.0,
      totalReviews: data.totalReviews || 100,
      reviews: (data.reviews || []).map((r: any) => ({
        author: r.author || "Гость",
        rating: r.rating || 4,
        text: r.text || "",
        date: r.date || "2024",
        source: "ai" as const
      })),
      pros: data.pros || [],
      cons: data.cons || [],
      source: "ai"
    }
  } catch (e) {
    console.error("Failed to parse AI reviews:", e)
    // Fallback на минимальные данные
    return {
      placeName,
      overallRating: 4.2,
      totalReviews: 150,
      reviews: [
        {
          author: "Путешественник",
          rating: 4,
          text: "Хорошее место для посещения",
          date: "2024",
          source: "ai"
        }
      ],
      pros: ["Интересное место"],
      cons: [],
      source: "ai"
    }
  }
}

// Получение реальных отзывов из Google Places API
async function getGoogleReviews(placeName: string, city: string): Promise<PlaceReviews | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    return null
  }

  try {
    // 1. Поиск Place ID
    const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json")
    searchUrl.searchParams.set("input", `${placeName} ${city}`)
    searchUrl.searchParams.set("inputtype", "textquery")
    searchUrl.searchParams.set("fields", "place_id")
    searchUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY)

    const searchResponse = await fetch(searchUrl.toString())
    const searchData = await searchResponse.json()

    if (!searchData.candidates?.[0]?.place_id) {
      return null
    }

    const placeId = searchData.candidates[0].place_id

    // 2. Получение деталей места с отзывами
    const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json")
    detailsUrl.searchParams.set("place_id", placeId)
    detailsUrl.searchParams.set("fields", "name,rating,user_ratings_total,reviews")
    detailsUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY)
    detailsUrl.searchParams.set("language", "ru")

    const detailsResponse = await fetch(detailsUrl.toString())
    const detailsData = await detailsResponse.json()

    if (!detailsData.result) {
      return null
    }

    const result = detailsData.result

    // Анализируем отзывы для pros/cons
    const reviews = (result.reviews || []).slice(0, 5)
    const pros: string[] = []
    const cons: string[] = []

    // Простой анализ тональности
    reviews.forEach((r: any) => {
      if (r.rating >= 4) {
        // Извлекаем позитивные моменты
        const positiveKeywords = ["отличн", "прекрасн", "рекоменд", "красив", "вкусн", "удобн", "чист"]
        positiveKeywords.forEach(kw => {
          if (r.text?.toLowerCase().includes(kw) && pros.length < 3) {
            const sentence = r.text.split(".").find((s: string) => s.toLowerCase().includes(kw))
            if (sentence && sentence.length < 100) {
              pros.push(sentence.trim())
            }
          }
        })
      } else if (r.rating <= 3) {
        // Извлекаем негативные моменты
        const negativeKeywords = ["долг", "очеред", "дорог", "шумн", "грязн", "плох"]
        negativeKeywords.forEach(kw => {
          if (r.text?.toLowerCase().includes(kw) && cons.length < 2) {
            const sentence = r.text.split(".").find((s: string) => s.toLowerCase().includes(kw))
            if (sentence && sentence.length < 100) {
              cons.push(sentence.trim())
            }
          }
        })
      }
    })

    return {
      placeName: result.name || placeName,
      overallRating: result.rating || 0,
      totalReviews: result.user_ratings_total || 0,
      reviews: reviews.map((r: any) => ({
        author: r.author_name || "Гость",
        rating: r.rating || 0,
        text: r.text || "",
        date: r.relative_time_description || "",
        source: "google" as const,
        avatar: r.profile_photo_url
      })),
      pros: pros.length ? pros : ["Популярное место"],
      cons,
      source: "google"
    }
  } catch (error) {
    console.error("Google Places API error:", error)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getRequestUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 10 req/min — Google Places costs $20/1000 requests
    const rl = checkRateLimit(userId, "reviews", 10)
    if (!rl.allowed) return rateLimitResponse(rl)

    const body = await request.json()
    const placeName = String(body?.placeName || "").trim().slice(0, 200)
    const city = String(body?.city || "").trim().slice(0, 100)

    if (!placeName) {
      return NextResponse.json(
        { error: "placeName is required" },
        { status: 400 }
      )
    }

    const reviews = await getReviewsData(placeName, city || "")
    return NextResponse.json(reviews)
  } catch (error) {
    console.error("Reviews API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    )
  }
}

// GET для простых запросов
export async function GET(request: Request) {
  const userId = await getRequestUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const placeName = searchParams.get("place")
  const city = searchParams.get("city")

  if (!placeName) {
    return NextResponse.json(
      { error: "place parameter is required" },
      { status: 400 }
    )
  }

  try {
    const reviews = await getReviewsData(placeName, city || "")
    return NextResponse.json(reviews)
  } catch (error) {
    console.error("Reviews API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    )
  }
}

/**
 * Shared logic to get reviews
 */
async function getReviewsData(placeName: string, city: string): Promise<PlaceReviews> {
  // Стратегия: сначала Google, потом AI
  let reviews: PlaceReviews | null = null

  // Пробуем Google Places API
  if (GOOGLE_PLACES_API_KEY) {
    reviews = await getGoogleReviews(placeName, city)
  }

  // Fallback на AI
  if (!reviews) {
    reviews = await generateAIReviews(placeName, city)
  }

  return reviews
}
