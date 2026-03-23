/**
 * In-memory sliding window rate limiter.
 * Works in Next.js standalone (persistent process) — NOT suitable for serverless/edge.
 * Limits are per userId per endpoint per minute.
 */

const WINDOW_MS = 60 * 1000 // 1 minute

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Global map — persists across requests in the same process
const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  userId: string,
  endpoint: string,
  maxPerMinute: number
): RateLimitResult {
  const key = `${userId}:${endpoint}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + WINDOW_MS
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: maxPerMinute - 1, resetAt }
  }

  if (entry.count >= maxPerMinute) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: maxPerMinute - entry.count, resetAt: entry.resetAt }
}

/**
 * IP-based rate limiter for public (unauthenticated) endpoints.
 * Extracts IP from standard headers.
 */
export function checkIpRateLimit(
  req: Request,
  endpoint: string,
  maxPerMinute: number
): RateLimitResult {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
  return checkRateLimit(`ip:${ip}`, endpoint, maxPerMinute)
}

/** Convenience: returns a 429 JSON response if rate limited */
export function rateLimitResponse(result: RateLimitResult) {
  const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
  return new Response(
    JSON.stringify({
      error: "Слишком много запросов. Подождите немного и попробуйте снова.",
      code: "RATE_LIMIT",
      retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  )
}
