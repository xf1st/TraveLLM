import test from "node:test"
import assert from "node:assert/strict"
import { optionalWithTimeout, withTimeout } from "../lib/async-timeout.ts"
import { fetchWithTimeout } from "../lib/fetch-with-timeout.ts"

test("unavailable optional context cannot indefinitely block a trip", async () => {
  const result = await optionalWithTimeout(new Promise<string>(() => {}), 5, "no live context", "context")
  assert.equal(result, "no live context")
  await assert.rejects(withTimeout(new Promise(() => {}), 5, "required operation"), { code: "GENERATION_TIMEOUT" })
})

test("fetch deadlines preserve existing cancellation and custom proxy options", async (t) => {
  const controller = new AbortController()
  const dispatcher = {}
  t.mock.method(globalThis, "fetch", async (_input: unknown, init?: RequestInit) => {
    assert.equal((init as RequestInit & { dispatcher: unknown }).dispatcher, dispatcher)
    controller.abort()
    assert.equal(init?.signal?.aborted, true)
    return Response.json({})
  })
  await fetchWithTimeout("https://example.test", { signal: controller.signal, dispatcher } as RequestInit & { dispatcher: unknown })
})
