import test from "node:test"
import assert from "node:assert/strict"
import { getHttpProxyUrl } from "../lib/http-proxy.ts"

test("explicit proxy off overrides inherited variables without automatic fallback", () => {
  const names = ["TRAVELLM_HTTP_PROXY", "HTTP_PROXY", "http_proxy"] as const
  const saved = names.map(name => process.env[name])
  try {
    process.env.HTTP_PROXY = "http://inherited.example:8080"
    process.env.TRAVELLM_HTTP_PROXY = "off"
    assert.equal(getHttpProxyUrl(), undefined)
    process.env.TRAVELLM_HTTP_PROXY = "http://project.example:8080"
    assert.equal(getHttpProxyUrl(), "http://project.example:8080")
    delete process.env.TRAVELLM_HTTP_PROXY
    assert.equal(getHttpProxyUrl(), "http://inherited.example:8080")
  } finally {
    names.forEach((name, i) => { if (saved[i] === undefined) delete process.env[name]; else process.env[name] = saved[i] })
  }
})
