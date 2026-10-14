import test from "node:test"
import assert from "node:assert/strict"
import { getEffectiveAccessMode } from "../lib/user-access-state.ts"

test("temporary expiry does not require the browser to rewrite a profile", () => {
  const now = Date.parse("2026-10-14T12:00:00Z")
  assert.equal(getEffectiveAccessMode("full_blocked", "2026-10-14T11:00:00Z", now), "active")
  assert.equal(getEffectiveAccessMode("ai_blocked", "2026-10-14T12:00:00Z", now), "active")
  assert.equal(getEffectiveAccessMode("full_blocked", "2026-10-15T12:00:00Z", now), "full_blocked")
})

test("permanent and invalid-date bans are not silently lifted", () => {
  assert.equal(getEffectiveAccessMode("full_blocked", null), "full_blocked")
  assert.equal(getEffectiveAccessMode("ai_blocked", "not-a-date"), "ai_blocked")
})
