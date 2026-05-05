"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { Epilogue, Plus_Jakarta_Sans } from "next/font/google"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  AlertTriangle,
  Bolt,
  Cloud,
  Sparkles,
  Star,
  Volume2,
  Wind,
} from "lucide-react"
import { PLAN_PENDING_GENERATION_KEY } from "@/lib/trip-generation-stream"
import { useTripGeneration } from "@/lib/context/trip-generation-context"
import { ErrorModal } from "@/components/ErrorModal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** Moodboard image — scripts/Vibe/code.html */
const MOODBOARD_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCvw0vQMzDfDDt8t4bxngK0Hw_nJ26IwdB_VVHla-UPBRkR90Bsk-hrVl35-g9I6nzRwA2iiJC5Li3piUtcTTZAMP8C5FbG-0nv6WLdjlOa9YoP72S3ccEIWgnFTwHjmIYU_AzqKtSf3dMPgPVZUzZvH6TQfRUNqy34aXpioVVbZWFf5AGsVW2JF3kvlMtfv3U8t4SGBlXY-p8VfbczblAIGG7KCQuQQxthIh9MFO1VyK7FKq0meEcar5DpEy-ZmaLKio2MGHGMWhbg"

/** Epilogue в next/font — только latin/latin-ext; кириллица уйдёт в системный fallback из стека. */
const fontHeadline = Epilogue({
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
})

const fontBody = Plus_Jakarta_Sans({
  subsets: ["latin", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

const FORBIDDEN_STEMS = [
  "хуй", "хуе", "хуи", "хуя", "пизд", "ебал", "ебать", "ебан", "ёбал", "ёбать", "ёбан", "наебал",
  "блять", "блядь", "мудак", "залупа", "суках", "сукин", "наркотик", "героин", "кокаин", "метамфет",
  "амфетамин", "проститут", "бордел", "стриптиз", "порнo", "порно",
  "ignore previous", "system prompt", "jailbreak", "dan mode",
  "забудь всё", "забудь все", "respond only", "act as an ai",
]

function sanitizeVibe(s: string): string {
  return s.replace(/[<>{}[\]\\]/g, "").replace(/(\r\n|\n|\r)/gm, " ").trim().slice(0, 2000)
}

const VIBE_CHIP_KEYS = ["roadTrip", "hkSg", "soloReset", "contrast"] as const

const ENERGY_KEYS = ["chaotic", "electric", "loud", "serene"] as const
type EnergyKey = (typeof ENERGY_KEYS)[number]

const ENERGY_ICON: Record<EnergyKey, typeof Bolt> = {
  chaotic: Wind,
  electric: Bolt,
  loud: Volume2,
  serene: Cloud,
}

const ENERGY_AI_LABEL: Record<EnergyKey, string> = {
  chaotic: "Chaotic",
  electric: "Electric",
  loud: "Loud",
  serene: "Serene",
}

function validateVibe(text: string, t: (key: string) => string): string | null {
  if (!text.trim()) return null
  const lower = text.toLowerCase()
  for (const stem of FORBIDDEN_STEMS) if (lower.includes(stem)) return t("validation.highlightInvalid")
  if (/\b(ты теперь|ты являешься|ты — это)\b/i.test(lower)) return t("validation.aiJailbreak")
  return null
}

function buildTripVibeForApi(energy: EnergyKey, raw: string): string {
  const body = sanitizeVibe(raw)
  const prefix = `[Energy: ${ENERGY_AI_LABEL[energy]}]`
  if (!body) return prefix
  return `${prefix}\n\n${body}`
}

export default function PlanVibePage() {
  const router = useRouter()
  const t = useTranslations("plan")
  const tv = useTranslations("plan.vibe")
  const tc = useTranslations("common")
  const { isGenerating, startGeneration } = useTripGeneration()

  const [basePayload, setBasePayload] = useState<Record<string, unknown> | null>(null)
  const [vibe, setVibe] = useState("")
  const [energy, setEnergy] = useState<EnergyKey>("electric")
  const [vibeError, setVibeError] = useState<string | null>(null)
  const [showEconomyWarning, setShowEconomyWarning] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null)
  const [errorModal, setErrorModal] = useState<{
    open: boolean
    title?: string
    message: string
    details?: string
  }>({ open: false, message: "" })

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PLAN_PENDING_GENERATION_KEY)
      if (!raw) {
        router.replace("/plan")
        return
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (!parsed || typeof parsed !== "object") {
        router.replace("/plan")
        return
      }
      setBasePayload(parsed)
    } catch {
      router.replace("/plan")
    }
  }, [router])

  const appendChip = (snippet: string) => {
    setVibe((prev) => {
      const next = snippet.trim()
      if (!next) return prev
      if (!prev.trim()) return next
      return `${prev.trim()}\n\n${next}`
    })
    setVibeError(null)
  }

  const runGeneration = async (payload: Record<string, unknown>) => {
    await startGeneration(payload, {
      autoFavorites: !!payload.autoFavorites,
      defaultTripTitle: t("defaultTripTitle"),
      defaultDestination: t("defaultDestination"),
    })
  }

  const startWithPayload = async (payload: Record<string, unknown>) => {
    if (payload.budget === "economy" && String(payload.customDestination || "").trim()) {
      setPendingPayload(payload)
      setShowEconomyWarning(true)
      return
    }
    await runGeneration(payload)
  }

  const handleEconomyChoice = async (strict: boolean) => {
    setShowEconomyWarning(false)
    if (!pendingPayload) return
    const finalPayload = { ...pendingPayload, strictDestinations: strict }
    setPendingPayload(null)
    await runGeneration(finalPayload)
  }

  const handleContinue = async () => {
    if (!basePayload) return
    const err = validateVibe(vibe, t)
    setVibeError(err)
    if (err) return

    const merged: Record<string, unknown> = { ...basePayload }
    const cleaned = vibe.trim() ? buildTripVibeForApi(energy, vibe) : `[Energy: ${ENERGY_AI_LABEL[energy]}]`

    merged.tripVibe = sanitizeVibe(cleaned)

    try {
      sessionStorage.setItem(PLAN_PENDING_GENERATION_KEY, JSON.stringify(merged))
    } catch {
      setErrorModal({ open: true, title: t("validation.checkTitle"), message: t("errors.storageFailed") })
      return
    }

    await startWithPayload(merged)
  }

  const handleSkip = async () => {
    if (!basePayload) return
    const merged = { ...basePayload }
    delete merged.tripVibe
    setVibe("")
    setVibeError(null)
    try {
      sessionStorage.setItem(PLAN_PENDING_GENERATION_KEY, JSON.stringify(merged))
    } catch {
      setErrorModal({ open: true, title: t("validation.checkTitle"), message: t("errors.storageFailed") })
      return
    }
    await startWithPayload(merged)
  }

  if (!basePayload) {
    return (
      <AppLayout className={cn(fontBody.className, "min-h-screen bg-[#fff3fa] dark:bg-transparent")}>
        <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-[#6b5469] dark:text-zinc-400">
          {tc("loading")}
        </div>
      </AppLayout>
    )
  }

  const stickerShadow = "shadow-[0_20px_40px_rgba(59,40,59,0.06)]"

  return (
    <AppLayout
      className={cn(
        fontBody.className,
        "trip-bg min-h-screen bg-[#fff3fa] text-[#3b283b] dark:bg-transparent dark:text-zinc-100",
        "selection:bg-[#ff7941] selection:text-[#431200] dark:selection:bg-orange-500/40 dark:selection:text-white",
      )}
    >
      <div className="relative -mx-3 -mt-4 min-w-0 max-w-[100vw] px-3 pb-28 pt-4 sm:-mx-4 sm:px-4 sm:pb-24 sm:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pb-32 lg:pt-10">
        <ErrorModal
          open={errorModal.open}
          onClose={() => setErrorModal((m) => ({ ...m, open: false }))}
          onRetry={handleContinue}
          title={errorModal.title}
          message={errorModal.message}
          details={errorModal.details}
        />

        <Dialog open={showEconomyWarning} onOpenChange={setShowEconomyWarning}>
          <DialogContent className="w-[calc(100vw-1.25rem)] max-w-md border-[#c0a5bd]/40 bg-[#fff3fa] dark:border-white/10 dark:bg-zinc-900/95 dark:text-zinc-100 sm:w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-bold text-foreground">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                {t("economyWarning.title")}
              </DialogTitle>
              <DialogDescription className="pt-1 text-sm text-[#6b5469] dark:text-zinc-400">
                {t("economyWarning.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleEconomyChoice(true)}
                className={cn(
                  "w-full touch-manipulation rounded-2xl border border-[#c0a5bd]/30 bg-white p-4 text-left transition-colors hover:bg-[#ffebfa]",
                  "dark:border-white/10 dark:bg-zinc-800/90 dark:hover:bg-zinc-800",
                  stickerShadow,
                )}
              >
                <p className="text-sm font-bold text-[#3b283b] dark:text-zinc-100">{t("economyWarning.strict")}</p>
                <p className="mt-1 text-xs text-[#6b5469] dark:text-zinc-400">{t("economyWarning.strictHint")}</p>
              </button>
              <button
                type="button"
                onClick={() => handleEconomyChoice(false)}
                className={cn(
                  "w-full touch-manipulation rounded-2xl border border-[#c0a5bd]/30 bg-white p-4 text-left transition-colors hover:bg-[#ffebfa]",
                  "dark:border-white/10 dark:bg-zinc-800/90 dark:hover:bg-zinc-800",
                  stickerShadow,
                )}
              >
                <p className="text-sm font-bold text-[#3b283b] dark:text-zinc-100">{t("economyWarning.flexible")}</p>
                <p className="mt-1 text-xs text-[#6b5469] dark:text-zinc-400">{t("economyWarning.flexibleHint")}</p>
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Decorative blobs — DESIGN.md */}
        <div
          className="pointer-events-none absolute -right-20 top-24 -z-0 h-64 w-64 rounded-full bg-[#ff85e4]/20 blur-3xl lg:right-[5%]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-32 top-1/2 -z-0 h-80 w-80 rounded-full bg-[#ff7941]/20 blur-3xl"
          aria-hidden
        />

        <button
          type="button"
          onClick={() => router.push("/plan")}
          className={cn(
            "relative z-10 mb-6 sm:mb-8 inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#a33800] transition hover:bg-[#ffebfa] touch-manipulation",
            "dark:text-orange-300 dark:hover:bg-white/10",
            fontBody.className,
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          {tv("back")}
        </button>

        <div className="relative z-10 mx-auto min-w-0 max-w-5xl">
          {/* Header — Stitch */}
          <header className="mb-8 overflow-visible sm:mb-10 lg:mb-12">
            <span
              className={cn(
                "mb-4 inline-block rotate-[-2deg] rounded-full bg-[#a80096] px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#ffeef6]",
                "dark:bg-fuchsia-700 dark:text-fuchsia-50",
                stickerShadow,
              )}
            >
              {tv("scrapbookBadge")}
            </span>
            <h1
              className={cn(
                "overflow-visible pb-1 pr-1 pt-2 text-4xl font-black italic leading-[1.08] tracking-tighter text-[#3b283b] sm:text-5xl sm:pr-3 sm:leading-[1.1] md:text-7xl md:leading-[1.12] lg:text-8xl lg:pr-4 lg:leading-[1.12]",
                "dark:text-zinc-100",
                fontHeadline.className,
              )}
            >
              {tv("headlineLead")}{" "}
              <span
                className="inline-block overflow-visible bg-gradient-to-r from-[#a33800] via-[#a80096] to-[#ff7941] bg-clip-text pe-1 text-transparent [-webkit-box-decoration-break:clone] [box-decoration-break:clone] dark:from-orange-300 dark:via-fuchsia-300 dark:to-amber-300 sm:pe-1.5"
              >
                {tv("headlineAccent")}
              </span>
            </h1>
            <p
              className={cn(
                "mt-4 sm:mt-6 max-w-md text-base font-medium leading-relaxed text-[#6b5469] sm:text-lg md:text-xl",
                "dark:text-zinc-400",
                fontBody.className,
              )}
            >
              {tv("subtitleLong")}
            </p>
          </header>

          <div className="grid grid-cols-1 items-start gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-8">
            {/* Left: form */}
            <div className="min-w-0 space-y-8 sm:space-y-10 lg:col-span-7">
              {/* 1 Energy */}
              <section>
                <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a33800] text-sm font-bold text-[#ffefeb]"
                    style={{ fontFamily: "inherit" }}
                  >
                    1
                  </span>
                  <h2
                    className={cn(
                      "text-xl sm:text-2xl font-black italic text-[#3b283b] dark:text-zinc-100",
                      fontHeadline.className,
                    )}
                  >
                    {tv("energyStep")}
                  </h2>
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3 md:gap-4">
                  {ENERGY_KEYS.map((key) => {
                    const Icon = ENERGY_ICON[key]
                    const selected = energy === key
                    const selectedStyles =
                      key === "chaotic"
                        ? "border-[#a33800] bg-[#ff7941]/10 scale-105 dark:border-orange-400 dark:bg-orange-500/25"
                        : key === "electric"
                          ? "border-[#a80096] bg-[#ff85e4]/10 scale-105 dark:border-fuchsia-400 dark:bg-fuchsia-500/20"
                          : key === "loud"
                            ? "border-[#006384] bg-[#97daff]/10 scale-105 dark:border-sky-400 dark:bg-sky-500/20"
                            : "border-[#876f85] bg-[#f7d1f3]/20 scale-105 dark:border-zinc-500 dark:bg-zinc-800/80"
                    const iconColor =
                      key === "chaotic"
                        ? "text-[#a33800] dark:text-orange-300"
                        : key === "electric"
                          ? "text-[#a80096] dark:text-fuchsia-300"
                          : key === "loud"
                            ? "text-[#006384] dark:text-sky-300"
                            : "text-[#876f85] dark:text-zinc-400"
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEnergy(key)}
                        aria-pressed={selected}
                        className={cn(
                          "group flex w-full min-w-0 items-center justify-center gap-2.5 rounded-full border-4 border-transparent bg-white px-4 py-3 transition-all duration-300 touch-manipulation sm:w-auto sm:justify-start sm:gap-3 sm:px-6 md:px-8 md:py-4",
                          "dark:bg-zinc-900/90 dark:ring-1 dark:ring-white/10",
                          stickerShadow,
                          selected ? selectedStyles : "hover:scale-[1.02] dark:hover:bg-zinc-800",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-6 w-6 shrink-0 transition-transform group-hover:scale-110",
                            iconColor,
                            key === "electric" && "motion-safe:animate-pulse",
                          )}
                        />
                        <span
                          className={cn(
                            "text-center text-base font-black uppercase italic tracking-tighter text-[#3b283b] sm:text-left sm:text-lg md:text-xl dark:text-zinc-100 leading-tight",
                            fontHeadline.className,
                            key === "serene" && "opacity-70 dark:opacity-90",
                          )}
                        >
                          {tv(`energy${key.charAt(0).toUpperCase() + key.slice(1)}` as "energyChaotic")}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* 2 Story */}
              <section>
                <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a80096] text-sm font-bold text-[#ffeef6]">
                    2
                  </span>
                  <h2
                    className={cn(
                      "text-xl sm:text-2xl font-black italic text-[#3b283b] dark:text-zinc-100",
                      fontHeadline.className,
                    )}
                  >
                    {tv("storyStep")}
                  </h2>
                </div>
                <div className="relative">
                  <label
                    className={cn(
                      "mb-2 ml-1 block text-xs font-bold uppercase tracking-widest text-[#6b5469] dark:text-zinc-400",
                      fontBody.className,
                    )}
                  >
                    {tv("manifestationLabel")}
                  </label>
                  <div className="relative group">
                    <Textarea
                      value={vibe}
                      onChange={(e) => {
                        setVibe(e.target.value.slice(0, 2000))
                        setVibeError(null)
                      }}
                      placeholder={tv("placeholderLong")}
                      className={cn(
                        "min-h-[10rem] sm:min-h-[12rem] w-full resize-y rounded-xl border-0 bg-white p-4 text-base font-medium text-[#3b283b] shadow-none sm:p-6 sm:text-lg md:p-8",
                        "dark:bg-zinc-900/90 dark:text-zinc-100 dark:ring-1 dark:ring-white/10",
                        stickerShadow,
                        "placeholder:text-[#c0a5bd]/80 dark:placeholder:text-zinc-500",
                        "focus-visible:ring-4 focus-visible:ring-[#a80096]/20 dark:focus-visible:ring-fuchsia-500/30",
                        fontBody.className,
                      )}
                      maxLength={2000}
                    />
                    {/* “Tape” decoration */}
                    <div
                      className="pointer-events-none absolute -right-6 -top-3 h-8 w-24 rotate-[15deg] rounded-sm bg-[#a33800]/30 mix-blend-multiply dark:mix-blend-normal dark:bg-orange-500/35"
                      aria-hidden
                    />
                  </div>
                  <div
                    className={cn(
                      "mt-2 flex flex-wrap justify-between gap-2 text-xs text-[#6b5469] dark:text-zinc-400",
                      fontBody.className,
                    )}
                  >
                    <span>{tv("hint")}</span>
                    <span className="tabular-nums">{vibe.length}/2000</span>
                  </div>
                  {vibeError && (
                    <p className="mt-2 text-sm font-medium text-[#b31b25] dark:text-red-400">{vibeError}</p>
                  )}

                  <p
                    className={cn(
                      "mb-2 mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a33800] dark:text-orange-300",
                      fontBody.className,
                    )}
                  >
                    {tv("chipsTitle")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {VIBE_CHIP_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => appendChip(tv(`chips.${key}`))}
                        className={cn(
                          "rounded-full border border-[#c0a5bd]/40 bg-[#ffebfa] px-3 py-2 text-left text-xs font-semibold text-[#3b283b] transition hover:bg-[#f7d1f3] touch-manipulation",
                          "dark:border-white/15 dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:bg-zinc-700",
                          fontBody.className,
                        )}
                      >
                        + {tv(`chips.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={isGenerating}
                  className={cn(
                    "inline-flex w-full min-h-12 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#a33800] to-[#ff7941] px-6 py-3.5 text-base font-black uppercase tracking-widest text-[#ffefeb] transition hover:scale-[1.02] sm:hover:scale-105 active:scale-95 disabled:opacity-60 touch-manipulation sm:w-auto sm:px-10 sm:py-4 sm:text-lg md:text-xl",
                    stickerShadow,
                    fontHeadline.className,
                  )}
                >
                  {tv("continue")}
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isGenerating}
                  className={cn(
                    "w-full min-h-11 rounded-full text-[#6b5469] hover:bg-[#f7d1f3]/50 hover:text-[#3b283b] touch-manipulation sm:w-auto",
                    "dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100",
                    fontBody.className,
                  )}
                >
                  {tv("skip")}
                </Button>
              </div>
            </div>

            {/* Right: moodboard sticker */}
            <aside className="min-w-0 px-1 sm:px-0 lg:col-span-5 lg:sticky lg:top-28">
              <div className="group relative overflow-visible pb-8 sm:pb-0">
                <div
                  className={cn(
                    "relative z-10 rotate-[2deg] rounded-lg border-b-[12px] border-[#f7d1f3] bg-white p-4 transition-transform duration-500 group-hover:rotate-[1deg]",
                    "dark:border-zinc-700 dark:bg-zinc-900/95 dark:ring-1 dark:ring-white/10",
                    stickerShadow,
                  )}
                >
                  <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-md">
                    <Image
                      src={MOODBOARD_IMG}
                      alt={tv("moodboardCaption")}
                      fill
                      className="object-cover grayscale transition-all duration-500 hover:grayscale-0"
                      sizes="(max-width: 1024px) 100vw, 400px"
                      unoptimized
                    />
                  </div>
                  <div className="space-y-1">
                    <span
                      className={cn(
                        "text-xs font-bold uppercase text-[#a80096] dark:text-fuchsia-300",
                        fontHeadline.className,
                      )}
                    >
                      {tv("moodboardTitle")}
                    </span>
                    <p className={cn("font-bold text-[#3b283b] dark:text-zinc-100", fontBody.className)}>
                      {tv("moodboardCaption")}
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "absolute -left-2 -top-4 z-20 rotate-[-12deg] scale-90 rounded-full border-4 border-white bg-[#97daff] p-4 text-[#004d68] sm:-left-6 sm:-top-6 sm:scale-100 sm:p-5",
                    "dark:border-zinc-800 dark:bg-sky-600 dark:text-sky-950",
                    stickerShadow,
                  )}
                >
                  <Star className="h-8 w-8 sm:h-10 sm:w-10 fill-[#004d68] dark:fill-sky-950" strokeWidth={0} />
                </div>

                <div
                  className={cn(
                    "absolute -bottom-6 -right-1 z-20 max-w-[min(100%,200px)] rotate-[-2deg] rounded-xl bg-[#ff85e4]/90 p-3 text-sm text-[#5e0053] sm:-bottom-8 sm:-right-4 sm:p-5 sm:text-base",
                    "dark:bg-fuchsia-900/95 dark:text-fuchsia-100",
                    stickerShadow,
                  )}
                >
                  <p className={cn("text-sm font-bold italic leading-tight", fontHeadline.className)}>
                    &ldquo;{tv("stickerQuote")}&rdquo;
                  </p>
                </div>
              </div>

              <div className={cn("mt-12 sm:mt-24 flex flex-wrap gap-2 opacity-90 dark:opacity-100", fontBody.className)}>
                <span className="rounded-full bg-[#f7d1f3] px-3 py-1 text-[10px] font-bold uppercase tracking-tighter text-[#3b283b] dark:bg-zinc-800 dark:text-zinc-300">
                  {tv("tagAdventure")}
                </span>
                <span className="rounded-full bg-[#f7d1f3] px-3 py-1 text-[10px] font-bold uppercase tracking-tighter text-[#3b283b] dark:bg-zinc-800 dark:text-zinc-300">
                  {tv("tagNeon")}
                </span>
                <span className="rounded-full bg-[#f7d1f3] px-3 py-1 text-[10px] font-bold uppercase tracking-tighter text-[#3b283b] dark:bg-zinc-800 dark:text-zinc-300">
                  {tv("tagExplorer")}
                </span>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
