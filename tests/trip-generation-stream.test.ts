import test from "node:test"
import assert from "node:assert/strict"
import { streamTripGeneration } from "../lib/trip-generation-stream.ts"

const route = { title: "Токио", itinerary: [{ day: 1 }] }

test("SSE result finishes even when the server keeps the connection open", async (t) => {
  let cancelled = false
  const bytes = new TextEncoder().encode(`: heartbeat\r\n\r\ndata: ${JSON.stringify({ type: "progress", phase: "enriching" })}\r\n\r\ndata: ${JSON.stringify({ type: "result", data: route })}\r\n\r\n`)
  t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({
    start(controller) { for (let i = 0; i < bytes.length; i += 3) controller.enqueue(bytes.slice(i, i + 3)) },
    cancel() { cancelled = true },
  }), { headers: { "Content-Type": "text/event-stream" } }))
  const phases: string[] = []
  const result = await streamTripGeneration({}, undefined, { onPhase: phase => phases.push(phase) })
  assert.deepEqual(result.routeData, route)
  assert.equal(cancelled, true)
  assert.deepEqual(phases, ["preparing", "generating", "enriching"])
})

test("final SSE event without an empty trailing line is parsed", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(`data:${JSON.stringify({ type: "result", data: route })}`))
  assert.deepEqual((await streamTripGeneration({})).routeData, route)
})

test("DeepSeek JSON response is accepted without requiring SSE", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    assert.equal(input, "/api/deepseek")
    return Response.json(route)
  })
  assert.deepEqual((await streamTripGeneration({ generationProvider: "deepseek" })).routeData, route)
})

test("configured default provider is used when the form has no override", async (t) => {
  const previous = process.env.NEXT_PUBLIC_ROUTE_GENERATION_PROVIDER
  process.env.NEXT_PUBLIC_ROUTE_GENERATION_PROVIDER = "deepseek"
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    assert.equal(input, "/api/deepseek")
    return Response.json(route)
  })
  try { assert.deepEqual((await streamTripGeneration({})).routeData, route) }
  finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_ROUTE_GENERATION_PROVIDER
    else process.env.NEXT_PUBLIC_ROUTE_GENERATION_PROVIDER = previous
  }
})

test("stream errors and monthly limit metadata reach the caller", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response('data: {"type":"error","message":"Timeout","code":"GENERATION_TIMEOUT"}\n\n'))
  await assert.rejects(streamTripGeneration({}), { code: "GENERATION_TIMEOUT" })
  t.mock.method(globalThis, "fetch", async () => Response.json({ message: "Limit", limitExceeded: true, limit: 10 }, { status: 429 }))
  await assert.rejects(streamTripGeneration({}), { limitExceeded: true, limit: 10 })
})

test("generation timeout is reported distinctly from user cancellation", async (t) => {
  const keepAlive = setTimeout(() => {}, 1000)
  t.mock.method(globalThis, "fetch", (_input: unknown, init?: RequestInit) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true })
  }))
  try { await assert.rejects(streamTripGeneration({}, undefined, { timeoutMs: 5 }), { code: "GENERATION_TIMEOUT" }) }
  finally { clearTimeout(keepAlive) }
})

test("an empty or malformed itinerary response is rejected", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ title: "Incomplete" }))
  await assert.rejects(streamTripGeneration({}), /Invalid response/)
})
