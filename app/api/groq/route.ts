// DeepSeek (Primary) -> OpenRouter (Fallback)
import { openrouterInference, OPENROUTER_MODEL } from "@/lib/openrouter"
import { deepseekInference } from "@/lib/deepseek"
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
            customDestination,
            customBudget
        } = body

        const durationDays = startDate && endDate
            ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 7

        // Define strict budget caps (updated to match new UI ranges)
        let budgetCap = 0;
        let budgetDesc = "";

        if (budget === "custom" && customBudget) {
            budgetCap = parseInt(customBudget.replace(/\D/g, '')) || 100000;
            budgetDesc = `Custom User Budget (${budgetCap} RUB)`;
        } else {
            switch (budget) {
                case "economy":
                    budgetCap = 7500 * durationDays;
                    budgetDesc = `Economy (~7.5k RUB/day - Хостелы, публичный транспорт, бесплатные активности)`;
                    break;
                case "comfort":
                    budgetCap = 20000 * durationDays;
                    budgetDesc = `Comfort (~20k RUB/day - Отели 3-4*, такси, хорошие рестораны)`;
                    break;
                case "premium":
                case "luxury":
                    budgetCap = 50000 * durationDays;
                    budgetDesc = `Premium (~50k RUB/day - 5* отели, бизнес-класс, VIP)`;
                    break;
                default:
                    budgetCap = 15000 * durationDays;
                    budgetDesc = "Moderate (~15k RUB/day)";
            }
        }


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
      - Travel Pace: ${preferences.pace || 'moderate'} (STRICT: If 'slow', suggest late starts and more free time. If 'fast', pack the day with activities).
      - Dietary: ${preferences.dietaryRestrictions?.join(', ') || 'None'}, Extra: ${preferences.dietaryCustom || 'None'}
      - Interests: ${preferences.interestsDetailed?.join(', ') || 'General'}, Extra: ${preferences.interestsCustom || 'None'}
      - Available Payment Methods: ${paymentMethods?.join(', ') || 'Not specified'}
      - Require Russian Speaking Guides: ${requireRussianGuide ? 'YES' : 'NO'}
      - Visited Countries: ${preferences.visitedCountries?.join(', ') || 'None specified'} (STRICT: If the target country is in this list, suggest NEW/HIDDEN spots. If exploring regions, AVOID these countries entirely).

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

        const systemPrompt = "You are an expert travel planner for TraveLM, specialized in Russian travelers. You provide JSON only. Be concise."

        // Helper to parse JSON from AI response
        function parseJsonResponse(raw: string, source: string): any {
            if (!raw) throw new Error(`Empty response from ${source}`)

            let clean = raw.match(/\{[\s\S]*\}/)?.[0] || raw

            if (!clean.trim().endsWith('}')) {
                console.warn(`${source} JSON appears truncated, attempting basic repair...`);
                let openBraces = (clean.match(/\{/g) || []).length;
                let closeBraces = (clean.match(/\}/g) || []).length;
                while (openBraces > closeBraces) { clean += '}'; closeBraces++; }
            }

            // Also fix truncated arrays
            if (!clean.trim().endsWith('}')) {
                clean = clean.replace(/,\s*$/, '') + ']}'
            }

            return JSON.parse(clean);
        }

        // Generate metadata (title, budget analysis, visa, safety) - small request
        async function generateMetadata(): Promise<any> {
            const metaPrompt = `
Generate ONLY the metadata for a travel itinerary. NO itinerary days needed.

DESTINATION: ${targetDescription}
DEPARTURE: ${departureCity}
DURATION: ${durationDays} days
BUDGET: ${budgetDesc} (max ${budgetCap} RUB)
STYLE: ${travelStyle.join(', ')}
PACE: ${preferences.pace || 'moderate'}
VISITED: ${preferences.visitedCountries?.join(', ') || 'None'}
PAYMENT METHODS: ${paymentMethods?.join(', ') || 'Not specified'}
PERSONALIZATION: ${preferences.interestsDetailed?.join(', ') || 'General'}
DIETARY: ${preferences.dietaryRestrictions?.join(', ') || 'None'}

Output VALID JSON only (all strings must be in double quotes):
{
  "title": "Название маршрута",
  "description": "Краткое описание на 2-3 предложения",
  "totalBudget": "${budgetCap} ₽",
  "budgetAnalysis": {
    "avgAccommodation": "5000 ₽/ночь",
    "avgFood": "3000 ₽/день",
    "avgTransport": "15000 ₽",
    "avgActivities": "5000 ₽/день",
    "avgMisc": "3000 ₽"
  },
  "visaAdvice": "Детальная информация о визе для граждан РФ",
  "paymentAdvice": "Какие карты работают, где менять деньги",
  "safetyInfo": { "rating": 8, "tips": "Советы по безопасности" },
  "restrictions": "Текущие ограничения если есть или null",
  "countries": [{"name": "Название страны"}],
  "tags": ["вино", "горы", "море"]
}

CRITICAL: 
- Output ONLY valid JSON, no markdown, no comments
- ALL values must be in double quotes (including tags)
- Do NOT use unquoted hashtags
- Fill ALL fields with REAL data for this destination!`;

            console.log("Parallel: Generating metadata...");
            const messages = [
                { role: "system" as const, content: systemPrompt },
                { role: "user" as const, content: metaPrompt }
            ]

            const raw = await deepseekInference(messages, { maxTokens: 2000, temperature: 0.6, tripDays: 3 });
            return parseJsonResponse(raw, "DeepSeek-Meta");
        }

        // Generate a chunk of days (e.g., days 1-4)
        async function generateDayChunk(startDay: number, endDay: number, destination: string): Promise<any[]> {
            const chunkPrompt = `
Generate ONLY days ${startDay} to ${endDay} of a ${durationDays}-day trip itinerary.

CONTEXT:
- DESTINATION: ${destination}
- DEPARTURE CITY: ${departureCity}
- STYLE: ${travelStyle.join(', ')}
- PACE: ${preferences.pace || 'moderate'} (STRICT: Follow intensity based on pace)
- DIETARY: ${preferences.dietaryRestrictions?.join(', ') || 'None'}
- BUDGET LEVEL: ${budgetDesc}
- START DATE: ${startDate || 'Flexible'}
- END DATE: ${endDate || 'Flexible'}

For EACH day, provide exactly this JSON structure inside an array:
[
  {
    "day": ${startDay},
    "title": "Название дня",
    "dayTotal": "X ₽",
    "activities": [
      { 
        "time": "Утро", 
        "placeName": "КОНКРЕТНОЕ название места", 
        "desc": "Описание", 
        "cost": "X ₽", 
        "ticketsRequired": false, 
        "mapLink": "https://www.google.com/maps/search/?api=1&query=PLACE_NAME+CITY",
        "link": "" 
      }
    ],
    "logistics": { 
      "mode": "Самолет/Поезд/Такси", 
      "from": "Откуда", 
      "to": "Куда", 
      "distance": "Xkm", 
      "duration": "Xч", 
      "price": "X ₽",
      "bookingLink": "URL для бронирования"
    }
  }
]

CRITICAL LINK FORMATS:
1. mapLink (ОБЯЗАТЕЛЬНО): https://www.google.com/maps/search/?api=1&query=URL_ENCODED_PLACE_NAME
   Пример: https://www.google.com/maps/search/?api=1&query=Museo+del+Prado+Madrid

2. Для logistics.bookingLink используй РЕАЛЬНЫЕ ссылки:
   - АВИАБИЛЕТЫ: https://www.aviasales.ru/search/${departureCity.substring(0, 3).toUpperCase()}${startDate?.replace(/-/g, '')}${destination.substring(0, 3).toUpperCase()}1
   - ПОЕЗДА РЖД: https://www.rzd.ru/
   - АВТОБУСЫ: https://www.blablacar.ru/search?fn=${departureCity}&tn=${destination}
   
3. Для ticketsRequired=true в link используй:
   - МУЗЕИ: https://www.google.com/search?q=купить+билеты+НАЗВАНИЕ+МУЗЕЯ+официальный+сайт
   - ЭКСКУРСИИ: https://www.getyourguide.com/s/?q=DESTINATION+ACTIVITY&searchSource=1
   - СОБЫТИЯ: https://www.google.com/search?q=tickets+EVENT_NAME+official

RULES:
- Generate EXACTLY ${endDay - startDay + 1} days (from day ${startDay} to day ${endDay})
- Each day MUST have exactly 3 activities: Утро, День, Вечер
- placeName MUST be REAL specific venue names
- ALL links must be properly URL-encoded
- Respond in RUSSIAN only
- Output ONLY the JSON array`;

            console.log(`Parallel: Generating days ${startDay}-${endDay}...`);
            const messages = [
                { role: "system" as const, content: systemPrompt },
                { role: "user" as const, content: chunkPrompt }
            ]

            const tokensNeeded = (endDay - startDay + 1) * 1800; // ~1800 tokens per day with links
            const raw = await deepseekInference(messages, {
                maxTokens: Math.min(tokensNeeded, 8000),
                temperature: 0.6,
                tripDays: endDay - startDay + 1
            });

            // Parse array response
            let clean = raw.match(/\[[\s\S]*\]/)?.[0] || raw;
            return JSON.parse(clean);
        }

        // Main generation logic
        async function generateParallel(): Promise<any> {
            const CHUNK_SIZE = 4; // Days per chunk
            const USE_PARALLEL = durationDays > 7;

            if (!USE_PARALLEL) {
                // Short trip - use original single request
                console.log(`Short trip(${durationDays} days) - using single request`);
                const messages = [
                    { role: "system" as const, content: systemPrompt },
                    { role: "user" as const, content: prompt }
                ]
                const raw = await deepseekInference(messages, { maxTokens: 8000, temperature: 0.6, tripDays: durationDays });
                return parseJsonResponse(raw, "DeepSeek");
            }

            // Long trip - parallel generation
            console.log(`Long trip(${durationDays} days) - using PARALLEL generation`);
            const startTime = Date.now();

            // Create chunk ranges
            const chunks: { start: number; end: number }[] = [];
            for (let i = 1; i <= durationDays; i += CHUNK_SIZE) {
                chunks.push({
                    start: i,
                    end: Math.min(i + CHUNK_SIZE - 1, durationDays)
                });
            }
            console.log(`Splitting into ${chunks.length} day chunks + metadata`);

            // Determine destination for day chunks
            const destName = customDestination ||
                (destinationType === 'russia' ? 'Россия' :
                    destinationType === 'abroad' ? 'Европа/Азия' : 'Международный');

            // Run ALL requests in parallel
            const [metadata, ...dayChunks] = await Promise.all([
                generateMetadata(),
                ...chunks.map(chunk => generateDayChunk(chunk.start, chunk.end, destName))
            ]);

            // Merge all days into single itinerary
            const allDays = dayChunks.flat().sort((a, b) => a.day - b.day);

            const result = {
                ...metadata,
                itinerary: allDays,
                coverImage: "" // Will be enriched below
            };

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`Parallel generation completed in ${elapsed}s(${chunks.length + 1} requests)`);

            return result;
        }

        try {
            // PRIMARY: DeepSeek with parallel generation
            try {
                console.log("Using DeepSeek as primary provider...");
                const routeData = await generateParallel();

                // Enrich with cover image
                try {
                    if (routeData.countries && routeData.countries.length > 0) {
                        const cover = await getDestinationImage(routeData.countries[0].name + " travel");
                        if (cover) routeData.coverImage = cover;
                    }
                } catch (imgError) {
                    // Cover image is optional
                }

                console.log("Success with DeepSeek")
                return NextResponse.json(routeData)
            } catch (deepseekError: any) {
                console.error("DeepSeek failed:", deepseekError.message)

                // FALLBACK: OpenRouter (single request)
                console.log("Falling back to OpenRouter...");
                const messages = [
                    { role: "system" as const, content: systemPrompt },
                    { role: "user" as const, content: prompt }
                ]
                const raw = await openrouterInference(messages, { maxTokens: 30000, temperature: 0.6 });
                const routeData = parseJsonResponse(raw, "OpenRouter");

                // Enrich cover image
                try {
                    if (routeData.countries && routeData.countries.length > 0) {
                        const cover = await getDestinationImage(routeData.countries[0].name + " travel");
                        if (cover) routeData.coverImage = cover;
                    }
                } catch { }

                console.log("Success with OpenRouter fallback")
                return NextResponse.json(routeData)
            }
        } catch (finalError: any) {
            console.error("All providers failed:", finalError.message)
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
