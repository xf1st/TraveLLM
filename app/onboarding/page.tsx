"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/logo"
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { CityAutocomplete } from "@/components/ui/city-autocomplete"
import { motion, AnimatePresence } from "framer-motion"

const STEP_LABELS = [
  "О вас",
  "Опыт и мечты",
  "Стиль",
  "Интересы",
  "Документы",
  "Готово",
]

const DOC_PASSPORTS = [
  { value: "ru_passport", label: "Паспорт РФ", icon: "🪪" },
  { value: "foreign_passport", label: "Загранпаспорт РФ", icon: "📘" },
]

const DOC_VISAS_TOP = [
  { value: "schengen", label: "Шенген", icon: "🇪🇺" },
  { value: "us_visa", label: "США", icon: "🇺🇸" },
  { value: "uk_visa", label: "Великобритания", icon: "🇬🇧" },
  { value: "japan_visa", label: "Япония", icon: "🇯🇵" },
  { value: "china_visa", label: "Китай", icon: "🇨🇳" },
  { value: "uae_visa", label: "ОАЭ", icon: "🇦🇪" },
  { value: "india_evisa", label: "Индия", icon: "🇮🇳" },
  { value: "canada_visa", label: "Канада", icon: "🇨🇦" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [preferences, setPreferences] = useState({
    travelFrequency: "",
    gender: "",
    age: "",
    visitedCountries: "",
    preferredDestinations: [] as string[],
    dietaryRestrictions: [] as string[],
    religion: "",
    budgetPreference: "",
    travelStyle: [] as string[],
    accommodation: "",
    transport: [] as string[],
    pace: "",
    companionsCount: "1",
    interestsDetailed: [] as string[],
    citizenship: "",
    nationality: "",
    documents: [] as string[],
    languages: [] as string[],
  })

  const totalSteps = 6

  const savePreferences = async (prefs: typeof preferences) => {
    localStorage.setItem("userPreferences", JSON.stringify(prefs))
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name,
        citizenship: prefs.citizenship,
        nationality: prefs.nationality,
        languages: prefs.languages,
        preferences: {
          ...prefs,
          visitedCountries: prefs.visitedCountries
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
        },
      })
    }
    router.push("/plan")
  }

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      await savePreferences(preferences)
    }
  }

  const handleSkip = async () => {
    // Save minimal preferences so OnboardingPrompt stops showing
    const prefs = {
      ...preferences,
      travelFrequency: preferences.travelFrequency || "sometimes",
      skipped: true,
    } as typeof preferences
    await savePreferences(prefs)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const toggleArray = (key: keyof typeof preferences, value: string) => {
    const array = preferences[key] as string[]
    setPreferences({
      ...preferences,
      [key]: array.includes(value) ? array.filter((v) => v !== value) : [...array, value],
    })
  }

  const chip = (selected: boolean) =>
    cn(
      "flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-medium cursor-pointer transition-all duration-200 select-none",
      selected
        ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
        : "border-border/60 bg-white/40 dark:bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
    )

  const tile = (selected: boolean) =>
    cn(
      "flex flex-col items-start p-4 rounded-2xl border text-sm font-medium cursor-pointer transition-all duration-200 text-left",
      selected
        ? "border-primary bg-primary/15 shadow-[0_0_0_1px_hsl(var(--primary))]"
        : "border-border/60 bg-white/40 dark:bg-card/40 text-muted-foreground hover:border-primary/40 hover:bg-accent/40"
    )

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Friendly ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full bg-violet-500/15 dark:bg-violet-500/10 blur-[140px]" />
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full bg-sky-500/15 dark:bg-sky-500/10 blur-[130px]" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-rose-400/10 dark:bg-rose-400/7 blur-[110px]" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-amber-400/10 dark:bg-amber-400/6 blur-[100px]" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container max-w-2xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-black text-sm text-foreground hidden sm:block">TraveLLM</span>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEP_LABELS.map((_, i) => {
              const n = i + 1
              const done = n < step
              const active = n === step
              return (
                <div
                  key={n}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    done
                      ? "h-2 w-2 bg-primary"
                      : active
                      ? "h-2 w-6 bg-primary"
                      : "h-2 w-2 bg-muted-foreground/25"
                  )}
                />
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium tabular-nums">
              {step}/{totalSteps}
            </span>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 container max-w-2xl px-4 py-8 md:py-10">
        {/* Step label */}
        <div className="mb-5 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Шаг {step} · {STEP_LABELS[step - 1]}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <Card className="p-6 sm:p-8 bg-card/75 backdrop-blur-md border-border/50 rounded-3xl shadow-sm">

              {/* ─── STEP 1: О вас ─── */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black">Расскажите о себе</h2>
                    <p className="text-muted-foreground mt-1.5">Пара вопросов — и AI лучше поймёт вас.</p>
                  </div>

                  {/* Travel frequency */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Как часто путешествуете?</Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { value: "rarely", label: "Редко", desc: "Раз в год или реже", icon: "🌱" },
                        { value: "sometimes", label: "Иногда", desc: "2–3 раза в год", icon: "✈️" },
                        { value: "often", label: "Часто", desc: "4+ раза в год", icon: "🌍" },
                        { value: "very-often", label: "Это страсть!", desc: "Постоянно", icon: "🔥" },
                      ].map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setPreferences({ ...preferences, travelFrequency: o.value })}
                          className={cn(
                            "flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-200 gap-2",
                            preferences.travelFrequency === o.value
                              ? "border-primary bg-primary/15 shadow-[0_0_0_1px_hsl(var(--primary))]"
                              : "border-border/60 bg-white/40 dark:bg-card/40 hover:border-primary/40 hover:bg-accent/40"
                          )}
                        >
                          <span className="text-2xl">{o.icon}</span>
                          <div>
                            <span className="font-semibold text-foreground text-sm block">{o.label}</span>
                            <span className="text-xs text-muted-foreground">{o.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gender + Age */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Пол</Label>
                      <div className="flex gap-1.5">
                        {[
                          { value: "male", label: "👨 М" },
                          { value: "female", label: "👩 Ж" },
                          { value: "unspecified", label: "🤷 —" },
                        ].map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setPreferences({ ...preferences, gender: o.value })}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                              preferences.gender === o.value
                                ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
                                : "border-border/60 text-muted-foreground hover:border-primary/40"
                            )}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Возраст</Label>
                      <Input
                        id="age-input"
                        type="number"
                        min={10}
                        max={100}
                        placeholder="28"
                        value={preferences.age}
                        onChange={(e) => setPreferences({ ...preferences, age: e.target.value })}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 2: Опыт и мечты ─── */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black">Ваш опыт и мечты</h2>
                    <p className="text-muted-foreground mt-1.5">AI не будет повторять места, где вы уже были.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Где уже побывали?</Label>
                    <CityAutocomplete
                      placeholder="Турция, Египет, Таиланд..."
                      value={preferences.visitedCountries}
                      onValueChange={(val) => setPreferences({ ...preferences, visitedCountries: val })}
                      className="rounded-2xl min-h-[48px]"
                      multiselect={true}
                    />
                    <p className="text-xs text-muted-foreground">Можно оставить пустым</p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border/40">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Куда хотите поехать?</Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { value: "russia", label: "🏔 По России" },
                        { value: "cis", label: "🌿 Страны СНГ" },
                        { value: "asia", label: "⛩️ Азия" },
                        { value: "europe", label: "🏛️ Европа" },
                        { value: "middle-east", label: "🕌 Ближний Восток" },
                        { value: "americas", label: "🗽 Америка" },
                      ].map((o) => {
                        const selected = preferences.preferredDestinations.includes(o.value)
                        return (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => toggleArray("preferredDestinations", o.value)}
                            className={tile(selected)}
                          >
                            <span className={cn("font-semibold text-sm", selected ? "text-primary" : "text-foreground")}>
                              {o.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 3: Стиль ─── */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black">Стиль путешествия</h2>
                    <p className="text-muted-foreground mt-1.5">Как вы любите ездить?</p>
                  </div>

                  {/* Pace */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Темп</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "slow", label: "🌊", desc: "Расслабленный" },
                        { value: "medium", label: "⚖️", desc: "Сбалансированный" },
                        { value: "fast", label: "⚡", desc: "Активный" },
                      ].map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setPreferences({ ...preferences, pace: o.value })}
                          className={cn(
                            "flex flex-col items-center py-3.5 px-2 rounded-2xl border text-sm font-medium transition-all text-center gap-1.5",
                            preferences.pace === o.value
                              ? "border-primary bg-primary/15 shadow-[0_0_0_1px_hsl(var(--primary))]"
                              : "border-border/60 bg-white/40 dark:bg-card/40 text-muted-foreground hover:border-primary/40"
                          )}
                        >
                          <span className="text-xl">{o.label}</span>
                          <span className={cn("text-xs leading-tight", preferences.pace === o.value ? "text-primary font-semibold" : "text-muted-foreground")}>
                            {o.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accommodation */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Жильё</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "hotel-budget", label: "🏨 Эконом", desc: "Хостел / 2–3★" },
                        { value: "apartment", label: "🏠 Апартаменты", desc: "Airbnb / Квартира" },
                        { value: "hotel-luxury", label: "✨ Комфорт / Люкс", desc: "Отель 4–5★" },
                        { value: "boutique", label: "🌿 Бутик / Эко", desc: "Глэмпинг" },
                      ].map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setPreferences({ ...preferences, accommodation: o.value })}
                          className={tile(preferences.accommodation === o.value)}
                        >
                          <span className={cn("font-semibold text-sm", preferences.accommodation === o.value ? "text-primary" : "text-foreground")}>
                            {o.label}
                          </span>
                          <span className="text-xs text-muted-foreground mt-0.5">{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transport */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Транспорт <span className="normal-case font-normal text-muted-foreground/70">(можно несколько)</span>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "walk", label: "🚶 Пешком" },
                        { value: "public", label: "🚌 Общественный" },
                        { value: "taxi", label: "🚕 Такси" },
                        { value: "car", label: "🚗 Авто" },
                        { value: "bike", label: "🚲 Велосипед" },
                      ].map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => toggleArray("transport", o.value)}
                          className={chip(preferences.transport.includes(o.value))}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 4: Интересы ─── */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black">Ваши интересы</h2>
                    <p className="text-muted-foreground mt-1.5">Выберите всё, что вам откликается</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Интересы</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "museums", label: "🏛️ Музеи и искусство" },
                        { value: "nature", label: "🏔 Природа и горы" },
                        { value: "food", label: "🍽️ Гастро-туры" },
                        { value: "history", label: "📜 История" },
                        { value: "spiritual", label: "⛩️ Святые места" },
                        { value: "local", label: "🗺️ Как местный" },
                        { value: "shopping", label: "🛍️ Шоппинг" },
                        { value: "photo", label: "📸 Фото-споты" },
                        { value: "nightlife", label: "🌙 Ночная жизнь" },
                        { value: "tech", label: "🤖 Технологии" },
                      ].map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => toggleArray("interestsDetailed", o.value)}
                          className={chip(preferences.interestsDetailed.includes(o.value))}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Религия / Культура</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "none", label: "Не важно" },
                          { value: "orthodox", label: "☦️ Православие" },
                          { value: "islam", label: "☪️ Ислам" },
                          { value: "buddhism", label: "☸️ Буддизм" },
                        ].map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setPreferences({ ...preferences, religion: o.value })}
                            className={chip(preferences.religion === o.value)}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Питание</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "halal", label: "☪️ Халяль" },
                          { value: "kosher", label: "✡️ Кошерно" },
                          { value: "vegetarian", label: "🥗 Вегетарианство" },
                          { value: "vegan", label: "🌱 Веганство" },
                          { value: "keto", label: "🥩 Кето" },
                          { value: "gluten-free", label: "🌾 Без глютена" },
                        ].map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => toggleArray("dietaryRestrictions", o.value)}
                            className={chip(preferences.dietaryRestrictions.includes(o.value))}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 5: Документы ─── */}
              {step === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black">Документы и языки</h2>
                    <p className="text-muted-foreground mt-1.5">AI учтёт, куда вы можете поехать без визы.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="citizenship" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Гражданство</Label>
                      <Input
                        id="citizenship"
                        placeholder="Например: РФ"
                        value={preferences.citizenship}
                        onChange={(e) => setPreferences({ ...preferences, citizenship: e.target.value })}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Национальность <span className="normal-case font-normal text-muted-foreground/60">(опц.)</span>
                      </Label>
                      <Input
                        id="nationality"
                        placeholder="Русский"
                        value={preferences.nationality}
                        onChange={(e) => setPreferences({ ...preferences, nationality: e.target.value })}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Языки</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "ru", label: "🇷🇺 Русский" },
                        { id: "en", label: "🇬🇧 Английский" },
                        { id: "local", label: "📚 Учу местный" },
                        { id: "other", label: "🌐 Другие" },
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => toggleArray("languages", lang.label)}
                          className={chip(preferences.languages.includes(lang.label))}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Паспорта</Label>
                    <div className="flex flex-wrap gap-2">
                      {DOC_PASSPORTS.map((doc) => (
                        <button
                          key={doc.value}
                          type="button"
                          onClick={() => toggleArray("documents", doc.value)}
                          className={chip(preferences.documents.includes(doc.value))}
                        >
                          {doc.icon} {doc.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Визы <span className="normal-case font-normal text-muted-foreground/60">(если есть)</span>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {DOC_VISAS_TOP.map((doc) => (
                        <button
                          key={doc.value}
                          type="button"
                          onClick={() => toggleArray("documents", doc.value)}
                          className={chip(preferences.documents.includes(doc.value))}
                        >
                          {doc.icon} {doc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 6: Готово! ─── */}
              {step === 6 && (
                <div className="space-y-8 text-center py-4">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-gradient-to-tr from-primary to-violet-500 shadow-2xl shadow-primary/30"
                  >
                    <Sparkles className="h-10 w-10 text-white fill-white" />
                  </motion.div>

                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black">Профиль готов!</h2>
                    <p className="text-lg text-muted-foreground mt-3 max-w-sm mx-auto">
                      AI теперь знает вас лучше. Создадим ваш первый идеальный маршрут?
                    </p>
                  </div>

                  <div className="bg-muted/40 rounded-2xl p-5 text-left border border-border/50 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ваш профиль</p>
                    <div className="flex flex-wrap gap-2">
                      {preferences.pace && (
                        <Badge variant="secondary" className="rounded-full">
                          {preferences.pace === "fast" ? "⚡ Активный" : preferences.pace === "slow" ? "🌊 Размеренный" : "⚖️ Сбалансированный"}
                        </Badge>
                      )}
                      {preferences.accommodation && (
                        <Badge variant="outline" className="rounded-full border-primary/40 text-primary">
                          {preferences.accommodation === "hotel-luxury" ? "✨ Люкс" :
                            preferences.accommodation === "apartment" ? "🏠 Апартаменты" :
                            preferences.accommodation === "boutique" ? "🌿 Бутик" : "🏨 Эконом"}
                        </Badge>
                      )}
                      {preferences.visitedCountries && (
                        <Badge variant="outline" className="rounded-full">
                          🗺️ {preferences.visitedCountries.split(",")[0].trim()}...
                        </Badge>
                      )}
                      {preferences.interestsDetailed.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="rounded-full">{s}</Badge>
                      ))}
                      {!preferences.pace && !preferences.accommodation && preferences.interestsDetailed.length === 0 && (
                        <Badge variant="secondary" className="rounded-full">✈️ Готов к путешествиям</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { icon: "✈️", label: "Авиабилеты", sub: "реальные цены" },
                      { icon: "🏨", label: "Отели", sub: "из базы" },
                      { icon: "🤖", label: "AI-план", sub: "за секунды" },
                    ].map((f) => (
                      <div key={f.label} className="p-3 rounded-2xl bg-muted/50 border border-border/50">
                        <div className="text-xl mb-1">{f.icon}</div>
                        <div className="text-xs font-semibold text-foreground">{f.label}</div>
                        <div className="text-[10px] text-muted-foreground">{f.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-5 flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-12 px-5 rounded-xl border-border/60 font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="flex-1 h-12 rounded-xl text-base font-bold"
            disabled={step === 1 && !preferences.travelFrequency}
          >
            {step === totalSteps ? "Создать профиль и начать" : "Далее"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Skip link */}
        {step < totalSteps && (
          <button
            onClick={handleSkip}
            className="block mx-auto mt-4 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline-offset-2 hover:underline"
          >
            Пропустить и начать планировать →
          </button>
        )}
      </main>
    </div>
  )
}
