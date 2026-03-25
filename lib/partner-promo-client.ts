export const PARTNER_PROMO_SESSION_KEY = "travellm_pending_partner_promo"

/** Partner / affiliate promo: letters, digits, ._- ; 2–64 chars */
const RE = /^[A-Za-z0-9_.\-]{2,64}$/

export function normalizePartnerPromo(raw: string): string | null {
  const t = raw.trim()
  if (t.length < 2 || t.length > 64) return null
  if (!RE.test(t)) return null
  return t
}

/** Read ?promo= ?partner= ?aff= from query and store if valid */
export function capturePartnerPromoFromSearch(search: string) {
  if (typeof window === "undefined") return
  try {
    const q = search.startsWith("?") ? search.slice(1) : search
    const sp = new URLSearchParams(q)
    const raw = sp.get("promo") || sp.get("partner") || sp.get("aff")
    const n = raw ? normalizePartnerPromo(raw) : null
    if (n) sessionStorage.setItem(PARTNER_PROMO_SESSION_KEY, n)
  } catch {
    /* ignore */
  }
}

export function getPendingPartnerPromo(): string | null {
  if (typeof window === "undefined") return null
  const c = sessionStorage.getItem(PARTNER_PROMO_SESSION_KEY)
  return c && normalizePartnerPromo(c) ? c : null
}

export function clearPendingPartnerPromo() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(PARTNER_PROMO_SESSION_KEY)
}

/** If input normalizes, overwrite session (manual field wins over URL until changed). */
export function persistPartnerPromoForSignup(input: string) {
  if (typeof window === "undefined") return
  const n = normalizePartnerPromo(input)
  if (n) sessionStorage.setItem(PARTNER_PROMO_SESSION_KEY, n)
}

export async function applyPendingPartnerPromo(): Promise<{ ok: boolean; skipped?: boolean }> {
  const code = getPendingPartnerPromo()
  if (!code) return { ok: true, skipped: true }

  const res = await fetch("/api/user/partner-promo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  })

  let data: { ok?: boolean; skipped?: boolean; error?: string } = {}
  try {
    data = await res.json()
  } catch {
    /* ignore */
  }

  if (res.ok && data.ok) {
    clearPendingPartnerPromo()
    return { ok: true, skipped: data.skipped }
  }

  if (res.status === 400 && data.error === "invalid_code") {
    clearPendingPartnerPromo()
    return { ok: true, skipped: true }
  }

  if (data.skipped) {
    clearPendingPartnerPromo()
    return { ok: true, skipped: true }
  }

  return { ok: false }
}
