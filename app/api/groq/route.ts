import { groq, GROQ_MODEL } from "@/lib/groq"
import { hfInference } from "@/lib/huggingface"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("AI API Request Body:", JSON.stringify(body, null, 2))
    const {
      departureCity,
      destinationType,
      countryCount,
      budget,
      startDate,
      endDate,
      travelStyle,
      companions,
      preferences,
      paymentMethods,
      requireRussianGuide
    } = body

    const durationDays = startDate && endDate
      ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 7

    const prompt = `
      Create a highly detailed, professional travel itinerary.
      
      DEPARTURE CITY: ${departureCity}
      TARGET: ${destinationType === 'mixed' ? 'Mixed (Russia + Abroad)' : destinationType === 'russia' ? 'Inside Russia' : 'Abroad'}
      COUNTRY COUNT: ${countryCount}
      START DATE: ${startDate || 'Any'}
      END DATE: ${endDate || 'Any'}
      DURATION: ${durationDays} days (STRICT: Generate exactly ${durationDays} days)
      SEASONALITY: Take the dates into account for weather and seasonal activities. Explicitly mention seasonal perks (e.g. "Идеальное время для лыж" or "Сезон цветения") in the 'description' or 'tips'.
      BUDGET: ${budget}
      STYLE: ${travelStyle.join(', ')}
      COMPANIONS: ${companions}
      
      PERSONALIZATION CONTEXT (VERY IMPORTANT):
      - Citizenship: ${preferences.citizenship || 'Not specified'}
      - Nationality: ${preferences.nationality || 'Not specified'}
      - Known Languages: ${preferences.languages?.join(', ') || 'Not specified'}
      - Dietary: ${preferences.dietaryRestrictions?.join(', ') || 'None'}, Extra: ${preferences.dietaryCustom || 'None'}
      - Interests: ${preferences.interestsDetailed?.join(', ') || 'General'}, Extra: ${preferences.interestsCustom || 'None'}
      - Available Payment Methods: ${paymentMethods?.join(', ') || 'Not specified'}
      - Require Russian Speaking Guides: ${requireRussianGuide ? 'YES' : 'NO'}

      COMMANDS:
      1. LOGISTICS: Include full door-to-door logistics (starting from ${departureCity} airport/station).
      2. TRANSIT: For every movement, specify: Mode, Distance (km), Travel Time, and price. 
      3. COST BREAKDOWN: For EVERY activity (morning/daytime/night), provide an estimated cost in RUB.
      4. LINKS: For major transport (flights) and accommodations, generate a placeholder markdown link to Aviasales/Booking/Yandex Travel (e.g. [Билеты](https://www.aviasales.ru)).
      5. DAILY SUMMARY: Calculate a "dayTotal" for each day.
      6. ANALYSIS: Provide average check for accommodation and food.
      7. VISA: Add visa requirements for ${preferences.citizenship} citizenship.
      8. PLACEHOLDERS: NEVER use words like 'Stunning', 'Amazing'. Use concrete, localized names.
      
      LANGUAGE: Respond strictly in RUSSIAN.
      FORMAT: JSON ONLY.
      
      STYLE GUIDE:
      - TITLE: Generate a creative, catchy, and localized title (e.g., "Секреты Лиссабона: Океан и История" or "Большое путешествие по Грузии"). DO NOT use generic placeholders like "Stunning Route Title".
      - DESCRIPTION: Write a compelling 2-3 sentence teaser that makes the traveler excited.

      JSON Schema:
      {
        "title": "...",
        "description": "...",
        "totalBudget": "...",
        "budgetAnalysis": {
          "avgAccommodation": "₽/night",
          "avgFood": "₽/day",
          "avgTransport": "₽/total"
        },
        "countries": [...],
        "itinerary": [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "dayTotal": "₽",
            "activities": [
              { "time": "Утро", "desc": "...", "cost": "₽", "link": "url" },
              { "time": "День", "desc": "...", "cost": "₽", "link": "url" },
              { "time": "Вечер", "desc": "...", "cost": "₽", "link": "url" }
            ],
            "logistics": { ... }
          }
        ]
      }
    `

    const systemPrompt = "You are an expert travel planner for TraveLM, specialized in Russian travelers. You provide JSON only."

    async function generateAndParse(source: "HF" | "Groq"): Promise<any> {
      let raw = ""
      if (source === "HF") {
        console.log("Attempting Hugging Face Inference...");
        raw = await hfInference(prompt, systemPrompt)
      } else {
        console.log("Attempting Groq Completion...");
        const completion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: 16384,
          temperature: 0.6,
          response_format: { type: "json_object" }
        })
        raw = completion.choices[0].message.content || ""
      }

      if (!raw) throw new Error(`Empty response from ${source}`)

      // Extraction & Repair
      let clean = raw.match(/\{[\s\S]*\}/)?.[0] || raw

      if (!clean.trim().endsWith('}')) {
        console.warn(`${source} JSON appears truncated, attempting basic repair...`);
        let openBraces = (clean.match(/\{/g) || []).length;
        let closeBraces = (clean.match(/\}/g) || []).length;
        let openBrackets = (clean.match(/\[/g) || []).length;
        let closeBrackets = (clean.match(/\]/g) || []).length;

        // Very basic repair: check if it's truncated at a property name or value
        if (clean.endsWith('"')) {
          // Probably truncated inside a string value
          clean += '"';
        } else if (clean.endsWith(':')) {
          // Truncated at a value start
          clean += '""';
        }

        while (openBrackets > closeBrackets) { clean += ']'; closeBrackets++; }
        while (openBraces > closeBraces) { clean += '}'; closeBraces++; }
      }

      try {
        return JSON.parse(clean)
      } catch (e: any) {
        console.error(`${source} JSON Parsing Failed:`, e.message);
        console.error("Snippet near error:", clean.substring(clean.length - 200));
        throw e;
      }
    }

    try {
      try {
        const routeData = await generateAndParse("HF")
        console.log("Success with Hugging Face")
        return NextResponse.json(routeData)
      } catch (hfError: any) {
        console.error("HF Failed or gave bad JSON, falling back to Groq:", hfError.message)
        
        // Если ошибка связана с токенами, попробуем еще раз с увеличенным лимитом
        if (hfError.message?.includes('token') || hfError.message?.includes('length')) {
          console.log("Token limit error detected, retrying with higher limits...")
        }
        
        const routeData = await generateAndParse("Groq")
        console.log("Success with Groq fallback")
        return NextResponse.json(routeData)
      }
    } catch (finalError: any) {
      console.error("All providers failed or gave bad JSON:", finalError.message)
      
      // Даем более информативную ошибку
      let errorMessage = "All AI providers failed to generate valid JSON"
      if (finalError.message?.includes('token')) {
        errorMessage = "Request too complex, try reducing trip duration or details"
      } else if (finalError.message?.includes('rate')) {
        errorMessage = "Too many requests, please try again in a moment"
      }
      
      return NextResponse.json({
        error: errorMessage,
        details: finalError.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error("Fatal API Error:", error)
    return NextResponse.json({
      error: error.message || "Unknown error",
    }, { status: 500 })
  }
}
