/** An expired temporary ban is inactive; permanent bans have no expiry. */
export function getEffectiveAccessMode(mode: unknown, blockedUntil: unknown, now = Date.now()): string {
  const timestamp = typeof blockedUntil === "string" && blockedUntil ? Date.parse(blockedUntil) : NaN
  if (Number.isFinite(timestamp) && timestamp <= now) return "active"
  return typeof mode === "string" && mode ? mode : "active"
}
