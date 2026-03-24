import type { DiscoveryReelRecord } from "@/lib/reel-anchor"

function anchorExtrasLines(anchor: Record<string, unknown>): string {
  const bookRaw =
    (typeof anchor.bookingUrl === "string" && anchor.bookingUrl) ||
    (typeof anchor.booking_url === "string" && anchor.booking_url) ||
    ""
  const book = bookRaw.trim()
  const lines: string[] = []
  if (book) lines.push(`  • Booking / info URL (reference for user): ${book}`)
  return lines.join("\n")
}

export function buildReelMandatoryPromptBlock(reel: DiscoveryReelRecord, locale: "ru" | "en"): string {
  const anchor = (reel.activity_anchor || {}) as Record<string, unknown>
  const place =
    (typeof anchor.placeName === "string" && anchor.placeName) || reel.city || reel.country
  const actTitle = (typeof anchor.title === "string" && anchor.title) || reel.title
  const actTime = (typeof anchor.time === "string" && anchor.time) || "10:00"
  const actDesc = (typeof anchor.desc === "string" && anchor.desc) || ""
  const day = reel.anchor_day
  const extras = anchorExtrasLines(anchor)

  if (locale === "en") {
    return `
⚠️ MANDATORY REEL ANCHOR (NON-NEGOTIABLE):
- On **day ${day}** of the itinerary you MUST include this exact experience (do not replace with a "similar" activity):
  • Title: "${actTitle}"
  • Place: "${place}" (${reel.country}${reel.city ? `, ${reel.city}` : ""})
  • Suggested time slot: ${actTime}
  • Details: ${actDesc}
${extras}
- The activity must appear as a real itinerary activity entry (with matching title or placeName) on day ${day}.
- If the reel includes a bookingUrl, copy it into the activity as bookingUrl so the user can open it from the trip.
- You may add other activities around it, but this anchor must remain clearly present.
`.trim()
  }

  return `
⚠️ ОБЯЗАТЕЛЬНАЯ АКТИВНОСТЬ ИЗ РИЛСА (НЕЛЬЗЯ ЗАМЕНИТЬ):
- В **день ${day}** маршрута ОБЯЗАТЕЛЬНО включи именно этот опыт (не подменяй «похожим»):
  • Название: «${actTitle}»
  • Место: «${place}» (${reel.country}${reel.city ? `, ${reel.city}` : ""})
  • Время (ориентир): ${actTime}
  • Детали: ${actDesc}
${extras}
- Запись должна быть в JSON как обычная активность дня (title/placeName совпадают по смыслу) на день ${day}.
- Если в рилсе есть bookingUrl — продублируй в активности как bookingUrl, чтобы пользователь открыл ссылку из маршрута.
- Остальные слоты дня можно заполнить вокруг неё, но якорь должен остаться явно.
`.trim()
}
