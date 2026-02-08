"use client"

import { useState, useEffect, Suspense } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Settings, Heart, Map, Clock, LogOut, Camera, Edit2, Check, Globe, Utensils, Zap, BookOpen, MapPin, ArrowRight, RotateCcw, Flag, Wallet, Hotel as HotelIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { MeshGradient } from "@paper-design/shaders-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { motion, AnimatePresence } from "framer-motion"

// Interest categories with Russian labels and unique colors
const INTEREST_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nature: { label: "Природа", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800" },
  history: { label: "История", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800" },
  local: { label: "Местная культура", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800" },
  photo: { label: "Фотография", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800" },
  tech: { label: "Технологии", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" },
  nightlife: { label: "Ночная жизнь", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800" },
  shopping: { label: "Шоппинг", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800" },
  spiritual: { label: "Духовное", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800" },
  food: { label: "Гастрономия", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800" },
  museums: { label: "Музеи", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800" },
}

// Profile background presets
const PROFILE_BACKGROUNDS = [
  { id: "avatar", label: "Аватар", gradient: "" }, // Special: uses blurred avatar
  { id: "aurora", label: "Северное сияние", gradient: "from-emerald-500/30 via-cyan-500/20 to-purple-500/30" },
  { id: "sunset", label: "Закат", gradient: "from-orange-500/30 via-rose-500/20 to-pink-500/30" },
  { id: "ocean", label: "Океан", gradient: "from-blue-500/30 via-cyan-500/20 to-teal-500/30" },
  { id: "forest", label: "Лес", gradient: "from-green-500/30 via-emerald-500/20 to-lime-500/30" },
  { id: "galaxy", label: "Космос", gradient: "from-purple-600/30 via-indigo-500/20 to-blue-600/30" },
  { id: "mountains", label: "Горы", gradient: "from-slate-500/30 via-zinc-500/20 to-gray-500/30" },
  { id: "desert", label: "Пустыня", gradient: "from-amber-500/30 via-orange-500/20 to-yellow-500/30" },
  { id: "abstract", label: "Абстракция", gradient: "from-fuchsia-500/30 via-violet-500/20 to-indigo-500/30" },
]

function ProfileContent() {
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
    pace: "moderate",
    religion: "none",
    languages: [] as string[],
    visitedCountries: [] as string[],
    dietaryRestrictions: [] as string[],
    dietaryCustom: "",
    interests: [] as string[],
    interestsCustom: "",
    notifications_enabled: true,
    accommodation: "hotel",
    profileBackground: "ocean", // Default background
    departureCity: "",
    aiCreativity: "balanced",
    autoFavorites: false,
    publicProfile: false,
    defaultTripDuration: "7",
  })

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

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
          setAvatarUrl(data.avatar_url) // Load avatar
          const prefs = data.preferences || {}
          setEditForm({
            full_name: data.full_name || "",
            citizenship: data.citizenship || "",
            nationality: data.nationality || "",
            pace: prefs.pace || "moderate",
            religion: prefs.religion || "none",
            languages: data.languages || [],
            visitedCountries: prefs.visitedCountries || [],
            dietaryRestrictions: prefs.dietaryRestrictions || [],
            dietaryCustom: prefs.dietaryCustom || "",
            interests: prefs.interestsDetailed || [],
            interestsCustom: prefs.interestsCustom || "",
            notifications_enabled: data.notifications_enabled ?? true,
            // accommodation normalization
            accommodation: (() => {
              const val = (prefs.accommodation || "").toLowerCase();
              if (val.includes("хостел") || val === "hostel") return "hostel";
              if (val.includes("апартамент") || val.includes("airbnb") || val === "airbnb") return "airbnb";
              if (val.includes("курорт") || val === "resort") return "resort";
              return "hotel";
            })(),
            profileBackground: prefs.profileBackground || "ocean",
            departureCity: prefs.departureCity || "",
            aiCreativity: prefs.aiCreativity || "balanced",
            autoFavorites: prefs.autoFavorites || false,
            publicProfile: data.public_profile || false,
            defaultTripDuration: prefs.defaultTripDuration || "7",
          })
        }

        // 1. Fetch from Supabase using FRESH ID
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
        // 2. Fetch from LocalStorage (Guest trips)
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

        // 3. Merge avoiding duplicates (prefer DB versions)
        const allRoutes = [...(dbTrips || [])]
        localTrips.forEach(lt => {
          // Check if this local trip is already in DB by title/date if ID is local-
          const isDup = allRoutes.find(dr =>
            dr.id === lt.id ||
            (dr.title === lt.title && Math.abs(new Date(dr.created_at).getTime() - new Date(lt.created_at).getTime()) < 60000)
          )
          if (!isDup) allRoutes.push(lt)
        })

        setUserRoutes(allRoutes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
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
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  // ... (Update Profile Logic remains similar, ensure avatar_url is preserved if needed, though usually handled separately)

  const handleUpdateProfile = async () => {
    if (!user) return
    setLoading(true)
    const updatedPreferences = {
      ...(profile.preferences || {}),
      pace: editForm.pace,
      religion: editForm.religion,
      visitedCountries: editForm.visitedCountries,
      dietaryRestrictions: editForm.dietaryRestrictions,
      dietaryCustom: editForm.dietaryCustom,
      interestsDetailed: editForm.interests,
      interestsCustom: editForm.interestsCustom,
      accommodation: editForm.accommodation,
      profileBackground: editForm.profileBackground,
      departureCity: editForm.departureCity,
      aiCreativity: editForm.aiCreativity,
      autoFavorites: editForm.autoFavorites,
    }

    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      citizenship: editForm.citizenship,
      nationality: editForm.nationality,
      languages: editForm.languages,
      preferences: updatedPreferences,
      notifications_enabled: editForm.notifications_enabled,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    if (error) {
      console.error("Error updating profile:", error)
      alert(`Ошибка при сохранении профиля: ${error.message}`)
    } else {
      setProfile({ ...profile, full_name: editForm.full_name, citizenship: editForm.citizenship, nationality: editForm.nationality, languages: editForm.languages, preferences: updatedPreferences })
      setIsEditing(false)
      // Notify other components (sidebar) about the update
      window.dispatchEvent(new Event('profile_updated'))
    }
    setLoading(false)
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

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 3. Update Profile Logic
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      setAvatarUrl(publicUrl)
      // Optional: Show success toast
    } catch (error: any) {
      alert('Error uploading avatar: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const tabs = [
    { id: "overview", label: "Обзор" },
    { id: "preferences", label: "Предпочтения" },
    { id: "history", label: "История генераций" },
    { id: "settings", label: "Настройки" }
  ]

  return (
    <AppLayout>
      <div className="relative min-h-screen pb-20 bg-background text-foreground transition-colors duration-300">
        {/* Dynamic Profile Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {editForm.profileBackground === "avatar" && avatarUrl ? (
            <>
              <img
                src={avatarUrl}
                alt=""
                className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[100vw] h-[80vh] object-cover blur-[80px] opacity-30 dark:opacity-40 scale-150"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
            </>
          ) : (
            <div className={`absolute top-[-10%] left-1/2 -translate-x-1/2 w-[100vw] h-[70vh] bg-gradient-to-br ${PROFILE_BACKGROUNDS.find(b => b.id === editForm.profileBackground)?.gradient || "from-blue-500/20 via-cyan-500/15 to-purple-500/20"
              } blur-[80px] rounded-full`} />
          )}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-12">

          {/* Centered Header with Light Mode support */}
          <div className="flex flex-col items-center text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="relative mb-6 group">
              <div className="h-32 w-32 rounded-full p-1 bg-gradient-to-br from-white/20 to-white/5 dark:from-white/20 dark:to-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-2xl relative">
                <div className="h-full w-full rounded-full overflow-hidden bg-muted/50 dark:bg-black/40 relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                      <User className="h-12 w-12 text-muted-foreground/50 dark:text-white/50" />
                    </div>
                  )}

                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-20">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}

                  <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                    <Camera className="h-8 w-8 text-white drop-shadow-lg" />
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
            </div>

            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 dark:from-white dark:to-white/60 mb-2">
              {profile?.full_name || user?.user_metadata?.full_name || "Путешественник"}
            </h1>
            <p className="text-lg text-muted-foreground mb-6 font-light">{user?.email}</p>

            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              className="rounded-full px-6 border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 backdrop-blur-md transition-all hover:scale-105"
            >
              {isEditing ? "Отменить редактирование" : "Редактировать профиль"}
            </Button>
          </div>

          {/* Edit Mode Content */}
          {isEditing ? (
            <Card className="p-8 bg-card/50 backdrop-blur-xl border border-border animate-in zoom-in-95 duration-300">
              <div className="grid gap-6 sm:grid-cols-2">

                {/* Background Picker - Full Width */}
                <div className="col-span-2 space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Camera className="h-4 w-4" /> Фон профиля
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {PROFILE_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, profileBackground: bg.id })}
                        className={`relative aspect-[4/3] rounded-xl overflow-hidden transition-all hover:scale-105 ${editForm.profileBackground === bg.id
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : "ring-1 ring-border hover:ring-primary/50"
                          }`}
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
                          <div className={`absolute inset-0 bg-gradient-to-br ${bg.gradient}`} />
                        )}
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-1 text-center font-medium">
                          {bg.label}
                        </span>
                        {editForm.profileBackground === bg.id && (
                          <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /> Полное имя</label>
                  <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="bg-background/50 border-input" />
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Globe className="h-4 w-4" /> Гражданство</label>
                  <Input value={editForm.citizenship} onChange={(e) => setEditForm({ ...editForm, citizenship: e.target.value })} className="bg-background/50 border-input" />
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /> Национальность</label>
                  <Input value={editForm.nationality} onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })} className="bg-background/50 border-input" />
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Zap className="h-4 w-4" /> Темп поездок</label>
                  <Select value={editForm.pace} onValueChange={(v) => setEditForm({ ...editForm, pace: v })}>
                    <SelectTrigger className="bg-background/50 border-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Размеренный</SelectItem>
                      <SelectItem value="moderate">Сбалансированный</SelectItem>
                      <SelectItem value="fast">Активный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Religion */}
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><BookOpen className="h-4 w-4" /> Религия (для халяль/кошер)</label>
                  <Select value={editForm.religion} onValueChange={(v) => setEditForm({ ...editForm, religion: v })}>
                    <SelectTrigger className="bg-background/50 border-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не важно</SelectItem>
                      <SelectItem value="islam">Ислам (Халяль)</SelectItem>
                      <SelectItem value="judaism">Иудаизм (Кошер)</SelectItem>
                      <SelectItem value="hinduism">Индуизм</SelectItem>
                      <SelectItem value="buddhism">Буддизм</SelectItem>
                      <SelectItem value="christianity">Христианство</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Languages - Tag Input */}
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><BookOpen className="h-4 w-4" /> Языки (Enter чтобы добавить)</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-background/50 border border-input rounded-md min-h-[42px]">
                    {editForm.languages.map((lang, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground" onClick={() => {
                        const newSw = [...editForm.languages]
                        newSw.splice(i, 1)
                        setEditForm({ ...editForm, languages: newSw })
                      }}>
                        {lang} ×
                      </Badge>
                    ))}
                    <input
                      className="bg-transparent outline-none flex-1 min-w-[100px] text-sm"
                      placeholder={editForm.languages.length === 0 ? "Например: Русский, English..." : ""}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = e.currentTarget.value.trim()
                          if (val && !editForm.languages.includes(val)) {
                            setEditForm({ ...editForm, languages: [...editForm.languages, val] })
                            e.currentTarget.value = ''
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Interests - Tag Input */}
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Heart className="h-4 w-4" /> Интересы</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-background/50 border border-input rounded-md min-h-[42px]">
                    {editForm.interests.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground" onClick={() => {
                        const newSw = [...editForm.interests]
                        newSw.splice(i, 1)
                        setEditForm({ ...editForm, interests: newSw })
                      }}>
                        {tag} ×
                      </Badge>
                    ))}
                    <input
                      className="bg-transparent outline-none flex-1 min-w-[100px] text-sm"
                      placeholder={editForm.interests.length === 0 ? "Архитектура, Спорт, Еда..." : ""}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = e.currentTarget.value.trim()
                          if (val && !editForm.interests.includes(val)) {
                            setEditForm({ ...editForm, interests: [...editForm.interests, val] })
                            e.currentTarget.value = ''
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Diet - Tag Input */}
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Utensils className="h-4 w-4" /> Диетические ограничения</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-background/50 border border-input rounded-md min-h-[42px]">
                    {editForm.dietaryRestrictions.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground" onClick={() => {
                        const newSw = [...editForm.dietaryRestrictions]
                        newSw.splice(i, 1)
                        setEditForm({ ...editForm, dietaryRestrictions: newSw })
                      }}>
                        {tag} ×
                      </Badge>
                    ))}
                    <input
                      className="bg-transparent outline-none flex-1 min-w-[100px] text-sm"
                      placeholder={editForm.dietaryRestrictions.length === 0 ? "Веган, Без глютена..." : ""}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = e.currentTarget.value.trim()
                          if (val && !editForm.dietaryRestrictions.includes(val)) {
                            setEditForm({ ...editForm, dietaryRestrictions: [...editForm.dietaryRestrictions, val] })
                            e.currentTarget.value = ''
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Visited Countries - Tag Input */}
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Globe className="h-4 w-4" /> Посещенные страны (Enter чтобы добавить)</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-background/50 border border-input rounded-md min-h-[42px]">
                    {editForm.visitedCountries.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground" onClick={() => {
                        const newSw = [...editForm.visitedCountries]
                        newSw.splice(i, 1)
                        setEditForm({ ...editForm, visitedCountries: newSw })
                      }}>
                        {tag} ×
                      </Badge>
                    ))}
                    <input
                      className="bg-transparent outline-none flex-1 min-w-[100px] text-sm"
                      placeholder={editForm.visitedCountries.length === 0 ? "Италия, Япония..." : ""}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = e.currentTarget.value.trim()
                          if (val && !editForm.visitedCountries.includes(val)) {
                            setEditForm({ ...editForm, visitedCountries: [...editForm.visitedCountries, val] })
                            e.currentTarget.value = ''
                          }
                        }
                      }}
                    />
                  </div>
                </div>



                {/* Accommodation Preference */}
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><HotelIcon className="h-4 w-4" /> Предпочтение жилья</label>
                  <Select value={editForm.accommodation} onValueChange={(v) => setEditForm({ ...editForm, accommodation: v })}>
                    <SelectTrigger className="bg-background/50 border-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotel">Отель</SelectItem>
                      <SelectItem value="hostel">Хостел</SelectItem>
                      <SelectItem value="airbnb">Апартаменты/Airbnb</SelectItem>
                      <SelectItem value="resort">Курорт</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-6 col-span-2 flex justify-end gap-3">
                  <Button onClick={() => setIsEditing(false)} variant="ghost">Отмена</Button>
                  <Button onClick={handleUpdateProfile} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">Сохранить</Button>
                </div>
              </div>
            </Card>
          ) : (
            <>
              {/* Navigation Tabs */}
              <div className="flex justify-center border-b border-black/5 dark:border-white/10 mb-12 overflow-x-auto">
                <div className="flex gap-8">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === tab.id
                        ? "text-foreground dark:text-white"
                        : "text-muted-foreground hover:text-foreground dark:hover:text-white/70"
                        }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    {activeTab === "overview" && (
                      <div className="space-y-8">
                        {/* Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-8 border-b border-black/5 dark:border-white/5">
                          {[
                            { label: "Гражданство", value: profile?.citizenship || "Не указано" },
                            { label: "Темп", value: profile?.preferences?.pace === 'fast' ? "Активный" : "Умеренный" },
                            { label: "Питание", value: profile?.preferences?.dietaryRestrictions?.length ? "Есть ограничения" : "Без ограничений" },
                            { label: "Языки", value: profile?.languages?.join(', ') || "Не указано" },
                            { label: "Культура", value: "Не указано" }
                          ].map((stat, i) => (
                            <div key={i} className="text-center md:text-left space-y-1">
                              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{stat.label}</p>
                              <p className="font-medium text-foreground">{stat.value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                          {/* Visited Card */}
                          <motion.div
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Card className="h-64 p-8 bg-card/40 border border-border backdrop-blur-sm rounded-[2rem] flex flex-col items-center justify-center text-center group hover:bg-card/60 transition-colors cursor-pointer w-full relative" onClick={() => setActiveTab("routes")}>
                              <h3 className="text-lg font-bold absolute top-6 left-6 flex items-center gap-2 text-foreground">
                                <Globe className="h-4 w-4 text-emerald-400" />
                                Посещенные места
                              </h3>
                              {(() => {
                                const rawData = profile?.preferences?.visitedCountries || []
                                let itemsList: string[] = []

                                if (Array.isArray(rawData)) {
                                  rawData.forEach(item => {
                                    if (typeof item === 'string') {
                                      item.split(';').forEach(s => itemsList.push(s.trim()))
                                    } else {
                                      itemsList.push(String(item))
                                    }
                                  })
                                } else if (typeof rawData === 'string') {
                                  const sep = rawData.includes(';') ? ';' : ','
                                  itemsList = rawData.split(sep).map(s => s.trim())
                                }

                                const allItems = itemsList.filter(Boolean)

                                if (allItems.length === 0) return (
                                  <>
                                    <p className="text-muted-foreground mb-4 max-w-[200px]">Еще нигде не были? Самое время начать!</p>
                                    <Button variant="link" className="text-primary" onClick={() => setActiveTab("routes")}>Создать маршрут</Button>
                                  </>
                                )

                                // 2. Multi-pass grouping to handle City, Country relationships
                                const grouped: Record<string, string[]> = {}

                                // Helper for common mappings (since we don't have a full DB)
                                const cityToCountry: Record<string, string> = {
                                  "москва": "Россия", "moscow": "Россия", "запрудня": "Россия",
                                  "токио": "Япония", "tokyo": "Япония", "дубай": "ОАЭ", "dubai": "ОАЭ",
                                  "абу-даби": "ОАЭ", "abu dhabi": "ОАЭ", "abu-dhabi": "ОАЭ",
                                  "хургада": "Египет", "hurghada": "Египет", "шарм-эль-шейх": "Египет",
                                  "каир": "Египет", "cairo": "Египет", "стамбул": "Турция",
                                  "париж": "Франция", "рим": "Италия", "лондон": "Великобритания",
                                  "нью-йорк": "США", "берлин": "Германия", "барселона": "Испания"
                                }

                                const knownCountries = ["Россия", "Япония", "ОАЭ", "Египет", "Турция", "Тайланд", "Италия", "Франция", "Испания", "Германия", "США", "Великобритания", "Китай", "Южная Корея"]

                                allItems.forEach((item: string) => {
                                  // Split by comma to detect internal structure: "City, Country"
                                  const parts = item.split(',').map(p => p.trim()).filter(Boolean)
                                  if (parts.length === 0) return

                                  let country: string
                                  let city: string | null = null

                                  if (parts.length > 1) {
                                    country = parts[parts.length - 1]
                                    city = parts[0]
                                  } else {
                                    const normalized = item.toLowerCase()
                                    const isKnownCountry = knownCountries.find(c => c.toLowerCase() === normalized)
                                    if (isKnownCountry) {
                                      country = isKnownCountry
                                    } else if (cityToCountry[normalized]) {
                                      country = cityToCountry[normalized]
                                      city = item
                                    } else {
                                      country = item
                                    }
                                  }

                                  if (!grouped[country]) grouped[country] = []
                                  if (city && city.toLowerCase() !== country.toLowerCase() && !grouped[country].some(c => c.toLowerCase() === city!.toLowerCase())) {
                                    grouped[country].push(city)
                                  }
                                })

                                return (
                                  <div className="flex flex-wrap justify-center gap-3 mt-4 overflow-y-auto max-h-32 px-2 py-1 custom-scrollbar">
                                    {Object.entries(grouped).map(([country, cities]) => (
                                      <Popover key={country}>
                                        <PopoverTrigger asChild>
                                          <div className="group/country relative" onClick={(e) => e.stopPropagation()}>
                                            <Badge
                                              variant="secondary"
                                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-3 py-1 cursor-help flex items-center gap-1.5 transition-all"
                                            >
                                              <Flag className="h-3 w-3" />
                                              {country}
                                              {cities.length > 0 && (
                                                <span className="text-[10px] bg-emerald-500/20 px-1.5 rounded-full font-bold">
                                                  {cities.length}
                                                </span>
                                              )}
                                            </Badge>
                                          </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-4 border-border/50 backdrop-blur-xl bg-card/80">
                                          <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                                            <MapPin className="h-3 w-3 text-emerald-400" />
                                            {country}
                                          </h4>
                                          {cities.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                              {cities.map(city => (
                                                <Badge key={city} variant="outline" className="text-[11px] font-normal border-emerald-500/10">
                                                  {city}
                                                </Badge>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-muted-foreground italic">Города не указаны</p>
                                          )}
                                        </PopoverContent>
                                      </Popover>
                                    ))}
                                  </div>
                                )
                              })()}
                            </Card>
                          </motion.div>

                          {/* Interests Card */}
                          <motion.div
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Card className="h-64 p-8 bg-card/40 border border-border backdrop-blur-sm rounded-[2rem] flex flex-col text-center relative group hover:bg-card/60 transition-colors w-full h-full">
                              <h3 className="text-lg font-bold absolute top-6 left-6 flex items-center gap-2 text-foreground">
                                <Heart className="h-4 w-4 text-rose-400" />
                                Ваши интересы
                              </h3>
                              <div className="flex flex-wrap gap-3 justify-center content-center h-full mt-4">
                                {profile?.preferences?.interestsDetailed?.length > 0 ? (
                                  profile.preferences.interestsDetailed.map((i: string) => {
                                    const key = i.toLowerCase()
                                    const config = INTEREST_CONFIG[key]
                                    return (
                                      <Badge
                                        key={i}
                                        variant="outline"
                                        className={`px-3 py-1.5 rounded-full transition-all cursor-default border ${config
                                          ? `${config.bg} ${config.color}`
                                          : "border-border text-foreground hover:bg-muted"
                                          }`}
                                      >
                                        {config?.label || i}
                                      </Badge>
                                    )
                                  })
                                ) : (
                                  <p className="text-muted-foreground">Интересы не выбраны</p>
                                )}
                              </div>
                            </Card>
                          </motion.div>
                        </div>
                      </div>
                    )}
                    {activeTab === "preferences" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card className="p-6 bg-card/40 border-border backdrop-blur-sm space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                              <Utensils className="h-5 w-5" />
                            </div>
                            <h3 className="font-medium text-lg">Питание</h3>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Ограничения:</p>
                            <div className="flex flex-wrap gap-2">
                              {profile?.preferences?.dietaryRestrictions?.length > 0 ? (
                                profile.preferences.dietaryRestrictions.map((r: string) => (
                                  <Badge key={r} variant="secondary" className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">{r}</Badge>
                                ))
                              ) : <span className="text-sm">Нет ограничений</span>}
                            </div>
                            {profile?.preferences?.dietaryCustom && (
                              <p className="text-sm italic text-muted-foreground mt-2">"{profile.preferences.dietaryCustom}"</p>
                            )}
                          </div>
                        </Card>

                        <Card className="p-6 bg-card/40 border-border backdrop-blur-sm space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                              <Clock className="h-5 w-5" />
                            </div>
                            <h3 className="font-medium text-lg">Темп</h3>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Предпочитаемый ритм:</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 capitalize">
                                {profile?.preferences?.pace === 'fast' ? "Активный" : profile?.preferences?.pace === 'slow' ? "Размеренный" : "Сбалансированный"}
                              </Badge>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-6 bg-card/40 border-border backdrop-blur-sm space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <h3 className="font-medium text-lg">Языки</h3>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Владение языками:</p>
                            <div className="flex flex-wrap gap-2">
                              {profile?.languages?.length > 0 ? (
                                profile.languages.map((l: string) => (
                                  <Badge key={l} variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{l}</Badge>
                                ))
                              ) : <span className="text-sm">Не указано</span>}
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}

                    {activeTab === "history" && (() => {
                      // Filter to show only completed trips from database (UUID format)
                      const completedTrips = userRoutes.filter((trip: any) =>
                        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trip.id)
                      )
                      return (
                        <Card className="overflow-hidden bg-card/40 border-border">
                          <div className="p-6 border-b border-border">
                            <h3 className="font-bold text-xl flex items-center gap-2">
                              <Zap className="h-5 w-5 text-primary" />
                              История генераций
                            </h3>
                            <p className="text-muted-foreground text-sm">Все маршруты, созданные AI-помощником</p>
                          </div>
                          <div className="divide-y divide-border/50">
                            {completedTrips.map((trip: any) => (
                              <div key={trip.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group cursor-pointer" onClick={() => window.location.href = `/trip/${trip.id}`}>
                                <div className="flex items-center gap-4">
                                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20">
                                    <MapPin className="h-6 w-6" />
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="font-medium group-hover:text-primary transition-colors">{trip.title}</h4>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{trip.destination}</Badge>
                                      {trip.duration_days && <Badge variant="outline" className="text-[10px] px-2 py-0.5">{trip.duration_days} дней</Badge>}
                                      <span className="text-muted-foreground/60">{new Date(trip.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="h-4 w-4" /></Button>
                              </div>
                            ))}
                            {completedTrips.length === 0 && (
                              <div className="p-12 text-center">
                                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                                  <Zap className="h-8 w-8 text-muted-foreground/30" />
                                </div>
                                <p className="font-medium text-muted-foreground">История пуста</p>
                                <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs mx-auto">Здесь будут отображаться все маршруты, сгенерированные AI-помощником</p>
                                <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/plan'}>
                                  Создать первый маршрут
                                </Button>
                              </div>
                            )}
                          </div>
                        </Card>
                      )
                    })()}

                    {activeTab === "settings" && (
                      <div className="max-w-2xl mx-auto space-y-8 pb-20">
                        <Card className="p-6 bg-card/40 border-border space-y-6">
                          <h3 className="font-bold text-lg flex items-center gap-2"><Settings className="h-5 w-5" /> Основные настройки</h3>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <label className="font-medium">Браузерные уведомления</label>
                                <p className="text-sm text-muted-foreground">Уведомлять, когда маршрут готов</p>
                              </div>
                              <Checkbox
                                checked={editForm.notifications_enabled}
                                onCheckedChange={(checked) => {
                                  setEditForm({ ...editForm, notifications_enabled: !!checked })
                                  // Auto-save logic for standalone settings (optional, but consistent with others)
                                  supabase.from('profiles').update({ notifications_enabled: !!checked }).eq('id', user.id).then()
                                }}
                              />
                            </div>





                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <label className="font-medium">Авто-избранное</label>
                                <p className="text-sm text-muted-foreground">Автоматически сохранять созданные маршруты</p>
                              </div>
                              <Checkbox
                                checked={editForm.autoFavorites}
                                onCheckedChange={(checked) => {
                                  const newVal = !!checked
                                  setEditForm({ ...editForm, autoFavorites: newVal })
                                  const newPrefs = { ...profile.preferences, autoFavorites: newVal }
                                  setProfile({ ...profile, preferences: newPrefs })
                                  supabase.from('profiles').update({ preferences: newPrefs }).eq('id', user.id).then()
                                }}
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <label className="font-medium">Креативность AI</label>
                                <p className="text-sm text-muted-foreground">Степень необычности маршрутов</p>
                              </div>
                              <Select
                                value={profile?.preferences?.aiCreativity ?? "balanced"}
                                onValueChange={(val) => {
                                  const newPrefs = { ...profile.preferences, aiCreativity: val }
                                  setProfile({ ...profile, preferences: newPrefs })
                                  setEditForm((prev: any) => ({ ...prev, aiCreativity: val }))
                                  supabase.from('profiles').update({ preferences: newPrefs }).eq('id', user.id).then()
                                }}
                              >
                                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="conservative">Консервативный</SelectItem>
                                  <SelectItem value="balanced">Сбалансированный</SelectItem>
                                  <SelectItem value="creative">Креативный</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>



                            <div className="space-y-2 pt-2">
                              <label className="font-medium">Город вылета (по умолчанию)</label>
                              <Input
                                placeholder="Например: Москва"
                                value={editForm.departureCity}
                                onChange={(e) => {
                                  setEditForm({ ...editForm, departureCity: e.target.value })
                                }}
                                onBlur={() => {
                                  const newPrefs = { ...profile.preferences, departureCity: editForm.departureCity }
                                  setProfile({ ...profile, preferences: newPrefs })
                                  supabase.from('profiles').update({ preferences: newPrefs }).eq('id', user.id).then()
                                }}
                                className="bg-background/50"
                              />
                              <p className="text-sm text-muted-foreground">Откуда вы обычно начинаете путешествие</p>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <label className="font-medium">Валюта</label>
                                <p className="text-sm text-muted-foreground">Основная валюта для расчётов</p>
                              </div>
                              <Select
                                value={profile?.preferences?.currency ?? "rub"}
                                onValueChange={(val) => {
                                  const newPrefs = { ...profile.preferences, currency: val }
                                  setProfile({ ...profile, preferences: newPrefs })
                                  supabase.from('profiles').update({ preferences: newPrefs }).eq('id', user.id).then()
                                }}
                              >
                                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="rub">₽ RUB</SelectItem>
                                  <SelectItem value="usd">$ USD</SelectItem>
                                  <SelectItem value="eur">€ EUR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <label className="font-medium">Единицы измерения</label>
                                <p className="text-sm text-muted-foreground">Километры или мили</p>
                              </div>
                              <Select
                                value={profile?.preferences?.units ?? "metric"}
                                onValueChange={(val) => {
                                  const newPrefs = { ...profile.preferences, units: val }
                                  setProfile({ ...profile, preferences: newPrefs })
                                  supabase.from('profiles').update({ preferences: newPrefs }).eq('id', user.id).then()
                                }}
                              >
                                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="metric">Метрика</SelectItem>
                                  <SelectItem value="imperial">Имперская</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <label className="font-medium">Язык интерфейса</label>
                                <p className="text-sm text-muted-foreground">Язык приложения</p>
                              </div>
                              <Select
                                value={profile?.preferences?.language ?? "ru"}
                                onValueChange={(val) => {
                                  const newPrefs = { ...profile.preferences, language: val }
                                  setProfile({ ...profile, preferences: newPrefs })
                                  supabase.from('profiles').update({ preferences: newPrefs }).eq('id', user.id).then()
                                }}
                              >
                                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                                  <SelectItem value="en">🇬🇧 English</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-6 bg-card/40 border-border space-y-6">
                          <h3 className="font-bold text-lg flex items-center gap-2"><Settings className="h-5 w-5" /> Управление</h3>
                          <Button variant="outline" className="w-full justify-start hover:bg-primary/10 hover:text-primary" onClick={() => window.location.href = "/onboarding"}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Перепройти опрос предпочтений
                          </Button>
                        </Card>

                        <Card className="p-6 bg-red-500/5 border-red-500/20 space-y-6">
                          <h3 className="font-bold text-lg text-red-600 dark:text-red-400 flex items-center gap-2"><LogOut className="h-5 w-5" /> Аккаунт</h3>

                          <div className="flex flex-col gap-4">
                            <Button variant="outline" className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700" onClick={async () => {
                              await supabase.auth.signOut()
                              window.location.href = "/"
                            }}>
                              <LogOut className="h-4 w-4 mr-2" />
                              Выйти из аккаунта
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-red-600">
                              Удалить аккаунт
                            </Button>
                          </div>
                        </Card>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}

        </div>
      </div>
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
