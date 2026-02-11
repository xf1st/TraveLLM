
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from "next/server"
import { deepseekInference } from "@/lib/deepseek"
import { openrouterInference } from "@/lib/openrouter"

export const maxDuration = 60 // Allow longer timeout for enrichment

export async function POST(req: Request) {
    try {
        const { tripId, itinerary } = await req.json()

        if (!itinerary) {
            return NextResponse.json({ error: "Itinerary is required" }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

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

        // Update in Supabase if tripId provided
        if (tripId) {
            const { error: updateError } = await supabase
                .from('trips')
                .update({ itinerary: finalItinerary })
                .eq('id', tripId)
            
            if (updateError) {
                console.error("Failed to update trip:", updateError)
            }
        }

        return NextResponse.json({ itinerary: finalItinerary })

    } catch (error: any) {
        console.error("Enrichment API error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
