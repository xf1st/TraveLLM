
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from "next/server"
import { z } from "zod"
import { deepseekInference } from "@/lib/deepseek"
import { openrouterInference } from "@/lib/openrouter"
import {
    getRequestUserId,
    recordAiUsageEvent,
    checkMonthlyChatAiLimit,
    monthlyChatAiLimitResponse,
} from "@/lib/ai-usage-events"
import { enforceAiAccess } from "@/lib/server/user-access"
import { fetchTripOwnedByUser } from "@/lib/server/trip-for-ai"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export const maxDuration = 60 // Allow longer timeout for enrichment

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const EnrichBodySchema = z.object({
    /** Обязателен: обогащение только для сохранённой поездки владельца (маршрут из БД). */
    tripId: z.string().regex(UUID_REGEX, "Invalid tripId"),
})

export async function POST(req: Request) {
    try {
        const userId = await getRequestUserId()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const accessErr = await enforceAiAccess(userId)
        if (accessErr) return accessErr

        const chatLimit = await checkMonthlyChatAiLimit(userId)
        if (!chatLimit.allowed) return monthlyChatAiLimitResponse(chatLimit)

        const rl = checkRateLimit(userId, "enrich-trip", 3)
        if (!rl.allowed) return rateLimitResponse(rl)

        const rawBody = await req.json()
        const parsed = EnrichBodySchema.safeParse(rawBody)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 }
            )
        }

        const { tripId } = parsed.data

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)
        const owned = await fetchTripOwnedByUser(supabase, tripId, userId)
        if (!owned.ok) {
            return NextResponse.json({ error: "Trip not found or access denied" }, { status: 403 })
        }

        const itinerary = Array.isArray(owned.trip.itinerary) ? owned.trip.itinerary : []
        if (itinerary.length === 0) {
            return NextResponse.json({ error: "Trip has no itinerary to enrich" }, { status: 400 })
        }
        if (itinerary.length > 60) {
            return NextResponse.json({ error: "Itinerary too large" }, { status: 400 })
        }

        // System Prompt for Enrichment
        const systemPrompt = `
You are a Travel Geocoding & Enrichment Expert.
Your task is to take an existing travel itinerary and ENRICH it with:
1.  **Exact Coordinates**: Latitude and Longitude for EVERY activity.
2.  **Visual Queries**: A short, specific query to find an image for the place (e.g., "Eiffel Tower Paris sunset", "Sushi platter Tokyo").
3.  **Booking/Price Info**: If missing, estimate a realistic price range and provide a generic booking search link.

**INPUT**:
A JSON travel itinerary.

**OUTPUT**:
Return valid JSON matching this schema exactly:
{
  "enriched_itinerary": [
    {
      "day": 1,
      "activities": [
        {
          "title": "Old Activity Title",
          "coordinates": { "lat": 48.8584, "lng": 2.2945 },
          "visual_query": "Eiffel Tower Paris landmark",
          "booking_link": "https://...", 
          "price": "20€ - 30€"
        }
      ]
    }
  ]
}

**RULES**:
1.  **Precision**: Coordinates must be accurate to the specific building/park entrance.
2.  **Structure**: Preserve the order of days and activities exactly.
3.  **JSON Only**: Output ONLY valid JSON. No markdown blocks.
4.  **Language**: Keep titles/descriptions in their original language (Russian), but visual_query should be in English for better image search results.
`

        // User Prompt
        const userPrompt = JSON.stringify(itinerary)

        let enrichedData = null

        // 1. Try DeepSeek
        try {
            console.log("Enriching with DeepSeek...")
            const dsResponse = await deepseekInference(
                [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
                { temperature: 0.3, maxTokens: 4000 }
            )
            // Parse JSON (handle potential markdown blocks)
            const cleanJson = dsResponse.replace(/```json|```/g, '').trim()
            enrichedData = JSON.parse(cleanJson)
        } catch (error) {
            console.error("DeepSeek enrichment failed:", error)
            // 2. Fallback to OpenRouter (Qwen/Llama)
            try {
                console.log("Enriching with OpenRouter...")
                const orResponse = await openrouterInference(
                    [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
                    { temperature: 0.3, maxTokens: 4000 }
                )
                const cleanJson = orResponse.replace(/```json|```/g, '').trim()
                enrichedData = JSON.parse(cleanJson)
            } catch (orError) {
                console.error("OpenRouter enrichment failed:", orError)
                return NextResponse.json({ error: "AI enrichment failed" }, { status: 500 })
            }
        }

        if (!enrichedData || !enrichedData.enriched_itinerary) {
            return NextResponse.json({ error: "Invalid AI response" }, { status: 500 })
        }

        // Merge Enriched Data back into original itinerary
        const finalItinerary = itinerary.map((day: any, dIdx: number) => {
            const enrichedDay = enrichedData.enriched_itinerary.find((ed: any) => ed.day === day.day) || {}
            
            const enrichedActivities = day.activities?.map((act: any, aIdx: number) => {
                const enrichedAct = enrichedDay.activities?.[aIdx]
                if (!enrichedAct) return act

                return {
                    ...act,
                    coordinates: enrichedAct.coordinates,
                    visual_query: enrichedAct.visual_query,
                    // Only update if missing in original
                    price: act.price || enrichedAct.price, 
                    bookingLink: act.bookingLink || enrichedAct.booking_link
                }
            }) || []

            return {
                ...day,
                activities: enrichedActivities
            }
        })

        const { error: updateError } = await supabase
            .from("trips")
            .update({ itinerary: finalItinerary })
            .eq("id", tripId)
            .eq("user_id", userId)

        if (updateError) {
            console.error("Failed to update trip:", updateError)
        }

        await recordAiUsageEvent({
            userId,
            tripId,
            source: "enrich-trip",
            provider: "deepseek-or-openrouter",
        })

        return NextResponse.json({ itinerary: finalItinerary })

    } catch (error: any) {
        console.error("Enrichment API error:", error)
        return NextResponse.json({ error: "Enrichment failed" }, { status: 500 })
    }
}
