"use client"

import { useState, useEffect, Suspense } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Settings, Heart, Map, Clock, LogOut, Camera, Edit2, Check, Globe, Utensils, Zap, BookOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"

function ProfileContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [userRoutes, setUserRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams?.get("tab") || "profile")
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
  })

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfile(data)
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
          })
        }

        // Load some mock/stored routes for now, or fetch from a 'trips' table if it existed
        const { data: trips } = await supabase.from('trips').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        if (trips) setUserRoutes(trips)
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  useEffect(() => {
    const tab = searchParams?.get("tab")
    if (tab) setActiveTab(tab)
  }, [searchParams])

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
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    if (!error) {
      setProfile({ ...profile, full_name: editForm.full_name, citizenship: editForm.citizenship, nationality: editForm.nationality, languages: editForm.languages, preferences: updatedPreferences })
      setIsEditing(false)
    }
    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 text-center">
              <div className="relative mx-auto mb-4 h-24 w-24">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-12 w-12" />
                </div>
                <Button size="icon" variant="outline" className="absolute bottom-0 right-0 h-8 w-8 rounded-full border-2 border-background">
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <h1 className="text-xl font-bold">{profile?.full_name || user?.user_metadata?.full_name || "Пользователь"}</h1>
              <p className="text-sm text-muted-foreground mb-4">{user?.email || "user@example.com"}</p>
              <Button
                variant={isEditing ? "default" : "outline"}
                className="w-full gap-2"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Отменить" : <><Edit2 className="h-4 w-4" /> Редактировать</>}
              </Button>
            </Card>

            <div className="space-y-2">
              {[
                { id: "profile", label: "Мой профиль", icon: User },
                { id: "routes", label: "Мои маршруты", icon: Map },
                { id: "favorites", label: "Избранное", icon: Heart },
                { id: "history", label: "История", icon: Clock },
                { id: "settings", label: "Настройки", icon: Settings },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start gap-3 px-4 py-6 text-base hover:bg-primary/5 hover:text-primary ${activeTab === item.id ? "bg-primary/10 text-primary font-semibold" : ""
                    }`}
                  onClick={() => {
                    setActiveTab(item.id)
                    window.history.pushState(null, "", `?tab=${item.id}`)
                  }}
                >
                  <item.icon className="h-5 w-5" /> {item.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-4 py-6 text-base text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.href = "/"
                }}
              >
                <LogOut className="h-5 w-5" /> Выйти
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {activeTab === "profile" && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="mb-4 text-2xl font-bold">Ваш профиль путешественника</h2>
                <Card className="p-6">
                  {isEditing ? (
                    <div className="space-y-6">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Полное имя</label>
                          <Input
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2"><Globe className="h-4 w-4" /> Гражданство</label>
                          <Input
                            value={editForm.citizenship}
                            onChange={(e) => setEditForm({ ...editForm, citizenship: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Национальность</label>
                          <Input
                            value={editForm.nationality}
                            onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2"><Zap className="h-4 w-4" /> Темп поездок</label>
                          <Select value={editForm.pace} onValueChange={(v) => setEditForm({ ...editForm, pace: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите темп" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="slow">Размеренный</SelectItem>
                              <SelectItem value="moderate">Сбалансированный</SelectItem>
                              <SelectItem value="fast">Активный</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2"><BookOpen className="h-4 w-4" /> Религия</label>
                          <Select value={editForm.religion} onValueChange={(v) => setEditForm({ ...editForm, religion: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите религию" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Не указано</SelectItem>
                              <SelectItem value="orthodox">Православие</SelectItem>
                              <SelectItem value="islam">Ислам</SelectItem>
                              <SelectItem value="buddhism">Буддизм</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-sm font-medium flex items-center gap-2"><Utensils className="h-4 w-4" /> Питание и ограничения</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 rounded-lg border p-4">
                            {['Halal', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-free', 'Nut-free', 'Dairy-free', 'No Seafood'].map(diet => (
                              <div key={diet} className="flex items-center gap-2">
                                <Checkbox
                                  id={diet}
                                  checked={editForm.dietaryRestrictions.includes(diet)}
                                  onCheckedChange={(checked: boolean) => {
                                    if (checked) setEditForm({ ...editForm, dietaryRestrictions: [...editForm.dietaryRestrictions, diet] })
                                    else setEditForm({ ...editForm, dietaryRestrictions: editForm.dietaryRestrictions.filter(d => d !== diet) })
                                  }}
                                />
                                <label htmlFor={diet} className="text-sm leading-none cursor-pointer">{diet}</label>
                              </div>
                            ))}
                          </div>
                          <Input
                            placeholder="Другие ограничения (например: Аллергия на мед)"
                            value={editForm.dietaryCustom}
                            onChange={(e) => setEditForm({ ...editForm, dietaryCustom: e.target.value })}
                            className="mt-2"
                          />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-sm font-medium flex items-center gap-2"><Heart className="h-4 w-4" /> Интересы</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 rounded-lg border p-4">
                            {['Пляжи', 'Ночная жизнь', 'История', 'Технологии', 'Искусство', 'Музыка', 'Спорт', 'Фотография', 'Архитектура', 'Гейминг', 'Наука'].map(interest => (
                              <div key={interest} className="flex items-center gap-2">
                                <Checkbox
                                  id={interest}
                                  checked={editForm.interests.includes(interest)}
                                  onCheckedChange={(checked: boolean) => {
                                    if (checked) setEditForm({ ...editForm, interests: [...editForm.interests, interest] })
                                    else setEditForm({ ...editForm, interests: editForm.interests.filter(i => i !== interest) })
                                  }}
                                />
                                <label htmlFor={interest} className="text-sm leading-none cursor-pointer">{interest}</label>
                              </div>
                            ))}
                          </div>
                          <Input
                            placeholder="Другие интересы (через запятую)"
                            value={editForm.interestsCustom}
                            onChange={(e) => setEditForm({ ...editForm, interestsCustom: e.target.value })}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><Globe className="h-4 w-4" /> Посещённые страны</label>
                        <Input
                          placeholder="Грузия, Турция, Таиланд, Италия..."
                          value={editForm.visitedCountries.join(', ')}
                          onChange={(e) => setEditForm({ ...editForm, visitedCountries: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })}
                        />
                        <p className="text-xs text-muted-foreground">Страны через запятую. ИИ не будет предлагать только те места, которые вы уже посетили.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Языки (английский, русский, и т.д.)</label>
                        <Input
                          placeholder="Введите через запятую"
                          value={editForm.languages.join(', ')}
                          onChange={(e) => setEditForm({ ...editForm, languages: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })}
                        />
                      </div>

                      <div className="pt-4 flex gap-3">
                        <Button onClick={handleUpdateProfile} disabled={loading} className="px-8 shadow-lg shadow-primary/20">
                          {loading ? "Сохранение..." : "Сохранить всё"}
                        </Button>
                        <Button variant="ghost" onClick={() => setIsEditing(false)}>Отмена</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Темп поездок</p>
                        <Badge variant="secondary" className="px-3 py-1">
                          {profile?.preferences?.pace === 'fast' ? 'Активный' : profile?.preferences?.pace === 'slow' ? 'Размеренный' : 'Сбалансированный'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Гражданство</p>
                        <Badge variant="secondary" className="px-3 py-1 border-primary/30">
                          {profile?.citizenship || 'Не указано'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Питание</p>
                        <div className="flex flex-wrap gap-2">
                          {profile?.preferences?.dietaryRestrictions?.length > 0 ? profile.preferences.dietaryRestrictions.map((d: string) => (
                            <Badge key={d} variant="outline">{d}</Badge>
                          )) : <span className="text-sm text-muted-foreground italic">Ограничений нет</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Языки</p>
                        <div className="flex flex-wrap gap-2">
                          {profile?.languages?.length > 0 ? profile.languages.map((l: string) => (
                            <Badge key={l} variant="outline">{l}</Badge>
                          )) : <span className="text-sm text-muted-foreground italic">Не выбрано</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Культурный код</p>
                        <Badge variant="secondary" className="px-3 py-1">
                          {profile?.preferences?.religion === 'orthodox' ? 'Православие' : profile?.preferences?.religion === 'islam' ? 'Ислам' : 'Не указано'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Национальность</p>
                        <p className="text-sm">{profile?.nationality || 'Не указана'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Посещённые страны</p>
                        <div className="flex flex-wrap gap-2">
                          {profile?.preferences?.visitedCountries?.length > 0 ? profile.preferences.visitedCountries.map((c: string) => (
                            <Badge key={c} variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">{c}</Badge>
                          )) : <span className="text-sm text-muted-foreground italic">Пока нигде не были? Самое время!</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 border-t pt-6">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Ваши интересы</p>
                    <div className="flex flex-wrap gap-2">
                      {profile?.preferences?.interestsDetailed?.map((i: string) => (
                        <Badge key={i} className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                          {i}
                        </Badge>
                      )) || <span className="text-sm text-muted-foreground italic">Давайте узнаем вас лучше</span>}
                    </div>
                  </div>

                  {!isEditing && (
                    <Button variant="link" className="mt-4 p-0 h-auto text-primary" onClick={() => window.location.href = '/onboarding'}>
                      Пройти опрос заново
                    </Button>
                  )}
                </Card>
              </section>
            )}

            {activeTab === "routes" && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Мои маршруты</h2>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/plan'}>Создать новый</Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {userRoutes.length > 0 ? userRoutes.map((trip: any) => (
                    <Card
                      key={trip.id}
                      className="group p-4 relative hover:shadow-md transition-all cursor-pointer overflow-hidden border-none shadow-sm"
                      onClick={() => window.location.href = `/trip/${trip.id}`}
                    >
                      <div className="h-32 w-full bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden relative">
                        <img
                          src={`https://loremflickr.com/400/300/travel,${encodeURIComponent(trip.destination || "city")}/all`}
                          alt={trip.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent" />
                        <Map className="h-8 w-8 text-white/50 relative z-10" />
                      </div>
                      <h3 className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{trip.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{trip.destination}</p>
                      <Badge className="absolute top-6 right-6 shadow-sm">AI</Badge>
                    </Card>
                  )) : (
                    <>
                      <Card className="p-4 relative hover:shadow-md transition-all cursor-pointer" onClick={() => window.location.href = '/trip/ai'}>
                        <div className="h-32 w-full bg-muted rounded-md mb-3 flex items-center justify-center">
                          <Map className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                        <h3 className="font-bold text-sm">Ваша первая поездка</h3>
                        <p className="text-xs text-muted-foreground">Пример маршрута</p>
                        <Badge className="absolute top-6 right-6 shadow-sm">Demo</Badge>
                      </Card>
                      <Card className="overflow-hidden border-dashed flex items-center justify-center p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => window.location.href = '/plan'}>
                        <div>
                          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                            <Edit2 className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-medium">Создать еще</p>
                        </div>
                      </Card>
                    </>
                  )}
                </div>
              </section>
            )}

            {activeTab === "favorites" && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Избранное пусто</h2>
                <p className="text-muted-foreground mb-6">Сохраняйте места и статьи, чтобы они появились здесь.</p>
                <Button onClick={() => window.location.href = '/news'}>Перейти в ленту</Button>
              </section>
            )}

            {activeTab === "history" && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="mb-4 text-2xl font-bold">История поиска</h2>
                <Card className="divide-y overflow-hidden">
                  {userRoutes.length > 0 ? userRoutes.map((trip: any) => (
                    <div
                      key={trip.id}
                      className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => window.location.href = `/trip/${trip.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Map className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{trip.title}</p>
                          <p className="text-xs text-muted-foreground">{trip.destination}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">{new Date(trip.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</p>
                        <p className="text-[10px] text-primary uppercase font-bold tracking-tighter">Смотреть</p>
                      </div>
                    </div>
                  )) : (
                    <div className="p-12 text-center text-muted-foreground italic">
                      История пуста. Начните планирование!
                    </div>
                  )}
                </Card>
              </section>
            )}

            {activeTab === "settings" && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="mb-4 text-2xl font-bold">Настройки профиля</h2>
                <Card className="p-6 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Уведомления</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Email уведомления</p>
                        <p className="text-xs text-muted-foreground">Новости о маршрутах и новые статьи</p>
                      </div>
                      <Button variant="outline" size="sm">Включено</Button>
                    </div>
                  </div>
                  <div className="pt-6 border-t space-y-4">
                    <h3 className="font-semibold text-lg text-destructive">Опасная зона</h3>
                    <Button variant="destructive" className="w-full sm:w-auto">Удалить аккаунт</Button>
                  </div>
                </Card>
              </section>
            )}
          </div>
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
