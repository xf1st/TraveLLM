"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronUp,
  Clapperboard,
  MapPin,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  Map,
  X,
  Send,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TripImage } from "@/components/TripImage"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReelCardDTO = {
  id: string
  title: string
  country: string
  city: string | null
  price_label: string | null
  suggested_start_date: string | null
  suggested_end_date: string | null
  anchor_day: number
  images: unknown
  activity_anchor?: Record<string, unknown> | null
  music_url: string | null
  locale: string
  likes_count: number
  comments_count: number
  is_liked: boolean
}

type ReelComment = {
  id: string
  body: string
  created_at: string
  profiles: { username: string | null; full_name: string | null; avatar_url: string | null } | null
}

type FeedMode = "discovery" | "liked"

// ─── Session-storage cache ────────────────────────────────────────────────────

const cacheKey = (locale: string, mode: FeedMode) => `travellm_reels_${locale}_${mode}_v1`

function readCache(key: string): ReelCardDTO[] | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { reels?: unknown }
    return Array.isArray(parsed?.reels) ? (parsed.reels as ReelCardDTO[]) : null
  } catch {
    return null
  }
}

function writeCache(key: string, reels: ReelCardDTO[]) {
  try { sessionStorage.setItem(key, JSON.stringify({ reels })) } catch {}
}

function clearCache(key: string) {
  try { sessionStorage.removeItem(key) } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 5)
}

function CommentAvatar({ profile }: { profile: ReelComment["profiles"] }) {
  if (profile?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
  }
  const initials = (profile?.full_name || profile?.username || "?")[0].toUpperCase()
  const palettes = ["from-sky-400 to-indigo-500", "from-rose-400 to-orange-500", "from-emerald-400 to-teal-500", "from-violet-400 to-purple-500"]
  const color = palettes[(initials.charCodeAt(0) || 0) % palettes.length]
  return (
    <div className={cn("w-8 h-8 rounded-full bg-gradient-to-tr shrink-0 flex items-center justify-center text-white text-xs font-bold", color)}>
      {initials}
    </div>
  )
}

// ─── CommentsPanel (mobile bottom sheet) ─────────────────────────────────────

function CommentsPanel({ reelId, commentsCount, onClose, onCommentAdded }: {
  reelId: string
  commentsCount: number
  onClose: () => void
  onCommentAdded: () => void
}) {
  const [comments, setComments] = useState<ReelComment[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [localCount, setLocalCount] = useState(commentsCount)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetch(`/api/reels/${reelId}/comments?limit=30`, { credentials: "include" })
      const j = await res.json().catch(() => ({}))
      if (!cancelled) {
        setComments(Array.isArray(j.comments) ? j.comments : [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [reelId])

  const sendComment = async () => {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    const res = await fetch(`/api/reels/${reelId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    })
    const j = await res.json().catch(() => ({}))
    if (res.ok && j.comment) {
      setComments((prev) => [j.comment, ...prev])
      setLocalCount((c) => c + 1)
      setDraft("")
      onCommentAdded()
    }
    setSending(false)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full h-[65%] bg-neutral-900 rounded-t-3xl flex flex-col pointer-events-auto border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-neutral-900 rounded-t-3xl shrink-0">
          <h3 className="font-bold text-white">Комментарии ({localCount})</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {loading ? (
            <div className="flex justify-center pt-8"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
          ) : comments.length === 0 ? (
            <p className="text-center text-white/40 text-sm pt-8">Будьте первым!</p>
          ) : (
            comments.map((c, i) => (
              <div key={c.id} className={cn("flex gap-3", i > 0 && "border-t border-white/5 pt-4")}>
                <CommentAvatar profile={c.profiles} />
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-bold text-white">{c.profiles?.username || c.profiles?.full_name || "Путешественник"}</p>
                  <p className="text-sm text-white/80">{c.body}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="shrink-0 p-4 border-t border-white/10 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            onKeyDown={(e) => e.key === "Enter" && sendComment()}
            placeholder="Написать комментарий..."
            className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-full px-4 py-2 text-sm outline-none border border-white/15 focus:border-white/30"
          />
          <button
            onClick={sendComment}
            disabled={!draft.trim() || sending}
            className="h-10 w-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─── DesktopComments — lazy: only fetches when isActive ──────────────────────

function DesktopComments({ reelId, commentsCount, isActive }: {
  reelId: string
  commentsCount: number
  isActive: boolean
}) {
  const [comments, setComments] = useState<ReelComment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [localCount, setLocalCount] = useState(commentsCount)

  useEffect(() => { setLocalCount(commentsCount) }, [commentsCount])

  // Only load once the slide is active
  useEffect(() => {
    if (!isActive || loaded) return
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/reels/${reelId}/comments?limit=30`, { credentials: "include" })
      const j = await res.json().catch(() => ({}))
      if (!cancelled) { setComments(Array.isArray(j.comments) ? j.comments : []); setLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [reelId, isActive, loaded])

  const sendComment = async () => {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    const res = await fetch(`/api/reels/${reelId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    })
    const j = await res.json().catch(() => ({}))
    if (res.ok && j.comment) {
      setComments((prev) => [j.comment, ...prev])
      setLocalCount((c) => c + 1)
      setDraft("")
    }
    setSending(false)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white/80">Комментарии ({localCount})</h3>
      {!loaded ? (
        isActive ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
        ) : (
          <p className="text-white/30 text-sm">Листайте к этому рилсу, чтобы загрузить</p>
        )
      ) : comments.length === 0 ? (
        <p className="text-white/40 text-sm">Пока нет комментариев</p>
      ) : (
        comments.map((c, i) => (
          <div key={c.id} className={cn("flex gap-3", i > 0 && "border-t border-white/5 pt-4")}>
            <CommentAvatar profile={c.profiles} />
            <div className="flex-1 space-y-1">
              <p className="text-xs font-bold text-white">{c.profiles?.username || c.profiles?.full_name || "Путешественник"}</p>
              <p className="text-sm text-white/80">{c.body}</p>
            </div>
          </div>
        ))
      )}
      <div className="flex gap-2 pt-2">
        <input
          id={`desktop-comment-input-${reelId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 500))}
          onKeyDown={(e) => e.key === "Enter" && sendComment()}
          placeholder="Написать комментарий..."
          className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-full px-4 py-2 text-sm outline-none border border-white/15 focus:border-white/30"
        />
        <button
          onClick={sendComment}
          disabled={!draft.trim() || sending}
          className="h-9 w-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Send className="h-3.5 w-3.5 text-white" />}
        </button>
      </div>
    </div>
  )
}

// ─── ReelSlide ────────────────────────────────────────────────────────────────

function ReelSlide({ reel, isActive, slideHeight, onLikeChange }: {
  reel: ReelCardDTO
  isActive: boolean
  slideHeight: number
  onLikeChange?: (reelId: string, liked: boolean, count: number) => void
}) {
  const t = useTranslations("reels")
  const [imgIdx, setImgIdx] = useState(0)
  const [soundOn, setSoundOn] = useState(false)
  const [isLiked, setIsLiked] = useState(reel.is_liked)
  const [likesCount, setLikesCount] = useState(reel.likes_count)
  const [commentsCount, setCommentsCount] = useState(reel.comments_count)
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const urls = asImageUrls(reel.images)
  const loc = [reel.city, reel.country].filter(Boolean).join(", ")

  useEffect(() => { setIsLiked(reel.is_liked) }, [reel.is_liked])
  useEffect(() => { setLikesCount(reel.likes_count) }, [reel.likes_count])
  useEffect(() => { setCommentsCount(reel.comments_count) }, [reel.comments_count])

  useEffect(() => {
    setImgIdx(0)
    scrollRef.current?.scrollTo({ left: 0 })
  }, [reel.id])

  useEffect(() => {
    if (!isActive) {
      setSoundOn(false)
      const a = audioRef.current
      if (a) { a.pause(); a.currentTime = 0 }
    }
  }, [isActive])

  const stopAudio = () => {
    setSoundOn(false)
    const a = audioRef.current
    if (a) { a.pause(); a.currentTime = 0 }
  }

  const toggleSound = async () => {
    if (!reel.music_url) return
    if (!audioRef.current) {
      audioRef.current = new Audio(reel.music_url)
      audioRef.current.preload = "metadata"
    }
    const a = audioRef.current
    if (soundOn) { stopAudio(); return }
    try { await a.play(); setSoundOn(true) } catch { setSoundOn(false) }
  }

  useEffect(() => () => stopAudio(), [])

  const handleDotClick = (i: number) => {
    setImgIdx(i)
    scrollRef.current?.scrollTo({ left: scrollRef.current.clientWidth * i, behavior: "smooth" })
  }

  const handleLike = async () => {
    if (likeLoading) return
    setLikeLoading(true)
    const nextLiked = !isLiked
    setIsLiked(nextLiked)
    setLikesCount((c) => c + (nextLiked ? 1 : -1))
    const res = await fetch(`/api/reels/${reel.id}/like`, {
      method: nextLiked ? "POST" : "DELETE",
      credentials: "include",
    })
    const j = await res.json().catch(() => ({}))
    if (res.ok) {
      setLikesCount(j.likes_count)
      onLikeChange?.(reel.id, j.is_liked, j.likes_count)
    } else {
      setIsLiked(!nextLiked)
      setLikesCount((c) => c + (nextLiked ? -1 : 1))
    }
    setLikeLoading(false)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/reels?id=${reel.id}`
    if (navigator.share) {
      try { await navigator.share({ title: reel.title, url }) } catch {}
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const slideStyle =
    slideHeight > 0
      ? { minHeight: slideHeight, height: slideHeight }
      : { minHeight: "calc(100dvh - 5rem)", height: "calc(100dvh - 5rem)" }

  return (
    <div className="w-full shrink-0 snap-start snap-always relative overflow-hidden bg-black flex flex-row" style={slideStyle}>

      {/* Media */}
      <div className="relative flex-1 h-full bg-neutral-900 overflow-hidden">
        <div
          ref={scrollRef}
          className="absolute inset-0 bg-neutral-900 flex overflow-x-auto snap-x snap-mandatory no-scrollbar touch-pan-x"
          onScroll={(e) => {
            const w = e.currentTarget.clientWidth
            if (w > 0) setImgIdx(Math.round(e.currentTarget.scrollLeft / w))
          }}
        >
          {urls.length > 0 ? (
            urls.map((url, i) => {
              const mods = ["", "scenic", "travel", "photography", "landscape"]
              return (
                <div key={i} className="w-full shrink-0 snap-center h-full relative">
                  <TripImage
                    src={url} alt={reel.title}
                    className="absolute inset-0 w-full h-full"
                    imgClassName="h-full w-full object-cover scale-[1.02]"
                    query={`${reel.title} ${loc} ${mods[i] || ""}`.trim()}
                    priority={isActive && i === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/95 pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
                </div>
              )
            })
          ) : (
            <div className="w-full shrink-0 snap-center h-full relative">
              <TripImage
                src={undefined as any} alt={reel.title}
                className="absolute inset-0 w-full h-full"
                imgClassName="h-full w-full object-cover scale-[1.02]"
                query={`${reel.title} ${loc}`}
                priority={isActive}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/95 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
            </div>
          )}
        </div>

        {/* Photo dots */}
        {urls.length > 1 && (
          <div className="absolute bottom-36 md:bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 pointer-events-none">
            {urls.map((_, i) => (
              <button key={i} type="button" aria-label={`${i + 1}`}
                onClick={() => handleDotClick(i)}
                className="touch-manipulation rounded-full p-2 sm:p-1 pointer-events-auto"
              >
                <span className={cn("mx-auto block h-1 rounded-full transition-all duration-300",
                  i === imgIdx ? "w-7 bg-white shadow-[0_0_12px_rgba(255,255,255,0.5)]" : "w-1.5 bg-white/35 sm:hover:bg-white/55"
                )} />
              </button>
            ))}
          </div>
        )}

        {/* Mobile right rail */}
        <div className="md:hidden absolute right-3 bottom-44 z-20 flex flex-col gap-5 items-center">
          <button onClick={handleLike} className="flex flex-col items-center gap-1 touch-manipulation">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10">
              <Heart className={cn("h-6 w-6 transition-colors", isLiked ? "fill-rose-500 text-rose-500" : "text-white")} />
            </div>
            <span className="text-xs font-bold text-white drop-shadow-md">{likesCount}</span>
          </button>
          <button onClick={() => setIsCommentsOpen(true)} className="flex flex-col items-center gap-1 touch-manipulation">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow-md">{commentsCount}</span>
          </button>
          <button onClick={handleShare} className="flex flex-col items-center gap-1 touch-manipulation">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10">
              <Share2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow-md">{copied ? "Ok!" : t("share")}</span>
          </button>
          <button className="flex flex-col items-center gap-1 touch-manipulation">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10">
              <Map className="h-6 w-6 text-white" />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow-md uppercase tracking-wide">Map</span>
          </button>
          {reel.music_url && (
            <button type="button" onClick={toggleSound} className="mt-2 flex touch-manipulation flex-col items-center gap-1">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-full border transition-transform active:scale-90",
                soundOn ? "bg-primary/90 border-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-black/20 border-white/10 text-white backdrop-blur-md"
              )}>
                {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </div>
            </button>
          )}
        </div>

        {/* Mobile bottom copy */}
        <div className="md:hidden absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-2xl space-y-4 px-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-4">
          <motion.div
            initial={false}
            animate={{ opacity: isActive ? 1 : 0.85, y: isActive ? 0 : 6 }}
            transition={{ duration: 0.35 }}
            className="space-y-3"
          >
            <Badge className="bg-white/15 text-white border-white/25 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase">
              {t("reelBadge")}
            </Badge>
            <h2 className="text-[1.65rem] sm:text-3xl font-black text-white leading-[1.15] tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
              {reel.title}
            </h2>
            <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
              <MapPin className="h-4 w-4 text-sky-400 shrink-0" />
              <span>{loc}</span>
            </div>
            {reel.price_label && (
              <p className="text-lg font-bold text-emerald-400 drop-shadow-md">{reel.price_label}</p>
            )}
            <p className="text-white/55 text-xs font-medium leading-relaxed pr-12">
              {t("anchorDay", { day: reel.anchor_day })}
            </p>
          </motion.div>
          <Button asChild size="lg"
            className="h-14 w-full touch-manipulation rounded-full border-0 bg-primary text-base font-bold text-primary-foreground shadow-xl shadow-primary/25 hover:bg-primary/90"
          >
            <Link href={`/plan/from-reel/${reel.id}`}>{t("ctaBuild")}</Link>
          </Button>
        </div>

        {/* Mobile comments sheet */}
        <AnimatePresence>
          {isCommentsOpen && (
            <div className="md:hidden absolute inset-0 z-50 flex flex-col justify-end">
              <CommentsPanel
                reelId={reel.id}
                commentsCount={commentsCount}
                onClose={() => setIsCommentsOpen(false)}
                onCommentAdded={() => setCommentsCount((c) => c + 1)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop info panel */}
      <div className="hidden md:flex flex-col w-[350px] lg:w-[420px] h-full bg-neutral-950 border-l border-white/10 overflow-hidden relative shrink-0 z-10 shadow-2xl">
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 pb-48">
          <div className="space-y-4">
            <Badge className="bg-white/15 text-white border-white/25 backdrop-blur-md text-xs font-bold tracking-widest uppercase">
              {t("reelBadge")}
            </Badge>
            <h2 className="text-2xl lg:text-3xl font-black text-white leading-tight">{reel.title}</h2>
            <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
              <MapPin className="h-4 w-4 text-sky-400 shrink-0" />
              <span>{loc}</span>
            </div>
            {reel.price_label && <p className="text-xl font-bold text-emerald-400">{reel.price_label}</p>}
            <p className="text-white/60 text-sm font-medium leading-relaxed">{t("anchorDay", { day: reel.anchor_day })}</p>
          </div>
          <div className="h-px w-full bg-white/10" />
          <Button variant="secondary" className="w-full bg-white/10 hover:bg-white/20 text-white border-0 justify-start gap-3 h-12 rounded-xl">
            <Map className="h-5 w-5 text-sky-400" />
            <span className="font-bold">Посмотреть на карте</span>
          </Button>
          <div className="h-px w-full bg-white/10" />
          <DesktopComments reelId={reel.id} commentsCount={commentsCount} isActive={isActive} />
        </div>

        {/* Sticky footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/10 p-5 space-y-5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-6">
              <button onClick={handleLike} className="flex items-center gap-2 group">
                <Heart className={cn("h-6 w-6 transition-colors", isLiked ? "fill-rose-500 text-rose-500" : "text-white group-hover:text-rose-400")} />
                <span className="text-sm font-bold text-white/90">{likesCount}</span>
              </button>
              <button
                onClick={() => document.getElementById(`desktop-comment-input-${reel.id}`)?.focus()}
                className="flex items-center gap-2 text-white hover:text-sky-400 transition-colors"
              >
                <MessageCircle className="h-6 w-6" />
                <span className="text-sm font-bold text-white/90">{commentsCount}</span>
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 text-white hover:text-emerald-400 transition-colors">
                <Share2 className="h-6 w-6" />
                <span className="text-sm font-bold text-white/90">{copied ? "Copied!" : t("share")}</span>
              </button>
            </div>
            {reel.music_url && (
              <button onClick={toggleSound} className="text-white/70 hover:text-white transition-colors bg-white/10 p-2.5 rounded-full">
                {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
            )}
          </div>
          <Button asChild size="lg"
            className="h-14 w-full rounded-xl border-0 bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
          >
            <Link href={`/plan/from-reel/${reel.id}`}>{t("ctaBuild")}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── DiscoveryReelsFeed ───────────────────────────────────────────────────────

export function DiscoveryReelsFeed({ className }: { className?: string }) {
  const locale = useLocale()
  const t = useTranslations("reels")
  const [mode, setMode] = useState<FeedMode>("discovery")
  const [reels, setReels] = useState<ReelCardDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [slideHeight, setSlideHeight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  // ID из шаренной ссылки — читается один раз при монтировании
  const initialIdRef = useRef<string | null>(
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('id')
      : null
  )

  // ── Fetch with cache ──────────────────────────────────────────────────────
  const fetchReels = useCallback(async (currentMode: FeedMode, force = false) => {
    const key = cacheKey(locale, currentMode)
    if (!force) {
      const cached = readCache(key)
      if (cached) {
        setReels(cached)
        setLoading(false)
        setRefreshing(false)
        return
      }
    } else {
      clearCache(key)
    }

    const endpoint =
      currentMode === "liked"
        ? "/api/reels/liked?limit=50"
        : `/api/reels?limit=24&locale=${locale === "en" ? "en" : "ru"}`

    try {
      const res = await fetch(endpoint, { credentials: "include" })
      const j = (await res.json().catch(() => ({}))) as { reels?: ReelCardDTO[]; error?: string }
      if (!res.ok) throw new Error(j.error || t("loadError"))
      let fetched = Array.isArray(j.reels) ? j.reels : []
      // Если открыли шаренную ссылку — убедимся что нужный рилс есть в списке
      const targetId = initialIdRef.current
      if (targetId && currentMode === 'discovery' && !fetched.find((r) => r.id === targetId)) {
        const single = await fetch(`/api/reels/${targetId}`, { credentials: 'include' })
          .then((r) => r.json()).catch(() => null)
        if (single?.reel) {
          fetched = [{ ...single.reel, likes_count: 0, comments_count: 0, is_liked: false }, ...fetched]
        }
      }
      setReels(fetched)
      writeCache(key, fetched)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [locale, t])

  // ── Mode change → clear index + fetch ────────────────────────────────────
  useEffect(() => {
    setCurrentIndex(0)
    setLoading(true)
    setError(null)
    fetchReels(mode)
  }, [mode, fetchReels])

  // ── После загрузки: скролл к нужному рилсу или в начало ──────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el || reels.length === 0) return
    const targetId = initialIdRef.current
    if (targetId) {
      const idx = reels.findIndex((r) => r.id === targetId)
      const safeIdx = idx >= 0 ? idx : 0
      // slideHeight может ещё не измериться — ждём следующего тика
      requestAnimationFrame(() => {
        if (el && slideHeight > 0) el.scrollTop = safeIdx * slideHeight
      })
      setCurrentIndex(safeIdx)
      initialIdRef.current = null
    } else {
      el.scrollTop = 0
      setCurrentIndex(0)
    }
  }, [reels, slideHeight])

  // ── URL sync: update ?id= on scroll (no history push) ────────────────────
  useEffect(() => {
    if (!reels[currentIndex]) return
    const url = new URL(window.location.href)
    url.searchParams.set("id", reels[currentIndex].id)
    window.history.replaceState(null, "", url.toString())
  }, [currentIndex, reels])

  // ── Slide height measurement ──────────────────────────────────────────────
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => { const h = el.clientHeight; if (h > 0) setSlideHeight(h) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [reels.length])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const h = slideHeight > 0 ? slideHeight : el.clientHeight
    if (h <= 0) return
    const idx = Math.min(reels.length - 1, Math.max(0, Math.round(el.scrollTop / h)))
    setCurrentIndex(idx)
  }, [reels.length, slideHeight])

  const handleRefresh = () => {
    setRefreshing(true)
    setCurrentIndex(0)
    fetchReels(mode, true)
  }

  const handleLikeChange = useCallback((reelId: string, liked: boolean, count: number) => {
    setReels((prev) => prev.map((r) => r.id === reelId ? { ...r, is_liked: liked, likes_count: count } : r))
    // Update cache
    const key = cacheKey(locale, mode)
    const cached = readCache(key)
    if (cached) {
      writeCache(key, cached.map((r) => r.id === reelId ? { ...r, is_liked: liked, likes_count: count } : r))
    }
  }, [locale, mode])

  // ── Render states ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center gap-4 bg-black text-white/50", className)}>
        <div className="h-14 w-14 rounded-full border-2 border-white/20 border-t-primary animate-spin" />
        <p className="text-sm font-medium">{t("loading")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center p-6 text-center bg-black text-white/80", className)}>
        <p className="text-sm text-rose-300/90 max-w-sm">{error}</p>
        <button onClick={handleRefresh} className="mt-4 flex items-center gap-2 text-white/60 hover:text-white text-sm">
          <RefreshCw className="h-4 w-4" /> Повторить
        </button>
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center p-8 text-center bg-black text-white/60", className)}>
        <Clapperboard className="h-14 w-14 mb-4 text-white/25" />
        <p className="text-sm max-w-xs">{mode === "liked" ? t("likedEmpty") : t("empty")}</p>
        {mode === "liked" && (
          <button
            onClick={() => setMode("discovery")}
            className="mt-5 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
          >
            ← {t("modeDiscover")}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn("relative flex flex-1 flex-col min-h-0 h-full bg-black", className)}>

      {/* Top bar */}
      <div className="pointer-events-none absolute top-0 inset-x-0 z-30 flex flex-col items-center pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <div className="pointer-events-auto flex w-full max-w-2xl items-center justify-between px-4 gap-3">

          {/* Counter */}
          <div className="flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 px-3 py-1.5 shrink-0">
            <Clapperboard className="h-5 w-5 text-sky-400" />
            <div className="leading-tight">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50 block">{t("title")}</span>
              <span className="text-xs font-bold text-white tabular-nums">{currentIndex + 1} / {reels.length}</span>
            </div>
          </div>

          {/* Mode toggle */}
          {mode === "liked" ? (
            <button
              onClick={() => setMode("discovery")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 text-white text-xs font-bold hover:bg-white/25 transition-colors"
            >
              <span>←</span> {t("modeDiscover")}
            </button>
          ) : (
            <button
              onClick={() => setMode("liked")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 text-white/60 text-xs font-bold hover:text-white transition-colors"
            >
              <Heart className="h-3 w-3" />
              {t("modeLiked")}
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-xl border border-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Slides */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 basis-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory no-scrollbar touch-pan-y overscroll-y-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {reels.map((r, i) => (
          <ReelSlide
            key={r.id}
            reel={r}
            isActive={i === currentIndex}
            slideHeight={slideHeight}
            onLikeChange={handleLikeChange}
          />
        ))}
      </div>

    </div>
  )
}
