"use client"

import { useState, useEffect } from "react"

// ─── Типы провайдеров ─────────────────────────────────────
type Provider = "pexels" | "unsplash" | "wikimedia" | "static" | "loading" | "none"

function detectProvider(url: string): Provider {
  if (url.includes("pexels.com") || url.includes("pexels-photo")) return "pexels"
  if (url.includes("unsplash.com")) return "unsplash"
  if (url.includes("wikimedia.org") || url.includes("wikipedia.org")) return "wikimedia"
  if (url.startsWith("/")) return "static"
  return "none"
}

const PROVIDER_COLORS: Record<Provider, string> = {
  pexels:    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  unsplash:  "bg-sky-500/20 text-sky-300 border-sky-500/30",
  wikimedia: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  static:    "bg-orange-500/20 text-orange-300 border-orange-500/30",
  loading:   "bg-white/5 text-white/30 border-white/10",
  none:      "bg-red-500/20 text-red-300 border-red-500/30",
}

// ─── Компонент одного тест-блока (gallery) ────────────────
function GalleryTest({ label, query, count = 4 }: { label: string; query: string; count?: number }) {
  const [images, setImages] = useState<string[]>([])
  const [status, setStatus] = useState<"loading" | "done" | "empty">("loading")
  const [ms, setMs] = useState<number>(0)

  useEffect(() => {
    const t0 = Date.now()
    fetch(`/api/gallery?query=${encodeURIComponent(query)}&count=${count}`)
      .then(r => r.json())
      .then(d => {
        setImages(d.images || [])
        setMs(Date.now() - t0)
        setStatus(d.images?.length ? "done" : "empty")
      })
      .catch(() => setStatus("empty"))
  }, [query, count])

  const providers = images.map(detectProvider)
  const mainProvider: Provider = status === "loading" ? "loading" : (providers[0] ?? "none")

  return (
    <div className="bg-white/3 rounded-2xl p-4 border border-white/5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-white/80">{label}</div>
          <div className="text-[10px] font-mono text-white/25 mt-0.5">"{query}"</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {status !== "loading" && <span className="text-[9px] text-white/25">{ms}ms</span>}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PROVIDER_COLORS[mainProvider]}`}>
            {mainProvider === "loading" ? "..." : mainProvider === "none" ? "❌ нет" : mainProvider}
          </span>
        </div>
      </div>

      {providers.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {providers.map((p, i) => (
            <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border ${PROVIDER_COLORS[p]}`}>
              #{i + 1} {p}
            </span>
          ))}
        </div>
      )}

      {status === "loading" && (
        <div className="grid grid-cols-2 gap-2">
          {[...Array(Math.min(count, 2))].map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}
      {status === "done" && (
        <div className={`grid gap-2 ${count === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {images.slice(0, 4).map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              className={`rounded-xl object-cover w-full ${count === 1 ? "aspect-video" : "aspect-square"}`}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
            />
          ))}
        </div>
      )}
      {status === "empty" && (
        <div className="flex items-center justify-center h-20 rounded-xl bg-red-500/5 border border-red-500/20">
          <span className="text-xs text-red-400">Фото не найдено</span>
        </div>
      )}
    </div>
  )
}

// ─── Тест одиночного /api/image ───────────────────────────
function HeroTest({ label, query }: { label: string; query: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<"loading" | "done" | "empty">("loading")
  const [ms, setMs] = useState<number>(0)

  useEffect(() => {
    const t0 = Date.now()
    fetch(`/api/image?query=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(d => {
        setUrl(d.url || null)
        setMs(Date.now() - t0)
        setStatus(d.url ? "done" : "empty")
      })
      .catch(() => setStatus("empty"))
  }, [query])

  const provider: Provider = url ? detectProvider(url) : (status === "loading" ? "loading" : "none")

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-white/70">{label}</div>
          <div className="text-[10px] font-mono text-white/25">"{query}"</div>
        </div>
        <div className="flex items-center gap-1.5">
          {status !== "loading" && <span className="text-[9px] text-white/25">{ms}ms</span>}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PROVIDER_COLORS[provider]}`}>
            {provider === "loading" ? "..." : provider === "none" ? "❌" : provider}
          </span>
        </div>
      </div>
      {status === "loading" && <div className="aspect-video rounded-xl bg-white/5 animate-pulse" />}
      {status === "done" && url && (
        <img src={url} alt="" className="aspect-video rounded-xl object-cover w-full"
          onError={(e) => { (e.target as HTMLImageElement).src = "/tbilisi-old-town.jpg" }} />
      )}
      {status === "empty" && (
        <div className="flex items-center justify-center aspect-video rounded-xl bg-red-500/5 border border-red-500/20">
          <span className="text-xs text-red-400">Нет фото</span>
        </div>
      )}
    </div>
  )
}

// ─── Страница ─────────────────────────────────────────────
export default function PhotoTestPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white p-6 pb-20 space-y-14 max-w-5xl mx-auto">

      <div>
        <h1 className="text-3xl font-black mb-2">🖼 Photo API Test</h1>
        <p className="text-white/40 text-sm mb-4">
          Каскад: <b className="text-emerald-400">Pexels</b> (галереи) → <b className="text-sky-400">Unsplash</b> (хедеры) → <b className="text-purple-400">Wikimedia</b> (fallback)
        </p>
        <div className="flex gap-2 flex-wrap">
          {(["pexels", "unsplash", "wikimedia", "static", "none"] as Provider[]).map(p => (
            <span key={p} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${PROVIDER_COLORS[p]}`}>
              {p === "none" ? "❌ не найдено" : p}
            </span>
          ))}
        </div>
      </div>

      {/* 1. Хедеры */}
      <section>
        <h2 className="text-xl font-bold mb-1">1. Обложки / хедеры <code className="text-sm font-mono text-white/30">/api/image</code></h2>
        <p className="text-white/30 text-xs mb-5">Unsplash → Wikimedia → static fallback</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <HeroTest label="Эйфелева башня" query="Эйфелева башня Париж" />
          <HeroTest label="Анапа пляж 🇷🇺" query="Анапа Черное море пляж" />
          <HeroTest label="Tokyo skyline" query="Tokyo skyline night" />
          <HeroTest label="Maldives" query="Maldives resort beach" />
          <HeroTest label="Санкт-Петербург" query="Санкт-Петербург Эрмитаж" />
          <HeroTest label="Dubai Burj Khalifa" query="Dubai Burj Khalifa" />
        </div>
      </section>

      {/* 2. Галереи — те что не грузили раньше */}
      <section>
        <h2 className="text-xl font-bold mb-1">2. Галереи (4 фото) <code className="text-sm font-mono text-white/30">/api/gallery</code></h2>
        <p className="text-white/30 text-xs mb-5">Pexels → Wikimedia (дополнение) → static fallback</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <GalleryTest label="Аквапарк Анапа 🇷🇺 ❌ раньше не грузил" query="Аквапарк Тики-Так Анапа" count={4} />
          <GalleryTest label="Крепость Калемегдан ❌ раньше не грузил" query="Крепость Калемегдан Белград" count={4} />
          <GalleryTest label="Ресторан Мексико Дубай ❌ раньше не грузил" query="Mexican restaurant Dubai" count={4} />
          <GalleryTest label="Skadarlija Belgrade ❌ раньше не грузил" query="Skadarlija Belgrade bohemian quarter" count={4} />
          <GalleryTest label="Le Comptoir du Relais ✅ грузил раньше" query="Le Comptoir du Relais Paris restaurant" count={4} />
          <GalleryTest label="Эйфелева башня ✅ грузил раньше" query="Эйфелева башня Париж" count={4} />
          <GalleryTest label="Swiss Alps Zermatt" query="Swiss Alps Zermatt mountain" count={4} />
          <GalleryTest label="Istanbul Grand Bazaar" query="Istanbul Grand Bazaar" count={4} />
          <GalleryTest label="Санкт-Петербург Эрмитаж" query="Санкт-Петербург Эрмитаж" count={4} />
          <GalleryTest label="Maldives beach" query="Maldives beach resort" count={4} />
        </div>
      </section>

      {/* 3. Одно фото */}
      <section>
        <h2 className="text-xl font-bold mb-1">3. Одно фото <code className="text-sm font-mono text-white/30">count=1</code></h2>
        <p className="text-white/30 text-xs mb-5">Для тумбнейлов в карточках</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <GalleryTest label="Сочи горы" query="Сочи горы море" count={1} />
          <GalleryTest label="Bali temple" query="Bali Tanah Lot temple" count={1} />
          <GalleryTest label="Парк Зарядье Москва" query="Парк Зарядье Москва" count={1} />
          <GalleryTest label="Dubai hotel interior" query="Dubai luxury hotel interior" count={1} />
          <GalleryTest label="Thailand floating market" query="Thailand floating market" count={1} />
          <GalleryTest label="Venice canal gondola" query="Venice canal gondola" count={1} />
        </div>
      </section>

      <footer className="text-center text-white/15 text-xs">
        Кэш: 1 час на сервере, 24ч в браузере. Обнови страницу для повторного теста.
      </footer>
    </div>
  )
}
