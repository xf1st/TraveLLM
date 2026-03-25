"use client"

import { ExternalLink, MapPin, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AffiliateNotice } from "@/components/partners/AffiliateNotice"

function safeUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length < 8) return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== "https:" && u.protocol !== "http:") return null
    return u.href
  } catch {
    return null
  }
}

function normalizeInfoLinks(raw: unknown): { title: string; url: string }[] {
  if (!Array.isArray(raw)) return []
  const out: { title: string; url: string }[] = []
  for (const x of raw) {
    if (!x || typeof x !== "object") continue
    const o = x as Record<string, unknown>
    const title = typeof o.title === "string" ? o.title.trim() : ""
    const url = safeUrl(o.url)
    if (title && url) out.push({ title, url })
    if (out.length >= 4) break
  }
  return out
}

type Props = {
  reelTitle: string
  lockedDestination: string
  priceLabel: string | null
  anchorDay: number
  activityAnchor: Record<string, unknown> | null | undefined
  hint: string
  sectionLabel: string
  bookFallbackLabel: string
}

export function ReelAnchorPreviewCard({
  reelTitle,
  lockedDestination,
  priceLabel,
  anchorDay,
  activityAnchor,
  hint,
  sectionLabel,
  bookFallbackLabel,
}: Props) {
  const a = activityAnchor ?? {}
  const actTitle = typeof a.title === "string" && a.title.trim() ? a.title.trim() : reelTitle
  const place =
    typeof a.placeName === "string" && a.placeName.trim() ? a.placeName.trim() : lockedDestination
  const desc = typeof a.desc === "string" ? a.desc.trim() : ""
  const time = typeof a.time === "string" ? a.time.trim() : ""
  const cost = typeof a.cost === "string" ? a.cost.trim() : ""
  const bookUrl = safeUrl(a.bookingUrl) ?? safeUrl(a.booking_url)
  const bookLabelRaw = a.bookingLabel ?? a.booking_label
  const bookLabel =
    typeof bookLabelRaw === "string" && bookLabelRaw.trim() ? bookLabelRaw.trim() : bookFallbackLabel
  const infoLinks = normalizeInfoLinks(a.infoLinks ?? a.info_links)

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-white/[0.04] to-white/[0.02] p-5 shadow-[0_8px_32px_rgba(16,185,129,0.08)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white shadow-lg shadow-emerald-500/30">
          {anchorDay}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/90">{sectionLabel}</span>
        <Sparkles className="h-3.5 w-3.5 text-emerald-400/80 ml-auto" />
      </div>

      <h3 className="text-lg font-bold text-white leading-snug mb-2">{actTitle}</h3>

      <div className="flex items-start gap-2 text-sm text-white/65 mb-1">
        <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>{place}</span>
      </div>

      {time ? <p className="text-xs text-white/45 mb-2 font-medium">{time}</p> : null}

      {priceLabel || cost ? (
        <p className="text-base font-bold text-emerald-400 mb-3">{cost || priceLabel}</p>
      ) : null}

      {desc ? (
        <p className="text-sm text-white/70 leading-relaxed mb-4 border-t border-white/10 pt-3">{desc}</p>
      ) : null}

      {infoLinks.length > 0 && (
        <ul className="space-y-2 mb-4">
          {infoLinks.map((l) => (
            <li key={l.url}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm font-medium text-sky-400 hover:text-sky-300",
                  "underline-offset-2 hover:underline",
                )}
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" />
                {l.title}
              </a>
            </li>
          ))}
        </ul>
      )}

      {bookUrl ? (
        <Button
          asChild
          className="w-full rounded-xl h-11 font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
        >
          <a href={bookUrl} target="_blank" rel="noopener noreferrer">
            {bookLabel}
          </a>
        </Button>
      ) : null}

      {(bookUrl || infoLinks.length > 0) && (
        <AffiliateNotice className="mt-3 text-white/40 [&_a]:text-sky-400/95" />
      )}

      <p className="text-[11px] text-white/35 mt-4 leading-snug">{hint}</p>
    </div>
  )
}
