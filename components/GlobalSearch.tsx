"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import * as RadixDialog from "@radix-ui/react-dialog"
import { Search, MapPin, User, Heart, Compass, X, Globe } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TripResult {
  id: string
  title: string
  destination: string
  cover_image?: string | null
  tags?: string[] | null
}

interface PersonResult {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

interface SearchState {
  myTrips: TripResult[]
  favorites: TripResult[]
  people: PersonResult[]
  loading: boolean
}

// ─── Main component ────────────────────────────────────────────────────────────

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const { user } = useAuth()
  const [query, setQuery] = useState("")
  const [state, setState] = useState<SearchState>({
    myTrips: [],
    favorites: [],
    people: [],
    loading: false,
  })

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("")
      setState({ myTrips: [], favorites: [], people: [], loading: false })
    }
  }, [open])

  const search = useCallback(
    async (q: string) => {
      if (!user) return
      setState((s) => ({ ...s, loading: true }))

      try {
        const pattern = q ? `%${q}%` : null

        // 1. My trips
        let tripsQuery = supabase
          .from("trips")
          .select("id, title, destination, cover_image, tags")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(5)
        if (pattern) {
          tripsQuery = tripsQuery.or(
            `title.ilike.${pattern},destination.ilike.${pattern}`
          )
        }

        // 2. Public profiles
        let profilesQuery = supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("public_profile", true)
          .neq("id", user.id)
          .not("username", "is", null)
          .limit(5)
        if (pattern) {
          profilesQuery = profilesQuery.or(
            `username.ilike.${pattern},full_name.ilike.${pattern}`
          )
        }

        // 3. Favorites — get IDs first, then trips
        const favRes = await supabase
          .from("favorites")
          .select("trip_id")
          .eq("user_id", user.id)
          .limit(30)

        const favIds = (favRes.data || []).map((f: any) => f.trip_id)

        const [tripsRes, profilesRes] = await Promise.all([
          tripsQuery,
          profilesQuery,
        ])

        let favTrips: TripResult[] = []
        if (favIds.length > 0) {
          let favQ = supabase
            .from("trips")
            .select("id, title, destination, cover_image, tags")
            .in("id", favIds)
            .limit(5)
          if (pattern) {
            favQ = favQ.or(
              `title.ilike.${pattern},destination.ilike.${pattern}`
            )
          }
          const favTripsRes = await favQ
          // Exclude trips already shown in "my trips"
          const myIds = new Set((tripsRes.data || []).map((t: any) => t.id))
          favTrips = (favTripsRes.data || []).filter(
            (t: any) => !myIds.has(t.id)
          )
        }

        setState({
          myTrips: tripsRes.data || [],
          favorites: favTrips,
          people: (profilesRes.data || []).filter((p: any) => p.username),
          loading: false,
        })
      } catch {
        setState((s) => ({ ...s, loading: false }))
      }
    },
    [user]
  )

  // Debounced search
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => search(query), 220)
    return () => clearTimeout(t)
  }, [query, open, search])

  const navigate = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  const hasResults =
    state.myTrips.length > 0 ||
    state.favorites.length > 0 ||
    state.people.length > 0

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        {/* Backdrop */}
        <RadixDialog.Overlay className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />

        {/* Panel */}
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12%] z-[201] w-full max-w-xl -translate-x-1/2 px-4 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
        >
          <RadixDialog.Title className="sr-only">Поиск</RadixDialog.Title>

          <Command
            shouldFilter={false}
            className="rounded-2xl overflow-hidden shadow-[0_32px_80px_-8px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)] bg-white/96 dark:bg-neutral-900/98 backdrop-blur-2xl"
          >
            {/* ── Input ── */}
            <div className="flex items-center gap-3 px-4 border-b border-black/5 dark:border-white/8">
              {state.loading ? (
                <div className="w-4 h-4 flex-shrink-0 border-[1.5px] border-primary/20 border-t-primary rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4 flex-shrink-0 text-muted-foreground/60" />
              )}

              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Поиск маршрутов, путешественников..."
                className="flex-1 bg-transparent py-[1.05rem] text-[14.5px] outline-none placeholder:text-muted-foreground/40 text-foreground"
              />

              {query ? (
                <button
                  onClick={() => setQuery("")}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* ── Results ── */}
            <Command.List className="overflow-y-auto max-h-[380px] p-2 space-y-0.5 search-list">
              {/* My trips */}
              {state.myTrips.length > 0 && (
                <Command.Group>
                  <SectionLabel icon={<Compass className="w-3 h-3" />} label="Мои маршруты" />
                  {state.myTrips.map((trip) => (
                    <TripItem
                      key={trip.id}
                      trip={trip}
                      onSelect={() => navigate(`/trip/${trip.id}`)}
                    />
                  ))}
                </Command.Group>
              )}

              {/* Favorites */}
              {state.favorites.length > 0 && (
                <Command.Group>
                  {state.myTrips.length > 0 && <Divider />}
                  <SectionLabel icon={<Heart className="w-3 h-3" />} label="Избранное" />
                  {state.favorites.map((trip) => (
                    <TripItem
                      key={`fav-${trip.id}`}
                      trip={trip}
                      onSelect={() => navigate(`/trip/${trip.id}`)}
                      isFavorite
                    />
                  ))}
                </Command.Group>
              )}

              {/* People */}
              {state.people.length > 0 && (
                <Command.Group>
                  {(state.myTrips.length > 0 || state.favorites.length > 0) && <Divider />}
                  <SectionLabel icon={<Globe className="w-3 h-3" />} label="Путешественники" />
                  {state.people.map((person) => (
                    <PersonItem
                      key={person.id}
                      person={person}
                      onSelect={() => navigate(`/profile/${person.username}`)}
                    />
                  ))}
                </Command.Group>
              )}

              {/* Empty */}
              <Command.Empty>
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                  {query ? (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                        <Search className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground/60">Ничего не найдено</p>
                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                          Нет результатов для «{query}»
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                        <Compass className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground/60">Начните вводить</p>
                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                          Поиск по маршрутам, избранному и путешественникам
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </Command.Empty>
            </Command.List>

            {/* ── Footer ── */}
            <div className="border-t border-black/5 dark:border-white/8 px-4 py-2 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                <KbdGroup keys={["↑", "↓"]} label="навигация" />
                <KbdGroup keys={["↵"]} label="открыть" />
                <KbdGroup keys={["Esc"]} label="закрыть" />
              </div>
              <span className="text-[10px] text-muted-foreground/30 font-mono tracking-tight">
                ⌘K — поиск
              </span>
            </div>
          </Command>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

// ─── Search Trigger Button ─────────────────────────────────────────────────────

export function SearchTriggerDesktop({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg bg-muted/50 dark:bg-white/5 border border-border/50 dark:border-white/8 text-muted-foreground hover:bg-muted hover:border-border transition-all duration-200 group"
    >
      <Search className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-xs text-muted-foreground/70 group-hover:text-muted-foreground transition-colors hidden lg:block whitespace-nowrap">
        Поиск...
      </span>
      <div className="hidden lg:flex items-center gap-0.5 ml-1">
        <kbd className="inline-flex items-center rounded border border-border/50 bg-background/60 px-1 py-px font-mono text-[9px] text-muted-foreground/60">
          ⌘
        </kbd>
        <kbd className="inline-flex items-center rounded border border-border/50 bg-background/60 px-1 py-px font-mono text-[9px] text-muted-foreground/60">
          K
        </kbd>
      </div>
    </button>
  )
}

export function SearchTriggerMobile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label="Поиск"
    >
      <Search className="w-4 h-4" />
    </button>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
      {icon}
      {label}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-border/30 mx-2 my-1.5" />
}

function KbdGroup({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="inline-flex items-center rounded border border-border/40 bg-background/50 px-1 py-px font-mono text-[9px] text-muted-foreground/60"
        >
          {k}
        </kbd>
      ))}
      <span>{label}</span>
    </span>
  )
}

function TripItem({
  trip,
  onSelect,
  isFavorite,
}: {
  trip: TripResult
  onSelect: () => void
  isFavorite?: boolean
}) {
  return (
    <Command.Item
      value={`${isFavorite ? "fav-" : ""}${trip.id}-${trip.title}`}
      onSelect={onSelect}
      className="flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer select-none outline-none transition-colors data-[selected=true]:bg-accent/60 hover:bg-accent/40"
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted border border-border/20">
        {trip.cover_image ? (
          <img
            src={trip.cover_image}
            alt={trip.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-500/15 to-indigo-500/15">
            <MapPin className="w-4 h-4 text-sky-500/60" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">{trip.title}</p>
        <p className="text-xs text-muted-foreground/70 truncate flex items-center gap-1 mt-0.5">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
          {trip.destination}
        </p>
      </div>

      {/* Tag */}
      {trip.tags?.[0] && (
        <span className="flex-shrink-0 hidden sm:block text-[10px] px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/30">
          {trip.tags[0].replace("#", "")}
        </span>
      )}
    </Command.Item>
  )
}

function PersonItem({
  person,
  onSelect,
}: {
  person: PersonResult
  onSelect: () => void
}) {
  return (
    <Command.Item
      value={`person-${person.id}-${person.username}`}
      onSelect={onSelect}
      className="flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer select-none outline-none transition-colors data-[selected=true]:bg-accent/60 hover:bg-accent/40"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted border border-border/20">
        {person.avatar_url ? (
          <img
            src={person.avatar_url}
            alt={person.full_name || ""}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/15 to-purple-500/15">
            <User className="w-4 h-4 text-indigo-500/60" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">
          {person.full_name || `@${person.username}`}
        </p>
        <p className="text-xs text-muted-foreground/60">@{person.username}</p>
      </div>

      {/* Badge */}
      <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
        Профиль
      </span>
    </Command.Item>
  )
}
