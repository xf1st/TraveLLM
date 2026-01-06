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
import { ArrowRight, ArrowLeft } from "lucide-react"

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
  })

  const progress = (step / 5) * 100

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1)
    } else {
      localStorage.setItem("userPreferences", JSON.stringify(preferences))
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
            <span className="text-muted-foreground">Шаг {step} из 5</span>
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
              <h2 className="mb-2 text-2xl font-bold">Куда вы любите ездить?</h2>
              <p className="mb-6 text-muted-foreground">Выберите всё, что интересно (можно несколько)</p>
              <div className="space-y-3">
                {[
                  { value: "russia", label: "По России" },
                  { value: "cis", label: "Страны СНГ" },
                  { value: "asia", label: "Азия" },
                  { value: "europe", label: "Европа" },
                  { value: "middle-east", label: "Ближний Восток" },
                  { value: "africa", label: "Африка" },
                  { value: "americas", label: "Америка" },
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
              <h2 className="mb-2 text-2xl font-bold">Есть ли у вас особые предпочтения?</h2>
              <p className="mb-6 text-muted-foreground">Религия и питание (по желанию)</p>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Религия</Label>
                  <RadioGroup
                    value={preferences.religion}
                    onValueChange={(v) => setPreferences({ ...preferences, religion: v })}
                    className="space-y-2"
                  >
                    {[
                      { value: "none", label: "Не важно" },
                      { value: "orthodox", label: "Православие" },
                      { value: "islam", label: "Ислам" },
                      { value: "buddhism", label: "Буддизм" },
                      { value: "other", label: "Другое" },
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
                  <Label className="text-base font-semibold">Предпочтения в питании</Label>
                  <div className="space-y-2">
                    {[
                      { value: "halal", label: "Халяль" },
                      { value: "vegetarian", label: "Вегетарианство" },
                      { value: "vegan", label: "Веганство" },
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
              <h2 className="mb-2 text-2xl font-bold">Какой бюджет вам комфортен?</h2>
              <p className="mb-6 text-muted-foreground">Примерный бюджет на неделю путешествия</p>
              <RadioGroup
                value={preferences.budgetPreference}
                onValueChange={(v) => setPreferences({ ...preferences, budgetPreference: v })}
                className="space-y-3"
              >
                {[
                  { value: "economy", label: "Эконом", desc: "До ₽30,000/неделя", icon: "💰" },
                  { value: "comfort", label: "Комфорт", desc: "₽30,000-70,000/неделя", icon: "✨" },
                  { value: "premium", label: "Премиум", desc: "От ₽70,000/неделя", icon: "🌟" },
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`budget-${option.value}`}
                    className="flex cursor-pointer items-center gap-4 rounded-lg border-2 border-border p-4 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm"
                  >
                    <RadioGroupItem value={option.value} id={`budget-${option.value}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{option.icon}</span>
                        <span className="font-semibold">{option.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{option.desc}</span>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </Card>
          )}

          {step === 5 && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-2 text-2xl font-bold">Что вы больше всего любите?</h2>
              <p className="mb-6 text-muted-foreground">Выберите интересы (можно несколько)</p>
              <div className="space-y-2">
                {[
                  { value: "culture", label: "Культура и история", icon: "🏛️" },
                  { value: "nature", label: "Природа и пешие походы", icon: "🏔️" },
                  { value: "food", label: "Гастрономия", icon: "🍽️" },
                  { value: "beach", label: "Пляжный отдых", icon: "🏖️" },
                  { value: "adventure", label: "Активные приключения", icon: "🎿" },
                  { value: "photography", label: "Фотография", icon: "📸" },
                  { value: "shopping", label: "Шоппинг", icon: "🛍️" },
                  { value: "nightlife", label: "Ночная жизнь", icon: "🎉" },
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`style-${option.value}`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm"
                  >
                    <Checkbox
                      id={`style-${option.value}`}
                      checked={preferences.travelStyle.includes(option.value)}
                      onCheckedChange={() => toggleArray("travelStyle", option.value)}
                    />
                    <span className="text-xl">{option.icon}</span>
                    <span>{option.label}</span>
                  </Label>
                ))}
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
          <Button onClick={handleNext} className="flex-1 transition-all hover:scale-105">
            {step === 5 ? "Завершить" : "Далее"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  )
}
