import type { TripAssistantLocale } from "@/lib/trip-assistant-segment"

export function captionInstruction(locale: TripAssistantLocale): string {
  if (locale === "en") {
    return `Briefly (1–3 sentences in English) describe what is in the photo and how it may relate to trip planning (place, food, sight, vibe). No JSON, no bullet lists.`
  }
  return `Опиши кратко (1–3 предложения на русском), что на фото и как это может относиться к планированию поездки (место, еда, достопримечательность, атмосфера). Без JSON, без списков.`
}

export function captionSystem(locale: TripAssistantLocale): string {
  return locale === "en"
    ? "You describe images briefly for a travel chat. Reply with the description only."
    : "Ты помощник для краткого описания изображений для туристического чата. Отвечай только описанием."
}

export function classifierSystem(locale: TripAssistantLocale): string {
  return locale === "en"
    ? "Intent analyzer for travel itinerary change requests. Reply with JSON only."
    : "Анализатор намерений и запросов на изменение маршрутов. Отвечай только JSON."
}

export function buildClassifierPrompt(
  locale: TripAssistantLocale,
  args: {
    tripTitle: string
    destination: string
    tripBudget: string
    tripDaysCount: number
    compactSummary: string
    imageContext: string
    userMessage: string
    /** День, который пользователь сейчас открыл в UI (для «отсюда», «остаток маршрута»). */
    contextDay?: number | null
    /** Сжатый текст прошлых реплик (см. trip-assistant-conversation). */
    conversationBlock?: string
  }
): string {
  const {
    tripTitle,
    destination,
    tripBudget,
    tripDaysCount,
    compactSummary,
    imageContext,
    userMessage,
    contextDay,
    conversationBlock,
  } = args

  const conv =
    conversationBlock && conversationBlock.trim().length > 0
      ? locale === "en"
        ? `\n${conversationBlock.trim()}\n`
        : `\n${conversationBlock.trim()}\n`
      : ""

  const uiCtxEn =
    contextDay != null && contextDay >= 1 && contextDay <= tripDaysCount
      ? `\nUI CONTEXT: The user is currently viewing **day ${contextDay}** (of ${tripDaysCount}). If they say “from here”, “the rest of the trip”, “tail”, “rewrite onward”, or similar without a number, set rewrite_segment startDay to ${contextDay} and endDay to ${tripDaysCount} (or set rewriteToEnd: true).\n`
      : ""

  const uiCtxRu =
    contextDay != null && contextDay >= 1 && contextDay <= tripDaysCount
      ? `\nКОНТЕКСТ UI: Пользователь сейчас смотрит **день ${contextDay}** (из ${tripDaysCount}). Если «отсюда», «остаток маршрута», «хвост», «перепиши дальше» без номера — для rewrite_segment startDay = ${contextDay}, endDay = ${tripDaysCount} или rewriteToEnd: true.\n`
      : ""

  if (locale === "en") {
    return `Analyze the user's message about their travel itinerary.

TRIP: "${tripTitle}"
Destination: ${destination}
Budget (reference): ${tripBudget}
Days in itinerary: ${tripDaysCount}
${uiCtxEn}
SHORT DAY OVERVIEW (not full JSON):
${compactSummary}
${imageContext ? `\nPHOTO CONTEXT (if attachments): ${imageContext}\n` : ""}${conv}
USER MESSAGE (classify THIS message; use chat history only for anaphora): "${userMessage}"

If the user wants to CHANGE the itinerary, return JSON:

1 — edit/replace one activity:
{"intent":"MODIFY","action":"edit_activity","dayNumber":N,"timeSlot":"Morning/Day/Evening or null","currentActivity":"current name or null","newActivityRequest":"what they want","explanation":"short"}

2 — add an activity to a day:
{"intent":"MODIFY","action":"add_activity","dayNumber":N,"timeSlot":"Evening","newActivityRequest":"what to add","explanation":"..."}

3 — REWRITE A RANGE OF CONSECUTIVE DAYS (replace days startDay..endDay entirely). For “rewrite from day A to the end / rest of trip”, use endDay=${tripDaysCount} OR {"rewriteToEnd":true} (omit endDay or set endDay to ${tripDaysCount}):
{"intent":"MODIFY","action":"rewrite_segment","startDay":A,"endDay":B,"newSegmentRequest":"what to change in these days","explanation":"..."}
Alternative: {"intent":"MODIFY","action":"rewrite_segment","startDay":A,"rewriteToEnd":true,"newSegmentRequest":"...","explanation":"..."}

4 — redistribute days across cities:
{"intent":"MODIFY","action":"redistribute","changes":[{"city":"X","currentDays":N,"newDays":M}],"explanation":"..."}

If the user asks a QUESTION (does not want to change the itinerary):
{"intent":"QUESTION"}

Return JSON ONLY, no markdown.`
  }

  return `Проанализируй сообщение пользователя о маршруте путешествия.

ПУТЕШЕСТВИЕ: "${tripTitle}"
Направление: ${destination}
Бюджет (справочно): ${tripBudget}
Дней в маршруте: ${tripDaysCount}
${uiCtxRu}
КРАТКИЙ ОБЗОР ДНЕЙ (без полного JSON):
${compactSummary}
${imageContext ? `\nКОНТЕКСТ ФОТО (если были вложения): ${imageContext}\n` : ""}${conv}
СООБЩЕНИЕ (классифицируй ЕГО; история — только для отсылок «как выше»): "${userMessage}"

Если пользователь хочет ИЗМЕНИТЬ маршрут — верни JSON:

Вариант 1 — редактировать/заменить одну активность:
{"intent":"MODIFY","action":"edit_activity","dayNumber":N,"timeSlot":"Утро/День/Вечер или null","currentActivity":"текущее название или null","newActivityRequest":"что хочет","explanation":"кратко"}

Вариант 2 — добавить активность в день:
{"intent":"MODIFY","action":"add_activity","dayNumber":N,"timeSlot":"Вечер","newActivityRequest":"что добавить","explanation":"..."}

Вариант 3 — ПЕРЕПИСАТЬ НЕСКОЛЬКО ДНЕЙ ПОДРЯД (заменить целиком дни startDay..endDay). Для «с дня A до конца / остаток» — endDay=${tripDaysCount} или rewriteToEnd: true:
{"intent":"MODIFY","action":"rewrite_segment","startDay":A,"endDay":B,"newSegmentRequest":"что именно переделать в этих днях","explanation":"..."}
Либо: {"intent":"MODIFY","action":"rewrite_segment","startDay":A,"rewriteToEnd":true,"newSegmentRequest":"...","explanation":"..."}

Вариант 4 — перераспределить дни по городам:
{"intent":"MODIFY","action":"redistribute","changes":[{"city":"X","currentDays":N,"newDays":M}],"explanation":"..."}

Если пользователь задаёт ВОПРОС (не хочет менять маршрут):
{"intent":"QUESTION"}

Верни ТОЛЬКО JSON, без markdown.`
}

export function buildAnswerPrompt(
  locale: TripAssistantLocale,
  args: {
    currentDate: string
    locationStr: string
    imageContext: string
    tripTitle: string
    destination: string
    tripBudget: string
    dayCount: number
    itineraryContext: string
    grounding: string
    userMessage: string
    /** День, открытый в UI (для «этот день», «отсюда»). */
    contextDay?: number | null
    conversationBlock?: string
  }
): { system: string; user: string } {
  const {
    currentDate,
    locationStr,
    imageContext,
    tripTitle,
    destination,
    tripBudget,
    dayCount,
    itineraryContext,
    grounding,
    userMessage,
    contextDay,
    conversationBlock,
  } = args

  const convBlock =
    conversationBlock && conversationBlock.trim().length > 0
      ? `${conversationBlock.trim()}\n\n`
      : ""

  const uiLineEn =
    contextDay != null && contextDay >= 1 && contextDay <= dayCount
      ? `They have **day ${contextDay}** open in the UI (of ${dayCount}).\n`
      : ""
  const uiLineRu =
    contextDay != null && contextDay >= 1 && contextDay <= dayCount
      ? `В интерфейсе открыт **день ${contextDay}** (из ${dayCount}).\n`
      : ""

  if (locale === "en") {
    return {
      system:
        "You are TraveLLM’s trip copilot: warm, practical, never boring. Reply ONLY in English. Plain text; **bold** and short markdown lists are OK.",
      user: `You help someone who is viewing their trip itinerary.

TODAY: ${currentDate}
USER LOCATION: ${locationStr}
${uiLineEn}${imageContext ? `ATTACHED PHOTOS CONTEXT: ${imageContext}\n` : ""}${convBlock}TRIP:
- Title: ${tripTitle}
- Destination: ${destination}
- Budget: ${tripBudget}
- Days: ${dayCount}

ITINERARY:
${itineraryContext}

FACTS (2026):
${grounding}

USER QUESTION: "${userMessage}"

RULES:
1. Answer ONLY in English.
2. If they ask "where am I?" or "what is near me?", use their coordinates.
3. Be concise (2–6 sentences). You may use **bold** for key names. No raw HTML.
4. Prefer plain language; optional short bullet list if it helps.
5. If they ask about editing the route, remind them they can replace an activity, rewrite days X–Y, or rewrite from the current day through the last day (e.g. “rest of trip”).
6. Sound like a savvy travel buddy — encouraging, specific, no filler.

Answer:`,
    }
  }

  return {
    system:
      "Ты напарник по маршруту TraveLLM: дружелюбный, конкретный, без канцелярита. Отвечай только на русском. Можно **выделение** и короткие списки markdown.",
    user: `Пользователь смотрит свой маршрут.

СЕГОДНЯ: ${currentDate}
ТЕКУЩАЯ ГЕОЛОКАЦИЯ ПОЛЬЗОВАТЕЛЯ: ${locationStr}
${uiLineRu}${imageContext ? `КОНТЕКСТ ВЛОЖЕННЫХ ФОТО: ${imageContext}\n` : ""}${convBlock}КОНТЕКСТ ПУТЕШЕСТВИЯ:
- Название: ${tripTitle}
- Направление: ${destination}
- Бюджет: ${tripBudget}
- Дней: ${dayCount}

МАРШРУТ:
${itineraryContext}

РЕАЛЬНОСТЬ (2026):
${grounding}

ВОПРОС ПОЛЬЗОВАТЕЛЯ: "${userMessage}"

ПРАВИЛА:
1. Отвечай только на русском.
2. Если пользователь спрашивает "где я?" или "что рядом?", используй его геолокацию.
3. Кратко и по делу (2–5 предложений). Можно **выделить** названия.
4. Практичные советы.
5. Если вопрос про редактирование — напомни про замену активности, переписывание дней A–B или «остаток маршрута» с текущего дня до конца.
6. Тон: как опытный друг в поездке.

Ответ:`,
  }
}

export function segmentSystem(locale: TripAssistantLocale): string {
  return locale === "en"
    ? "You generate a fragment of a travel itinerary. Reply with JSON only."
    : "Генератор фрагментов туристического маршрута. Отвечай только JSON."
}

const SEGMENT_COST_RULES_EN = `
Pricing (each activity "cost"):
- Use realistic amounts in USD for this destination; do NOT paste large local-currency integers (e.g. IDR/VND) as if they were USD.
- A typical evening out (bar/dinner) abroad is usually tens–low hundreds of USD for most destinations, not six-digit dollar amounts.
`.trim()

const SEGMENT_COST_RULES_RU = `
СТОИМОСТЬ (поле cost у каждой активности):
- За границей: оценка в ₽ для пользователя; НЕ копируй крупные номиналы IDR/VND/батов как «рубли».
- Один вечер (бар/ужин) за границей — обычно порядка 2 000–25 000 ₽ на человека, не сотни тысяч.
`.trim()

export function buildSegmentUserPrompt(
  locale: TripAssistantLocale,
  args: {
    tripTitle: string
    destination: string
    tripBudget: string
    edgesBefore: string
    edgesAfter: string
    userRequest: string
    imageContext: string
    segmentJson: string
    startDay: number
    endDay: number
    /** Краткий контекст прошлых реплик чата */
    priorChatSummary?: string
  }
): string {
  const {
    tripTitle,
    destination,
    tripBudget,
    edgesBefore,
    edgesAfter,
    userRequest,
    imageContext,
    segmentJson,
    startDay,
    endDay,
    priorChatSummary,
  } = args
  const n = endDay - startDay + 1

  const prior =
    priorChatSummary && priorChatSummary.trim().length > 0
      ? locale === "en"
        ? `\nRECENT CHAT (for nuance):\n${priorChatSummary.trim()}\n`
        : `\nНЕДАВНИЙ ДИАЛОГ (для нюансов):\n${priorChatSummary.trim()}\n`
      : ""

  if (locale === "en") {
    return `You are rewriting a SEGMENT of a travel itinerary (several consecutive days). Keep logistics realistic and consistent with neighboring days.

TRIP: ${tripTitle}
Destination: ${destination}
Budget: ${tripBudget}

${SEGMENT_COST_RULES_EN}

NEIGHBORS (do not rewrite them fully — only use for connections):
${edgesBefore}
${edgesAfter}
${prior}
USER REQUEST: ${userRequest}
${imageContext ? `\nPHOTO CONTEXT: ${imageContext}\n` : ""}

CURRENT SEGMENT (days ${startDay}–${endDay}) — JSON:
${segmentJson}

Return ONLY JSON:
{ "days": [ /* array of days; each: day, title, tips (optional), activities: [{ time, type, title, placeName, desc, cost, mapLink, link?, bookingUrl?, ticketUrl? }] */ ] }

Rules:
- Exactly ${n} days. Field "day" must run from ${startDay} to ${endDay}.
- Activity types: transport | hotel | food | activity | free
- mapLink: Google Maps search (https://www.google.com/maps/search/?api=1&query=...)
- Short descriptions, specific place names.
- Align transfers/hotels with neighbors if the request implies it.
- Activity titles and descriptions must be in English.
- Every activity "cost" must follow the pricing rules above.

JSON:`
  }

  return `Ты переписываешь ФРАГМЕНТ маршрута путешествия (несколько дней подряд). Сохраняй реалистичную логистику и согласованность с соседними днями.

ПУТЕШЕСТВИЕ: ${tripTitle}
Направление: ${destination}
Бюджет: ${tripBudget}

${SEGMENT_COST_RULES_RU}

СОСЕДИ (не переписывай их целиком — только учитывай для стыковки):
${edgesBefore}
${edgesAfter}
${prior}
ЗАПРОС ПОЛЬЗОВАТЕЛЯ: ${userRequest}
${imageContext ? `\nФОТО/КОНТЕКСТ: ${imageContext}\n` : ""}

ТЕКУЩИЙ СЕГМЕНТ (дни ${startDay}–${endDay}) — JSON:
${segmentJson}

Верни ТОЛЬКО JSON вида:
{ "days": [ /* массив дней; каждый день: day, title, tips (опционально), activities: [{ time, type, title, placeName, desc, cost, mapLink, link?, bookingUrl?, ticketUrl? }] */ ] }

Правила:
- Ровно ${n} дней. Поля day должны идти подряд от ${startDay} до ${endDay}.
- type активности: transport | hotel | food | activity | free
- mapLink: Google Maps поиск места (https://www.google.com/maps/search/?api=1&query=...)
- Короткие описания, конкретные названия мест.
- Согласуй переезды/отели с соседями, если запрос это подразумевает.
- Поле cost: реалистичные суммы в ₽; за границей не путай IDR/VND с рублями.

JSON:`
}

export function activitySystem(locale: TripAssistantLocale): string {
  return locale === "en"
    ? "You generate one tourism activity as JSON. English copy."
    : "Генератор туристических активностей."
}

export function buildActivityUserPrompt(
  locale: TripAssistantLocale,
  args: {
    city: string
    newActivityRequest: string
    timeSlot: string
    priorChatSummary?: string
  }
): string {
  const { city, newActivityRequest, timeSlot, priorChatSummary } = args
  const slot = timeSlot || (locale === "en" ? "Day" : "День")
  const prior =
    priorChatSummary && priorChatSummary.trim().length > 0
      ? locale === "en"
        ? `\nRecent chat (context):\n${priorChatSummary.trim()}\n`
        : `\nНедавний диалог (контекст):\n${priorChatSummary.trim()}\n`
      : ""
  if (locale === "en") {
    return `Generate one activity for a trip.
City: ${city}
Request: "${newActivityRequest}"
Time: ${slot}
${prior}
Types: activity | food | hotel | transport | free
"cost": realistic USD for this city — not six-digit local-currency numbers mislabeled as USD.

Return JSON:
{
  "time": "${slot}",
  "type": "activity",
  "title": "short title",
  "placeName": "SPECIFIC name",
  "desc": "2-3 sentences in English",
  "cost": "realistic price in USD for the activity",
  "mapLink": "https://www.google.com/maps/search/?api=1&query=...",
  "link": ""
}`
  }
  return `Сгенерируй активность для путешествия.
Город: ${city}
Запрос: "${newActivityRequest}"
Время: ${slot}
${prior}
Поля type: activity | food | hotel | transport | free
Поле cost: реалистичная сумма в ₽; за границей не путай IDR/VND с рублями.

Верни JSON:
{
  "time": "${slot}",
  "type": "activity",
  "title": "краткий заголовок",
  "placeName": "КОНКРЕТНОЕ название",
  "desc": "2-3 предложения",
  "cost": "цена в ₽ (оценка)",
  "mapLink": "https://www.google.com/maps/search/?api=1&query=...",
  "link": ""
}`
}
