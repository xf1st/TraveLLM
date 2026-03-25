/** sessionStorage key for ?ref=CODE captured before signup/login */
export const REFERRAL_SESSION_KEY = "travellm_pending_referral"

const CODE_RE = /^[A-Za-z0-9]{4,32}$/

export function captureReferralFromSearch(search: string) {
  if (typeof window === "undefined") return
  try {
    const q = search.startsWith("?") ? search.slice(1) : search
    const ref = new URLSearchParams(q).get("ref")
    if (ref && CODE_RE.test(ref.trim())) {
      sessionStorage.setItem(REFERRAL_SESSION_KEY, ref.trim().toUpperCase())
    }
  } catch {
    /* ignore */
  }
}

export function getPendingReferralCode(): string | null {
  if (typeof window === "undefined") return null
  const c = sessionStorage.getItem(REFERRAL_SESSION_KEY)
  return c && c.length >= 4 ? c : null
}

export function clearPendingReferral() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(REFERRAL_SESSION_KEY)
}

export type ApplyReferralResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string }

/**
 * POST /api/referral/apply with pending code; clears storage on success or permanent failure.
 */
export async function applyPendingReferral(): Promise<ApplyReferralResult> {
  const code = getPendingReferralCode()
  if (!code) return { ok: true, skipped: true }

  const res = await fetch("/api/referral/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  })

  let data: { error?: string } = {}
  try {
    data = await res.json()
  } catch {
    /* ignore */
  }

  const err = typeof data.error === "string" ? data.error : "unknown"

  if (res.ok) {
    clearPendingReferral()
    return { ok: true }
  }

  if (
    err === "already_referred" ||
    err === "already_rewarded" ||
    err === "code_not_found" ||
    err === "invalid_code" ||
    err === "self"
  ) {
    clearPendingReferral()
    return err === "already_referred" || err === "already_rewarded"
      ? { ok: true, skipped: true }
      : { ok: false, error: err }
  }

  return { ok: false, error: err }
}

export function buildAuthSignupReferralUrl(origin: string, code: string) {
  const o = origin.replace(/\/$/, "")
  const c = encodeURIComponent(code)
  return `${o}/auth?tab=signup&ref=${c}`
}
