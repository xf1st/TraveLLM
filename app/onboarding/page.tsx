"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, ArrowLeft, Sparkles, Globe, Languages, MapPin, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { CityAutocomplete } from "@/components/ui/city-autocomplete"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [preferences, setPreferences] = useState({
    travelFrequency: "",
    visitedCountries: "", // New Field
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
    languages: [] as string[],
  })

  const totalSteps = 11 // Increased from 10
  const progress = (step / totalSteps) * 100

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      localStorage.setItem("userPreferences", JSON.stringify(preferences))

      // Sync to Supabase if logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
          citizenship: preferences.citizenship,
          nationality: preferences.nationality,
          languages: preferences.languages,
          preferences: {
            ...preferences,
            visitedCountries: preferences.visitedCountries.split(',').map(s => s.trim()).filter(s => s.length > 0)
          }
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

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-900 to-black pointer-events-none" />

      <Header />

      <main className="container relative z-10 max-w-2xl px-4 py-12 md:py-20">
        <div className="mb-8 space-y-2">
          <div className="flex items-center justify-between text-sm font-medium text-zinc-400">
            <span>Шаг {step} из {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-zinc-800" indicatorClassName="bg-gradient-to-r from-blue-500 to-emerald-500" />
        </div>

        <div className="animate-in fade-in slide-in-from-right-8 duration-500" key={step}>
          {/* WRAPPER CARD STYLE */}
          <Card className="p-8 bg-zinc-900/50 backdrop-blur-xl border-white/5 shadow-2xl rounded-[2.5rem]">

            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black text-white">Как часто вы путешествуете?</h2>
                <p className="text-zinc-400 text-lg">Это поможет нам лучше понять ваш опыт.</p>
                <RadioGroup
                  value={preferences.travelFrequency}
                  onValueChange={(v) => setPreferences({ ...preferences, travelFrequency: v })}
                  className="space-y-3"
                >
                  {[
                    { value: "rarely", label: "Редко (раз в год или реже)" },
                    { value: "sometimes", label: "Иногда (2-3 раза в год)" },
                    { value: "often", label: "Часто (4+ раза в год)" },
                    { value: "very-often", label: "Очень часто (путешествия — моя страсть!)" },
                  ].map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={option.value}
                      className="flex cursor-pointer items-center gap-4 rounded-2xl border border-white/5 bg-zinc-800/30 p-5 transition-all hover:bg-white/5 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10 has-[:checked]:shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="border-white/20 text-primary" />
                      <span className="text-lg font-medium">{option.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* NEW STEP: Visited Countries */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                  <Globe className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black text-white">Где вы уже были?</h2>
                <p className="text-zinc-400 text-lg">Перечислите страны, которые вы уже посетили, чтобы мы не предлагали их снова (или предлагали новые места в них).</p>

                <CityAutocomplete
                  placeholder="Например: Турция, Египет, Тайланд, Италия, Франция..."
                  value={preferences.visitedCountries}
                  onValueChange={(val) => setPreferences({ ...preferences, visitedCountries: val })}
                  className="bg-zinc-800/50 border-white/10 text-lg rounded-2xl min-h-[56px]"
                  multiselect={true}
                />
                <p className="text-sm text-zinc-500">Выберите города или страны, в которых вы уже побывали.</p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black text-white">География планов</h2>
                <p className="text-zinc-400 text-lg">Куда планируете или мечтаете поехать в ближайшее время?</p>
                <div className="space-y-3">
                  {[
                    { value: "russia", label: "По России (Золотое кольцо, Алтай, Сочи...)" },
                    { value: "cis", label: "Страны СНГ (Грузия, Армения, Казахстан...)" },
                    { value: "asia", label: "Азия (Таиланд, Бали, Китай...)" },
                    { value: "europe", label: "Европа" },
                    { value: "middle-east", label: "Ближний Восток (ОАЭ, Турция...)" },
                    { value: "americas", label: "Америка (США, Латинская Америка)" }, // Added Americas
                  ].map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`dest-${option.value}`}
                      className="flex cursor-pointer items-center gap-4 rounded-2xl border border-white/5 bg-zinc-800/30 p-5 transition-all hover:bg-white/5 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"
                    >
                      <Checkbox
                        id={`dest-${option.value}`}
                        checked={preferences.preferredDestinations.includes(option.value)}
                        onCheckedChange={() => toggleArray("preferredDestinations", option.value)}
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <span className="text-lg font-medium">{option.label}</span>
                    </Label>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black text-white">Особые предпочтения</h2>
                <p className="text-zinc-400 text-lg">Мы учтем ваши культурные и диетические особенности</p>

                <div className="space-y-4">
                  <Label className="text-base font-bold uppercase tracking-wider text-zinc-500">Религия / Культура</Label>
                  <RadioGroup
                    value={preferences.religion}
                    onValueChange={(v) => setPreferences({ ...preferences, religion: v })}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {[
                      { value: "none", label: "Не важно" },
                      { value: "orthodox", label: "Православие" },
                      { value: "islam", label: "Ислам" },
                      { value: "buddhism", label: "Буддизм" },
                    ].map((option) => (
                      <Label
                        key={option.value}
                        htmlFor={`rel-${option.value}`}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 p-4 transition-all hover:bg-white/5 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"
                      >
                        <RadioGroupItem value={option.value} id={`rel-${option.value}`} className="border-white/20 text-primary" />
                        <span>{option.label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <Label className="text-base font-bold uppercase tracking-wider text-zinc-500">Питание</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { value: "halal", label: "Халяль" },
                      { value: "kosher", label: "Кошерно" },
                      { value: "vegetarian", label: "Вегетарианство" },
                      { value: "vegan", label: "Веганство" },
                      { value: "keto", label: "Кето" },
                      { value: "gluten-free", label: "Без глютена" },
                    ].map((option) => (
                      <Label
                        key={option.value}
                        htmlFor={`diet-${option.value}`}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 p-4 transition-all hover:bg-white/5 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"
                      >
                        <Checkbox
                          id={`diet-${option.value}`}
                          checked={preferences.dietaryRestrictions.includes(option.value)}
                          onCheckedChange={() => toggleArray("dietaryRestrictions", option.value)}
                          className="border-white/20 data-[state=checked]:bg-primary"
                        />
                        <span>{option.label}</span>
                      </Label>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black text-white">Транспорт</h2>
                <p className="text-zinc-400 text-lg">Как вы любите передвигаться?</p>
                <div className="space-y-3">
                  {[
                    { value: "walk", label: "Пешком", icon: "🚶", desc: "Много хожу" },
                    { value: "public", label: "Транспорт", icon: "🚌", desc: "Метро/Автобус" },
                    { value: "taxi", label: "Такси", icon: "🚕", desc: "Комфорт" },
                    { value: "car", label: "Авто", icon: "🚗", desc: "Аренда" },
                    { value: "bike", label: "Вело", icon: "🚲", desc: "Активность" },
                  ].map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`trans-${option.value}`}
                      className="flex cursor-pointer items-center gap-4 rounded-2xl border border-white/5 bg-zinc-800/30 p-4 transition-all hover:bg-white/5 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"
                    >
                      <Checkbox
                        id={`trans-${option.value}`}
                        checked={preferences.transport.includes(option.value)}
                        onCheckedChange={() => toggleArray("transport", option.value)}
                        className="border-white/20 data-[state=checked]:bg-primary"
                      />
                      <span className="text-2xl">{option.icon}</span>
                      <div className="flex flex-col">
                        <span className="font-bold">{option.label}</span>
                        <span className="text-xs text-zinc-500">{option.desc}</span>
                      </div>
                    </Label>
                  ))}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black text-white">Жилье</h2>
                <p className="text-zinc-400 text-lg">Где вам комфортнее всего?</p>
                <RadioGroup
                  value={preferences.accommodation}
                  onValueChange={(v) => setPreferences({ ...preferences, accommodation: v })}
                  className="space-y-3"
                >
                  {[
                    { value: "hotel-budget", label: "Эконом", icon: "🏨", desc: "Хостел / 2-3*" },
                    { value: "apartment", label: "Апартаменты", icon: "🏠", desc: "Airbnb / Квартира" },
                    { value: "hotel-luxury", label: "Комфорт/Люкс", icon: "✨", desc: "Отель 4-5*" },
                    { value: "boutique", label: "Бутик/Эко", icon: "🌿", desc: "Глэмпинг" },
                  ].map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`acc-${option.value}`}
                      className="flex cursor-pointer items-center gap-4 rounded-2xl border border-white/5 bg-zinc-800/30 p-4 transition-all hover:bg-white/5 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"
                    >
                      <RadioGroupItem value={option.value} id={`acc-${option.value}`} className="border-white/20 text-primary" />
                      <span className="text-2xl">{option.icon}</span>
                      <div className="flex flex-col">
                        <span className="font-bold">{option.label}</span>
                        <span className="text-xs text-zinc-500">{option.desc}</span>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black text-white">Темп</h2>
                <p className="text-zinc-400 text-lg">Насколько насыщенным должен быть день?</p>
                <RadioGroup
                  value={preferences.pace}
                  onValueChange={(v) => setPreferences({ ...preferences, pace: v })}
                  className="space-y-3"
                >
                  {[
                    { value: "slow", label: "Спокойный", desc: "1-2 места, релакс, сон", color: "text-blue-400" },
                    { value: "medium", label: "Сбалансированный", desc: "3-4 места, разумный темп", color: "text-emerald-400" },
                    { value: "fast", label: "Галопом", desc: "Максимум всего, ранний подъем", color: "text-orange-400" },
                  ].map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`pace-${option.value}`}
                      className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-white/5 bg-zinc-800/30 p-5 transition-all hover:bg-white/5 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={cn("text-xl font-black", option.color)}>{option.label}</span>
                        <RadioGroupItem value={option.value} id={`pace-${option.value}`} className="border-white/20 text-primary" />
                      </div>
                      <span className="text-base text-zinc-400">{option.desc}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {step === 8 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-black text-white">Интересы</h2>
                <p className="text-zinc-400 text-lg">Выберите все, что вам откликается</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { value: "museums", label: "Музеи и Искусство" },
                    { value: "nature", label: "Природа и Горы" },
                    { value: "food", label: "Гастро-туры" },
                    { value: "history", label: "История" },
                    { value: "spiritual", label: "Святые места" },
                    { value: "local", label: "Как местный" },
                    { value: "shopping", label: "Шоппинг" },
                    { value: "photo", label: "Фото-споты" },
                    { value: "nightlife", label: "Ночная жизнь" },
                    { value: "tech", label: "Технологии" },
                  ].map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`int-${option.value}`}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 p-4 transition-all hover:bg-white/5 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"
                    >
                      <Checkbox
                        id={`int-${option.value}`}
                        checked={preferences.interestsDetailed.includes(option.value)}
                        onCheckedChange={() => toggleArray("interestsDetailed", option.value)}
                        className="border-white/20 data-[state=checked]:bg-primary"
                      />
                      <span className="text-sm font-medium">{option.label}</span>
                    </Label>
                  ))}
                </div>
              </div>
            )}

            {step === 9 && (
              <div className="space-y-6">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
                  <Globe className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-black text-white">Гражданство</h2>
                <p className="text-zinc-400 text-lg">Для проверки визовых требований.</p>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="citizenship" className="text-zinc-400">Гражданство</Label>
                    <Input
                      id="citizenship"
                      placeholder="Например: РФ"
                      value={preferences.citizenship}
                      onChange={(e) => setPreferences({ ...preferences, citizenship: e.target.value })}
                      className="h-14 bg-zinc-800/50 border-white/10 rounded-xl text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality" className="text-zinc-400">Национальность (опционально)</Label>
                    <Input
                      id="nationality"
                      placeholder="Например: Русский"
                      value={preferences.nationality}
                      onChange={(e) => setPreferences({ ...preferences, nationality: e.target.value })}
                      className="h-14 bg-zinc-800/50 border-white/10 rounded-xl text-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 10 && (
              <div className="space-y-6">
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4">
                  <Languages className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-black text-white">Языки</h2>
                <p className="text-zinc-400 text-lg">Какими языками владеете?</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { id: "ru", label: "Русский" },
                    { id: "en", label: "Английский" },
                    { id: "local", label: "Хочу учить местный" },
                    { id: "other", label: "Другие языки" },
                  ].map((lang) => (
                    <Label
                      key={lang.id}
                      htmlFor={`lang-${lang.id}`}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 p-4 transition-all hover:bg-white/5 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"
                    >
                      <Checkbox
                        id={`lang-${lang.id}`}
                        checked={preferences.languages.includes(lang.label)}
                        onCheckedChange={() => toggleArray("languages", lang.label)}
                        className="border-white/20 data-[state=checked]:bg-primary"
                      />
                      <span>{lang.label}</span>
                    </Label>
                  ))}
                </div>
              </div>
            )}

            {step === 11 && (
              <div className="space-y-8 text-center py-8">
                <div className="mx-auto h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-purple-600 flex shadow-2xl shadow-primary/30 animate-in zoom-in duration-500">
                  <Sparkles className="h-10 w-10 text-white fill-white" />
                </div>
                <div>
                  <h2 className="mb-3 text-4xl font-black text-white">Профиль готов!</h2>
                  <p className="text-xl text-zinc-400 max-w-md mx-auto">
                    ИИ теперь знает вас лучше. Создадим ваше первое идеальное путешествие?
                  </p>
                </div>

                <div className="bg-zinc-800/50 rounded-2xl p-6 text-left border border-white/5 space-y-3">
                  <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">Ваш профиль:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-zinc-700 hover:bg-zinc-600 px-3 py-1 text-sm">{preferences.pace === 'fast' ? 'Активный' : preferences.pace === 'slow' ? 'Размеренный' : 'Сбалансированный'}</Badge>
                    {preferences.visitedCountries && <Badge variant="outline" className="border-primary/50 text-primary px-3 py-1">Были в: {preferences.visitedCountries.split(',')[0]}...</Badge>}
                    {preferences.travelStyle.slice(0, 3).map(s => <Badge key={s} variant="secondary" className="bg-white/10 text-zinc-300">{s}</Badge>)}
                  </div>
                </div>
              </div>
            )}

          </Card> {/* End Wrapper Card */}
        </div>

        <div className="mt-8 flex gap-4">
          {step > 1 && (
            <Button variant="ghost" onClick={handleBack} className="text-zinc-400 hover:text-white hover:bg-white/5">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1 h-12 rounded-full text-lg font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:scale-[1.02]" disabled={step === 1 && !preferences.travelFrequency}>
            {step === totalSteps ? "Начать планирование" : "Далее"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  )
}
