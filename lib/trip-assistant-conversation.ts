import type { TripAssistantLocale } from "@/lib/trip-assistant-segment"

export type TripAssistantChatMessage = {
  role: "user" | "assistant"
  content: string
}

const MAX_MESSAGES = 16
const MAX_MSG_CHARS = 1800
const MAX_BLOCK_CHARS = 7000

/** Безопасный разбор истории с клиента. */
export function parseConversationHistory(raw: unknown): TripAssistantChatMessage[] {
  if (!Array.isArray(raw)) return []
  const out: TripAssistantChatMessage[] = []
  for (const m of raw) {
    if (!m || typeof m !== "object") continue
    const role = (m as { role?: string }).role
    const content = String((m as { content?: string }).content ?? "").trim()
    if (!content) continue
    if (role !== "user" && role !== "assistant") continue
    out.push({ role, content: content.slice(0, MAX_MSG_CHARS) })
  }
  return out.slice(-MAX_MESSAGES)
}

/**
 * Текстовый блок для классификатора / ответа / сегмента.
 */
export function formatConversationBlock(
  locale: TripAssistantLocale,
  messages: TripAssistantChatMessage[]
): string {
  if (messages.length === 0) return ""

  const header =
    locale === "en"
      ? "RECENT CHAT (newest last; use for references like “same as before”, “that museum”):"
      : "НЕДАВНИЙ ДИАЛОГ (ниже новее; учитывай ссылки вроде «как выше», «тот музей»):"

  const lines: string[] = []
  let total = header.length + 2

  for (const m of messages) {
    const label =
      locale === "en"
        ? m.role === "user"
          ? "User"
          : "Assistant"
        : m.role === "user"
          ? "Пользователь"
          : "Ассистент"
    const line = `${label}: ${m.content}`
    if (total + line.length + 1 > MAX_BLOCK_CHARS) break
    lines.push(line)
    total += line.length + 1
  }

  if (lines.length === 0) return ""
  return `${header}\n${lines.join("\n")}`
}
