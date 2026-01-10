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
import { ArrowRight, ArrowLeft, Sparkles, Globe, Languages } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [preferences, setPreferences] = useState({
    travelFrequency: "",
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

  const totalSteps = 10
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
          preferences: preferences
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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl px-4 py-12 md:py-20">
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Шаг {step} из {totalSteps}</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="animate-in fade-in slide-in-from-right-4 duration-500" key={step}>
          {step === 1 && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-2 text-2xl font-bold">Как часто вы путешествуете?</h2>
              <p className="mb-6 text-muted-foreground">Это поможет нам лучше понять ваш опыт</p>
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
                    className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm"
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <span>{option.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </Card>
          )}

          {step === 2 && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-2 text-2xl font-bold">Вы планируете поездку по России или за рубеж?</h2>
              <p className="mb-6 text-muted-foreground">Ваши основные интересы по направлениям</p>
              <div className="space-y-3">
                {[
                  { value: "russia", label: "По России (Золотое кольцо, Алтай, Сочи...)" },
                  { value: "cis", label: "Страны СНГ (Грузия, Армения, Казахстан...)" },
                  { value: "asia", label: "Азия (Таиланд, Бали, Китай...)" },
                  { value: "europe", label: "Европа" },
                  { value: "middle-east", label: "Ближний Восток (ОАЭ, Турция...)" },
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`dest-${option.value}`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm"
                  >
                    <Checkbox
                      id={`dest-${option.value}`}
                      checked={preferences.preferredDestinations.includes(option.value)}
                      onCheckedChange={() => toggleArray("preferredDestinations", option.value)}
                    />
                    <span>{option.label}</span>
                  </Label>
                ))}
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-2 text-2xl font-bold">Особые предпочтения</h2>
              <p className="mb-6 text-muted-foreground">Мы учтем ваши культурные и диетические особенности</p>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Религия / Культура</Label>
                  <RadioGroup
                    value={preferences.religion}
                    onValueChange={(v) => setPreferences({ ...preferences, religion: v })}
                    className="space-y-2"
                  >
                    {[
                      { value: "none", label: "Не важно" },
                      { value: "orthodox", label: "Православие (ищу храмы, святыни)" },
                      { value: "islam", label: "Ислам (нужен халяль, мечети)" },
                      { value: "buddhism", label: "Буддизм" },
                    ].map((option) => (
                      <Label
                        key={option.value}
                        htmlFor={`rel-${option.value}`}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <RadioGroupItem value={option.value} id={`rel-${option.value}`} />
                        <span>{option.label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Питание</Label>
                  <div className="space-y-2">
                    {[
                      { value: "halal", label: "Халяль" },
                      { value: "kosher", label: "Кошерно" },
                      { value: "vegetarian", label: "Вегетарианство" },
                      { value: "vegan", label: "Веганство" },
                      { value: "keto", label: "Кето" },
                      { value: "paleo", label: "Палео" },
                      { value: "gluten-free", label: "Без глютена" },
                      { value: "nut-free", label: "Без орехов" },
                      { value: "dairy-free", label: "Без лактозы" },
                    ].map((option) => (
                      <Label
                        key={option.value}
                        htmlFor={`diet-${option.value}`}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <Checkbox
                          id={`diet-${option.value}`}
                          checked={preferences.dietaryRestrictions.includes(option.value)}
                          onCheckedChange={() => toggleArray("dietaryRestrictions", option.value)}
                        />
                        <span>{option.label}</span>
                      </Label>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {step === 4 && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-2 text-2xl font-bold">Как вы предпочитаете передвигаться?</h2>
              <p className="mb-6 text-muted-foreground">Выберите все подходящие варианты</p>
              <div className="space-y-3">
                {[
                  { value: "walk", label: "Пешком (люблю много ходить)", icon: "🚶" },
                  { value: "public", label: "Общественный транспорт", icon: "🚌" },
                  { value: "taxi", label: "Такси / Трансфер", icon: "🚕" },
                  { value: "car", label: "Аренда автомобиля", icon: "🚗" },
                  { value: "bike", label: "Велосипед / Самокат", icon: "🚲" },
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`trans-${option.value}`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      id={`trans-${option.value}`}
                      checked={preferences.transport.includes(option.value)}
                      onCheckedChange={() => toggleArray("transport", option.value)}
                    />
                    <span className="text-xl">{option.icon}</span>
                    <span>{option.label}</span>
                  </Label>
                ))}
              </div>
            </Card>
          )}

          {step === 5 && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-2 text-2xl font-bold">Тип проживания</h2>
              <p className="mb-6 text-muted-foreground">Где вам комфортнее всего?</p>
              <RadioGroup
                value={preferences.accommodation}
                onValueChange={(v) => setPreferences({ ...preferences, accommodation: v })}
                className="space-y-3"
              >
                {[
                  { value: "hotel-budget", label: "Бюджетный отель / Хостел", icon: "🏨" },
                  { value: "apartment", label: "Апартаменты / Квартира", icon: "🏠" },
                  { value: "hotel-luxury", label: "Отель 4-5 звезд", icon: "✨" },
                  { value: "boutique", label: "Бутик-отель / Глэмпинг", icon: "🌿" },
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`acc-${option.value}`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <RadioGroupItem value={option.value} id={`acc-${option.value}`} />
                    <span className="text-xl">{option.icon}</span>
                    <span>{option.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </Card>
          )}

          {step === 6 && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-2 text-2xl font-bold">Темп путешествия</h2>
              <p className="mb-6 text-muted-foreground">Насколько насыщенным должен быть день?</p>
              <RadioGroup
                value={preferences.pace}
                onValueChange={(v) => setPreferences({ ...preferences, pace: v })}
                className="space-y-3"
              >
                {[
                  { value: "slow", label: "Спокойный (1-2 места в день)", desc: "Без спешки, больше отдыха" },
                  { value: "medium", label: "Сбалансированный", desc: "3-4 места в день, разумный темп" },
                  { value: "fast", label: "Насыщенный", desc: "Хочу увидеть максимум возможного!" },
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`pace-${option.value}`}
                    className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-4 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={option.value} id={`pace-${option.value}`} />
                      <span className="font-semibold">{option.label}</span>
                    </div>
                    <span className="ml-7 text-sm text-muted-foreground">{option.desc}</span>
                  </Label>
                ))}
              </RadioGroup>
            </Card>
          )}

          {step === 7 && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-2 text-2xl font-bold">Ваши интересы (детально)</h2>
              <p className="mb-6 text-muted-foreground">Выберите все, что вам откликается</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: "museums", label: "Музеи и Искусство" },
                  { value: "nature", label: "Природа и Горы" },
                  { value: "food", label: "Гастро-туры / Рынки" },
                  { value: "history", label: "История / Архитектура" },
                  { value: "spiritual", label: "Святые места / Ретриты" },
                  { value: "local", label: "Жизнь как местный" },
                  { value: "shopping", label: "Шоппинг" },
                  { value: "photo", label: "Места для фото" },
                  { value: "kids", label: "Развлечения для детей" },
                  { value: "nightlife", label: "Бары / Ночная жизнь" },
                  { value: "tech", label: "Технологии" },
                  { value: "gaming", label: "Гейминг" },
                  { value: "science", label: "Наука" },
                  { value: "sports", label: "Спорт" },
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`int-${option.value}`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      id={`int-${option.value}`}
                      checked={preferences.interestsDetailed.includes(option.value)}
                      onCheckedChange={() => toggleArray("interestsDetailed", option.value)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </Label>
                ))}
              </div>
            </Card>
          )}

          {step === 8 && (
            <Card className="p-6 md:p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">Гражданство и Национальность</h2>
              <p className="mb-6 text-muted-foreground">Это поможет нам учитывать визовые правила и культурные нюансы</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="citizenship">Гражданство</Label>
                  <Input
                    id="citizenship"
                    placeholder="Например: РФ"
                    value={preferences.citizenship}
                    onChange={(e) => setPreferences({ ...preferences, citizenship: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Национальность / Этническая принадлежность</Label>
                  <Input
                    id="nationality"
                    placeholder="Например: Русский"
                    value={preferences.nationality}
                    onChange={(e) => setPreferences({ ...preferences, nationality: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Опционально. Помогает давать советы по кухне и безопасности.</p>
                </div>
              </div>
            </Card>
          )}

          {step === 9 && (
            <Card className="p-6 md:p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Languages className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">На каких языках вы говорите?</h2>
              <p className="mb-6 text-muted-foreground">Мы предложим места, где будет проще общаться</p>

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
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      id={`lang-${lang.id}`}
                      checked={preferences.languages.includes(lang.label)}
                      onCheckedChange={() => toggleArray("languages", lang.label)}
                    />
                    <span>{lang.label}</span>
                  </Label>
                ))}
              </div>
            </Card>
          )}

          {step === 10 && (
            <Card className="p-6 md:p-8 text-center">
              <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">Почти готово!</h2>
              <p className="mb-8 text-muted-foreground">
                Мы сохранили ваши предпочтения. Теперь ИИ будет предлагать маршруты, которые подходят именно вам.
              </p>
              <div className="space-y-4 text-left border-t pt-6">
                <p className="text-sm font-semibold">Ваш профиль путешественника:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{preferences.pace === 'fast' ? 'Активный' : preferences.pace === 'slow' ? 'Размеренный' : 'Сбалансированный'}</Badge>
                  {preferences.religion !== 'none' && <Badge variant="secondary">{preferences.religion}</Badge>}
                  {preferences.travelStyle.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
                  <Badge variant="outline" className="border-primary/50">{preferences.citizenship || "Гражданство не указано"}</Badge>
                  {preferences.languages.length > 0 && <Badge variant="outline">{preferences.languages.join(", ")}</Badge>}
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="mt-8 flex gap-4">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} className="transition-all hover:scale-105 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1 transition-all hover:scale-105" disabled={step === 1 && !preferences.travelFrequency}>
            {step === totalSteps ? "Начать планирование" : "Далее"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  )
}
