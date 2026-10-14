"use client"

import { fetchWithTimeout } from "./fetch-with-timeout.ts"

const pending = new Map<string, Promise<any>>()

/** Share simultaneous header/sidebar/guard reads; never cache another user's data. */
export function getAccountSummary(userId: string): Promise<any> {
  const existing = pending.get(userId)
  if (existing) return existing
  const request = (async () => {
    const response = await fetchWithTimeout("/api/user/me", { credentials: "same-origin", cache: "no-store" }, 12000)
    if (!response.ok) throw new Error(`Account request failed (${response.status})`)
    const data = await response.json()
    if (data.user?.id !== userId) throw new Error("Account changed during request")
    return data
  })().finally(() => { if (pending.get(userId) === request) pending.delete(userId) })
  pending.set(userId, request)
  return request
}
