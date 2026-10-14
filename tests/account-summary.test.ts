import test from "node:test"
import assert from "node:assert/strict"
import { getAccountSummary } from "../lib/account-summary-client.ts"

test("simultaneous account reads share one request without caching later reads", async (t) => {
  let calls = 0
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ user: { id: "same-user" }, profile: { full_name: "Alice" } }) })
  const header = getAccountSummary("same-user")
  const sidebar = getAccountSummary("same-user")
  assert.equal(header, sidebar)
  await Promise.all([header, sidebar])
  assert.equal(calls, 1)
  await getAccountSummary("same-user")
  assert.equal(calls, 2)
})

test("failed reads can retry and cannot display another account's data", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ user: { id: "other-user" } }))
  await assert.rejects(getAccountSummary("expected-user"), /Account changed/)
  t.mock.method(globalThis, "fetch", async () => Response.json({ user: { id: "expected-user" } }))
  assert.equal((await getAccountSummary("expected-user")).user.id, "expected-user")
})
