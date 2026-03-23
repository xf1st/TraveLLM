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
  Medal, Hotel as HotelIcon, Star, Calendar,
  LayoutDashboard, Trophy, SlidersHorizontal, Settings as SettingsIcon, X,
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
import { supabase } from "@/lib/supabase"
import { patchMyProfile, ProfilePatchError } from "@/lib/user-profile-client"
import { appToast as toast } from "@/components/ui/sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { motion, AnimatePresence } from "framer-motion"
import Achievements, { ACHIEVEMENTS } from "@/components/Achievements"
import { TripFeedbackDialog, type TripFeedbackRecord } from "@/components/travel/TripFeedbackDialog"
import { cn } from "@/lib/utils"
import {
  PROFILE_NAME_MAX,
  PROFILE_USERNAME_MAX,
  PROFILE_TEXT_MAX,
  PROFILE_LANGUAGE_IDS,
  PROFILE_INTEREST_IDS,
  sanitizeDisplayName,
  sanitizeUsernameInput,
  normalizeUsername,
  sanitizeLongText,
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
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-muted/30 border-b border-border/30 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="text-primary/80">{icon}</span>
        <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
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
            <div className="p-5 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Settings section header
function SettingsSectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="px-5 py-3 bg-muted/30 border-b border-border/30 text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
      {icon}
      {title}
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
      "flex items-center justify-between px-5 py-4",
      !last && "border-b border-border/30"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{label}</div>
          {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
        </div>
      </div>
      <div className="shrink-0 ml-4">{control}</div>
    </div>
  )
}

function ProfileContent() {
  const tp = useTranslations("profile")
  const tc = useTranslations("common")
  const locale = useLocale()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [userRoutes, setUserRoutes] = useState<any[]>([])
  const [debugInfo, setDebugInfo] = useState<any>({ userId: null, error: null, sessionStatus: "Checking..." })
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams?.get("tab") || "overview")
  const [editForm, setEditForm] = useState({
    full_name: "",
    citizenship: "",
    nationality: "",
    gender: "",
    age: "",
    pace: "moderate",
    languages: [] as string[],
    interests: [] as string[],
    notifications_enabled: true,
    accommodation: "hotel",
    profileBackground: "ocean",
    autoFavorites: false,
    publicProfile: false,
    username: "",
    bio: "",
    defaultTripDuration: "7",
  })

  const [siteOrigin, setSiteOrigin] = useState("")
  useEffect(() => {
    setSiteOrigin(typeof window !== "undefined" ? window.location.origin : "")
  }, [])

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [feedbackByTripId, setFeedbackByTripId] = useState<Record<string, TripFeedbackRecord>>({})
  const [feedbackTrip, setFeedbackTrip] = useState<any | null>(null)
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
  }, [completedTrips, profile?.preferences?.visitedCountries])

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const authUser = session?.user || null
      setUser(authUser)
      setDebugInfo((prev: any) => ({ ...prev, sessionStatus: authUser ? "ACTIVE" : "NONE", userId: authUser?.id }))

      if (authUser) {
        const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
        if (data) {
          setProfile(data)
          setAvatarUrl(data.avatar_url)
          const prefs = data.preferences || {}
          setEditForm({
            full_name: data.full_name || "",
            citizenship: data.citizenship || "",
            nationality: data.nationality || "",
            gender: prefs.gender || "",
            age: prefs.age ? String(prefs.age) : "",
            pace: prefs.pace || "moderate",
            languages: migrateLanguageList(data.languages),
            interests: filterInterestList(prefs.interestsDetailed),
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
          })
        }

        const { data: dbTrips, error: dbError } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })

        if (dbError) {
          console.error("Profile load error (DB):", dbError.message, "Code:", dbError.code, "Details:", dbError.details)
          setDebugInfo((prev: any) => ({ ...prev, error: dbError.message }))
        }

        setDebugInfo((prev: any) => ({ ...prev, userId: authUser.id }))
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

        const allRoutes = [...(dbTrips || [])]
        localTrips.forEach(lt => {
          const isDup = allRoutes.find(dr =>
            dr.id === lt.id ||
            (dr.title === lt.title && Math.abs(new Date(dr.created_at).getTime() - new Date(lt.created_at).getTime()) < 60000)
          )
          if (!isDup) allRoutes.push(lt)
        })

        setUserRoutes(allRoutes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))

        try {
          const { data: feedbackRows, error: feedbackError } = await supabase
            .from("trip_feedback")
            .select("trip_id,rating,comment,liked,disliked,source,updated_at")
            .eq("user_id", authUser.id)

          if (feedbackError) {
            if (feedbackError.code !== "42P01") {
              console.warn("Profile feedback load error:", feedbackError.message)
            }
          } else if (Array.isArray(feedbackRows)) {
            const byTrip: Record<string, TripFeedbackRecord> = {}
            feedbackRows.forEach((row: any) => {
              const tripKey = String(row?.trip_id || "")
              if (!tripKey) return
              byTrip[tripKey] = row
            })
            setFeedbackByTripId(byTrip)
          }
        } catch (feedbackFetchError) {
          console.warn("Failed to fetch trip feedback:", feedbackFetchError)
        }
      } else {
        // GUEST MODE
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
            } catch (e) { }
          }
        }
        setUserRoutes(localTrips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
        setFeedbackByTripId({})
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  const achievementNotifiedRef = useRef(false)

  useEffect(() => {
    // Wait until profile and data are fully loaded
    if (!profile || !user) return
    // Run only once per mount after data is ready
    if (achievementNotifiedRef.current) return
    achievementNotifiedRef.current = true

    const STORAGE_KEY = `travellm_seen_achievements_${user.id}`
    const seen: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")

    const stats = {
      countries: visitedSummary.countries.length,
      trips: userRoutes.length,
      weeks: 0,
    }

    const newlyUnlocked: string[] = []
    ACHIEVEMENTS.forEach((ach) => {
      if (ach.condition(stats) && !seen.includes(ach.id)) {
        newlyUnlocked.push(ach.id)
        toast.custom(
          () => (
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white p-4 rounded-xl shadow-md md:shadow-2xl flex items-center gap-4 border border-white/20">
              <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                <Medal className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-lg">{tp("achievement.newAchievement")}!</h4>
                <p className="text-sm opacity-90">{tp(`achievement.${ach.titleKey}`)}</p>
              </div>
            </div>
          ),
          { duration: 5000 },
        )
      }
    })

    if (newlyUnlocked.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, ...newlyUnlocked]))
    }
  }, [visitedSummary.countries.length, userRoutes.length, profile, user])

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

    const bioSan = sanitizeLongText(editForm.bio || "", PROFILE_TEXT_MAX)
    const cit = sanitizeCitizenshipNationality(editForm.citizenship)
    const nat = sanitizeCitizenshipNationality(editForm.nationality)
    const ageNum = editForm.age.trim() ? parseProfileAge(editForm.age) : null
    if (editForm.age.trim() && ageNum === null) {
      toast.error(tp("toast.ageInvalid"))
      return
    }

    const langs = migrateLanguageList(editForm.languages)
    const interests = filterInterestList(editForm.interests)

    setLoading(true)

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
    setLoading(false)
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
    const bioSan = sanitizeLongText(editForm.bio || "", PROFILE_TEXT_MAX)
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
        await supabase.auth.signOut()
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

      await patchMyProfile({ avatar_url: publicUrl })

      setAvatarUrl(publicUrl)
      toast.success(tp("toast.avatarUpdated"))
    } catch (error: any) {
      toast.error('Error uploading avatar: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const tabs = [
    { id: "overview", label: tp("overview"), icon: LayoutDashboard },
    { id: "achievements", label: tp("achievements"), icon: Trophy },
    { id: "settings", label: tp("settings"), icon: SettingsIcon },
  ]

  const paceLabel = profile?.preferences?.pace === 'fast'
    ? tp("stats.activePace")
    : profile?.preferences?.pace === 'slow'
    ? tp("stats.relaxedPace")
    : tp("stats.balanced")

  const currentBg = PROFILE_BACKGROUNDS.find(b => b.id === editForm.profileBackground)

  return (
    <AppLayout className="bg-background">
      <div className="min-h-[calc(100vh-4rem)] pb-20">

        <div className="max-w-4xl mx-auto px-4 pt-8">

          {/* ===== PROFILE HERO ===== */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            {/* Row 1 — Banner */}
            <div className="relative rounded-[2rem] overflow-hidden h-32 mb-[-48px]">
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
            <div className="relative px-6 pb-4 flex items-end gap-4">
              {/* Avatar */}
              <div className="relative shrink-0 group">
                <div className="h-24 w-24 rounded-full ring-4 ring-background bg-muted overflow-hidden shadow-md md:shadow-2xl">
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
                        onChange={(e) => setNameTemp(sanitizeDisplayName(e.target.value))}
                        maxLength={PROFILE_NAME_MAX}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveNameInline()
                          if (e.key === "Escape") setNameEditing(false)
                        }}
                        className="text-xl font-black bg-transparent border-b-2 border-primary outline-none w-full text-foreground leading-tight py-0"
                        placeholder="Ваше имя"
                      />
                      <button
                        onClick={saveNameInline}
                        disabled={savingName}
                        className="h-7 w-7 rounded-full flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 transition-colors shrink-0"
                      >
                        {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setNameEditing(false)}
                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors text-xs shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setNameTemp(profile?.full_name || user?.user_metadata?.full_name || ""); setNameEditing(true) }}
                      className="text-xl font-black truncate text-foreground leading-tight hover:text-primary transition-colors flex items-center gap-2 group text-left"
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
                        onChange={(e) => setUsernameTemp(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveUsernameInline()
                          if (e.key === "Escape") setUsernameEditing(false)
                        }}
                        className="text-xs bg-transparent border-b border-primary outline-none w-28 font-mono text-foreground py-0.5"
                        placeholder="username"
                        maxLength={20}
                      />
                      <button
                        onClick={saveUsernameInline}
                        disabled={savingUsername}
                        className="h-5 w-5 rounded flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setUsernameEditing(false)}
                        className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : profile?.username ? (
                    <button
                      onClick={() => { setUsernameTemp(profile.username || ""); setUsernameEditing(true) }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground group transition-colors"
                    >
                      <span className="font-mono">@{profile.username}</span>
                      <Edit2 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ) : (
                    <button
                      onClick={() => { setUsernameTemp(""); setUsernameEditing(true) }}
                      className="text-xs text-primary/60 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span className="font-mono">@</span>
                      <span>Добавить username</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-center">
                {profile?.username && profile?.public_profile && (
                  <Button
                    onClick={handleShareProfile}
                    variant="outline"
                    size="icon"
                    className={cn(
                      "rounded-xl transition-all h-10 w-10 md:w-auto md:px-4 md:gap-2",
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
                  onClick={() => setIsEditing(!isEditing)}
                  variant="outline"
                  size="icon"
                  className="rounded-xl border-white/20 bg-white/10 dark:bg-white/5 hover:bg-white/20 backdrop-blur-md h-10 w-10 md:w-auto md:px-4 md:gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  <span className="hidden md:inline">{isEditing ? tp("cancel") : tp("configure")}</span>
                </Button>
              </div>
            </div>

            {/* Bio */}
            <div className="px-6 mt-2 relative group">
              {profile?.bio ? (
                <p className="text-sm text-muted-foreground line-clamp-2 max-w-lg">{profile.bio}</p>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-muted-foreground/50 hover:text-primary transition-colors"
                >
                  {tp("bioHint")}
                </button>
              )}
            </div>

            {/* Stats strip modernized */}
            <div className="px-6 mt-5">
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
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
              <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Edit2 className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-bold">{tp("editProfileTitle")}</h2>
                  </div>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="max-h-[80vh] overflow-y-auto p-5 space-y-3">

                  {/* Section 1: Личные данные */}
                  <EditSection title={tp("personalSection")} icon={<User className="h-4 w-4" />} defaultOpen={true}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{tp("fullNameLabel")}</label>
                        <Input
                          value={editForm.full_name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, full_name: sanitizeDisplayName(e.target.value) })
                          }
                          maxLength={PROFILE_NAME_MAX}
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Username</label>
                        <div className="flex items-center">
                          <span className="px-3 py-2 text-sm bg-muted/50 border border-input border-r-0 rounded-l-md text-muted-foreground">@</span>
                          <Input
                            value={editForm.username}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                username: sanitizeUsernameInput(e.target.value).toLowerCase(),
                              })
                            }
                            placeholder="username"
                            maxLength={PROFILE_USERNAME_MAX}
                            className="bg-background/50 font-mono rounded-l-none"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{tp("aboutMeLabel")}</label>
                        <textarea
                          value={editForm.bio}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              bio: sanitizeLongText(e.target.value, PROFILE_TEXT_MAX),
                            })
                          }
                          placeholder={tp("aboutMePlaceholder")}
                          maxLength={PROFILE_TEXT_MAX}
                          rows={2}
                          className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right">{editForm.bio.length}/{PROFILE_TEXT_MAX}</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{tp("uploadAvatar")}</label>
                        <label htmlFor="avatar-upload-edit" className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background/50 cursor-pointer hover:bg-muted/30 transition-colors text-sm text-muted-foreground">
                          <Camera className="h-4 w-4" />
                          {uploading ? tp("uploading") : tp("selectPhoto")}
                          <input id="avatar-upload-edit" type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
                        </label>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{tp("citizenshipLabel")}</label>
                        <Input
                          value={editForm.citizenship}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              citizenship: sanitizeCitizenshipNationality(e.target.value),
                            })
                          }
                          maxLength={PROFILE_TEXT_MAX}
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{tp("nationalityLabel")}</label>
                        <Input
                          value={editForm.nationality}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              nationality: sanitizeCitizenshipNationality(e.target.value),
                            })
                          }
                          maxLength={PROFILE_TEXT_MAX}
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{tp("genderLabel")}</label>
                        <Select value={editForm.gender || "unspecified"} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                          <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unspecified">{tp("genderUnspecified")}</SelectItem>
                            <SelectItem value="male">{tp("genderMale")}</SelectItem>
                            <SelectItem value="female">{tp("genderFemale")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{tp("ageLabel")}</label>
                        <Input type="number" min={10} max={100} placeholder="28" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="bg-background/50" />
                      </div>
                    </div>
                  </EditSection>

                  {/* Section 2: Фон профиля */}
                  <EditSection title={tp("backgroundSection")} icon={<Camera className="h-4 w-4" />} defaultOpen={false}>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
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
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{tp("paceLabel")}</label>
                        <Select value={editForm.pace} onValueChange={(v) => setEditForm({ ...editForm, pace: v })}>
                          <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slow">{tp("paceOptions.slow")}</SelectItem>
                            <SelectItem value="moderate">{tp("paceOptions.moderate")}</SelectItem>
                            <SelectItem value="fast">{tp("paceOptions.fast")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{tp("accommodationLabel")}</label>
                        <Select value={editForm.accommodation} onValueChange={(v) => setEditForm({ ...editForm, accommodation: v })}>
                          <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
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
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{tp("languagesLabel")}</label>
                      <div className="flex flex-wrap gap-2 p-2 bg-background/50 border border-input rounded-md min-h-[42px]">
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
                        className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
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
                      <label className="text-xs font-medium text-muted-foreground">{tp("interestsLabel")}</label>
                      <div className="flex flex-wrap gap-2 p-2 bg-background/50 border border-input rounded-md min-h-[42px]">
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
                        className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
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
                <div className="sticky bottom-0 border-t border-border/50 bg-card/80 backdrop-blur-md px-6 py-4 flex justify-end gap-3">
                  <Button onClick={() => setIsEditing(false)} variant="ghost">{tp("cancel")}</Button>
                  <Button onClick={handleUpdateProfile} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {loading ? tp("saving") : tp("saveChanges")}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              {/* ===== TABS ===== */}
              <div className="mb-6">
                <div className="flex gap-1 overflow-x-auto no-scrollbar p-1 bg-muted/40 dark:bg-white/5 rounded-2xl border border-border/50">
                  {tabs.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap",
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

                      {/* Interests card */}
                      <div className="trip-glass border border-white/20 rounded-2xl p-5">
                        <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                          <Heart className="h-4 w-4 text-rose-400" />
                          Интересы
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
                            <p className="text-sm text-muted-foreground">Добавьте интересы в настройках</p>
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

                      {/* Achievements embedded */}
                      <div className="trip-glass border border-white/20 rounded-2xl p-5">
                        <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                          <Medal className="h-4 w-4 text-amber-400" />
                          {tp("achievementsTab")}
                        </h3>
                        <Achievements visitedCountries={visitedSummary.countries} completedTripsCount={completedTrips.length} />
                      </div>
                    </div>
                  )}

                  {/* ====== ACHIEVEMENTS TAB ====== */}
                  {activeTab === "achievements" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                          <MapPin className="w-6 h-6 text-cyan-500" />
                          {tp("completedTripsTitle")}
                        </h2>
                        <p className="text-muted-foreground text-sm">{tp("completedTripsSubtitle")}</p>

                        {completedTrips.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {completedTrips.map((trip: any) => {
                              const feedback = feedbackByTripId[String(trip.id)] || null
                              return (
                                <Link key={trip.id} href={`/trip/completed?tripId=${trip.id}`}>
                                  <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                                    <Card className="h-full border-white/10 bg-white/5 hover:bg-white/10 transition-colors overflow-hidden group flex flex-col relative">
                                      <div className="absolute top-3 right-3 z-10">
                                        {feedback?.rating ? (
                                          <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 backdrop-blur-md">
                                            <Star className="w-3 h-3 mr-1 fill-emerald-400 text-emerald-400" /> {feedback.rating}
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary" className="bg-black/40 backdrop-blur-md border-white/10 text-white/70">
                                            {tp("noRating")}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="h-32 w-full bg-muted/20 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-blue-500/20 opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <MapPin className="w-8 h-8 text-white/30 group-hover:text-white/50 transition-colors group-hover:scale-110 duration-500" />
                                        </div>
                                      </div>
                                      <div className="p-4 flex flex-col flex-grow">
                                        <div className="font-bold text-foreground line-clamp-1 mb-1 group-hover:text-cyan-400 transition-colors">{trip.title || tp("defaultTripTitle")}</div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
                                          <span>{trip.destination || tp("defaultDestination")}</span>
                                        </div>
                                        <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(trip.created_at || Date.now()).toLocaleDateString()}</span>
                                          <span className="flex items-center gap-1 text-cyan-500 group-hover:translate-x-1 transition-transform">{tp("view")} <ArrowRight className="w-3 h-3" /></span>
                                        </div>
                                      </div>
                                    </Card>
                                  </motion.div>
                                </Link>
                              )
                            })}
                          </div>
                        ) : (
                          <Card className="border-white/20 trip-glass p-8 text-center text-muted-foreground">
                            {tp("noCompletedTrips")}
                          </Card>
                        )}
                      </div>

                      {/* Cities by country */}
                      <div className="grid gap-6">
                        <Card className="p-5 border-white/20 trip-glass">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <MapIcon className="h-5 w-5 text-cyan-500" />
                            {tp("citiesByCountry")}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 mb-4">
                            {tp("citiesSummary", { countries: visitedSummary.countries.length, cities: visitedSummary.totalCities })}
                          </p>
                          <div className="mt-3 space-y-3 max-h-72 overflow-y-auto pr-1">
                            {visitedSummary.citiesByCountry.map((entry) => (
                              <div key={entry.country} className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-emerald-500/5 p-3">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-lg leading-none">{getCountryFlag(entry.country)}</span>
                                    <div className="font-semibold text-foreground truncate">{entry.country}</div>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400">
                                    {tp("cityCount", { count: entry.cities.length })}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {entry.cities.map((city) => (
                                    <Badge key={entry.country + "-" + city} variant="outline" className="text-[10px] border-emerald-500/25">
                                      {city}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {visitedSummary.citiesByCountry.length === 0 && (
                              <span className="text-sm text-muted-foreground">{tp("noData")}</span>
                            )}
                          </div>
                        </Card>
                      </div>

                      {/* Achievements */}
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                          <Medal className="w-6 h-6 text-amber-500" />
                          {tp("achievementsTab")}
                        </h2>
                        <Achievements visitedCountries={visitedSummary.countries} completedTripsCount={completedTrips.length} />
                      </div>
                    </div>
                  )}

                  {/* ====== PREFERENCES TAB ====== */}
                  {activeTab === "preferences" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <Card className="p-6 trip-glass border-white/20 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Utensils className="h-5 w-5" />
                          </div>
                          <h3 className="font-medium text-lg">{tp("foodSection")}</h3>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">{tp("foodRestrictions")}</p>
                          <div className="flex flex-wrap gap-2">
                            {profile?.preferences?.dietaryRestrictions?.length > 0 ? (
                              profile.preferences.dietaryRestrictions.map((r: string) => (
                                <Badge key={r} variant="secondary" className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">{r}</Badge>
                              ))
                            ) : <span className="text-sm">{tp("noRestrictions")}</span>}
                          </div>
                          {profile?.preferences?.dietaryCustom && (
                            <p className="text-sm italic text-muted-foreground mt-2">"{profile.preferences.dietaryCustom}"</p>
                          )}
                        </div>
                      </Card>

                      <Card className="p-6 trip-glass border-white/20 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <ClockIcon className="h-5 w-5" />
                          </div>
                          <h3 className="font-medium text-lg">{tp("paceSection")}</h3>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">{tp("preferredPace")}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 capitalize">
                              {paceLabel}
                            </Badge>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-6 trip-glass border-white/20 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <h3 className="font-medium text-lg">{tp("languagesSectionTitle")}</h3>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">{tp("languagesSpoken")}</p>
                          <div className="flex flex-wrap gap-2">
                            {profile?.languages?.length > 0 ? (
                              profile.languages.map((l: string) => (
                                <Badge key={l} variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{l}</Badge>
                              ))
                            ) : <span className="text-sm">{tp("notSpecified")}</span>}
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* ====== HISTORY TAB ====== */}
                  {activeTab === "history" && (() => {
                    const dbTrips = userRoutes.filter((trip: any) =>
                      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trip.id)
                    )
                    return (
                      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
                        <div className="p-6 border-b border-border/50">
                          <h3 className="font-bold text-xl flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            {tp("historyTitle")}
                          </h3>
                          <p className="text-muted-foreground text-sm">{tp("historySubtitle")}</p>
                        </div>
                        <div className="divide-y divide-border/30">
                          {dbTrips.map((trip: any) => (
                            <div
                              key={trip.id}
                              className="p-4 flex items-center justify-between hover:bg-muted/30 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                              onClick={() => window.location.href = `/trip/${trip.id}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20">
                                  <MapPin className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="font-medium group-hover:text-primary transition-colors">{trip.title}</h4>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{trip.destination}</Badge>
                                    {trip.duration_days && <Badge variant="outline" className="text-[10px] px-2 py-0.5">{trip.duration_days} {tc("days")}</Badge>}
                                    <span className="text-muted-foreground/60">{new Date(trip.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                  </div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {dbTrips.length === 0 && (
                            <div className="p-12 text-center">
                              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                                <Zap className="h-8 w-8 text-muted-foreground/30" />
                              </div>
                              <p className="font-medium text-muted-foreground">{tp("historyEmpty")}</p>
                              <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs mx-auto">{tp("historyEmptyDesc")}</p>
                              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/plan'}>
                                {tp("createFirst")}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* ====== SETTINGS TAB (redesigned) ====== */}
                  {activeTab === "settings" && (
                    <div className="max-w-2xl mx-auto space-y-4 pb-20">

                      {/* Section 1: Профиль */}
                      <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
                        <SettingsSectionHeader icon={<User className="h-3.5 w-3.5" />} title={tp("sectionProfile")} />
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0">
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
                        <div className="flex items-center justify-between px-5 py-3.5">
                          <div className="text-sm text-muted-foreground">Username</div>
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

                      {/* Section 2: Приложение */}
                      <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
                        <SettingsSectionHeader icon={<Settings className="h-3.5 w-3.5" />} title={tp("sectionApp")} />
                        <SettingsRow
                          icon={<Bell className="h-4 w-4" />}
                          label={tp("notificationsLabel")}
                          description={tp("notificationsDesc")}
                          control={
                            <Checkbox
                              checked={editForm.notifications_enabled}
                              onCheckedChange={async (checked) => {
                                const v = !!checked
                                setEditForm({ ...editForm, notifications_enabled: v })
                                try {
                                  const { profile: p } = await patchMyProfile({ notifications_enabled: v })
                                  setProfile((prev: any) => ({ ...prev, ...p }))
                                } catch (err: unknown) {
                                  const msg = err instanceof ProfilePatchError ? err.message : "Error"
                                  toast.error(msg)
                                }
                              }}
                            />
                          }
                        />
                        <SettingsRow
                          icon={<Bookmark className="h-4 w-4" />}
                          label={tp("autoFavoritesLabel")}
                          description={tp("autoFavoritesDesc")}
                          control={
                            <Checkbox
                              checked={editForm.autoFavorites}
                              onCheckedChange={async (checked) => {
                                const newVal = !!checked
                                setEditForm({ ...editForm, autoFavorites: newVal })
                                const newPrefs = { ...profile.preferences, autoFavorites: newVal }
                                setProfile({ ...profile, preferences: newPrefs })
                                try {
                                  const { profile: p } = await patchMyProfile({ preferences: newPrefs })
                                  setProfile((prev: any) => ({ ...prev, ...p }))
                                } catch (err: unknown) {
                                  const msg = err instanceof ProfilePatchError ? err.message : "Error"
                                  toast.error(msg)
                                }
                              }}
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
                              onValueChange={async (val) => {
                                const newPrefs = { ...profile.preferences, currency: val }
                                setProfile({ ...profile, preferences: newPrefs })
                                try {
                                  const { profile: p } = await patchMyProfile({ preferences: newPrefs })
                                  setProfile((prev: any) => ({ ...prev, ...p }))
                                } catch (err: unknown) {
                                  const msg = err instanceof ProfilePatchError ? err.message : "Error"
                                  toast.error(msg)
                                }
                              }}
                            >
                              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
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
                              onValueChange={async (val) => {
                                const newPrefs = { ...profile.preferences, language: val }
                                setProfile({ ...profile, preferences: newPrefs })
                                try {
                                  const { profile: p } = await patchMyProfile({ preferences: newPrefs })
                                  setProfile((prev: any) => ({ ...prev, ...p }))
                                } catch (err: unknown) {
                                  const msg = err instanceof ProfilePatchError ? err.message : "Error"
                                  toast.error(msg)
                                  return
                                }
                                const expires = new Date()
                                expires.setFullYear(expires.getFullYear() + 1)
                                document.cookie = `NEXT_LOCALE=${val};path=/;expires=${expires.toUTCString()};SameSite=Lax`
                                window.location.reload()
                              }}
                            >
                              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ru">Русский</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                              </SelectContent>
                            </Select>
                          }
                        />
                      </div>

                      {/* Section 3: Публичный профиль */}
                      <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
                        <SettingsSectionHeader icon={<Globe className="h-3.5 w-3.5" />} title={tp("sectionPublicProfile")} />
                        <div className="p-5 space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Username</label>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-mono text-sm">@</span>
                              <Input
                                value={editForm.username}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    username: sanitizeUsernameInput(e.target.value).toLowerCase(),
                                  })
                                }
                                placeholder="username"
                                maxLength={PROFILE_USERNAME_MAX}
                                className="bg-background/50 font-mono"
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
                            <label className="text-xs font-medium text-muted-foreground">{tp("aboutLabel")}</label>
                            <textarea
                              value={editForm.bio}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  bio: sanitizeLongText(e.target.value, PROFILE_TEXT_MAX),
                                })
                              }
                              placeholder={tp("bioPlaceholder")}
                              maxLength={PROFILE_TEXT_MAX}
                              rows={3}
                              className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            />
                            <p className="text-xs text-muted-foreground">{editForm.bio.length}/{PROFILE_TEXT_MAX}</p>
                          </div>

                          <div className="flex items-center justify-between py-2 border-t border-border/30">
                            <div>
                              <div className="text-sm font-medium">{tp("publicProfile")}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{tp("shareHint")}</div>
                            </div>
                            <Checkbox
                              checked={editForm.publicProfile}
                              onCheckedChange={(checked) => setEditForm({ ...editForm, publicProfile: !!checked })}
                            />
                          </div>

                          <Button
                            onClick={handleSavePublicProfile}
                            disabled={savingPublicProfile}
                            className="w-full sm:w-auto"
                          >
                            {savingPublicProfile ? tp("saving") : tp("saveChanges")}
                          </Button>
                        </div>
                      </div>

                      {/* Section 4: Управление */}
                      <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
                        <SettingsSectionHeader icon={<Settings className="h-3.5 w-3.5" />} title={tp("sectionManagement")} />
                        <div className="px-5 py-4">
                          <Button variant="outline" className="w-full justify-start hover:bg-primary/10 hover:text-primary" onClick={() => window.location.href = "/onboarding"}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {tp("resetPreferences")}
                          </Button>
                        </div>
                      </div>

                      {/* Section 5: Аккаунт */}
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
                        <SettingsSectionHeader icon={<LogOut className="h-3.5 w-3.5 text-red-400" />} title={tp("sectionAccount")} />
                        <div className="p-5 flex flex-col gap-3">
                          <Button
                            variant="outline"
                            className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 border-red-500/20"
                            onClick={async () => {
                              await supabase.auth.signOut()
                              window.location.href = "/"
                            }}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            {tp("signOutLabel")}
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-muted-foreground hover:text-red-600"
                            onClick={() => setDeleteDialogOpen(true)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            {tp("deleteAccountLabel")}
                          </Button>
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
        <DialogContent className="sm:max-w-[425px]">
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

      {feedbackTrip && (
        <TripFeedbackDialog
          open={!!feedbackTrip}
          onOpenChange={(open) => {
            if (!open) setFeedbackTrip(null)
          }}
          tripId={String(feedbackTrip.id)}
          tripTitle={feedbackTrip.title || "Completed trip"}
          source="profile"
          initialFeedback={feedbackByTripId[String(feedbackTrip.id)] || null}
          onSubmitted={(saved) => {
            setFeedbackByTripId((prev) => ({ ...prev, [String(saved.trip_id)]: saved }))
          }}
        />
      )}
    </AppLayout>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}

