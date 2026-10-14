import test from "node:test"
import assert from "node:assert/strict"

test("a long route uses the current Flash model without thinking and keeps its output budget", async () => {
  const savedFetch = globalThis.fetch
  const savedKey = process.env.DEEPSEEK_API_KEY
  const savedProxy = process.env.TRAVELLM_HTTP_PROXY
  process.env.DEEPSEEK_API_KEY = "test-only-key"
  process.env.TRAVELLM_HTTP_PROXY = "off"
  let sent: Record<string, any> = {}
  globalThis.fetch = async (_input, init) => {
    sent = JSON.parse(init?.body as string)
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }], usage: {
      prompt_tokens: 100, completion_tokens: 5, total_tokens: 105,
      prompt_cache_hit_tokens: 100, prompt_cache_miss_tokens: 0,
    } }), { headers: { "Content-Type": "application/json" } })
  }
  try {
    const { deepseekInferenceWithUsage, DEEPSEEK_CHAT } = await import("../lib/deepseek.ts")
    const result = await deepseekInferenceWithUsage([{ role: "user", content: "Return JSON" }], {
      tripDays: 14, maxTokens: 16000, responseFormat: "json_object",
    })
    assert.equal(DEEPSEEK_CHAT, "deepseek-flash")
    assert.equal(sent.model, "deepseek-flash")
    assert.deepEqual(sent.thinking, { type: "disabled" })
    assert.equal(sent.max_tokens, 16000)
    assert.deepEqual(sent.response_format, { type: "json_object" })
    assert.equal(result.usage?.model, "deepseek-flash")
    assert.equal(result.usage?.promptCacheMissTokens, 0)
    assert.equal(JSON.parse(result.content).ok, true)
  } finally {
    globalThis.fetch = savedFetch
    if (savedKey === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = savedKey
    if (savedProxy === undefined) delete process.env.TRAVELLM_HTTP_PROXY; else process.env.TRAVELLM_HTTP_PROXY = savedProxy
  }
})
