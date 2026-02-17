"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/logo"
import { ArrowRight, ArrowLeft, Sparkles, Globe, Languages, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { CityAutocomplete } from "@/components/ui/city-autocomplete"
import { motion, AnimatePresence } from "framer-motion"

const STEP_LABELS = [
  "Частота",
  "О себе",
  "Страны",
  "Регионы",
  "Питание",
  "Транспорт",
  "Жильё",
  "Темп",
  "Интересы",
  "Гражданство",
  "Документы",
  "Языки",
  "Готово",
]

const DOC_PASSPORTS = [
  { value: "ru_passport", label: "Паспорт РФ", icon: "🪪", desc: "Внутренний" },
  { value: "foreign_passport", label: "Загранпаспорт РФ", icon: "📘", desc: "Для выезда за рубеж" },
]

const DOC_VISAS = [
  { value: "schengen", label: "Шенгенская виза", icon: "🇪🇺", desc: "29 стран Европы" },
  { value: "us_visa", label: "Виза США", icon: "🇺🇸", desc: "B1/B2 (бизнес/туризм)" },
  { value: "uk_visa", label: "Виза Великобритании", icon: "🇬🇧", desc: "Standard Visitor" },
  { value: "canada_visa", label: "Виза Канады", icon: "🇨🇦", desc: "Виза посетителя (TRV)" },
  { value: "australia_visa", label: "Виза Австралии", icon: "🇦🇺", desc: "Виза (Subclass 600)" },
  { value: "japan_visa", label: "Виза Японии", icon: "🇯🇵", desc: "Туристическая" },
  { value: "korea_visa", label: "Виза Южной Кореи", icon: "🇰🇷", desc: "K-ETA (разрешение)" },
  { value: "india_evisa", label: "E-виза Индии", icon: "🇮🇳", desc: "e-Tourist Visa" },
  { value: "thailand_evisa", label: "Таиланд (Штамп/Виза)", icon: "🇹🇭", desc: "Безвиз (60 дн) или e-Visa" },
  { value: "vietnam_evisa", label: "E-виза Вьетнама", icon: "🇻🇳", desc: "90 дней (e-Visa)" },
  { value: "china_visa", label: "Виза Китая", icon: "🇨🇳", desc: "Туристическая L-виза" },
  { value: "uae_visa", label: "Виза ОАЭ", icon: "🇦🇪", desc: "Виза по прибытии" },
  { value: "saudi_visa", label: "Виза Саудовской Аравии", icon: "🇸🇦", desc: "e-Visa" },
  { value: "israel_visa", label: "Виза Израиля", icon: "🇮🇱", desc: "ETA-IL / Туристическая" },
  { value: "albania_evisa", label: "E-виза Албании", icon: "🇦🇱", desc: "Для граждан РФ" },
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

  const totalSteps = 13

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      localStorage.setItem("userPreferences", JSON.stringify(preferences))
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
          citizenship: preferences.citizenship,
          nationality: preferences.nationality,
          languages: preferences.languages,
          preferences: {
            ...preferences,
            visitedCountries: preferences.visitedCountries.split(",").map((s) => s.trim()).filter((s) => s.length > 0),
          },
        })
      }
      router.push("/plan")
    }
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

  const optionClass =
    "flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-card/50 p-4 transition-all duration-200 hover:bg-accent/50 hover:border-primary/30 active:scale-[0.98] active:bg-primary/10 has-[:checked]:border-primary has-[:checked]:bg-primary/15 has-[:checked]:shadow-[0_0_0_1px_hsl(var(--primary))]"

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
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
                      ? "h-2 w-5 bg-primary"
                      : "h-2 w-2 bg-muted-foreground/30"
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

      <main className="container max-w-2xl px-4 py-8 md:py-12">
        {/* Step label */}
        <div className="mb-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Шаг {step} · {STEP_LABELS[step - 1]}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Card className="p-6 sm:p-8 bg-card border-border rounded-3xl shadow-sm">

              {/* Step 1 — Travel frequency */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">Как часто вы путешествуете?</h2>
                    <p className="text-muted-foreground mt-2">Это поможет нам лучше понять ваш опыт.</p>
                  </div>
                  <RadioGroup
                    value={preferences.travelFrequency}
                    onValueChange={(v) => setPreferences({ ...preferences, travelFrequency: v })}
                    className="space-y-3"
                  >
                    {[
                      { value: "rarely", label: "Редко", desc: "Раз в год или реже", icon: "🌱" },
                      { value: "sometimes", label: "Иногда", desc: "2–3 раза в год", icon: "✈️" },
                      { value: "often", label: "Часто", desc: "4+ раза в год", icon: "🌍" },
                      { value: "very-often", label: "Очень часто", desc: "Путешествия — моя страсть!", icon: "🔥" },
                    ].map((option) => (
                      <Label key={option.value} htmlFor={option.value} className={optionClass}>
                        <RadioGroupItem value={option.value} id={option.value} className="border-border text-primary shrink-0" />
                        <span className="text-2xl shrink-0">{option.icon}</span>
                        <div>
                          <span className="font-semibold text-foreground block">{option.label}</span>
                          <span className="text-sm text-muted-foreground">{option.desc}</span>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Step 2 — О себе */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">О вас</h2>
                    <p className="text-muted-foreground mt-2">Поможет подобрать маршрут под ваши потребности.</p>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Пол</Label>
                      <RadioGroup
                        value={preferences.gender}
                        onValueChange={(v) => setPreferences({ ...preferences, gender: v })}
                        className="grid grid-cols-3 gap-3"
                      >
                        {[
                          { value: "male", label: "Мужской", icon: "👨" },
                          { value: "female", label: "Женский", icon: "👩" },
                          { value: "unspecified", label: "Не указываю", icon: "🤷" },
                        ].map((o) => (
                          <Label key={o.value} htmlFor={`gender-${o.value}`} className={cn(optionClass, "relative justify-center flex-col text-center py-4")}>
                            <RadioGroupItem value={o.value} id={`gender-${o.value}`} className="border-border text-primary absolute right-3 top-3" />
                            <span className="text-2xl mb-1">{o.icon}</span>
                            <span className="font-medium text-foreground text-sm">{o.label}</span>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                    <div className="space-y-3 pt-2 border-t border-border">
                      <Label htmlFor="age-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Возраст</Label>
                      <Input
                        id="age-input"
                        type="number"
                        min={10}
                        max={100}
                        placeholder="Например: 28"
                        value={preferences.age}
                        onChange={(e) => setPreferences({ ...preferences, age: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 — Visited countries */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">Где вы уже были?</h2>
                    <p className="text-muted-foreground mt-2">Перечислите страны, которые вы посетили, чтобы AI мог предложить новые места.</p>
                  </div>
                  <CityAutocomplete
                    placeholder="Турция, Египет, Таиланд, Италия..."
                    value={preferences.visitedCountries}
                    onValueChange={(val) => setPreferences({ ...preferences, visitedCountries: val })}
                    className="rounded-2xl min-h-[52px]"
                    multiselect={true}
                  />
                  <p className="text-sm text-muted-foreground">Этот шаг можно пропустить — нажмите «Далее».</p>
                </div>
              )}

              {/* Step 4 — Preferred destinations */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">География планов</h2>
                    <p className="text-muted-foreground mt-2">Куда планируете или мечтаете поехать?</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { value: "russia", label: "По России", desc: "Алтай, Сочи, Золотое кольцо…", icon: "🏔" },
                      { value: "cis", label: "Страны СНГ", desc: "Грузия, Армения, Казахстан…", icon: "🌿" },
                      { value: "asia", label: "Азия", desc: "Таиланд, Бали, Китай…", icon: "⛩️" },
                      { value: "europe", label: "Европа", desc: "Классические маршруты", icon: "🏛️" },
                      { value: "middle-east", label: "Ближний Восток", desc: "ОАЭ, Турция, Египет…", icon: "🕌" },
                      { value: "americas", label: "Америка", desc: "США, Латинская Америка…", icon: "🗽" },
                    ].map((option) => (
                      <Label key={option.value} htmlFor={`dest-${option.value}`} className={optionClass}>
                        <Checkbox
                          id={`dest-${option.value}`}
                          checked={preferences.preferredDestinations.includes(option.value)}
                          onCheckedChange={() => toggleArray("preferredDestinations", option.value)}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                        />
                        <span className="text-2xl shrink-0">{option.icon}</span>
                        <div>
                          <span className="font-semibold text-foreground block">{option.label}</span>
                          <span className="text-sm text-muted-foreground">{option.desc}</span>
                        </div>
                      </Label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5 — Special preferences */}
              {step === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">Особые предпочтения</h2>
                    <p className="text-muted-foreground mt-2">Мы учтём культурные и диетические особенности</p>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Религия / Культура</Label>
                    <RadioGroup
                      value={preferences.religion}
                      onValueChange={(v) => setPreferences({ ...preferences, religion: v })}
                      className="grid grid-cols-2 gap-3"
                    >
                      {[
                        { value: "none", label: "Не важно" },
                        { value: "orthodox", label: "Православие" },
                        { value: "islam", label: "Ислам" },
                        { value: "buddhism", label: "Буддизм" },
                      ].map((o) => (
                        <Label key={o.value} htmlFor={`rel-${o.value}`} className={cn(optionClass, "justify-start gap-3")}>
                          <RadioGroupItem value={o.value} id={`rel-${o.value}`} className="border-border text-primary" />
                          <span className="font-medium text-foreground">{o.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Питание</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "halal", label: "Халяль" },
                        { value: "kosher", label: "Кошерно" },
                        { value: "vegetarian", label: "Вегетарианство" },
                        { value: "vegan", label: "Веганство" },
                        { value: "keto", label: "Кето" },
                        { value: "gluten-free", label: "Без глютена" },
                      ].map((o) => (
                        <Label key={o.value} htmlFor={`diet-${o.value}`} className={cn(optionClass, "justify-start gap-3")}>
                          <Checkbox
                            id={`diet-${o.value}`}
                            checked={preferences.dietaryRestrictions.includes(o.value)}
                            onCheckedChange={() => toggleArray("dietaryRestrictions", o.value)}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <span className="font-medium text-foreground">{o.label}</span>
                        </Label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6 — Transport */}
              {step === 6 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">Транспорт</h2>
                    <p className="text-muted-foreground mt-2">Как вы любите передвигаться?</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { value: "walk", label: "Пешком", icon: "🚶", desc: "Много хожу" },
                      { value: "public", label: "Транспорт", icon: "🚌", desc: "Метро / Автобус" },
                      { value: "taxi", label: "Такси", icon: "🚕", desc: "Комфорт" },
                      { value: "car", label: "Авто", icon: "🚗", desc: "Аренда машины" },
                      { value: "bike", label: "Велосипед", icon: "🚲", desc: "Активность" },
                    ].map((o) => (
                      <Label key={o.value} htmlFor={`trans-${o.value}`} className={optionClass}>
                        <Checkbox
                          id={`trans-${o.value}`}
                          checked={preferences.transport.includes(o.value)}
                          onCheckedChange={() => toggleArray("transport", o.value)}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                        />
                        <span className="text-2xl shrink-0">{o.icon}</span>
                        <div>
                          <span className="font-semibold text-foreground block">{o.label}</span>
                          <span className="text-sm text-muted-foreground">{o.desc}</span>
                        </div>
                      </Label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 7 — Accommodation */}
              {step === 7 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">Жильё</h2>
                    <p className="text-muted-foreground mt-2">Где вам комфортнее всего?</p>
                  </div>
                  <RadioGroup
                    value={preferences.accommodation}
                    onValueChange={(v) => setPreferences({ ...preferences, accommodation: v })}
                    className="space-y-3"
                  >
                    {[
                      { value: "hotel-budget", label: "Эконом", icon: "🏨", desc: "Хостел / 2–3★" },
                      { value: "apartment", label: "Апартаменты", icon: "🏠", desc: "Airbnb / Квартира" },
                      { value: "hotel-luxury", label: "Комфорт / Люкс", icon: "✨", desc: "Отель 4–5★" },
                      { value: "boutique", label: "Бутик / Эко", icon: "🌿", desc: "Глэмпинг, Глэмпинг" },
                    ].map((o) => (
                      <Label key={o.value} htmlFor={`acc-${o.value}`} className={optionClass}>
                        <RadioGroupItem value={o.value} id={`acc-${o.value}`} className="border-border text-primary shrink-0" />
                        <span className="text-2xl shrink-0">{o.icon}</span>
                        <div>
                          <span className="font-semibold text-foreground block">{o.label}</span>
                          <span className="text-sm text-muted-foreground">{o.desc}</span>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Step 8 — Pace */}
              {step === 8 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">Темп путешествия</h2>
                    <p className="text-muted-foreground mt-2">Насколько насыщенным должен быть день?</p>
                  </div>
                  <RadioGroup
                    value={preferences.pace}
                    onValueChange={(v) => setPreferences({ ...preferences, pace: v })}
                    className="space-y-3"
                  >
                    {[
                      { value: "slow", label: "Спокойный", desc: "1–2 места, релакс и отдых", color: "text-blue-500", icon: "🌊" },
                      { value: "medium", label: "Сбалансированный", desc: "3–4 места, разумный темп", color: "text-emerald-500", icon: "⚖️" },
                      { value: "fast", label: "Галопом", desc: "Максимум всего, ранний подъём", color: "text-orange-500", icon: "⚡" },
                    ].map((o) => (
                      <Label
                        key={o.value}
                        htmlFor={`pace-${o.value}`}
                        className={cn(optionClass, "flex-row items-center")}
                      >
                        <RadioGroupItem value={o.value} id={`pace-${o.value}`} className="border-border text-primary shrink-0" />
                        <span className="text-2xl shrink-0">{o.icon}</span>
                        <div className="flex-1">
                          <span className={cn("font-bold block", o.color)}>{o.label}</span>
                          <span className="text-sm text-muted-foreground">{o.desc}</span>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Step 9 — Interests */}
              {step === 9 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">Интересы</h2>
                    <p className="text-muted-foreground mt-2">Выберите всё, что вам откликается</p>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {[
                      { value: "museums", label: "Музеи и Искусство", icon: "🏛️" },
                      { value: "nature", label: "Природа и Горы", icon: "🏔" },
                      { value: "food", label: "Гастро-туры", icon: "🍽️" },
                      { value: "history", label: "История", icon: "📜" },
                      { value: "spiritual", label: "Святые места", icon: "⛩️" },
                      { value: "local", label: "Как местный", icon: "🗺️" },
                      { value: "shopping", label: "Шоппинг", icon: "🛍️" },
                      { value: "photo", label: "Фото-споты", icon: "📸" },
                      { value: "nightlife", label: "Ночная жизнь", icon: "🌙" },
                      { value: "tech", label: "Технологии", icon: "🤖" },
                    ].map((o) => (
                      <Label key={o.value} htmlFor={`int-${o.value}`} className={optionClass}>
                        <Checkbox
                          id={`int-${o.value}`}
                          checked={preferences.interestsDetailed.includes(o.value)}
                          onCheckedChange={() => toggleArray("interestsDetailed", o.value)}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                        />
                        <span className="text-lg shrink-0">{o.icon}</span>
                        <span className="font-medium text-foreground text-sm">{o.label}</span>
                      </Label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 10 — Citizenship */}
              {step === 10 && (
                <div className="space-y-6">
                  <div className="h-11 w-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">Гражданство</h2>
                    <p className="text-muted-foreground mt-2">Нужно для проверки визовых требований.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="citizenship" className="text-sm font-medium">Гражданство</Label>
                      <Input
                        id="citizenship"
                        placeholder="Например: РФ"
                        value={preferences.citizenship}
                        onChange={(e) => setPreferences({ ...preferences, citizenship: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality" className="text-sm font-medium">Национальность <span className="text-muted-foreground font-normal">(опционально)</span></Label>
                      <Input
                        id="nationality"
                        placeholder="Например: Русский"
                        value={preferences.nationality}
                        onChange={(e) => setPreferences({ ...preferences, nationality: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 11 — Documents */}
              {step === 11 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">Ваши документы</h2>
                    <p className="text-muted-foreground mt-2">Какие паспорта и визы у вас есть? AI будет предлагать только доступные для вас страны.</p>
                  </div>

                  {/* Passports */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Паспорта и удостоверения</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {DOC_PASSPORTS.map((doc) => (
                        <Label key={doc.value} htmlFor={`doc-${doc.value}`} className={cn(optionClass, "relative flex-col text-center py-4 justify-center")}>
                          <Checkbox
                            id={`doc-${doc.value}`}
                            checked={preferences.documents.includes(doc.value)}
                            onCheckedChange={() => toggleArray("documents", doc.value)}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary absolute right-3 top-3"
                          />
                          <span className="text-2xl mb-1">{doc.icon}</span>
                          <span className="font-semibold text-foreground text-sm block">{doc.label}</span>
                          <span className="text-xs text-muted-foreground">{doc.desc}</span>
                        </Label>
                      ))}
                    </div>
                    {/* Other country passport */}
                    <div className="flex gap-2 items-center">
                      <span className="text-xl shrink-0">🌍</span>
                      <Input
                        placeholder="Паспорт другой страны (напр: Израиль)"
                        className="h-10 rounded-xl text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const val = e.currentTarget.value.trim()
                            if (val) {
                              const key = `passport:${val}`
                              if (!preferences.documents.includes(key)) {
                                setPreferences({ ...preferences, documents: [...preferences.documents, key] })
                              }
                              e.currentTarget.value = ''
                            }
                          }
                        }}
                      />
                    </div>
                    {/* Other country ID */}
                    <div className="flex gap-2 items-center">
                      <span className="text-xl shrink-0">🆔</span>
                      <Input
                        placeholder="ID-карта другой страны (напр: Германия)"
                        className="h-10 rounded-xl text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const val = e.currentTarget.value.trim()
                            if (val) {
                              const key = `id:${val}`
                              if (!preferences.documents.includes(key)) {
                                setPreferences({ ...preferences, documents: [...preferences.documents, key] })
                              }
                              e.currentTarget.value = ''
                            }
                          }
                        }}
                      />
                    </div>
                    {/* Show added custom passport/IDs */}
                    {preferences.documents.filter(d => d.startsWith('passport:') || d.startsWith('id:')).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {preferences.documents.filter(d => d.startsWith('passport:') || d.startsWith('id:')).map(d => (
                          <Badge key={d} variant="secondary" className="cursor-pointer rounded-full" onClick={() => setPreferences({ ...preferences, documents: preferences.documents.filter(x => x !== d) })}>
                            {d.startsWith('passport:') ? `🌍 Паспорт ${d.split(':')[1]}` : `🆔 ID ${d.split(':')[1]}`} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visas */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Визы</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DOC_VISAS.map((doc) => {
                        const checked = preferences.documents.includes(doc.value)
                        return (
                          <button
                            key={doc.value}
                            type="button"
                            onClick={() => toggleArray("documents", doc.value)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all text-left duration-200 active:scale-[0.98] ${checked ? 'border-primary bg-primary/15 shadow-[0_0_0_1px_hsl(var(--primary))]' : 'border-border bg-card/50 hover:bg-accent/50 hover:border-primary/30 active:bg-primary/10'}`}
                          >
                            <span className="text-base shrink-0">{doc.icon}</span>
                            <div className="min-w-0">
                              <span className="font-medium text-foreground text-xs block truncate">{doc.label}</span>
                              <span className="text-[10px] text-muted-foreground">{doc.desc}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {/* Custom visa input */}
                    <div className="flex gap-2 items-center">
                      <span className="text-xl shrink-0">✈️</span>
                      <Input
                        placeholder="Другая виза → Enter (напр: Албания)"
                        className="h-10 rounded-xl text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const val = e.currentTarget.value.trim()
                            if (val) {
                              const key = `visa:${val}`
                              if (!preferences.documents.includes(key)) {
                                setPreferences({ ...preferences, documents: [...preferences.documents, key] })
                              }
                              e.currentTarget.value = ''
                            }
                          }
                        }}
                      />
                    </div>
                    {preferences.documents.filter(d => d.startsWith('visa:')).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {preferences.documents.filter(d => d.startsWith('visa:')).map(d => (
                          <Badge key={d} variant="secondary" className="cursor-pointer rounded-full" onClick={() => setPreferences({ ...preferences, documents: preferences.documents.filter(x => x !== d) })}>
                            ✈️ Виза {d.split(':')[1]} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 12 — Languages */}
              {step === 12 && (
                <div className="space-y-6">
                  <div className="h-11 w-11 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                    <Languages className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground">Языки</h2>
                    <p className="text-muted-foreground mt-2">Какими языками вы владеете?</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { id: "ru", label: "Русский", icon: "🇷🇺" },
                      { id: "en", label: "Английский", icon: "🇬🇧" },
                      { id: "local", label: "Хочу учить местный", icon: "📚" },
                      { id: "other", label: "Другие языки", icon: "🌐" },
                    ].map((lang) => (
                      <Label key={lang.id} htmlFor={`lang-${lang.id}`} className={optionClass}>
                        <Checkbox
                          id={`lang-${lang.id}`}
                          checked={preferences.languages.includes(lang.label)}
                          onCheckedChange={() => toggleArray("languages", lang.label)}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                        />
                        <span className="text-xl">{lang.icon}</span>
                        <span className="font-medium text-foreground">{lang.label}</span>
                      </Label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 13 — Done */}
              {step === 13 && (
                <div className="space-y-8 text-center py-6">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-gradient-to-tr from-primary to-violet-500 shadow-2xl shadow-primary/30"
                  >
                    <Sparkles className="h-10 w-10 text-white fill-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-foreground">Профиль готов!</h2>
                    <p className="text-lg text-muted-foreground mt-3 max-w-sm mx-auto">
                      AI теперь знает вас лучше. Создадим ваш первый идеальный маршрут?
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-2xl p-5 text-left border border-border space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ваш профиль</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {preferences.pace === "fast" ? "⚡ Активный" : preferences.pace === "slow" ? "🌊 Размеренный" : "⚖️ Сбалансированный"}
                      </Badge>
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
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { icon: "✈️", label: "Авиабилеты", sub: "реальные цены" },
                      { icon: "🏨", label: "Отели", sub: "из базы" },
                      { icon: "🤖", label: "AI-план", sub: "за секунды" },
                    ].map((f) => (
                      <div key={f.label} className="p-3 rounded-2xl bg-muted/50 border border-border">
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
        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-12 px-5 rounded-xl border-border font-semibold"
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
            {step === totalSteps ? "Создать профиль" : "Далее"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Skip hint on optional steps */}
        {[2, 3, 5, 10, 11, 12].includes(step) && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            Этот шаг необязателен — можно пропустить
          </p>
        )}
      </main>
    </div>
  )
}
