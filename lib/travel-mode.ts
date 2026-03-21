/** User preference for primary transport between hubs (plan form → AI). */
export type TravelMode = "flight" | "train" | "car"

export function normalizeTravelMode(raw: unknown): TravelMode {
  const s = typeof raw === "string" ? raw.toLowerCase().trim() : ""
  if (s === "train" || s === "car") return s
  return "flight"
}
