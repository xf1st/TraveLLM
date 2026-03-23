/**
 * Постобработка полей cost: модель иногда подставляет суммы в местной валюте (IDR и т.д.),
 * оставляя знак ₽ из инструкции. Исправляем только при явных эвристиках + страна назначения.
 */

const IDR_PER_RUB = 182 // грубая оценка для подписи «~» (не курс ЦБ)

/** Текст маршрута + страны + названия дней — для детекции Индонезии */
export function collectRouteDestinationBlob(routeData: any): string {
  if (!routeData || typeof routeData !== "object") return ""
  const parts: string[] = [routeData.title, routeData.description]
  if (Array.isArray(routeData.countries)) {
    for (const c of routeData.countries) {
      if (c?.name) parts.push(String(c.name))
    }
  }
  if (Array.isArray(routeData.destinations)) {
    parts.push(routeData.destinations.join(" "))
  }
  if (Array.isArray(routeData.itinerary)) {
    for (const d of routeData.itinerary) {
      if (d?.title) parts.push(String(d.title))
      if (Array.isArray(d?.activities)) {
        for (const a of d.activities) {
          parts.push(a?.placeName, a?.title, a?.desc)
        }
      }
    }
  }
  return parts.filter(Boolean).join(" ")
}

export function destinationLikelyUsesIdr(blob: string): boolean {
  if (!blob) return false
  return /\b(bali|бали|кут[аеи]?|кута|семиньяк|seminyak|ubud|убуд|джакарта|jakarta|ломбок|lombok|индонезия|indonesia|yogyakarta|jogja|сурабая|surabaya|gili|гили|bromo|бромо)\b/i.test(
    blob
  )
}

const SKIP_ACTIVITY = /вертол|helicopter|яхт|yacht|чартер|private jet|джет|свадьб|wedding/i

/**
 * Если в строке cost большие числа при ₽, а по контексту Индонезия — трактуем как IDR и пересчитываем в ₽.
 */
export function maybeRewriteIdrMislabeledAsRub(
  cost: string,
  act: { title?: string; desc?: string; type?: string }
): string | null {
  if (!cost || typeof cost !== "string") return null
  if (!/₽|руб/i.test(cost)) return null
  const combined = `${act.title || ""} ${act.desc || ""}`
  if (SKIP_ACTIVITY.test(combined)) return null
  if (act.type === "transport") return null

  const digits = cost.replace(/\s/g, "").match(/\d+/g)
  if (!digits?.length) return null
  const values = digits.map((d) => parseInt(d, 10)).filter((n) => Number.isFinite(n))
  if (values.length === 0) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)

  // Типичная ошибка: 500k–2M «руб» за бар/ужин — похоже на IDR
  if (lo < 80_000 || hi > 25_000_000) return null
  if (hi / lo > 50) return null

  const rubLo = Math.round(lo / IDR_PER_RUB)
  const rubHi = Math.round(hi / IDR_PER_RUB)

  // После пересчёта должно выглядеть как реалистичный чек в ₽
  if (rubHi > 400_000 || rubLo < 50) return null

  const fmt = (n: number) =>
    n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })

  const suffix = cost.includes("(") ? " " + cost.slice(cost.indexOf("(")).trim() : ""
  if (rubLo === rubHi) {
    return `≈${fmt(rubLo)} ₽${suffix ? suffix : ""}`
  }
  return `≈${fmt(rubLo)} – ${fmt(rubHi)} ₽${suffix ? suffix : ""}`
}

/**
 * Обходит itinerary и правит activity.cost при необходимости.
 */
export function sanitizeMislabeledForeignCosts(routeData: any): any {
  if (!routeData || !Array.isArray(routeData.itinerary)) return routeData

  const blob = collectRouteDestinationBlob(routeData)
  if (!destinationLikelyUsesIdr(blob)) return routeData

  for (const day of routeData.itinerary) {
    if (!Array.isArray(day?.activities)) continue
    for (const act of day.activities) {
      if (!act?.cost || typeof act.cost !== "string") continue
      const fixed = maybeRewriteIdrMislabeledAsRub(act.cost, act)
      if (fixed) {
        act.cost = fixed
      }
    }
  }

  return routeData
}
