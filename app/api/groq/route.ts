import { groq, GROQ_MODEL } from "@/lib/groq"
// Forced Rebuild verified syntax
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
                while (openBraces > closeBraces) { clean += '}'; closeBraces++; }
            }

            try {
                const jsonData = JSON.parse(clean);

                // --- ENRICHMENT WITH IMAGES ---

                try {
                    // 1. Cover Image
                    if (jsonData.countries && jsonData.countries.length > 0) {
                        const cover = await getDestinationImage(jsonData.countries[0].name + " travel background");
                        if (cover) jsonData.coverImage = cover;
                    }

                    // 2. Day Images (Parallel)
                    if (jsonData.itinerary && Array.isArray(jsonData.itinerary)) {
                        const country = jsonData.countries?.[0]?.name || destinationType;
                        await Promise.all(jsonData.itinerary.map(async (day: any) => {
                            try {
                                // Try to construct a good query: "Paris Eiffel Tower" or "Bali Beach"
                                // If day title is generic "Day 1", use country + activities desc
                                let query = `${country} ${day.title || 'travel'}`;
                                if (day.title?.includes("Day") || day.title?.includes("День")) {
                                    // generic title, peek activities
                                    const activity = day.activities?.[0]?.desc || 'landscape';
                                    // Extract first few words of activity
                                    const keywords = activity.split(' ').slice(0, 4).join(' ');
                                    query = `${country} ${keywords}`;
                                }

                                const img = await getDestinationImage(query);
                                if (img) day.image = img;
                            } catch (e) {
                                console.error("Failed to fetch day image", e);
                            }
                        }));
                    }
                } catch (imgError) {
                    console.error("Pexels enrichment failed, proceeding with text only", imgError);
                }
                // -------------------------------------

                return jsonData;
            } catch (e: any) {
                console.error(`${source} JSON Parsing Failed:`, e.message);
                throw e;
            }
        }

        try {
            try {
                // Try Groq first as it's more reliable with provided key
                const routeData = await generateAndParse("Groq")
                console.log("Success with Groq")
                return NextResponse.json(routeData)
            } catch (groqError: any) {
                console.error("Groq failed, trying HF fallback:", groqError.message)
                const routeData = await generateAndParse("HF")
                console.log("Success with HF fallback")
                return NextResponse.json(routeData)
            }
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
