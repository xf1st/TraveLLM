import { jsonrepair } from "jsonrepair"
import { z } from "zod"
import { geminiInference } from "@/lib/gemini"
import { getGalleryImages } from "@/lib/images"
import { REEL_CREATIVITY_DEFAULT, reelCreativityToTemperature } from "@/lib/reel-creativity"

const LlmReelSchema = z.object({
  title: z.string().min(2).max(280),
  country: z.string().min(2).max(120),
  city: z.string().max(120).optional().nullable(),
  price_label: z.string().min(1).max(220),
  price_amount: z.number().positive().max(10_000_000).optional().nullable(),
  price_currency: z.enum(["RUB", "USD", "EUR", "GBP"]).default("RUB"),
  suggested_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  suggested_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  anchor_day: z.number().int().min(1).max(60),
  activity_anchor: z
    .object({
      title: z.string().min(1),
      placeName: z.string().optional(),
      time: z.string().optional(),
      type: z.string().optional(),
      desc: z.string().optional(),
      cost: z.string().optional(),
      booking_url: z.union([z.string(), z.null()]).optional(),
      booking_label: z.union([z.string(), z.null()]).optional(),
      info_links: z
        .array(
          z.object({
            title: z.string(),
            url: z.string(),
          }),
        )
        .optional()
        .nullable(),
    })
    .passthrough(),
  imageQueries: z.array(z.string().min(3).max(220)).min(3).max(5),
  music_url: z.union([z.string().url(), z.null(), z.literal("")]).optional(),
})

/** Строки для блока «не повторять» в промпте (батч + недавние из БД). */
export type ReelAvoidRow = { title: string; country: string; city: string | null }

const DIVERSITY_FOCUS_EN = [
  "This card: prefer South America, Africa, or Oceania — not Europe+Asia default.",
  "This card: cold/nordic or polar-adjacent experience (northern lights, ice, winter sport) — not hot beach.",
  "This card: urban culture — museum district, architecture walk, live music venue — not generic temple tour.",
  "This card: food & drink deep-dive (market tour, chef table, regional wine) — not only landmark photo.",
  "This card: soft adventure — kayak, via ferrata, glacier hike, wildlife safari — not balloon/skydive.",
  "This card: small town or secondary city in a well-known country — not the #1 Instagram spot of that country.",
] as const

const DIVERSITY_FOCUS_RU = [
  "Эта карточка: Южная Америка, Африка или Океания — не дефолт «Европа+Азия».",
  "Эта карточка: холодный/северный опыт (северное сияние, лёд, зимний спорт) — не пляж.",
  "Эта карточка: городская культура — кварталы, музеи, концерт — не шаблон «только храм».",
  "Эта карточка: еда и напитки (рынок, дегустация, шеф-стол) — не только фото у достопримечательности.",
  "Эта карточка: мягкое приключение — каяк, виа-феррата, ледник, сафари — не шар/прыжок по умолчанию.",
  "Эта карточка: второй город или провинция в известной стране — не главный инста-спот страны.",
] as const

function pickDiversityFocus(locale: "ru" | "en"): string {
  const arr = locale === "en" ? DIVERSITY_FOCUS_EN : DIVERSITY_FOCUS_RU
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0]
}

function buildAvoidBlock(locale: "ru" | "en", rows: ReelAvoidRow[]): string {
  const q = locale === "en" ? '"' : "«"
  const q2 = locale === "en" ? '"' : "»"
  const trimmed = rows
    .filter((r) => r.title?.trim() && r.country?.trim())
    .slice(0, 36)
    .map((r) => {
      const loc = [r.city?.trim(), r.country.trim()].filter(Boolean).join(", ")
      return `- ${q}${r.title.trim().slice(0, 120)}${q2} (${loc})`
    })
  if (trimmed.length === 0) return ""

  const head =
    locale === "en"
      ? "\n\nSTRICT — Your card must NOT duplicate or trivially rephrase any row below (change country OR switch to a clearly different activity archetype — not same balloon/wine/skydive slot in the same region):\n"
      : "\n\nСТРОГО — карточка НЕ должна дублировать и не должна быть «чуть иначе сформулированной» копией строк ниже (смени страну ИЛИ тип активности — не тот же шар/вино/прыжок в том же регионе):\n"

  return head + trimmed.join("\n") + "\n"
}

function diversityPreamble(locale: "ru" | "en"): string {
  if (locale === "en") {
    return `

DIVERSITY (critical for our catalog):
- Each generation must feel DISTINCT: vary continents, biomes, and activity categories across cards.
- Do NOT lean on the same viral templates repeatedly: e.g. another "sunrise balloon over Cappadocia/Göreme", another "Fuji + cherry blossoms" stack, "Kyoto temples only", "Dubai skydive as default thrill", "Bali swing". If you pick Turkey, do NOT add another Cappadocia/Göreme hot-air balloon when similar rows already appear in the avoid list below.
- Prefer specific operators/locations; avoid copy-paste wording from typical influencer captions.
- Random focus for THIS card: ${pickDiversityFocus("en")}
`.trim()
  }
  return `

РАЗНООБРАЗИЕ (критично для каталога):
- Каждая карточка должна отличаться: чередуй континенты, климат, тип активности.
- Не злоупотребляй одними и теми же «рилс-шаблонами»: снова шар над Каппадокией/Гёреме, снова Фудзи+сакура пачкой, только храмы Киото, дефолтный прыжок в Дубае, качели на Бали. Если страна Турция — не делай очередной шар над Каппадокией/Гёреме, если в списке ниже уже есть похожие карточки.
- Конкретика важнее красивых клише.
- Случайный акцент для ЭТОЙ карточки: ${pickDiversityFocus("ru")}
`.trim()
}

export type ReelInsertPayload = {
  title: string
  country: string
  city: string | null
  price_label: string
  price_amount: number | null
  price_currency: string
  suggested_start_date: string
  suggested_end_date: string
  anchor_day: number
  images: string[]
  activity_anchor: Record<string, unknown>
  music_url: string | null
  locale: "ru" | "en"
}

function parseIsoDateUtc(s: string): Date {
  const d = new Date(`${s}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${s}`)
  return d
}

function tripDaysInclusive(start: string, end: string): number {
  const a = parseIsoDateUtc(start)
  const b = parseIsoDateUtc(end)
  if (b < a) throw new Error("suggested_end_date before suggested_start_date")
  return Math.ceil((b.getTime() - a.getTime()) / 86_400_000) + 1
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function safeExternalUrl(s: string | null | undefined): string | null {
  if (!s || typeof s !== "string") return null
  try {
    const u = new URL(s.trim())
    if (u.protocol !== "http:" && u.protocol !== "https:") return null
    return u.href
  } catch {
    return null
  }
}

function sanitizeInfoLinksFromModel(raw: unknown): { title: string; url: string }[] {
  if (!Array.isArray(raw)) return []
  const out: { title: string; url: string }[] = []
  for (const row of raw) {
    if (!row || typeof row !== "object") continue
    const o = row as Record<string, unknown>
    const title = typeof o.title === "string" ? o.title.trim() : ""
    const url = safeExternalUrl(typeof o.url === "string" ? o.url : undefined)
    if (title.length >= 2 && url) out.push({ title: title.slice(0, 120), url })
    if (out.length >= 4) break
  }
  return out
}

function parseLlmJson(raw: string): unknown {
  const stripped = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim()
  const block = stripped.match(/\{[\s\S]*\}/)?.[0] ?? stripped
  try {
    return JSON.parse(block)
  } catch {
    return JSON.parse(jsonrepair(block))
  }
}

async function resolveImages(queries: string[], fallbackQuery: string): Promise<string[]> {
  const out: string[] = []
  const seen = new Set<string>()
  const qList = queries.map((q) => q.trim()).filter(Boolean)

  for (const q of qList) {
    if (out.length >= 5) break
    try {
      const urls = await getGalleryImages(q, 2, out.length ? [...out] : undefined)
      for (const u of urls) {
        if (u && !seen.has(u)) {
          seen.add(u)
          out.push(u)
        }
        if (out.length >= 5) break
      }
    } catch (e) {
      console.warn("[reel-generation] gallery query failed:", q, e)
    }
  }

  if (out.length === 0 && fallbackQuery) {
    try {
      const urls = await getGalleryImages(fallbackQuery.slice(0, 200), 5)
      for (const u of urls) {
        if (u && !seen.has(u)) {
          seen.add(u)
          out.push(u)
        }
        if (out.length >= 5) break
      }
    } catch (e) {
      console.warn("[reel-generation] fallback gallery failed:", e)
    }
  }

  return out.slice(0, 5)
}

export type GenerateReelOptions = {
  /** 0 = предсказуемо, 100 = смелее идеи; влияет на temperature модели */
  creativity?: number
  /** Недавние карточки + уже сгенерированные в этом батче — чтобы не повторять темы */
  avoidRows?: ReelAvoidRow[]
}

/**
 * One LLM call + image search → row ready for discovery_reels insert (no id).
 */
export async function generateOneReelCard(
  locale: "ru" | "en",
  options: GenerateReelOptions = {},
): Promise<ReelInsertPayload> {
  const today = new Date()
  const winStart = new Date(today)
  winStart.setUTCDate(winStart.getUTCDate() + 7)
  const winEnd = new Date(today)
  winEnd.setUTCDate(winEnd.getUTCDate() + 60)

  const ws = fmt(winStart)
  const we = fmt(winEnd)

  const system =
    locale === "en"
      ? "You are a travel editor for TraveLLM. Output exactly ONE JSON object, no markdown, no commentary. Maximize variety vs other cards — never clone trending templates."
      : "Ты редактор путешествий TraveLLM. Выведи ровно ОДИН JSON-объект, без markdown и без комментариев. Максимум разнообразия относительно других карточек — не клонируй одни и те же «вирусные» шаблоны."

  const avoidBlock = buildAvoidBlock(locale, options.avoidRows ?? [])
  const divPre = diversityPreamble(locale)

  const user =
    locale === "en"
      ? `Create ONE "discovery reel" card: one SPECIFIC, BOOKABLE travel experience (not generic sightseeing) that could inspire someone to plan a trip.

${divPre}
${avoidBlock}

Examples of the level of specificity wanted: small-group surf lesson in Sydney; Rioja or Tuscany wine tasting with transport; tandem skydive over Dubai/Palm; parasailing off Phuket/Koh Samui; fjord RIB safari in Norway; stargazing jeep tour in Wadi Rum; cooking class with market visit. Vary regions — do not default all cards to the same famous balloon spot.

Hard rules:
- Pick ONE real country and (usually) a specific city or region tourists can visit.
- Suggested trip dates: choose suggested_start_date and suggested_end_date (YYYY-MM-DD) so the trip length is 5–13 calendar days inclusive (about 4–12 nights), and BOTH dates fall between ${ws} and ${we} (inclusive).
- anchor_day: 1-based index of the day within that trip when this hero activity should happen. Must be between 1 and trip length (inclusive). Prefer day 2–4 for multi-day trips.
- price_amount: realistic estimate for THIS activity or experience for one person or a couple (match price_label).
- price_currency: RUB, USD, or EUR.
- price_label: short human text with currency symbol (e.g. "from $89" or "от 4 500 ₽").
- activity_anchor object MUST include:
  • title, placeName, time (HH:MM), type "activity"
  • desc: 2–4 sentences with concrete detail (duration, what is included, skill level if relevant) — not vague marketing.
  • cost: repeat the price hint from price_label.
  • booking_url: optional string — ONE real https URL to book or reserve (GetYourGuide, Viator, Klook, official operator, Google Maps place, Tripadvisor listing). If you are not sure the URL exists, use null. NEVER invent paths or slugs.
  • booking_label: optional short CTA in English (e.g. "Book on GetYourGuide"); default can be "Book".
  • info_links: optional array of 0–3 objects { "title", "url" } with extra official/read-more links (tourism board, venue site). Same rule: real https URLs only or omit.
- imageQueries: 3–5 short ENGLISH stock-photo search phrases (Pexels/Unsplash) that describe THIS place and activity visually — no people faces, no NSFW.
- music_url: always null (we add tracks later).
- All visible copy (title, country, city, labels, activity_anchor text) must be in English.

Return JSON keys exactly:
title, country, city (string or null), price_label, price_amount (number), price_currency, suggested_start_date, suggested_end_date, anchor_day (number), activity_anchor (object), imageQueries (array of strings), music_url (null).`
      : `Придумай ОДНУ карточку "рилса" TraveLLM: одна КОНКРЕТНАЯ, РЕАЛЬНО ЗАКАЗЫВАЕМАЯ активность (не абстрактное «посмотреть город»), от которой хочется спланировать поездку.

${divPre}
${avoidBlock}

Примеры уровня детализации: урок серфинга на Бонди в Сиднее; дегустация вин в Риохе/Тоскане с трансфером; тандем-прыжок с парашютом в Дубае; парасейлинг у Пхукета/Самуи; RIB-сафари по фьордам; ночной джип-тур под звёзды в Вади-Рам; кулинарный класс с рынком. Чередуй регионы — не своди всё к одному «фирменному» шару.

Жёстко:
- Одна реальная страна и (как правило) город или регион.
- suggested_start_date и suggested_end_date (YYYY-MM-DD): длительность 5–13 календарных дней (примерно 4–12 ночей), обе даты в диапазоне с ${ws} по ${we} включительно.
- anchor_day: номер дня поездки (с 1), когда стоит эта активность. От 1 до длины поездки. Часто день 2–4.
- price_amount — реалистичная оценка именно этой активности (на 1–2 человек).
- price_currency: RUB (по умолчанию), или USD/EUR если уместно.
- price_label: коротко для карточки, с символом валюты (например "от 4 500 ₽").
- activity_anchor ОБЯЗАТЕЛЬНО с полями:
  • title, placeName, time (ЧЧ:ММ), type "activity"
  • desc: 2–4 предложения с практикой (длительность, что входит, уровень подготовки если важно) — не вода.
  • cost: как в price_label.
  • booking_url: опционально — одна реальная https-ссылка для брони (GetYourGuide, Viator, Klook, официальный сайт оператора, карточка в Google Maps, Tripadvisor). Если нет уверенности в URL — null. НЕ выдумывай пути.
  • booking_label: опционально — короткий текст кнопки на русском (например «Забронировать на GetYourGuide»).
  • info_links: опционально 0–3 объекта { "title", "url" } — доп. официальные/инфо ссылки. Только реальные https или не включай.
- imageQueries: 3–5 коротких запросов на АНГЛИЙСКОМ для стоковых фото (место + активность), без лиц в кадре, без NSFW.
- music_url: всегда null.
- Все тексты для пользователя (title, country, city, price_label, activity_anchor) — на русском.

Верни JSON с полями:
title, country, city (строка или null), price_label, price_amount (число), price_currency, suggested_start_date, suggested_end_date, anchor_day (число), activity_anchor (объект), imageQueries (массив строк), music_url (null).`

  const creativity = options.creativity ?? REEL_CREATIVITY_DEFAULT
  const temperature = reelCreativityToTemperature(creativity)

  const raw = await geminiInference(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { maxTokens: 2500, temperature, responseFormat: "json_object" },
  )

  const data = LlmReelSchema.parse(parseLlmJson(raw))

  const duration = tripDaysInclusive(data.suggested_start_date, data.suggested_end_date)
  if (duration < 5 || duration > 13) {
    throw new Error(`Trip length ${duration} days out of allowed 5–13`)
  }

  const anchor = Math.min(Math.max(1, data.anchor_day), duration)

  if (data.suggested_start_date < ws || data.suggested_end_date > we) {
    throw new Error("Suggested dates outside allowed window")
  }

  const city = data.city?.trim() || null
  const fallbackQuery = [city, data.country, "travel landmark scenic"].filter(Boolean).join(" ")

  const images = await resolveImages(data.imageQueries, fallbackQuery)

  const aa = data.activity_anchor
  const bookingUrl = safeExternalUrl(
    typeof aa.booking_url === "string" ? aa.booking_url : undefined,
  )
  const bookingLabel =
    typeof aa.booking_label === "string" && aa.booking_label.trim()
      ? aa.booking_label.trim().slice(0, 80)
      : null
  const infoLinks = sanitizeInfoLinksFromModel(aa.info_links)

  const anchorObj: Record<string, unknown> = {
    title: aa.title,
    placeName: aa.placeName ?? city ?? data.country,
    time: aa.time ?? "10:00",
    type: aa.type ?? "activity",
    desc: aa.desc ?? "",
    cost: aa.cost ?? data.price_label,
  }
  if (bookingUrl) anchorObj.bookingUrl = bookingUrl
  if (bookingLabel) anchorObj.bookingLabel = bookingLabel
  if (infoLinks.length > 0) anchorObj.infoLinks = infoLinks

  const music =
    data.music_url && typeof data.music_url === "string" && data.music_url.length > 0
      ? data.music_url
      : null

  return {
    title: data.title.trim(),
    country: data.country.trim(),
    city,
    price_label: data.price_label.trim(),
    price_amount: data.price_amount ?? null,
    price_currency: data.price_currency,
    suggested_start_date: data.suggested_start_date,
    suggested_end_date: data.suggested_end_date,
    anchor_day: anchor,
    images,
    activity_anchor: anchorObj,
    music_url: music,
    locale,
  }
}
