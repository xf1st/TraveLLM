import { glmInference, llamaInference, GLM_MODEL, LLAMA_MODEL } from "@/lib/cerebras"
import { qwenInference, QWEN_MODEL } from "@/lib/qwen"
// import { deepseekInference, DEEPSEEK_MODEL } from "@/lib/deepseek" // DISABLED
import { hfInference } from "@/lib/huggingface"
import { NextResponse } from "next/server"
import { getDestinationImage } from "@/lib/images"

export async function POST(req: Request) {
    try {
        const body = await req.json()
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
            requireRussianGuide,
            customDestination
        } = body

        const durationDays = startDate && endDate
            ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 7

        // Define strict budget caps
        let budgetCap = 0;
        let budgetDesc = "";
        switch (budget) {
            case "economy": budgetCap = 50000; budgetDesc = "Economy (Cheap/Free activities, Hostels/Cheap Hotels, Public Transport)"; break;
            case "comfort": budgetCap = 150000; budgetDesc = "Comfort (Good Hotels 3-4*, Taxi/Comfort Transport, Mix of free/paid activities)"; break;
            case "luxury": budgetCap = 500000; budgetDesc = "Luxury (5* Hotels, VIP Transport, Expensive Restaurants)"; break;
            default: budgetCap = 150000; budgetDesc = "Moderate";
        }
        // Adjust cap for duration (approximate)
        if (durationDays > 7) budgetCap = Math.round(budgetCap * (durationDays / 7));


        const targetDescription = customDestination
            ? `Specific User Request: ${customDestination}`
            : destinationType === 'mixed' ? 'Mixed (Russia + Abroad)' : destinationType === 'russia' ? 'Inside Russia' : 'Abroad'

        const prompt = `
      Create a highly detailed, professional travel itinerary.
      
      DEPARTURE CITY: ${departureCity}
      TARGET: ${targetDescription}
      COUNTRY COUNT: ${countryCount}
      START DATE: ${startDate || 'Any'}
      END DATE: ${endDate || 'Any'}
      DURATION: ${durationDays} days (STRICT: Generate exactly ${durationDays} days)
      SEASONALITY: Dates are ${startDate} to ${endDate}. CHECK FOR SEASONS/HOLIDAYS. If winter, NO beach swimming unless tropical. If New Year, mention events.
      BUDGET: ${budgetDesc}. STRICT CAP: ${budgetCap} RUB total. do NOT exceed.
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
      - Visited Countries: ${preferences.visitedCountries?.join(', ') || 'None specified'}

      COMMANDS:
      1. LOGISTICS: Include full door-to-door logistics (starting from ${departureCity} airport/station).
      2. TRANSIT: For every movement, specify: Mode, Distance (km), Travel Time, and price. 
      3. COST BREAKDOWN: For EVERY activity, provide a REALISTIC estimated cost in RUB. **NEVER use '0' or 'Free' for everything.** Even a walk involves buying water/snack. Estimate ~500-1000 RUB for free activities (as misc expenses). Dinner must be 1500-5000 RUB depending on budget.
      4. LINKS: Provide links only for PAID tickets (museums, events).
      5. DAILY SUMMARY: Sum up costs.
      6. BUDGET ANALYSIS: Fill 'budgetAnalysis' with concrete numbers. 'avgAccommodation' must be realistic (e.g. 5000-15000 RUB).
      7. NAMED ENTITIES (CRITICAL): **BAN GENERIC NAMES.**
         - BAD: "Local Restaurant", "Central Park", "City Museum", "Try local cuisine".
         - GOOD: "Ресторан 'Dr. Живаго'", "Парк Зарядье", "Третьяковская Галерея", "Попробуйте паэлью в La Barraca".
         - If you don't know a name, SEARCH your knowledge base.
      8. LANGUAGE: **STRICTLY RUSSIAN**. Do NOT use English words like 'nearby', 'local', 'city'. Translate everything.
      
      LANGUAGE: Respond strictly in RUSSIAN.
      FORMAT: JSON ONLY.

      JSON Schema:
      {
        "title": "Topic",
        "description": "Intro",
        "totalBudget": "150 000 ₽",
        "budgetAnalysis": {
          "avgAccommodation": "5 000 ₽/ночь",
          "avgFood": "3 000 ₽/день",
          "avgTransport": "10 000 ₽",
          "avgActivities": "20 000 ₽",
          "avgMisc": "5 000 ₽"
        },
        "visaAdvice": "...",
        "paymentAdvice": "...",
        "safetyInfo": { "rating": 9, "tips": "..." },
        "restrictions": "...",
        "countries": [{"name": "Russia"}],
        "tags": ["#tag"],
        "coverImage": "",
        "itinerary": [
          {
            "day": 1,
            "title": "Arrival in Moscow",
            "image": "", 
            "dayTotal": "15 000 ₽",
            "activities": [
              { 
                "time": "Утро", 
                "placeName": "Конкретное Название Места (ОБЯЗАТЕЛЬНО)",
                "desc": "Подробное описание активности, что делать и почему это интересно...", 
                "cost": "500 ₽", 
                "ticketsRequired": false,
                "mapLink": "https://www.google.com/maps/search/?api=1&query=Название+Места",
                "link": "" 
              },
              { "time": "День", "placeName": "...", "desc": "...", "cost": "...", "ticketsRequired": true, "mapLink": "...", "link": "https://..." },
              { "time": "Вечер", "placeName": "...", "desc": "...", "cost": "...", "ticketsRequired": false, "mapLink": "...", "link": "" }
            ],
            "logistics": { "mode": "Taxi", "from": "A", "to": "B", "distance": "10km", "duration": "30m", "price": "1000 ₽" }
          }
        ]
      }
      
      CRITICAL INSTRUCTIONS:
      1. For 'activities', you MUST generate EXACTLY 3 items for every single day: "Утро", "День", "Вечер".
      2. 'placeName' is MANDATORY. It MUST be the REAL, SPECIFIC name of a venue, museum, restaurant, park, etc. 
         FORBIDDEN: "местный ресторан", "парк", "музей", "центр города".
         REQUIRED: "Ресторан 'Beluga'", "Музей Ван Гога", "Парк Вондела", "Ночной клуб 'Paradiso'".
      3. 'mapLink' is MANDATORY. Generate a Google Maps search URL for each placeName:
         Format: https://www.google.com/maps/search/?api=1&query=URL_ENCODED_PLACE_NAME
      4. 'link' should be a real booking/ticket website URL (e.g., GetYourGuide, Viator, official museum site) if ticketsRequired is true. If you don't know the exact URL, use a Google search URL: https://www.google.com/search?q=купить+билеты+PLACE_NAME
      5. CRITICAL: 'desc' should contain ONLY the activity description (what to do, why it's interesting). 
         DO NOT include cost information or ticket URLs in the 'desc' field. 
         Cost goes in 'cost' field. Ticket URL goes in 'link' field. Keep 'desc' clean.
      6. Keep response concise to avoid JSON truncation. Focus on quality over quantity of text.
      
      7. CRITICAL - 'budgetAnalysis' is MANDATORY! You MUST fill ALL 5 fields with REALISTIC prices in RUB:
         - "avgAccommodation": Average hotel cost per night (e.g. "5 000 ₽/ночь" for economy, "15 000 ₽/ночь" for luxury)
         - "avgFood": Average daily food cost (e.g. "2 500 ₽/день" for economy, "8 000 ₽/день" for luxury)
         - "avgTransport": Total transport cost for entire trip (flights, trains, taxis)
         - "avgActivities": Average daily entertainment cost (museums, tours, attractions)
         - "avgMisc": Miscellaneous expenses (tips, souvenirs, emergencies)
         DO NOT leave these empty or use placeholders like "...". Calculate based on budget level and destination!
         
      8. CRITICAL - 'visaAdvice' is MANDATORY! Provide specific visa information for Russian citizens:
         - Visa required or visa-free? How many days allowed?
         - How to apply? What documents needed?
         - Processing time, costs, embassy locations
         Example: "Для граждан РФ виза не требуется на срок до 30 дней. Необходим загранпаспорт сроком действия минимум 6 месяцев."
         
      9. CRITICAL - 'paymentAdvice' is MANDATORY! Provide payment info for Russian travelers:
         - Does Mir card work? UnionPay? Cash preferred?
         - Currency exchange tips, ATM availability
         - Average prices in local currency vs RUB
         Example: "Карты Мир не принимаются. Рекомендуется UnionPay или наличные евро. Обменники в аэропорту с высокой комиссией - лучше менять в городе."
         
      10. CRITICAL - 'safetyInfo' is MANDATORY! Provide:
          - "rating": Safety score 1-10 for tourists
          - "tips": Specific safety advice (areas to avoid, scams, emergency numbers)
          Example: { "rating": 8, "tips": "Избегайте туристических районов ночью. Остерегайтесь карманников в метро. Экстренные службы: 112" }
    `

        const systemPrompt = "You are an expert travel planner for TraveLM, specialized in Russian travelers. You provide JSON only."

        async function generateAndParse(source: "Qwen" | "GLM" | "Llama" | "HF"): Promise<any> {
            let raw = ""
            const messages = [
                { role: "system" as const, content: systemPrompt },
                { role: "user" as const, content: prompt }
            ]
            const opts = { maxTokens: 16384, temperature: 0.6 }

            if (source === "Qwen") {
                console.log("Attempting Qwen-32B via HF...");
                raw = await qwenInference(messages, opts)
            } else if (source === "GLM") {
                console.log("Attempting GLM-4.7 via Cerebras...");
                raw = await glmInference(messages, opts)
            } else if (source === "Llama") {
                console.log("Attempting Llama-3.3-70B via Cerebras...");
                raw = await llamaInference(messages, opts)
            } else {
                console.log("Attempting Hugging Face 8B Inference...");
                raw = await hfInference(prompt, systemPrompt)
            }

            if (!raw) throw new Error(`Empty response from ${source}`)

            // Extraction & Repair
            let clean = raw.match(/\{[\s\S]*\}/)?.[0] || raw

            if (!clean.trim().endsWith('}')) {
                console.warn(`${source} JSON appears truncated, attempting basic repair...`);
                let openBraces = (clean.match(/\{/g) || []).length;
                let closeBraces = (clean.match(/\}/g) || []).length;
                while (openBraces > closeBraces) { clean += '}'; closeBraces++; }
            }

            try {
                const jsonData = JSON.parse(clean);

                // --- ENRICHMENT: Only Cover Image (fast) ---
                try {
                    if (jsonData.countries && jsonData.countries.length > 0) {
                        const cover = await getDestinationImage(jsonData.countries[0].name + " travel");
                        if (cover) jsonData.coverImage = cover;
                    }
                } catch (imgError) {
                    // Cover image is optional, proceed without it
                }
                // Day images are now loaded lazily via TripImage component
                // -------------------------------------

                return jsonData;
            } catch (e: any) {
                console.error(`${source} JSON Parsing Failed:`, e.message);
                throw e;
            }
        }

        try {
            // CEREBRAS MODELS DISABLED - съедают HF free tier слишком быстро
            // Раскомментируй когда нужна более мощная модель:
            /*
            try {
                // 1. Try GLM-4.7 first (358B, newest)
                const routeData = await generateAndParse("GLM")
                console.log("Success with GLM-4.7")
                return NextResponse.json(routeData)
            } catch (glmError: any) {
                console.error("GLM-4.7 failed:", glmError.message)
                try {
                    // 2. Try Llama-3.3-70B (reliable)
                    const routeData = await generateAndParse("Llama")
                    console.log("Success with Llama-3.3-70B")
                    return NextResponse.json(routeData)
                } catch (llamaError: any) {
                    console.error("Llama-3.3-70B failed:", llamaError.message)
            */

            // Qwen as primary, HF as fallback
            try {
                const routeData = await generateAndParse("Qwen")
                console.log("Success with Qwen-32B")
                return NextResponse.json(routeData)
            } catch (qwenError: any) {
                console.error("Qwen failed:", qwenError.message)
                const routeData = await generateAndParse("HF")
                console.log("Success with HF fallback")
                return NextResponse.json(routeData)
            }

            /*
                }
            }
            */
        } catch (finalError: any) {
            console.error("All providers failed or gave bad JSON:", finalError.message)
            return NextResponse.json({
                error: "All AI providers failed to generate valid JSON",
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
