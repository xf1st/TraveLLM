"use client"

import { useState, useEffect, Suspense } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Settings, Heart, Map, Clock, LogOut, Camera, Edit2, Check, Globe, Utensils, Zap, BookOpen, MapPin, ArrowRight, RotateCcw, Flag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { MeshGradient } from "@paper-design/shaders-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { motion, AnimatePresence } from "framer-motion"

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
  })

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const authUser = session?.user || null
      setUser(authUser)
      setDebugInfo(prev => ({ ...prev, sessionStatus: authUser ? "ACTIVE" : "NONE", userId: authUser?.id }))

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
          setDebugInfo(prev => ({ ...prev, error: dbError.message }))
        }

        setDebugInfo(prev => ({ ...prev, userId: authUser.id }))
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

    if (!error) {
      setProfile({ ...profile, full_name: editForm.full_name, citizenship: editForm.citizenship, nationality: editForm.nationality, languages: editForm.languages, preferences: updatedPreferences })
      setIsEditing(false)
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
    { id: "routes", label: "Мои маршруты" },
    { id: "preferences", label: "Предпочтения" },
    { id: "history", label: "История" },
    { id: "settings", label: "Настройки" }
  ]

  return (
    <AppLayout>
      <div className="relative min-h-screen pb-20 bg-background text-foreground transition-colors duration-300">
        {/* LightRays Background - Adjusted for Light Mode */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-blue-500/10 dark:bg-blue-500/10 blur-[100px] rounded-full" />
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
                                {profile?.preferences?.interestsDetailed?.map((i: string) => (
                                  <Badge key={i} variant="outline" className="border-border text-foreground px-3 py-1.5 rounded-full hover:bg-muted transition-all cursor-default">
                                    {i}
                                  </Badge>
                                )) || <p className="text-muted-foreground">Интересы не выбраны</p>}
                              </div>
                            </Card>
                          </motion.div>
                        </div>
                      </div>
                    )}

                    {activeTab === "routes" && (
                      <div className="relative min-h-[400px] rounded-3xl overflow-hidden p-6 border border-border bg-card/40">
                        {/* Gradient Background - Only visible in Dark Mode effectively, or adjusted opacity for light */}
                        <div className="absolute inset-0 z-0 opacity-10 dark:opacity-40 pointer-events-none">
                          <MeshGradient
                            className="w-full h-full"
                            colors={["#000000", "#1E1E1E", "#0F172A", "#000000"]}
                            speed={0.2}
                          />
                        </div>

                        <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {userRoutes.map((trip: any) => (
                            <div key={trip.id} onClick={() => window.location.href = `/trip/${trip.id}`} className="aspect-[4/3] relative rounded-3xl overflow-hidden cursor-pointer group shadow-lg border border-border/50">
                              <img
                                src={`https://loremflickr.com/400/300/travel,${encodeURIComponent(trip.destination || "nature")}/all`}
                                alt={trip.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">{trip.title}</h3>
                                <div className="flex items-center gap-2 text-white/60 text-sm">
                                  <MapPin className="h-3 w-3" />
                                  {trip.destination}
                                </div>
                              </div>
                            </div>
                          ))}
                          {/* Add New Card */}
                          <div onClick={() => window.location.href = '/plan'} className="aspect-[4/3] rounded-3xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer text-muted-foreground hover:text-primary backdrop-blur-sm">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                              <Edit2 className="h-5 w-5" />
                            </div>
                            <span className="font-medium">Создать новый</span>
                          </div>
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

                    {activeTab === "history" && (
                      <Card className="overflow-hidden bg-card/40 border-border">
                        <div className="p-6 border-b border-border">
                          <h3 className="font-bold text-xl">История поездок</h3>
                          <p className="text-muted-foreground text-sm">Ваши прошлые приключения</p>
                        </div>
                        <div className="divide-y divide-border/50">
                          {userRoutes.map((trip: any) => (
                            <div key={trip.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group cursor-pointer" onClick={() => window.location.href = `/trip/${trip.id}`}>
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden relative">
                                  <img src={`https://loremflickr.com/100/100/travel,${encodeURIComponent(trip.destination || "nature")}/all`} className="object-cover w-full h-full" alt="" />
                                </div>
                                <div>
                                  <h4 className="font-medium group-hover:text-primary transition-colors">{trip.title}</h4>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {trip.destination}</span>
                                    <span>•</span>
                                    <span>{new Date(trip.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm"><ArrowRight className="h-4 w-4" /></Button>
                            </div>
                          ))}
                          {userRoutes.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">
                              История пуста
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {activeTab === "settings" && (
                      <div className="max-w-2xl mx-auto space-y-8 pb-20">
                        {/* Debug Info (Only for devs/diagnostics) */}
                        <Card className="p-4 bg-red-500/5 border-red-500/20 text-[10px] font-mono">
                          <p className="font-bold opacity-50 uppercase mb-2">Diagnostic Data</p>
                          <p>User ID: {debugInfo.userId || "NONE (GUEST)"}</p>
                          <p>DB Error: {debugInfo.error || "None"}</p>
                          <p>Session: {debugInfo.sessionStatus}</p>
                        </Card>

                        <Card className="p-6 bg-card/40 border-border space-y-6">
                          <h3 className="font-bold text-lg flex items-center gap-2"><Settings className="h-5 w-5" /> Настройки приложения</h3>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <label className="font-medium">Браузерные уведомления</label>
                                <p className="text-sm text-muted-foreground">Получать пуш-уведомление, когда маршрут готов</p>
                              </div>
                              <Checkbox
                                checked={editForm.notifications_enabled}
                                onCheckedChange={(checked) => {
                                  setEditForm({ ...editForm, notifications_enabled: !!checked })
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <label className="font-medium">Валюта</label>
                                <p className="text-sm text-muted-foreground">Основная валюта для расчетов</p>
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
                                  <SelectItem value="rub">RUB</SelectItem>
                                  <SelectItem value="usd">USD</SelectItem>
                                  <SelectItem value="eur">EUR</SelectItem>
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
