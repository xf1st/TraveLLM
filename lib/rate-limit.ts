import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Distributed rate limiter with DB-first semantics.
 * Uses Supabase RPC when available and falls back to in-memory buckets locally.
 */

const WINDOW_MS = 60 * 1000

interface RateLimitEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, RateLimitEntry>()

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of memoryStore.entries()) {
      if (now >= entry.resetAt) memoryStore.delete(key)
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

function getWindowBounds(windowMs: number, now = Date.now()) {
  const windowStart = Math.floor(now / windowMs) * windowMs
  return {
    windowStart,
    resetAt: windowStart + windowMs,
  }
}

function getInMemoryKey(identifier: string, endpoint: string) {
  return `${identifier}:${endpoint}`
}

function checkRateLimitInMemory(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const { resetAt } = getWindowBounds(windowMs, now)
  const key = getInMemoryKey(identifier, endpoint)
  const entry = memoryStore.get(key)

  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      resetAt,
    }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count += 1
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  }
}

let serviceRoleClient: SupabaseClient | null | undefined

function getServiceRoleClient(): SupabaseClient | null {
  if (serviceRoleClient !== undefined) return serviceRoleClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    serviceRoleClient = null
    return serviceRoleClient
  }

  serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return serviceRoleClient
}

async function checkRateLimitInDb(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const client = getServiceRoleClient()
  if (!client) return null

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))
  const { resetAt } = getWindowBounds(windowMs)
  const dbKey = getInMemoryKey(identifier, endpoint)

  const { data, error } = await client.rpc("check_rate_limit_db", {
    p_key: dbKey,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    console.warn("[RateLimit] Falling back to memory store:", error.message)
    return null
  }

  return {
    allowed: Boolean(data),
    remaining: Boolean(data) ? Math.max(0, maxRequests - 1) : 0,
    resetAt,
  }
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number = WINDOW_MS
): Promise<RateLimitResult> {
  const dbResult = await checkRateLimitInDb(
    identifier,
    endpoint,
    maxRequests,
    windowMs
  )
  if (dbResult) return dbResult

  return checkRateLimitInMemory(identifier, endpoint, maxRequests, windowMs)
}

/**
 * IP-based rate limiter for public (unauthenticated) endpoints.
 * Extracts IP from standard headers.
 */
export async function checkIpRateLimit(
  req: Request,
  endpoint: string,
  maxPerMinute: number
): Promise<RateLimitResult> {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  return checkRateLimit(`ip:${ip}`, endpoint, maxPerMinute)
}

/** Convenience: returns a 429 JSON response if rate limited */
export function rateLimitResponse(result: RateLimitResult) {
  const retryAfterSec = Math.max(
    1,
    Math.ceil((result.resetAt - Date.now()) / 1000)
  )
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
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  )
}
