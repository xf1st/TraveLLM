import { deepseekInference } from "@/lib/deepseek"
import { NextResponse } from "next/server"
import { GROUNDING_DATA_2026 } from "@/lib/grounding"

// Extract city from day title (e.g., "Токио: Сибуя" -> "Токио")
function extractCity(title: string): string {
  if (!title) return "Unknown"
  const colonIndex = title.indexOf(":")
  if (colonIndex > 0) {
    return title.substring(0, colonIndex).trim()
  }
  // Check for common patterns
  if (title.includes("Перелёт") || title.includes("Перелет")) return "FLIGHT"
  if (title.includes("Прибытие")) return "ARRIVAL"
  if (title.includes("Вылет")) return "DEPARTURE"
  return title.split(" ")[0].trim()
}

// Analyze itinerary to get city groups
function analyzeCityGroups(itinerary: any[]) {
  const groups: { city: string; startDay: number; endDay: number; days: any[] }[] = []
  let currentGroup: any = null

  for (const day of itinerary) {
    const city = extractCity(day.title)

    if (city === "FLIGHT" || city === "ARRIVAL" || city === "DEPARTURE") {
      // Flight/transition day - belongs to previous group
      if (currentGroup) {
        currentGroup.days.push(day)
        currentGroup.endDay = day.day
      }
      continue
    }

    if (!currentGroup || currentGroup.city !== city) {
      // New city group
      if (currentGroup) {
        groups.push(currentGroup)
      }
      currentGroup = {
        city,
        startDay: day.day,
        endDay: day.day,
        days: [day]
      }
    } else {
      // Same city, extend group
      currentGroup.days.push(day)
      currentGroup.endDay = day.day
    }
  }

  if (currentGroup) {
    groups.push(currentGroup)
  }

  return groups
}

// Generate a single new day content
async function generateSingleDay(city: string, dayNumber: number, existingDays: any[]): Promise<any> {
  const usedPlaces = existingDays
    .flatMap((d: any) => d.activities?.map((a: any) => a.placeName) || [])
    .join(", ")

  const prompt = `Сгенерируй ОДИН день путешествия в городе ${city}.
УЧИТЫВАЙ РЕАЛЬНОСТЬ (Январь 2026): ${GROUNDING_DATA_2026.globalRestrictions.join(' ')}. Аэропорты: ${GROUNDING_DATA_2026.airportStatus.join(' ')}.
${city === 'Moscow' ? 'Популярные места: ' + GROUNDING_DATA_2026.trendingLocations.Moscow.join(', ') : ''}


День номер: ${dayNumber}
УЖЕ ИСПОЛЬЗОВАННЫЕ МЕСТА (не повторять!): ${usedPlaces || "нет"}

Верни ТОЛЬКО JSON:
{
  "day": ${dayNumber},
  "title": "${city}: [название достопримечательности или района]",
  "dayTotal": "[сумма] ₽",
  "activities": [
    { "time": "Утро", "placeName": "[КОНКРЕТНОЕ название места]", "desc": "[2-3 предложения описания]", "cost": "[цена] ₽", "ticketsRequired": true/false, "mapLink": "https://www.google.com/maps/search/?api=1&query=[place+name+${city}]", "link": "" },
    { "time": "День", "placeName": "...", "desc": "...", "cost": "...", "ticketsRequired": false, "mapLink": "...", "link": "" },
    { "time": "Вечер", "placeName": "...", "desc": "...", "cost": "...", "ticketsRequired": false, "mapLink": "...", "link": "" }
  ],
  "logistics": null
}

ВАЖНО: Отвечай ТОЛЬКО JSON, без markdown!`

  const raw = await deepseekInference([
    { role: "system", content: "Ты эксперт по путешествиям. Генерируй уникальные места, не повторяй уже использованные." },
    { role: "user", content: prompt }
  ], { maxTokens: 4000, temperature: 0.7 })

  try {
    const clean = raw.match(/\{[\s\S]*\}/)?.[0] || raw
    return JSON.parse(clean)
  } catch {
    return null
  }
}

// Generate departure day
async function generateDepartureDay(fromCity: string, dayNumber: number): Promise<any> {
  return {
    day: dayNumber,
    title: `Вылет в Москву`,
    dayTotal: "52 000 ₽",
    activities: [
      {
        time: "Утро",
        placeName: `Аэропорт ${fromCity}`,
        desc: "Сборы в отеле, последний завтрак. Трансфер в аэропорт.",
        cost: "3000 ₽",
        ticketsRequired: false,
        mapLink: `https://www.google.com/maps/search/?api=1&query=Airport+${fromCity.replace(/\s/g, "+")}`,
        link: ""
      },
      {
        time: "День",
        placeName: "Перелёт",
        desc: "Перелёт домой. Время в пути зависит от маршрута.",
        cost: "45000 ₽",
        ticketsRequired: true,
        mapLink: "",
        link: "https://www.aviasales.ru"
      },
      {
        time: "Вечер",
        placeName: "Москва",
        desc: "Прибытие в Москву. Конец путешествия!",
        cost: "4000 ₽",
        ticketsRequired: false,
        mapLink: "https://www.google.com/maps/search/?api=1&query=Moscow+Airport",
        link: ""
      }
    ],
    logistics: { mode: "Самолёт", from: fromCity, to: "Москва", distance: "~3000 км", duration: "~4ч", price: "45 000 ₽" }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { currentItinerary, userMessage } = body

    if (!currentItinerary || !userMessage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const itinerary = currentItinerary.itinerary || []
    const totalDays = itinerary.length

    console.log("Modify: Analyzing city groups...")
    const cityGroups = analyzeCityGroups(itinerary)
    console.log("City groups:", cityGroups.map(g => `${g.city}(${g.days.length}d)`).join(" → "))

    // Analyze Trip Context (Vibe & Budget)
    const tripTitle = currentItinerary.title || "Путешествие"
    const tripDesc = currentItinerary.description || ""
    const currentBudget = currentItinerary.totalBudget || "Не указан"

    // Calculate simple vibe stats
    let expensiveCount = 0
    let cheapCount = 0
    itinerary.forEach((d: any) => {
      d.activities?.forEach((a: any) => {
        if (a.cost?.replace(/[^0-9]/g, "") > 3000) expensiveCount++
        else cheapCount++
      })
    })
    const vibe = expensiveCount > cheapCount ? "Luxury/Comfort" : "Budget/Economy"

    // Parse user request with fast AI - now supports activity-level edits
    const parsePrompt = `Проанализируй запрос пользователя на изменение маршрута.

КОНТЕКСТ ПУТЕШЕСТВИЯ:
- Название: ${tripTitle}
- Стиль: ${vibe}
- Бюджет: ${currentBudget}

ТЕКУЩИЙ МАРШРУТ:
${itinerary.map((day: any) => `День ${day.day}: ${day.title}
  Активности: ${day.activities?.map((a: any) => `${a.time}: ${a.placeName}`).join(', ') || 'нет'}`).join('\n')}

ЗАПРОС ПОЛЬЗОВАТЕЛЯ: "${userMessage}"

ЗАДАЧА: Определи ТИП изменения и верни соответствующий JSON.

ТИП 1 - РЕДАКТИРОВАНИЕ АКТИВНОСТИ (замена/изменение конкретной активности в конкретном дне):
Примеры: "замени музей на ресторан в день 3", "в день 2 утром хочу кофейню", "убери торговый центр из дня 5"
{
  "action": "edit_activity",
  "dayNumber": 3,
  "timeSlot": "Утро" | "День" | "Вечер" | null,
  "currentActivity": "название текущей активности или null",
  "newActivityRequest": "что хочет пользователь вместо этого",
  "explanation": "Заменяю музей на ресторан в день 3"
}

ТИП 2 - ПЕРЕРАСПРЕДЕЛЕНИЕ ДНЕЙ (изменение количества дней в городах):
Примеры: "сократи пребывание в Анапе", "добавь дней в Токио", "меньше времени на пляж"
{
  "action": "redistribute",
  "changes": [
    { "city": "Токио", "currentDays": 6, "newDays": 10 },
    { "city": "Анапа", "currentDays": 8, "newDays": 2 }
  ],
  "explanation": "Сократил Анапу с 8 до 2 дней"
}

ТИП 3 - ДОБАВЛЕНИЕ АКТИВНОСТИ (добавить что-то в день):
{
  "action": "add_activity",
  "dayNumber": 2,
  "timeSlot": "Вечер",
  "newActivityRequest": "добавить вечерний бар",
  "explanation": "Добавляю вечерний бар в день 2"
}

Верни СТРОГО JSON без markdown!`

    const parseRaw = await deepseekInference([
      { role: "system", content: "Ты анализируешь запросы на изменение маршрутов." },
      { role: "user", content: parsePrompt }
    ], { maxTokens: 1000, temperature: 0.3 })

    let parsedRequest
    try {
      const clean = parseRaw.match(/\{[\s\S]*\}/)?.[0] || parseRaw
      parsedRequest = JSON.parse(clean)
    } catch {
      return NextResponse.json({
        explanation: "Не удалось понять запрос. Попробуйте:\n• 'Замени музей на ресторан в день 3'\n• 'Добавь кофейню в день 2 утром'\n• 'Сократи Анапу до 2 дней'",
        modificationType: "general_advice",
        modifications: []
      })
    }

    console.log("Parsed request:", parsedRequest)

    // Handle edit_activity action - replace/modify specific activity in a day
    if (parsedRequest.action === "edit_activity") {
      const { dayNumber, timeSlot, currentActivity, newActivityRequest } = parsedRequest
      const targetDay = itinerary.find((d: any) => d.day === dayNumber)

      if (!targetDay) {
        return NextResponse.json({
          explanation: `День ${dayNumber} не найден в маршруте.`,
          modificationType: "error",
          modifications: []
        })
      }

      // Get city from day title
      const city = extractCity(targetDay.title)

      // Generate new activity with AI
      const activityPrompt = `Сгенерируй ОДНУ активность для путешествия.

Город: ${city}
День: ${dayNumber}
Время: ${timeSlot || "любое"}
Запрос пользователя: "${newActivityRequest}"
Стиль поездки: ${vibe}
Бюджет: ${currentBudget}

${currentActivity ? `Заменяем активность: ${currentActivity}` : "Новая активность"}

Верни ТОЛЬКО JSON одной активности:
{
  "time": "${timeSlot || "День"}",
  "placeName": "КОНКРЕТНОЕ название места",
  "desc": "2-3 предложения описания",
  "cost": "цена ₽",
  "ticketsRequired": true/false,
  "mapLink": "https://www.google.com/maps/search/?api=1&query=place+name+${city.replace(/\s/g, "+")}",
  "link": ""
}`

      const activityRaw = await deepseekInference([
        { role: "system", content: "Ты эксперт по путешествиям. Генерируй реальные места." },
        { role: "user", content: activityPrompt }
      ], { maxTokens: 500, temperature: 0.7 })

      let newActivity
      try {
        const clean = activityRaw.match(/\{[\s\S]*\}/)?.[0] || activityRaw
        newActivity = JSON.parse(clean)
      } catch {
        return NextResponse.json({
          explanation: "Не удалось сгенерировать новую активность. Попробуйте еще раз.",
          modificationType: "error",
          modifications: []
        })
      }

      // Create updated itinerary
      const newItinerary = itinerary.map((day: any) => {
        if (day.day !== dayNumber) return day

        let updatedActivities = [...(day.activities || [])]

        if (timeSlot) {
          // Replace activity at specific time slot
          const activityIndex = updatedActivities.findIndex((a: any) =>
            a.time?.toLowerCase() === timeSlot.toLowerCase()
          )
          if (activityIndex >= 0) {
            updatedActivities[activityIndex] = { ...newActivity, time: timeSlot }
          } else {
            updatedActivities.push({ ...newActivity, time: timeSlot })
          }
        } else if (currentActivity) {
          // Replace activity by name match
          const activityIndex = updatedActivities.findIndex((a: any) =>
            a.placeName?.toLowerCase().includes(currentActivity.toLowerCase())
          )
          if (activityIndex >= 0) {
            updatedActivities[activityIndex] = newActivity
          }
        } else {
          // Just add the activity
          updatedActivities.push(newActivity)
        }

        // Recalculate day total
        const dayTotal = updatedActivities.reduce((sum: number, a: any) => {
          const cost = parseInt(String(a.cost || "0").replace(/[^0-9]/g, "")) || 0
          return sum + cost
        }, 0)

        return {
          ...day,
          activities: updatedActivities,
          dayTotal: `${dayTotal.toLocaleString("ru-RU")} ₽`
        }
      })

      return NextResponse.json({
        explanation: parsedRequest.explanation || `Обновил активность в день ${dayNumber}`,
        modificationType: "activity_edit",
        modifications: [{ type: "replace_all_days", newItinerary }]
      })
    }

    // Handle add_activity action
    if (parsedRequest.action === "add_activity") {
      const { dayNumber, timeSlot, newActivityRequest } = parsedRequest
      const targetDay = itinerary.find((d: any) => d.day === dayNumber)

      if (!targetDay) {
        return NextResponse.json({
          explanation: `День ${dayNumber} не найден.`,
          modificationType: "error",
          modifications: []
        })
      }

      const city = extractCity(targetDay.title)

      const activityPrompt = `Сгенерируй активность: "${newActivityRequest}" в городе ${city}.
Время: ${timeSlot || "День"}
Стиль: ${vibe}

Верни JSON:
{
  "time": "${timeSlot || "День"}",
  "placeName": "название",
  "desc": "описание",
  "cost": "цена ₽",
  "ticketsRequired": false,
  "mapLink": "https://www.google.com/maps/search/?api=1&query=...",
  "link": ""
}`

      const activityRaw = await deepseekInference([
        { role: "system", content: "Генератор активностей для путешествий." },
        { role: "user", content: activityPrompt }
      ], { maxTokens: 400, temperature: 0.7 })

      let newActivity
      try {
        const clean = activityRaw.match(/\{[\s\S]*\}/)?.[0] || activityRaw
        newActivity = JSON.parse(clean)
      } catch {
        return NextResponse.json({
          explanation: "Ошибка генерации. Попробуйте еще раз.",
          modificationType: "error",
          modifications: []
        })
      }

      const newItinerary = itinerary.map((day: any) => {
        if (day.day !== dayNumber) return day

        const updatedActivities = [...(day.activities || []), newActivity]
        const dayTotal = updatedActivities.reduce((sum: number, a: any) => {
          return sum + (parseInt(String(a.cost || "0").replace(/[^0-9]/g, "")) || 0)
        }, 0)

        return {
          ...day,
          activities: updatedActivities,
          dayTotal: `${dayTotal.toLocaleString("ru-RU")} ₽`
        }
      })

      return NextResponse.json({
        explanation: parsedRequest.explanation || `Добавил активность в день ${dayNumber}`,
        modificationType: "activity_add",
        modifications: [{ type: "replace_all_days", newItinerary }]
      })
    }

    if (parsedRequest.action === "redistribute") {
      // Smart redistribution
      const modifications: any[] = []
      let newItinerary: any[] = []
      let currentDayNum = 1

      // Process each city group
      for (const group of cityGroups) {
        const change = parsedRequest.changes?.find((c: any) =>
          c.city.toLowerCase().includes(group.city.toLowerCase()) ||
          group.city.toLowerCase().includes(c.city.toLowerCase())
        )

        if (change && change.newDays < change.currentDays) {
          // REDUCE days - keep first N days
          const daysToKeep = group.days.slice(0, change.newDays)
          for (const day of daysToKeep) {
            newItinerary.push({ ...day, day: currentDayNum++ })
          }
          console.log(`${group.city}: reduced from ${group.days.length} to ${change.newDays} days`)
        } else if (change && change.newDays > change.currentDays) {
          // INCREASE days - keep existing + add new ones PARALLEL
          for (const day of group.days) {
            newItinerary.push({ ...day, day: currentDayNum++ })
          }

          const daysToAdd = change.newDays - change.currentDays
          console.log(`${group.city}: adding ${daysToAdd} new days in parallel...`)

          // Generate new days in PARALLEL
          const newDayPromises = []
          for (let i = 0; i < daysToAdd; i++) {
            newDayPromises.push(generateSingleDay(group.city, currentDayNum + i, [...group.days, ...newItinerary]))
          }

          const newDays = await Promise.all(newDayPromises)
          for (const newDay of newDays) {
            if (newDay) {
              newDay.day = currentDayNum++
              newItinerary.push(newDay)
            }
          }
        } else {
          // No change - keep as is
          for (const day of group.days) {
            newItinerary.push({ ...day, day: currentDayNum++ })
          }
        }
      }

      // Always end with departure day
      const lastCity = cityGroups[cityGroups.length - 1]?.city || "город"
      const lastDay = newItinerary[newItinerary.length - 1]

      // Check if last day is already departure
      const lastTitle = lastDay?.title?.toLowerCase() || ""
      if (!lastTitle.includes("вылет") && !lastTitle.includes("москв")) {
        // Replace last day with departure OR add departure
        if (newItinerary.length >= totalDays) {
          // Replace last day
          const departureDay = await generateDepartureDay(lastCity, currentDayNum - 1)
          newItinerary[newItinerary.length - 1] = departureDay
        } else {
          // Add departure day
          const departureDay = await generateDepartureDay(lastCity, currentDayNum)
          newItinerary.push(departureDay)
        }
      }

      // Ensure correct total days
      if (newItinerary.length > totalDays) {
        newItinerary = newItinerary.slice(0, totalDays)
      }

      // Renumber all days
      newItinerary = newItinerary.map((day, idx) => ({ ...day, day: idx + 1 }))

      // REGENERATE METADATA (Budget & Info)
      console.log("Regenerating metadata...")
      const metadataPrompt = `Проанализируй новый маршрут и обнови мета-информацию.
      
      МАРШРУТ:
      ${JSON.stringify(newItinerary.map((d: any) => ({ day: d.day, title: d.title, total: d.dayTotal })))}

      Верни JSON:
      {
         "totalBudget": "[сумма] ₽ (посчитай сумму всех дней + 20%)",
         "budgetAnalysis": {
           "avgAccommodation": "...",
           "avgFood": "...",
           "avgTransport": "...",
           "avgActivities": "...",
           "avgMisc": "..."
         },
         "importantInfo": [
           { "title": "Виза/Въезд", "description": "..." },
           { "title": "Валюта", "description": "..." },
           { "title": "Транспорт", "description": "..." }
         ]
      }`

      const metaRaw = await deepseekInference([
        { role: "system", content: "Ты финансовый аналитик путешествий." },
        { role: "user", content: metadataPrompt }
      ], { maxTokens: 1000 })

      let metadataUpdates = null
      try {
        const cleanMeta = metaRaw.match(/\{[\s\S]*\}/)?.[0] || metaRaw
        metadataUpdates = JSON.parse(cleanMeta)
      } catch (e) {
        console.error("Failed to parse metadata", e)
      }

      return NextResponse.json({
        explanation: parsedRequest.explanation || `Перераспределил дни между городами`,
        modificationType: "smart_edit",
        modifications: [{ type: "replace_all_days", newItinerary }],
        metadataUpdates: metadataUpdates
      })
    }

    // Default: unknown action
    return NextResponse.json({
      explanation: "Уточните запрос. Примеры:\n• 'Замени музей на кафе в день 2'\n• 'Добавь вечерний бар в день 3'\n• 'Сократи Сочи до 3 дней'",
      modificationType: "general_advice",
      modifications: []
    })

  } catch (error: any) {
    console.error("Modify Itinerary API Error:", error)
    return NextResponse.json({
      error: error.message || "Unknown error",
    }, { status: 500 })
  }
}
