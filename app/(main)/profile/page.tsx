"use client"

import { useState, useEffect, useMemo, useRef, Suspense } from "react"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  User, Settings, Heart, Map as MapIcon, Clock as ClockIcon, LogOut, Camera, Edit2,
  Check, Globe, Utensils, Zap, BookOpen, MapPin, ArrowRight, RotateCcw, Flag, Wallet,
  Hotel as HotelIcon, Star, Calendar,
  LayoutDashboard, SlidersHorizontal, Settings as SettingsIcon, X,
  Bell, Bookmark, Plane, Banknote, Languages, ChevronDown, ChevronRight as ChevronRightIcon, Share2,
  Loader2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ProfileSkeleton } from "@/components/profile/profile-skeleton"
import { supabase, signOut } from "@/lib/supabase"
import { patchMyProfile, ProfilePatchError } from "@/lib/user-profile-client"
import { appToast } from "@/components/ui/sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  PROFILE_NAME_MAX,
  PROFILE_USERNAME_MAX,
  PROFILE_BIO_MAX,
  PROFILE_LOCALE_LINE_MAX,
  PROFILE_LANGUAGE_IDS,
  PROFILE_INTEREST_IDS,
  sanitizeDisplayName,
  sanitizeDisplayNameInput,
  sanitizeBioInput,
  sanitizeLocaleInput,
  sanitizeUsernameInput,
  normalizeUsername,
  sanitizeBioText,
  sanitizeCitizenshipNationality,
  validateDisplayName,
  validateUsername,
  migrateLanguageList,
  filterInterestList,
  parseProfileAge,
} from "@/lib/profile-validation"

// Interest categories — colors only (labels come from i18n)
const INTEREST_CONFIG: Record<string, { color: string; bg: string }> = {
  nature: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800" },
  history: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800" },
  local: { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800" },
  photo: { color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800" },
  tech: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" },
  nightlife: { color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800" },
  shopping: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800" },
  spiritual: { color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800" },
  food: { color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800" },
  museums: { color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800" },
}

// Profile background presets — labels come from i18n
const PROFILE_BACKGROUNDS = [
  { id: "avatar", gradient: "" }, // Special: uses blurred avatar
  { id: "aurora", gradient: "from-emerald-500/30 via-cyan-500/20 to-purple-500/30" },
  { id: "sunset", gradient: "from-orange-500/30 via-rose-500/20 to-pink-500/30" },
  { id: "ocean", gradient: "from-blue-500/30 via-cyan-500/20 to-teal-500/30" },
  { id: "forest", gradient: "from-green-500/30 via-emerald-500/20 to-lime-500/30" },
  { id: "galaxy", gradient: "from-purple-600/30 via-indigo-500/20 to-blue-600/30" },
  { id: "mountains", gradient: "from-slate-500/30 via-zinc-500/20 to-gray-500/30" },
  { id: "desert", gradient: "from-amber-500/30 via-orange-500/20 to-yellow-500/30" },
  { id: "abstract", gradient: "from-fuchsia-500/30 via-violet-500/20 to-indigo-500/30" },
]

const COUNTRY_BY_CITY: Record<string, string> = {
  moscow: "Russia",
  petersburg: "Russia",
  belgrade: "Serbia",
  paris: "France",
  rome: "Italy",
  tokyo: "Japan",
  dubai: "UAE",
  istanbul: "Turkey",
  bangkok: "Thailand",
  barcelona: "Spain",
  london: "United Kingdom",
}

const COUNTRY_FLAG_BY_KEY: Record<string, string> = {
  russia: "RU",
  "россия": "RU",
  serbia: "RS",
  "сербия": "RS",
  france: "FR",
  "франция": "FR",
  italy: "IT",
  "италия": "IT",
  japan: "JP",
  "япония": "JP",
  uae: "AE",
  "оаэ": "AE",
  "united arab emirates": "AE",
  turkey: "TR",
  "турция": "TR",
  thailand: "TH",
  "таиланд": "TH",
  spain: "ES",
  "испания": "ES",
  "united kingdom": "GB",
  "великобритания": "GB",
  germany: "DE",
  "германия": "DE",
  usa: "US",
  "сша": "US",
}


const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ")
const toKey = (value: string) => normalizeName(value).toLowerCase()

function parseLocation(raw: unknown): { country?: string; city?: string } {
  const value = normalizeName(String(raw || ""))
  if (!value) return {}

  const parts = value
    .split(",")
    .map((part) => normalizeName(part))
    .filter(Boolean)

  if (parts.length >= 2) {
    return { city: parts[0], country: parts[parts.length - 1] }
  }

  const inferredCountry = COUNTRY_BY_CITY[toKey(value)]
  if (inferredCountry) return { city: value, country: inferredCountry }
  return { country: value }
}

function getCountryFlag(country: string): string {
  const code = COUNTRY_FLAG_BY_KEY[toKey(country)]
  if (!code) return "🌍"
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("")
}

// Edit form section component
function EditSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="trip-glass overflow-hidden rounded-[1.75rem]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-11 w-full touch-manipulation items-center gap-3 px-5 py-5 text-left transition-colors hover:bg-primary/5 sm:px-6"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</span>
        <span className="text-base font-bold text-foreground flex-1">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 p-5 space-y-4 sm:p-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Settings section header
function SettingsSectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border/40 p-5 sm:p-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-[18px]">{icon}</span>
      <div className="min-w-0 pt-0.5">
        <h3 className="text-base font-bold tracking-tight text-foreground">{title}</h3>
        {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

// Settings row
function SettingsRow({
  icon,
  label,
  description,
  control,
  last,
}: {
  icon?: React.ReactNode
  label: string
  description?: string
  control: React.ReactNode
  last?: boolean
}) {
  return (
    <div className={cn(
      "flex flex-wrap items-center justify-between gap-x-3 gap-y-3 px-5 py-4 sm:px-6",
      !last && "border-b border-border/30"
    )}>
      <div className="flex flex-1 items-center gap-3 min-w-[160px]">
        {icon && <span className="flex size-9 items-center justify-center rounded-xl bg-primary/5 text-primary shrink-0">{icon}</span>}
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{label}</div>
          {description && <div className="text-xs leading-relaxed text-muted-foreground mt-1">{description}</div>}
        </div>
      </div>
      <div className="shrink-0 ml-auto">{control}</div>
    </div>
  )
}

function createProfileEditForm(data: any = {}) {
  const prefs = data.preferences || {}
  return {
            full_name: data.full_name || "",
            citizenship: data.citizenship || "",
            nationality: data.nationality || "",
            gender: prefs.gender || "",
            age: prefs.age ? String(prefs.age) : "",
            pace: prefs.pace || "moderate",
            languages: migrateLanguageList(data.languages) as string[],
            interests: filterInterestList(prefs.interestsDetailed) as string[],
            notifications_enabled: data.notifications_enabled ?? true,
            accommodation: (() => {
              const val = (prefs.accommodation || "").toLowerCase();
              if (val.includes("хостел") || val === "hostel") return "hostel";
              if (val.includes("апартамент") || val.includes("airbnb") || val === "airbnb") return "airbnb";
              if (val.includes("курорт") || val === "resort") return "resort";
              return "hotel";
            })(),
            profileBackground: prefs.profileBackground || "ocean",
            autoFavorites: prefs.autoFavorites || false,
            publicProfile: data.public_profile || false,
            username: data.username || "",
            bio: data.bio || "",
            defaultTripDuration: prefs.defaultTripDuration || "7",
  }
}

function ProfileContent() {
  const tp = useTranslations("profile")
  const tc = useTranslations("common")
  const locale = useLocale()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [userRoutes, setUserRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSetting, setSavingSetting] = useState<string | null>(null)
  const settingSaveInFlight = useRef(false)
  const [isEditing, setIsEditing] = useState(false)
  const initialTab = searchParams?.get("tab")
  const [activeTab, setActiveTab] = useState(initialTab === "settings" ? "settings" : "overview")
  const [editForm, setEditForm] = useState(() => createProfileEditForm())
  const toastSource = isEditing || activeTab !== "settings" ? "profile" : "settings"
  const toast = {
    success: (msg: string) => appToast.success(msg, { source: toastSource }),
    error: (msg: string) => appToast.error(msg, { source: toastSource }),
  }

  const [siteOrigin, setSiteOrigin] = useState("")
  useEffect(() => {
    if (typeof window === "undefined") return
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
    setSiteOrigin(fromEnv && fromEnv.length > 0 ? fromEnv : window.location.origin)
  }, [])

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [usernameEditing, setUsernameEditing] = useState(false)
  const [usernameTemp, setUsernameTemp] = useState("")
  const [savingUsername, setSavingUsername] = useState(false)
  const [nameEditing, setNameEditing] = useState(false)
  const [nameTemp, setNameTemp] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const saveNameInline = async () => {
    if (!user) return
    const val = sanitizeDisplayName(nameTemp)
    const check = validateDisplayName(val)
    if (!check.ok) {
      if (check.error === "empty") toast.error(tp("toast.nameEmpty"))
      else toast.error(tp("toast.nameInvalid"))
      return
    }
    setSavingName(true)
    try {
      const { profile: p } = await patchMyProfile({ full_name: val })
      setProfile((prev: any) => ({ ...prev, ...p }))
      setEditForm((prev) => ({ ...prev, full_name: (p.full_name as string) || val }))
      setNameEditing(false)
      toast.success(tp("toast.nameUpdated"))
      window.dispatchEvent(new Event("profile_updated"))
    } catch (e: unknown) {
      const msg = e instanceof ProfilePatchError ? e.message : (e as Error)?.message || "Error"
      toast.error(tp("toast.nameSaveError", { message: msg }))
    } finally {
      setSavingName(false)
    }
  }

  const completedTrips = useMemo(() => {
    return userRoutes.filter((trip: any) => {
      const status = String(trip?.status || "").toLowerCase()
      return status === "completed" || Boolean(trip?.completed_at || trip?.completedAt)
    })
  }, [userRoutes])

  const visitedSummary = useMemo(() => {
    const countries = new Set<string>()
    const citiesByCountry = new Map<string, Set<string>>()

    const addLocation = (raw: unknown) => {
      const parsed = parseLocation(raw)
      const country = parsed.country ? normalizeName(parsed.country) : ""
      const city = parsed.city ? normalizeName(parsed.city) : ""
      if (!country) return
      countries.add(country)
      if (city) {
        if (!citiesByCountry.has(country)) citiesByCountry.set(country, new Set<string>())
        citiesByCountry.get(country)!.add(city)
      }
    }

    completedTrips.forEach((trip: any) => {
      addLocation(trip.destination)

      if (Array.isArray(trip.countries)) {
        trip.countries.forEach((country: any) => addLocation(typeof country === "string" ? country : country?.name))
      }

      if (Array.isArray(trip.itinerary)) {
        trip.itinerary.forEach((day: any) => {
          addLocation(day?.endCity)
          addLocation(day?.logistics?.to)
          if (Array.isArray(day?.activities)) {
            day.activities.forEach((act: any) => {
              addLocation(act?.city)
              addLocation(act?.country)
              addLocation(act?.location)
            })
          }
        })
      }
    })

    const countriesList = Array.from(countries).sort((a, b) => a.localeCompare(b, "ru"))
    const citiesList = Array.from(citiesByCountry.entries())
      .map(([country, cities]) => ({
        country,
        cities: Array.from(cities).sort((a, b) => a.localeCompare(b, "ru")),
      }))
      .sort((a, b) => a.country.localeCompare(b.country, "ru"))

    return {
      countries: countriesList,
      citiesByCountry: citiesList,
      totalCities: citiesList.reduce((sum, item) => sum + item.cities.length, 0),
    }
  }, [completedTrips])

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    setLoading(true)
    setLoadError(false)
    const loadProfile = async () => {
      const meRes = await fetch("/api/user/me?include=profile-page", { credentials: "same-origin", signal: controller.signal, cache: "no-store" })
      if (!meRes.ok) throw new Error(`Profile request failed (${meRes.status})`)
      const meData = await meRes.json()
      if (!meData.user || !Array.isArray(meData.trips)) throw new Error("Incomplete profile response")
      if (cancelled) return
      const authUser = meData.user
      setUser(authUser)

      if (authUser) {
        const data = meData.profile || { full_name: authUser.user_metadata?.full_name, avatar_url: authUser.user_metadata?.avatar_url, preferences: {} }
        if (data) {
          setProfile(data)
          setAvatarUrl(data.avatar_url || authUser.user_metadata?.avatar_url || null)
          setEditForm(createProfileEditForm(data))
        }

        const localTrips: any[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('trip-') || key === 'lastGeneratedRoute')) {
            try {
              const tripData = JSON.parse(localStorage.getItem(key) || '{}')
              if (tripData.title) {
                const id = key === 'lastGeneratedRoute' ? 'ai-last' : key.replace('trip-', '')
                localTrips.push({
                  id,
                  ...tripData,
                  created_at: tripData.created_at || new Date().toISOString()
                })
              }
            } catch (e) {
              console.error("Local trip parse error:", e)
            }
          }
        }

        const allRoutes = [...(meData.trips || [])]
        localTrips.forEach(lt => {
          const isDup = allRoutes.find(dr =>
            dr.id === lt.id ||
            (dr.title === lt.title && Math.abs(new Date(dr.created_at).getTime() - new Date(lt.created_at).getTime()) < 60000)
          )
          if (!isDup) allRoutes.push(lt)
        })

        setUserRoutes(allRoutes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))


      }
      setLoading(false)
    }
    void loadProfile().catch(() => {
      if (!cancelled) setLoadError(true)
    }).finally(() => {
      window.clearTimeout(timeout)
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [loadAttempt])

  // Wait for the server before changing a setting. Serial saves avoid stale preferences
  // overwriting one another, and a failed request leaves the saved value visible.
  const saveServiceSetting = async (key: string, value: string | boolean) => {
    if (!user || settingSaveInFlight.current) return false
    settingSaveInFlight.current = true
    setSavingSetting(key)
    try {
      const body = key === "notifications_enabled" ? { notifications_enabled: value } : { preferences: { [key]: value } }
      const { profile: p } = await patchMyProfile(body)
      setProfile((prev: any) => ({ ...prev, ...p }))
      if (key === "notifications_enabled" || key === "autoFavorites") {
        setEditForm((prev) => ({ ...prev, [key]: value }))
      }
      window.dispatchEvent(new Event("profile_updated"))
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error"
      toast.error(tp("toast.saveError", { message: msg }))
      return false
    } finally {
      settingSaveInFlight.current = false
      setSavingSetting(null)
    }
  }

  const handleUpdateProfile = async () => {
    if (!user) return

    const nameVal = sanitizeDisplayName(editForm.full_name)
    const nameCheck = validateDisplayName(nameVal)
    if (!nameCheck.ok) {
      if (nameCheck.error === "empty") toast.error(tp("toast.nameEmpty"))
      else toast.error(tp("toast.nameInvalid"))
      return
    }

    const uNorm = normalizeUsername(editForm.username)
    const usernameCheck = validateUsername(uNorm)
    if (!usernameCheck.ok && usernameCheck.error !== undefined) {
      const err = usernameCheck.error
      if (err === "short" || err === "long") toast.error(tp("toast.usernameLength"))
      else toast.error(tp("toast.usernameInvalid"))
      return
    }

    const bioSan = sanitizeBioText(editForm.bio || "", PROFILE_BIO_MAX)
    const cit = sanitizeCitizenshipNationality(editForm.citizenship)
    const nat = sanitizeCitizenshipNationality(editForm.nationality)
    const ageNum = editForm.age.trim() ? parseProfileAge(editForm.age) : null
    if (editForm.age.trim() && ageNum === null) {
      toast.error(tp("toast.ageInvalid"))
      return
    }

    const langs = migrateLanguageList(editForm.languages)
    const interests = filterInterestList(editForm.interests)

    setSavingProfile(true)

    const prevPrefs = profile.preferences || {}
    const updatedPreferences = {
      ...prevPrefs,
      gender: editForm.gender,
      age: ageNum,
      pace: editForm.pace,
      interestsDetailed: interests,
      accommodation: editForm.accommodation,
      profileBackground: editForm.profileBackground,
      autoFavorites: editForm.autoFavorites,
    }

    delete (updatedPreferences as Record<string, unknown>).religion
    delete (updatedPreferences as Record<string, unknown>).visitedCountries
    delete (updatedPreferences as Record<string, unknown>).dietaryRestrictions
    delete (updatedPreferences as Record<string, unknown>).dietaryCustom
    delete (updatedPreferences as Record<string, unknown>).departureCity
    delete (updatedPreferences as Record<string, unknown>).aiCreativity
    delete (updatedPreferences as Record<string, unknown>).units
    delete (updatedPreferences as Record<string, unknown>).interestsCustom

    try {
      const { profile: p } = await patchMyProfile({
        full_name: nameVal,
        citizenship: cit || null,
        nationality: nat || null,
        languages: langs,
        username: uNorm || null,
        bio: bioSan || null,
        preferences: updatedPreferences,
        notifications_enabled: editForm.notifications_enabled,
      })
      setProfile((prev: any) => ({ ...prev, ...p }))
      setEditForm((prev) => ({
        ...prev,
        full_name: nameVal,
        citizenship: cit,
        nationality: nat,
        username: uNorm,
        bio: bioSan,
        languages: langs,
        interests,
      }))
      setIsEditing(false)
      toast.success(tp("toast.profileUpdated"))
      window.dispatchEvent(new Event("profile_updated"))
    } catch (e: unknown) {
      console.error("Error updating profile:", e)
      if (e instanceof ProfilePatchError && (e.code === "username_taken" || e.status === 409)) {
        toast.error(tp("toast.usernameTaken"))
      } else {
        const msg = e instanceof ProfilePatchError ? e.message : (e as Error)?.message || "Error"
        toast.error(tp("toast.profileSaveError", { message: msg }))
      }
    }
    setSavingProfile(false)
  }

  const [savingPublicProfile, setSavingPublicProfile] = useState(false)
  const [copiedProfile, setCopiedProfile] = useState(false)

  const handleShareProfile = async () => {
    if (!profile?.username || !profile?.public_profile) return
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const url = `${origin}/profile/${profile.username}`
    if (navigator.share) {
      try { await navigator.share({ title: `${tp("title")} — TraveLLM`, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopiedProfile(true)
      setTimeout(() => setCopiedProfile(false), 2000)
    }
  }

  const handleSavePublicProfile = async () => {
    if (!user) return
    const usernameValue = normalizeUsername(editForm.username)
    const usernameCheck = validateUsername(usernameValue)
    if (!usernameCheck.ok) {
      const err = usernameCheck.error
      if (err === "short" || err === "long") toast.error(tp("toast.usernameLength"))
      else toast.error(tp("toast.usernameInvalid"))
      return
    }
    const bioSan = sanitizeBioText(editForm.bio || "", PROFILE_BIO_MAX)
    setSavingPublicProfile(true)
    try {
      const { profile: p } = await patchMyProfile({
        username: usernameValue || null,
        public_profile: editForm.publicProfile,
        bio: bioSan || null,
      })
      setProfile((prev: any) => ({ ...prev, ...p }))
      setEditForm((prev) => ({ ...prev, username: usernameValue, bio: bioSan }))
      toast.success(tp("toast.publicProfileSaved"))
    } catch (e: unknown) {
      if (e instanceof ProfilePatchError && (e.code === "username_taken" || e.status === 409)) {
        toast.error(tp("toast.usernameTaken"))
      } else {
        const msg = e instanceof ProfilePatchError ? e.message : (e as Error)?.message || "Error"
        toast.error(tp("toast.saveError", { message: msg }))
      }
    } finally {
      setSavingPublicProfile(false)
    }
  }

  const saveUsernameInline = async () => {
    if (!user) return
    const val = normalizeUsername(usernameTemp)
    const usernameCheck = validateUsername(val)
    if (!usernameCheck.ok) {
      const err = usernameCheck.error
      if (err === "short" || err === "long") toast.error(tp("toast.usernameLength"))
      else toast.error(tp("toast.usernameInvalid"))
      return
    }
    setSavingUsername(true)
    try {
      const { profile: p } = await patchMyProfile({ username: val || null })
      setProfile((prev: any) => ({ ...prev, ...p }))
      setEditForm((prev) => ({ ...prev, username: val }))
      setUsernameEditing(false)
      toast.success("Username обновлён")
    } catch (e: unknown) {
      if (e instanceof ProfilePatchError && (e.code === "username_taken" || e.status === 409)) {
        toast.error(tp("toast.usernameTaken"))
      } else {
        const msg = e instanceof ProfilePatchError ? e.message : (e as Error)?.message || "Error"
        toast.error(tp("toast.error", { message: msg }))
      }
    } finally {
      setSavingUsername(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
      })

      if (res.ok) {
        toast.success(tp("toast.accountDeleted"))
        await signOut()
        window.location.href = "/"
      } else {
        const data = await res.json()
        toast.error(data.error || tp("toast.accountDeleteError"))
      }
    } catch (err) {
      toast.error("Произошла ошибка")
      console.error(err)
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { profile: p } = await patchMyProfile({ avatar_url: publicUrl })
      setProfile((prev: any) => ({ ...prev, ...p }))

      setAvatarUrl(publicUrl)
      window.dispatchEvent(new Event("profile_updated"))
      toast.success(tp("toast.avatarUpdated"))
    } catch (error: any) {
      toast.error('Error uploading avatar: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const tabs = [
    { id: "overview", label: tp("overview"), icon: LayoutDashboard },
    { id: "settings", label: tp("settings"), icon: SettingsIcon },
  ]

  const paceLabel = profile?.preferences?.pace === 'fast'
    ? tp("stats.activePace")
    : profile?.preferences?.pace === 'slow'
    ? tp("stats.relaxedPace")
    : tp("stats.balanced")

  const cancelEditing = () => {
    setEditForm(createProfileEditForm(profile || {}))
    setIsEditing(false)
  }

  const currentBg = PROFILE_BACKGROUNDS.find(b => b.id === editForm.profileBackground)

  if (loading) return <AppLayout className="bg-background"><ProfileSkeleton settings={activeTab === "settings"} /></AppLayout>

  if (loadError) return (
    <AppLayout className="bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div role="alert" className="trip-glass rounded-[1.75rem] p-6 sm:p-8">
          <h1 className="text-xl font-bold">{tp("loadErrorTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{tp("loadErrorDesc")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => setLoadAttempt((attempt) => attempt + 1)}><RotateCcw className="mr-2 size-4" />{tp("retryLoad")}</Button>
            <Button asChild variant="outline"><Link href="/auth">{tp("signInAgain")}</Link></Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout className="bg-background">
      <div className="min-h-[calc(100vh-4rem)] pb-20">

        <div className="mx-auto min-w-0 max-w-4xl px-3 pt-6 sm:px-4 sm:pt-8">

          {/* ===== PROFILE HERO ===== */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            {/* Row 1 — Banner */}
            <div className="relative mb-[-48px] h-28 overflow-hidden rounded-2xl sm:h-32 sm:rounded-[2rem]">
              {editForm.profileBackground === "avatar" && avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-md opacity-60 scale-110"
                />
              ) : (
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br",
                  currentBg?.gradient || "from-blue-500/40 via-cyan-500/30 to-purple-500/40"
                )} />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/60" />
            </div>

            {/* Row 2 — Identity bar overlapping banner */}
            <div className="relative flex flex-wrap items-end gap-x-4 gap-y-3 px-4 pb-4 sm:px-6">
              {/* Avatar */}
              <div className="relative shrink-0 group">
                <div className="h-20 w-20 rounded-full ring-4 ring-background bg-muted overflow-hidden shadow-md sm:h-24 sm:w-24 md:shadow-2xl">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                      <User className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-20 rounded-full">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 rounded-full"
                  >
                    <Camera className="h-6 w-6 text-white drop-shadow-lg" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={uploadAvatar}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              {/* Name + email + username + badge */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap min-h-[28px]">
                  {nameEditing ? (
                    <div className="flex items-center gap-1 w-full max-w-[240px]">
                      <input
                        autoFocus
                        value={nameTemp}
                        onChange={(e) => setNameTemp(sanitizeDisplayNameInput(e.target.value))}
                        maxLength={PROFILE_NAME_MAX}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveNameInline()
                          if (e.key === "Escape") setNameEditing(false)
                        }}
                        className="w-full border-b-2 border-primary bg-transparent py-0 text-lg font-black leading-tight text-foreground outline-none sm:text-xl"
                        placeholder="Ваше имя"
                      />
                      <button
                        type="button"
                        onClick={saveNameInline}
                        disabled={savingName}
                        className="flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full text-emerald-500 transition-colors hover:bg-emerald-500/10"
                      >
                        {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNameEditing(false)}
                        className="flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full text-xs text-muted-foreground transition-colors hover:bg-muted/50"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setNameTemp(profile?.full_name || user?.user_metadata?.full_name || ""); setNameEditing(true) }}
                      className="group flex touch-manipulation items-center gap-2 truncate text-left text-lg font-black leading-tight text-foreground transition-colors hover:text-primary sm:text-xl"
                    >
                      {profile?.full_name || user?.user_metadata?.full_name || tp("defaultTraveler")}
                      <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </button>
                  )}
                </div>
                
                {/* Username inline */}
                <div className="mt-0.5 flex items-center gap-1 min-h-[20px]">
                  {usernameEditing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground font-mono">@</span>
                      <input
                        autoFocus
                        value={usernameTemp}
                        onChange={(e) => setUsernameTemp(sanitizeUsernameInput(e.target.value).toLowerCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveUsernameInline()
                          if (e.key === "Escape") setUsernameEditing(false)
                        }}
                        className="text-xs bg-transparent border-b border-primary outline-none w-28 font-mono text-foreground py-0.5"
                        placeholder="username"
                        maxLength={20}
                      />
                      <button
                        type="button"
                        onClick={saveUsernameInline}
                        disabled={savingUsername}
                        className="flex h-8 w-8 touch-manipulation items-center justify-center rounded text-emerald-500 transition-colors hover:bg-emerald-500/10"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setUsernameEditing(false)}
                        className="flex h-8 w-8 touch-manipulation items-center justify-center rounded text-xs text-muted-foreground transition-colors hover:bg-muted/50"
                      >
                        ✕
                      </button>
                    </div>
                  ) : profile?.username ? (
                    <button
                      type="button"
                      onClick={() => { setUsernameTemp(profile.username || ""); setUsernameEditing(true) }}
                      className="group flex touch-manipulation items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="font-mono">@{profile.username}</span>
                      <Edit2 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setUsernameTemp(""); setUsernameEditing(true) }}
                      className="flex touch-manipulation items-center gap-1 text-xs text-primary/60 transition-colors hover:text-primary"
                    >
                      <span className="font-mono">@</span>
                      <span>Добавить username</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex w-full shrink-0 justify-end gap-2 self-center sm:w-auto sm:justify-start">
                {profile?.username && profile?.public_profile && (
                  <Button
                    onClick={handleShareProfile}
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-11 touch-manipulation rounded-xl transition-all sm:h-10 sm:w-10 md:w-auto md:px-4 md:gap-2",
                      copiedProfile
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-white/20 bg-white/10 dark:bg-white/5 hover:bg-white/20 backdrop-blur-md"
                    )}
                  >
                    {copiedProfile ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    <span className="hidden md:inline">{copiedProfile ? tp("copied") : tp("share")}</span>
                  </Button>
                )}
                <Button
                  onClick={() => { if (isEditing) cancelEditing(); else setIsEditing(true) }}
                  aria-label={isEditing ? tp("cancel") : tp("configure")}
                  variant="outline"
                  size="icon"
                  className="h-11 touch-manipulation rounded-xl border-white/20 bg-white/10 backdrop-blur-md dark:bg-white/5 hover:bg-white/20 sm:h-10 sm:w-10 md:w-auto md:px-4 md:gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  <span className="hidden md:inline">{isEditing ? tp("cancel") : tp("configure")}</span>
                </Button>
              </div>
            </div>

            {/* Bio */}
            <div className="relative mt-2 px-4 group sm:px-6">
              {profile?.bio ? (
                <p className="text-sm text-muted-foreground line-clamp-2 max-w-lg">{profile.bio}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="touch-manipulation text-xs text-muted-foreground/50 transition-colors hover:text-primary"
                >
                  {tp("bioHint")}
                </button>
              )}
            </div>

            {/* Stats strip modernized */}
            <div className="mt-5 px-4 sm:px-6">
              <div className="flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] no-scrollbar sm:gap-3">
                {[
                  { value: userRoutes.length, label: tp("statsTrips"), icon: MapIcon, color: "text-blue-400" },
                  { value: visitedSummary.countries.length, label: tp("statsCountries"), icon: Globe, color: "text-emerald-400" },
                  { value: paceLabel.split(' ')[0], label: tp("statsPace"), icon: Zap, color: "text-amber-400" },
                  { value: profile?.languages?.length || 0, label: tp("statsLanguages"), icon: Languages, color: "text-purple-400" },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="shrink-0 flex items-center gap-2.5 bg-white/5 dark:bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 transition-all hover:bg-white/10"
                  >
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                    <div className="flex flex-col leading-none">
                      <span className="font-black text-sm text-foreground uppercase">{stat.value}</span>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{stat.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ===== EDIT MODE (redesigned) ===== */}
          {isEditing ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-1 py-2">
                  <div className="flex items-center gap-2">
                    <Edit2 className="h-4 w-4 text-primary" />
                    <div><h2 className="text-2xl font-bold tracking-tight">{tp("editProfileTitle")}</h2><p className="mt-1.5 text-sm text-muted-foreground">{tp("editProfileSubtitle")}</p></div>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    aria-label={tp("cancel")}
                    className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="space-y-4">

                  {/* Section 1: Личные данные */}
                  <EditSection title={tp("personalSection")} icon={<User className="h-4 w-4" />} defaultOpen={true}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="edit-full-name" className="text-sm font-medium">{tp("fullNameLabel")}</label>
                        <Input
                          id="edit-full-name"
                          value={editForm.full_name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, full_name: sanitizeDisplayNameInput(e.target.value) })
                          }
                          maxLength={PROFILE_NAME_MAX}
                          className="h-11 w-full rounded-xl bg-background/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="edit-username" className="text-sm font-medium">{tp("username")}</label>
                        <div className="relative">
                          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                          <Input
                            id="edit-username"
                            value={editForm.username}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                username: sanitizeUsernameInput(e.target.value).toLowerCase(),
                              })
                            }
                            placeholder="username"
                            maxLength={PROFILE_USERNAME_MAX}
                            className="h-11 rounded-xl bg-background/50 pl-9 font-mono"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label htmlFor="edit-bio" className="text-sm font-medium">{tp("aboutMeLabel")}</label>
                        <textarea
                          id="edit-bio"
                          value={editForm.bio}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              bio: sanitizeBioInput(e.target.value, PROFILE_BIO_MAX),
                            })
                          }
                          placeholder={tp("aboutMePlaceholder")}
                          maxLength={PROFILE_BIO_MAX}
                          rows={3}
                          className="w-full resize-none rounded-xl border border-input bg-background/50 px-3 py-2 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm"
                        />
                        <p className="text-xs text-muted-foreground text-right">{editForm.bio.length}/{PROFILE_BIO_MAX}</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">{tp("uploadAvatar")}</label>
                        <label htmlFor="avatar-upload-edit" className="flex items-center gap-2 px-3 py-2 rounded-xl border border-input bg-background/50 cursor-pointer hover:bg-muted/30 transition-colors text-sm text-muted-foreground">
                          <Camera className="h-4 w-4" />
                          {uploading ? tp("uploading") : tp("selectPhoto")}
                          <input id="avatar-upload-edit" type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
                        </label>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="edit-citizenship" className="text-sm font-medium">{tp("citizenshipLabel")}</label>
                        <Input
                          id="edit-citizenship"
                          value={editForm.citizenship}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              citizenship: sanitizeLocaleInput(e.target.value),
                            })
                          }
                          maxLength={PROFILE_LOCALE_LINE_MAX}
                          className="h-11 w-full rounded-xl bg-background/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="edit-nationality" className="text-sm font-medium">{tp("nationalityLabel")}</label>
                        <Input
                          id="edit-nationality"
                          value={editForm.nationality}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              nationality: sanitizeLocaleInput(e.target.value),
                            })
                          }
                          maxLength={PROFILE_LOCALE_LINE_MAX}
                          className="h-11 w-full rounded-xl bg-background/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">{tp("genderLabel")}</label>
                        <Select value={editForm.gender || "unspecified"} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                          <SelectTrigger className="h-11 w-full rounded-xl bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unspecified">{tp("genderUnspecified")}</SelectItem>
                            <SelectItem value="male">{tp("genderMale")}</SelectItem>
                            <SelectItem value="female">{tp("genderFemale")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">{tp("ageLabel")}</label>
                        <Input type="number" min={10} max={120} placeholder="28" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="h-11 w-full rounded-xl bg-background/50" />
                      </div>
                    </div>
                  </EditSection>

                  {/* Section 2: Фон профиля */}
                  <EditSection title={tp("backgroundSection")} icon={<Camera className="h-4 w-4" />} defaultOpen={false}>
                    <div className="order-1 md:order-none grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {PROFILE_BACKGROUNDS.map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, profileBackground: bg.id })}
                          className={cn(
                            "relative aspect-[4/3] rounded-xl overflow-hidden transition-all hover:scale-105",
                            editForm.profileBackground === bg.id
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : "ring-1 ring-border hover:ring-primary/50"
                          )}
                        >
                          {bg.id === "avatar" ? (
                            <div className="absolute inset-0 bg-muted flex items-center justify-center">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-full h-full object-cover blur-sm opacity-60" />
                              ) : (
                                <User className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                          ) : (
                            <div className={cn("absolute inset-0 bg-gradient-to-br", bg.gradient)} />
                          )}
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-1 text-center font-medium">
                            {tp(`backgrounds.${bg.id}` as any)}
                          </span>
                          {editForm.profileBackground === bg.id && (
                            <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </EditSection>

                  {/* Section 3: Travel */}
                  <EditSection title={tp("travelSection")} icon={<Plane className="h-4 w-4" />} defaultOpen={false}>
                    <div className="order-2 md:order-none grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">{tp("paceLabel")}</label>
                        <Select value={editForm.pace} onValueChange={(v) => setEditForm({ ...editForm, pace: v })}>
                          <SelectTrigger className="h-11 w-full rounded-xl bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slow">{tp("paceOptions.slow")}</SelectItem>
                            <SelectItem value="moderate">{tp("paceOptions.moderate")}</SelectItem>
                            <SelectItem value="fast">{tp("paceOptions.fast")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">{tp("accommodationLabel")}</label>
                        <Select value={editForm.accommodation} onValueChange={(v) => setEditForm({ ...editForm, accommodation: v })}>
                          <SelectTrigger className="h-11 w-full rounded-xl bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hotel">{tp("accom.hotel")}</SelectItem>
                            <SelectItem value="hostel">{tp("accom.hostel")}</SelectItem>
                            <SelectItem value="airbnb">{tp("accom.airbnb")}</SelectItem>
                            <SelectItem value="resort">{tp("accom.resort")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </EditSection>

                  {/* Section 5: Languages & interests */}
                  <EditSection title={tp("languagesSection")} icon={<Heart className="h-4 w-4" />} defaultOpen={false}>
                    <div className="order-4 md:order-none space-y-1.5">
                      <label className="text-sm font-medium">{tp("languagesLabel")}</label>
                      <div className="flex flex-wrap gap-2 p-2 bg-background/50 border border-input rounded-xl min-h-[42px]">
                        {editForm.languages.map((lang, i) => (
                          <Badge
                            key={lang}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => {
                              const newSw = [...editForm.languages]
                              newSw.splice(i, 1)
                              setEditForm({ ...editForm, languages: newSw })
                            }}
                          >
                            {tp(`languageOptions.${lang}` as any)} ×
                          </Badge>
                        ))}
                      </div>
                      <select
                        className="w-full h-9 rounded-xl border border-input bg-background/50 px-3 text-sm"
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value
                          e.target.value = ""
                          if (v && !editForm.languages.includes(v)) {
                            setEditForm({ ...editForm, languages: [...editForm.languages, v] })
                          }
                        }}
                      >
                        <option value="">{tp("selectFromList")}</option>
                        {PROFILE_LANGUAGE_IDS.filter((id) => !editForm.languages.includes(id)).map((id) => (
                          <option key={id} value={id}>
                            {tp(`languageOptions.${id}` as any)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 mt-2">
                      <label className="text-sm font-medium">{tp("interestsLabel")}</label>
                      <div className="flex flex-wrap gap-2 p-2 bg-background/50 border border-input rounded-xl min-h-[42px]">
                        {editForm.interests.map((tag, i) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => {
                              const newSw = [...editForm.interests]
                              newSw.splice(i, 1)
                              setEditForm({ ...editForm, interests: newSw })
                            }}
                          >
                            {tp(`interests.${tag}` as any)} ×
                          </Badge>
                        ))}
                      </div>
                      <select
                        className="w-full h-9 rounded-xl border border-input bg-background/50 px-3 text-sm"
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value
                          e.target.value = ""
                          if (v && !editForm.interests.includes(v)) {
                            setEditForm({ ...editForm, interests: [...editForm.interests, v] })
                          }
                        }}
                      >
                        <option value="">{tp("selectFromList")}</option>
                        {PROFILE_INTEREST_IDS.filter((id) => !editForm.interests.includes(id)).map((id) => (
                          <option key={id} value={id}>
                            {tp(`interests.${id}` as any)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </EditSection>

                </div>

                {/* Sticky footer */}
                <div className="trip-glass flex flex-col-reverse gap-2 rounded-[1.75rem] p-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
                  <Button onClick={cancelEditing} variant="ghost" className="w-full touch-manipulation sm:w-auto">{tp("cancel")}</Button>
                  <Button onClick={handleUpdateProfile} disabled={savingProfile} className="w-full touch-manipulation bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
                    {savingProfile ? tp("saving") : tp("saveChanges")}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              {/* ===== TABS ===== */}
              <div className="mb-6">
                <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-muted/40 p-1 [-webkit-overflow-scrolling:touch] no-scrollbar dark:bg-white/5">
                  {tabs.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex min-h-10 shrink-0 touch-manipulation items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 sm:px-3.5",
                          isActive
                            ? "bg-background dark:bg-white/10 text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "")} />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ===== TAB CONTENT ===== */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >

                  {/* ====== OVERVIEW TAB ====== */}
                  {activeTab === "overview" && (
                    <div className="space-y-4">
                      {/* Stats cards row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { value: userRoutes.length, label: tp("overlayRoutes") },
                          { value: visitedSummary.countries.length, label: tp("overlayCountries") },
                          { value: completedTrips.length, label: tp("overlayCompleted") },
                          { value: profile?.preferences?.interestsDetailed?.length || 0, label: tp("overlayInterests") },
                        ].map((stat, i) => (
                          <div key={i} className="trip-glass border border-white/20 rounded-2xl p-4 text-center">
                            <div className="text-2xl font-black text-foreground">{stat.value}</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Приглашение друга — на обзоре, без входа в «Настроить» */}
                      {/* Interests card */}
                      <div className="trip-glass border border-white/20 rounded-2xl p-5">
                        <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                          <Heart className="h-4 w-4 text-rose-400" />
                          {tp("interestsLabel")}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {profile?.preferences?.interestsDetailed?.length > 0 ? (
                            profile.preferences.interestsDetailed.map((interest: string) => {
                              const key = interest.toLowerCase()
                              const config = INTEREST_CONFIG[key]
                              return (
                                <Badge
                                  key={interest}
                                  variant="outline"
                                  className={cn(
                                    "px-3 py-1.5 rounded-full transition-all cursor-default border",
                                    config ? `${config.bg} ${config.color}` : "border-border text-foreground hover:bg-muted"
                                  )}
                                >
                                  {INTEREST_CONFIG[interest.toLowerCase()] ? tp(`interests.${interest.toLowerCase()}` as any) : interest}
                                </Badge>
                              )
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">{tp("addInterestsHint")}</p>
                          )}
                        </div>
                      </div>

                      {/* Travel style */}
                      <div className="grid sm:grid-cols-2 gap-3">
                        {/* Travel style card */}
                        <div className="trip-glass border border-white/20 rounded-2xl p-5">
                          <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                            <Zap className="h-4 w-4 text-yellow-400" />
                            {tp("travelStyleSection")}
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{tp("paceSection")}</span>
                              <Badge variant="outline" className="border-blue-500/20 text-blue-400">
                                {paceLabel}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{tp("accommodationSection")}</span>
                              <Badge variant="outline" className="border-purple-500/20 text-purple-400">
                                {profile?.preferences?.accommodation === 'hostel' ? tp("accom.hostel") :
                                  profile?.preferences?.accommodation === 'airbnb' ? tp("accom.airbnb") :
                                  profile?.preferences?.accommodation === 'resort' ? tp("accom.resort") : tp("accom.hotel")}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ====== SETTINGS TAB (redesigned) ====== */}
                  {activeTab === "settings" && (
                    <div className="grid min-w-0 items-start gap-4 pb-8 md:grid-cols-2">

                      <div className="flex flex-wrap items-end justify-between gap-3 px-1 pb-2 md:col-span-2">
                        <div>
                          <h2 className="text-2xl font-bold tracking-tight">{tp("serviceSettingsTitle")}</h2>
                          <p className="mt-1.5 text-sm text-muted-foreground">{tp("serviceSettingsDesc")}</p>
                        </div>
                        <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {savingSetting ? <><Loader2 className="size-3.5 animate-spin" />{tp("saving")}</> : <><Check className="size-3.5 text-emerald-500" />{tp("settingsAutoSave")}</>}
                        </span>
                      </div>

                      {/* Section 1: Профиль */}
                      <div className="trip-glass min-w-0 overflow-hidden rounded-[1.75rem] md:col-span-2">
                        <SettingsSectionHeader icon={<User className="h-3.5 w-3.5" />} title={tp("sectionProfile")} description={tp("settingsProfileDesc")} />
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 border-b border-border/30 sm:px-6">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-12 rounded-2xl bg-muted overflow-hidden shrink-0 ring-1 ring-border/50">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{profile?.full_name || user?.user_metadata?.full_name || tp("defaultTraveler")}</div>
                              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 ml-4 rounded-full"
                            onClick={() => setIsEditing(true)}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                            {tp("edit")}
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                          <div className="text-sm text-muted-foreground">{tp("username")}</div>
                          <div className="flex items-center gap-1.5">
                            {usernameEditing ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">@</span>
                                <input
                                  autoFocus
                                  value={usernameTemp}
                                  onChange={(e) =>
                                    setUsernameTemp(sanitizeUsernameInput(e.target.value).toLowerCase())
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveUsernameInline()
                                    if (e.key === "Escape") setUsernameEditing(false)
                                  }}
                                  className="text-xs bg-transparent border-b border-primary outline-none w-28 font-mono text-foreground py-0.5"
                                  placeholder="username"
                                  maxLength={PROFILE_USERNAME_MAX}
                                />
                                <button onClick={saveUsernameInline} disabled={savingUsername} className="h-5 w-5 rounded flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                                  <Check className="h-3 w-3" />
                                </button>
                                <button onClick={() => setUsernameEditing(false)} className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors text-xs">✕</button>
                              </div>
                            ) : profile?.username ? (
                              <button
                                onClick={() => { setUsernameTemp(profile.username || ""); setUsernameEditing(true) }}
                                className="flex items-center gap-1 text-sm font-mono text-foreground hover:text-primary group transition-colors"
                              >
                                @{profile.username}
                                <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ) : (
                              <button
                                onClick={() => { setUsernameTemp(""); setUsernameEditing(true) }}
                                className="text-sm text-primary/70 hover:text-primary transition-colors"
                              >
                                {tp("addUsername")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="contents md:block md:space-y-4">
                      {/* Section 2: Приложение */}
                      <div className="trip-glass min-w-0 overflow-hidden rounded-[1.75rem]">
                        <SettingsSectionHeader icon={<Settings className="h-3.5 w-3.5" />} title={tp("sectionApp")} description={tp("settingsAppDesc")} />
                        <SettingsRow
                          icon={<Bell className="h-4 w-4" />}
                          label={tp("notificationsLabel")}
                          description={tp("notificationsDesc")}
                          control={
                            <Switch
                              className="relative h-6 w-11 data-[state=unchecked]:bg-muted data-[state=unchecked]:border-border after:absolute after:-inset-y-2 after:inset-x-0 [&_[data-slot=switch-thumb]]:size-5 [&_[data-slot=switch-thumb][data-state=checked]]:translate-x-5"
                              aria-label={tp("notificationsLabel")}
                              checked={editForm.notifications_enabled}
                              disabled={savingSetting !== null}
                              onCheckedChange={(value) => { void saveServiceSetting("notifications_enabled", value) }}
                            />
                          }
                        />
                        <SettingsRow
                          icon={<Bookmark className="h-4 w-4" />}
                          label={tp("autoFavoritesLabel")}
                          description={tp("autoFavoritesDesc")}
                          control={
                            <Switch
                              className="relative h-6 w-11 data-[state=unchecked]:bg-muted data-[state=unchecked]:border-border after:absolute after:-inset-y-2 after:inset-x-0 [&_[data-slot=switch-thumb]]:size-5 [&_[data-slot=switch-thumb][data-state=checked]]:translate-x-5"
                              aria-label={tp("autoFavoritesLabel")}
                              checked={editForm.autoFavorites}
                              disabled={savingSetting !== null}
                              onCheckedChange={(value) => { void saveServiceSetting("autoFavorites", value) }}
                            />
                          }
                        />
                        <SettingsRow
                          icon={<Banknote className="h-4 w-4" />}
                          label={tp("currencyLabel")}
                          description={tp("currencyDesc")}
                          control={
                            <Select
                              value={profile?.preferences?.currency ?? "rub"}
                              disabled={savingSetting !== null}
                              onValueChange={(value) => { void saveServiceSetting("currency", value) }}
                            >
                              <SelectTrigger aria-label={tp("currencyLabel")} className="h-10 w-[108px] rounded-xl bg-background/50"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="rub">₽ RUB</SelectItem>
                                <SelectItem value="usd">$ USD</SelectItem>
                                <SelectItem value="eur">€ EUR</SelectItem>
                              </SelectContent>
                            </Select>
                          }
                        />
                        <SettingsRow
                          icon={<Languages className="h-4 w-4" />}
                          label={tp("languageLabel")}
                          description={tp("languageDesc")}
                          last
                          control={
                            <Select
                              value={locale}
                              disabled={savingSetting !== null}
                              onValueChange={async (val) => {
                                if (!await saveServiceSetting("language", val)) return
                                const expires = new Date()
                                expires.setFullYear(expires.getFullYear() + 1)
                                document.cookie = `NEXT_LOCALE=${val};path=/;expires=${expires.toUTCString()};SameSite=Lax`
                                window.location.reload()
                              }}
                            >
                              <SelectTrigger aria-label={tp("languageLabel")} className="h-10 w-[128px] rounded-xl bg-background/50"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ru">Русский</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                              </SelectContent>
                            </Select>
                          }
                        />
                      </div>

                      {/* Section 4: Управление */}
                      <div className="order-3 md:order-none trip-glass min-w-0 overflow-hidden rounded-[1.75rem]">
                        <SettingsSectionHeader icon={<Settings className="h-3.5 w-3.5" />} title={tp("sectionManagement")} description={tp("settingsManagementDesc")} />
                        <div className="space-y-3 p-5 sm:p-6">
                          <Button variant="outline" className="h-auto min-h-11 w-full justify-start whitespace-normal rounded-xl text-left hover:bg-primary/10 hover:text-primary" onClick={() => window.location.href = "/onboarding"}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {tp("resetPreferences")}
                          </Button>
                          <Button variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal rounded-xl text-left" onClick={() => {
                            const keys = Object.keys(localStorage).filter((key) => key.startsWith("travellm_hint_") || key === "travellm_welcome_seen")
                            keys.forEach((key) => localStorage.removeItem(key))
                            toast.success(tp("toast.hintReset"))
                          }}>
                            <BookOpen className="mr-2 size-4 shrink-0" />{tp("resetHints")}
                          </Button>
                        </div>
                      </div>

                      </div>
                      <div className="contents md:block md:space-y-4">
                      {/* Section 3: Публичный профиль */}
                      <div className="trip-glass min-w-0 overflow-hidden rounded-[1.75rem]">
                        <SettingsSectionHeader icon={<Globe className="h-3.5 w-3.5" />} title={tp("sectionPublicProfile")} description={tp("settingsPublicDesc")} />
                        <div className="p-5 space-y-5 sm:p-6">
                          <div className="space-y-1.5">
                            <label htmlFor="public-username" className="text-sm font-medium">{tp("username")}</label>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-mono text-sm">@</span>
                              <Input
                                id="public-username"
                                value={editForm.username}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    username: sanitizeUsernameInput(e.target.value).toLowerCase(),
                                  })
                                }
                                placeholder="username"
                                maxLength={PROFILE_USERNAME_MAX}
                                className="h-11 rounded-xl bg-background/50 font-mono"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">{tp("usernameHint")}</p>
                            {editForm.username && siteOrigin && (
                              <p className="text-xs text-sky-500 break-all">
                                {siteOrigin}/profile/{editForm.username}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label htmlFor="public-bio" className="text-sm font-medium">{tp("aboutLabel")}</label>
                            <textarea
                              id="public-bio"
                              value={editForm.bio}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  bio: sanitizeBioInput(e.target.value, PROFILE_BIO_MAX),
                                })
                              }
                              placeholder={tp("bioPlaceholder")}
                              maxLength={PROFILE_BIO_MAX}
                              rows={3}
                              className="w-full resize-none rounded-xl border border-input bg-background/50 px-3 py-2 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm"
                            />
                            <p className="text-xs text-muted-foreground">{editForm.bio.length}/{PROFILE_BIO_MAX}</p>
                          </div>

                          <div className="flex items-center justify-between py-2 border-t border-border/30">
                            <div>
                              <div className="text-sm font-medium">{tp("publicProfile")}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{tp("shareHint")}</div>
                            </div>
                            <Switch
                              className="relative h-6 w-11 data-[state=unchecked]:bg-muted data-[state=unchecked]:border-border after:absolute after:-inset-y-2 after:inset-x-0 [&_[data-slot=switch-thumb]]:size-5 [&_[data-slot=switch-thumb][data-state=checked]]:translate-x-5"
                              aria-label={tp("publicProfile")}
                              checked={editForm.publicProfile}
                              disabled={savingPublicProfile || savingSetting !== null}
                              onCheckedChange={(checked) => setEditForm({ ...editForm, publicProfile: !!checked })}
                            />
                          </div>

                          <Button
                            onClick={handleSavePublicProfile}
                            disabled={savingPublicProfile || savingSetting !== null}
                            className="w-full rounded-full sm:w-auto"
                          >
                            {savingPublicProfile ? tp("saving") : tp("saveChanges")}
                          </Button>
                        </div>
                      </div>

                      {/* Section 5: Аккаунт */}
                      <div className="min-w-0 overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/40">
                        <SettingsSectionHeader icon={<LogOut className="h-3.5 w-3.5 text-red-400" />} title={tp("sectionAccount")} description={tp("settingsAccountDesc")} />
                        <div className="p-5 flex flex-col gap-3 sm:p-6">
                          <Button
                            variant="outline"
                            className="min-h-11 w-full justify-start rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 border-red-500/20"
                            onClick={async () => {
                              await signOut()
                              window.location.href = "/"
                            }}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            {tp("signOutLabel")}
                          </Button>
                          <Button
                            variant="ghost"
                            className="min-h-11 w-full justify-start rounded-xl text-muted-foreground hover:text-red-600"
                            onClick={() => setDeleteDialogOpen(true)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            {tp("deleteAccountLabel")}
                          </Button>
                        </div>
                      </div>
                      </div>

                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </>
          )}

        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.25rem)] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{tp("deleteAccountTitle")}</DialogTitle>
            <DialogDescription>
              {tp("deleteAccountDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              {tp("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tp("deleting")}
                </>
              ) : (
                tp("deleteForever")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </AppLayout>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <AppLayout className="bg-background"><ProfileSkeleton /></AppLayout>
    }>
      <ProfileContent />
    </Suspense>
  )
}

