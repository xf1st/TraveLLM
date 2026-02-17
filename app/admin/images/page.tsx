"use client"

import { useState, useCallback } from "react"

const PRESET_QUERIES = [
  "Дубай Бурдж Халифа",
  "Тбилиси старый город",
  "rooftop restaurant Istanbul",
  "Antalya beach resort",
  "Tokyo street night",
  "Москва Красная площадь",
  "Paris Eiffel Tower",
  "Алтай горы природа",
  "Мальдивы пляж",
  "some random nonexistent place xyz123",
]

type ImageResult = {
  url: string
  provider: string
}

type QueryResult = {
  query: string
  images: ImageResult[]
  ms: number
  error?: string
}

function detectProvider(url: string): string {
  if (url.includes("pexels.com")) return "Pexels"
  if (url.includes("unsplash.com")) return "Unsplash"
  if (url.includes("wikimedia.org") || url.includes("wikipedia.org")) return "Wikimedia"
  if (url.startsWith("/api/proxy-image")) return "Proxy"
  if (url.startsWith("/")) return "Local fallback"
  return "Unknown"
}

// Full fallback chain matching TripImage behaviour:
// direct → proxy (/api/proxy-image) → /api/image (Unsplash→Wikimedia→static) → ❌
type LoadStage = "direct" | "proxy" | "api_image" | "failed"

function ImageCard({ img, index, query }: { img: ImageResult; index: number; query: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading")
  const [currentSrc, setCurrentSrc] = useState(img.url)
  const [stage, setStage] = useState<LoadStage>("direct")

  const providerColor: Record<string, string> = {
    "Pexels":         "bg-green-500/20 text-green-400 border-green-500/30",
    "Unsplash":       "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Wikimedia":      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "Local fallback": "bg-red-500/20 text-red-400 border-red-500/30",
    "Proxy":          "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "Fallback API":   "bg-violet-500/20 text-violet-400 border-violet-500/30",
    "Unknown":        "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  }

  const displayProvider =
    stage === "proxy"     && status === "ok" ? "Proxy" :
    stage === "api_image" && status === "ok" ? "Fallback API" :
    detectProvider(currentSrc)

  const stageHint: Partial<Record<LoadStage, string>> = {
    proxy:     " via proxy",
    api_image: " /api/image",
  }

  const loadingLabel: Partial<Record<LoadStage, string>> = {
    direct:    "загружается...",
    proxy:     "proxy...",
    api_image: "/api/image...",
  }

  const handleError = async () => {
    if (stage === "direct" && !img.url.startsWith("/")) {
      // Step 1 — proxy (bypass RU client blocks)
      setStage("proxy")
      setCurrentSrc(`/api/proxy-image?url=${encodeURIComponent(img.url)}`)
      setStatus("loading")

    } else if (stage === "proxy" || (stage === "direct" && img.url.startsWith("/"))) {
      // Step 2 — fetch new URL from /api/image (Unsplash → Wikimedia → static)
      setStage("api_image")
      setStatus("loading")
      try {
        const res = await fetch(`/api/image?query=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.url) {
          setCurrentSrc(data.url)
        } else {
          setStage("failed")
          setStatus("error")
        }
      } catch {
        setStage("failed")
        setStatus("error")
      }

    } else {
      // Step 3 — all failed
      setStage("failed")
      setStatus("error")
    }
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-zinc-900 border border-white/10 group">
      <div className="aspect-[4/3] relative">
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 animate-pulse z-10">
            <span className="text-zinc-500 text-xs">{loadingLabel[stage] ?? "загружается..."}</span>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/50 gap-2 z-10">
            <span className="text-3xl">❌</span>
            <span className="text-red-400 text-[10px] text-center px-2">direct + proxy + /api/image — все упали</span>
          </div>
        )}
        <img
          src={currentSrc}
          alt={`Image ${index + 1}`}
          className={`w-full h-full object-cover transition-opacity duration-300 ${status === "ok" ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setStatus("ok")}
          onError={handleError}
        />
      </div>

      <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${providerColor[displayProvider] ?? providerColor["Unknown"]}`}>
        {displayProvider}{stage !== "direct" && status === "ok" ? stageHint[stage] : ""}
      </div>

      <div className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white">
        #{index + 1}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-black/85 text-[9px] text-zinc-400 px-2 py-1.5 translate-y-full group-hover:translate-y-0 transition-transform truncate">
        {currentSrc}
      </div>
    </div>
  )
}

export default function AdminImagesPage() {
  const [query, setQuery] = useState("")
  const [count, setCount] = useState(4)
  const [results, setResults] = useState<QueryResult[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"gallery" | "hero">("gallery")

  const runQuery = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    const start = Date.now()
    try {
      let images: ImageResult[] = []
      let fetchError: string | undefined

      if (mode === "gallery") {
        const res = await fetch(`/api/gallery?query=${encodeURIComponent(q)}&count=${count}`)
        const data = await res.json()
        if (!res.ok) fetchError = `HTTP ${res.status}`
        images = (data.images || []).map((url: string) => ({ url, provider: detectProvider(url) }))
      } else {
        // hero mode — /api/image returns single URL (Unsplash → Wikimedia → static)
        const res = await fetch(`/api/image?query=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (!res.ok) fetchError = `HTTP ${res.status}`
        if (data.url) images = [{ url: data.url, provider: detectProvider(data.url) }]
      }

      const ms = Date.now() - start
      setResults(prev => [{ query: q, images, ms, error: fetchError }, ...prev].slice(0, 20))
    } catch (e: any) {
      setResults(prev => [{ query: q, images: [], ms: Date.now() - start, error: e.message }, ...prev].slice(0, 20))
    }
    setLoading(false)
  }, [count, mode])

  const runAll = async () => {
    for (const q of PRESET_QUERIES) {
      await runQuery(q)
      await new Promise(r => setTimeout(r, 300))
    }
  }

  const providerStats = results.flatMap(r => r.images).reduce((acc, img) => {
    acc[img.provider] = (acc[img.provider] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalImages = results.flatMap(r => r.images).length
  const avgMs = results.length > 0 ? Math.round(results.reduce((a, r) => a + r.ms, 0) / results.length) : 0

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-mono">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="border-b border-white/10 pb-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">🖼️ Image Provider Tester</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Client fallback: <code className="text-orange-400">direct → proxy → /api/image → ❌</code>
            </p>
          </div>
          {/* Mode switcher */}
          <div className="flex gap-1 bg-zinc-900 border border-white/10 rounded-lg p-1 text-sm">
            <button
              onClick={() => { setMode("gallery"); setResults([]) }}
              className={`px-4 py-1.5 rounded-md font-bold transition-colors ${mode === "gallery" ? "bg-green-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              /api/gallery
              <span className="ml-1.5 text-[10px] font-normal opacity-70">Pexels→Wiki</span>
            </button>
            <button
              onClick={() => { setMode("hero"); setResults([]) }}
              className={`px-4 py-1.5 rounded-md font-bold transition-colors ${mode === "hero" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              /api/image
              <span className="ml-1.5 text-[10px] font-normal opacity-70">Unsplash→Wiki</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runQuery(query)}
            placeholder="Введи запрос..."
            className="flex-1 min-w-[300px] bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          />
          {mode === "gallery" && (
            <select
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              {[1, 2, 4, 6, 8].map(n => <option key={n} value={n}>{n} фото</option>)}
            </select>
          )}
          <button onClick={() => runQuery(query)} disabled={loading || !query.trim()} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-sm font-bold transition-colors">
            {loading ? "..." : "Запрос"}
          </button>
          <button onClick={runAll} disabled={loading} className="px-5 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 rounded-lg text-sm font-bold transition-colors">
            Прогнать все пресеты
          </button>
          {results.length > 0 && (
            <button onClick={() => setResults([])} className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
              Очистить
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_QUERIES.map(q => (
            <button key={q} onClick={() => { setQuery(q); runQuery(q) }} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-full text-xs text-zinc-300 transition-colors">
              {q}
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div className="flex flex-wrap gap-4 p-4 bg-zinc-900 rounded-xl border border-white/10 text-sm">
            <span>Запросов: <strong className="text-white">{results.length}</strong></span>
            <span>Фото: <strong className="text-white">{totalImages}</strong></span>
            <span>Avg: <strong className="text-yellow-400">{avgMs}мс</strong></span>
            {Object.entries(providerStats).map(([p, n]) => (
              <span key={p}>{p}: <strong className={
                p === "Pexels" ? "text-green-400" :
                p === "Unsplash" ? "text-blue-400" :
                p === "Wikimedia" ? "text-yellow-400" : "text-red-400"
              }>{n}</strong></span>
            ))}
          </div>
        )}

        <div className="space-y-8">
          {results.map((result, ri) => (
            <div key={ri} className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-zinc-400 text-xs">#{results.length - ri}</span>
                <code className="text-white font-bold text-sm bg-zinc-900 px-3 py-1 rounded-lg border border-white/10">{result.query}</code>
                <span className={`text-xs px-2 py-0.5 rounded-full ${result.error ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                  {result.error ? `❌ ${result.error}` : `✓ ${result.images.length} фото`}
                </span>
                <span className="text-xs text-zinc-500">{result.ms}мс</span>
              </div>
              {result.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {result.images.map((img, i) => (
                    <ImageCard key={i} img={img} index={i} query={result.query} />
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500 text-sm pl-2">Нет результатов</div>
              )}
            </div>
          ))}
        </div>

        {results.length === 0 && (
          <div className="text-center py-20 text-zinc-600">
            <div className="text-5xl mb-4">🔍</div>
            <p>Введи запрос или нажми «Прогнать все пресеты»</p>
          </div>
        )}
      </div>
    </div>
  )
}
