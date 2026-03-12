"use client"

import { useState } from "react"
import { submitBetaFeedback } from "@/app/actions/beta-feedback"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function BetaFeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await submitBetaFeedback(formData)
      if (result.success) {
        toast.success(result.message)
        router.push("/dashboard") // Или куда-то еще после успешной отправки
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Произошла ошибка при отправке")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-3xl mx-auto my-8 bg-black/40 backdrop-blur-md border-white/10 text-white">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Опрос Бета-Тестера TraveLLM
        </CardTitle>
        <CardDescription className="text-center text-gray-300 text-lg mt-2">
          Ваше мнение критически важно для нас. Пожалуйста, ответьте на 13 вопросов, чтобы мы могли сделать сервис идеальным для ваших будущих путешествий.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Вопрос 1 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">
              1. Оцените общее впечатление от сгенерированных маршрутов (от 1 до 10) <span className="text-red-400">*</span>
            </Label>
            <RadioGroup name="rating_overall" required className="flex flex-wrap gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <div key={num} className="flex items-center space-x-2 bg-black/50 p-2 rounded-lg border border-white/10 hover:border-blue-500/50 transition-colors">
                  <RadioGroupItem value={num.toString()} id={`rating-${num}`} className="border-gray-400 text-blue-500" />
                  <Label htmlFor={`rating-${num}`} className="cursor-pointer">{num}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Вопрос 2 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">2. Насколько релевантными и интересными были предложенные места?</Label>
            <RadioGroup name="rating_places" className="flex flex-col gap-3 pt-2">
              {[
                "Отлично - 100% попадание в мои интересы",
                "Хорошо - большинство мест мне понравились",
                "Удовлетворительно - слишком банально или слишком специфично",
                "Плохо - совсем не то, что я ожидал"
              ].map((option) => (
                <div key={option} className="flex items-center space-x-3">
                  <RadioGroupItem value={option} id={`places-${option}`} className="border-gray-400 text-blue-500" />
                  <Label htmlFor={`places-${option}`} className="cursor-pointer text-gray-200">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Вопрос 3 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">3. Насколько точным оказался расчет бюджета?</Label>
            <RadioGroup name="budget_accuracy" className="flex flex-col gap-3 pt-2">
              {[
                "Очень точно - цены похожи на реальные",
                "Слегка занижен - в реальности выйдет дороже",
                "Слегка завышен - можно съездить дешевле",
                "Абсолютно нереалистичные цены",
                "Не обратил(а) внимания на бюджет"
              ].map((option) => (
                <div key={option} className="flex items-center space-x-3">
                  <RadioGroupItem value={option} id={`budget-${option}`} className="border-gray-400 text-blue-500" />
                  <Label htmlFor={`budget-${option}`} className="cursor-pointer text-gray-200">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Вопрос 4 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">
              4. Насколько удобен и понятен интерфейс сайта (UX/UI)? (от 1 до 10)
            </Label>
            <RadioGroup name="ui_rating" className="flex flex-wrap gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <div key={num} className="flex items-center space-x-2 bg-black/50 p-2 rounded-lg border border-white/10 hover:border-emerald-500/50 transition-colors">
                  <RadioGroupItem value={num.toString()} id={`ui-${num}`} className="border-gray-400 text-emerald-500" />
                  <Label htmlFor={`ui-${num}`} className="cursor-pointer">{num}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Вопрос 5 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">5. Сталкивались ли вы с техническими ошибками (багами)?</Label>
            <p className="text-sm text-gray-400">Если да, пожалуйста, опишите их подробнее (не генерировался маршрут, зависал интерфейс и т.д.)</p>
            <Textarea 
              name="bugs_encountered" 
              placeholder="Все работало отлично / Столкнулся с проблемой..." 
              className="bg-black/50 border-white/20 text-white placeholder:text-gray-500 min-h-[100px]"
            />
          </div>

          {/* Вопрос 6 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">6. Чего, по вашему мнению, больше всего не хватает в сгенерированных маршрутах?</Label>
            <Textarea 
              name="missing_features" 
              placeholder="Не хватает ссылок на покупку билетов, точного времени, карт..." 
              className="bg-black/50 border-white/20 text-white placeholder:text-gray-500 min-h-[100px]"
            />
          </div>

          {/* Вопрос 7 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">7. Насколько полезна была информация о визах, безопасности и правилах въезда? (от 1 до 5)</Label>
            <RadioGroup name="visa_info_rating" className="flex gap-4 pt-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex items-center space-x-2 bg-black/50 px-4 py-2 rounded-lg border border-white/10 hover:border-blue-500/50 transition-colors">
                  <RadioGroupItem value={num.toString()} id={`visa-${num}`} className="border-gray-400 text-blue-500" />
                  <Label htmlFor={`visa-${num}`} className="cursor-pointer">{num}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Вопрос 8 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">8. Воспользовались бы вы нашим сервисом для планирования вашей следующей реальной поездки?</Label>
            <RadioGroup name="would_use_again" className="flex flex-col gap-3 pt-2">
              {[
                "Да, обязательно",
                "Скорее да, как отправной точкой для идей",
                "Возможно, если сервис станет лучше",
                "Нет, предпочитаю планировать сам или через турагента"
              ].map((option) => (
                <div key={option} className="flex items-center space-x-3">
                  <RadioGroupItem value={option} id={`use-${option}`} className="border-gray-400 text-blue-500" />
                  <Label htmlFor={`use-${option}`} className="cursor-pointer text-gray-200">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Вопрос 9 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">9. Как вы оцениваете скорость работы сервиса (генерация маршрута)?</Label>
            <RadioGroup name="generation_speed" className="flex flex-col gap-3 pt-2">
              {[
                "Очень быстро, приятно удивлен",
                "Нормально, готов подождать ради хорошего результата",
                "Слишком долго, напрягает ожидание",
                "Сервис выдавал тайм-аут или ошибку из-за долгого ожидания"
              ].map((option) => (
                <div key={option} className="flex items-center space-x-3">
                  <RadioGroupItem value={option} id={`speed-${option}`} className="border-gray-400 text-blue-500" />
                  <Label htmlFor={`speed-${option}`} className="cursor-pointer text-gray-200">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Вопрос 10 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">
              10. Насколько удобна 3D-карта для визуализации и просмотра маршрута? (от 1 до 10)
            </Label>
            <RadioGroup name="map_convenience" className="flex flex-wrap gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <div key={num} className="flex items-center space-x-2 bg-black/50 p-2 rounded-lg border border-white/10 hover:border-emerald-500/50 transition-colors">
                  <RadioGroupItem value={num.toString()} id={`map-${num}`} className="border-gray-400 text-emerald-500" />
                  <Label htmlFor={`map-${num}`} className="cursor-pointer">{num}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Вопрос 11 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">11. Какую цену вы бы считали справедливой за месячную подписку на TraveLLM?</Label>
            <RadioGroup name="subscription_price" className="flex flex-col gap-3 pt-2">
              {[
                "До 300 рублей в месяц",
                "300 - 500 рублей в месяц",
                "500 - 1000 рублей в месяц",
                "Готов платить больше за премиум функции",
                "Предпочел бы разовую оплату за каждый сгенерированный маршрут"
              ].map((option) => (
                <div key={option} className="flex items-center space-x-3">
                  <RadioGroupItem value={option} id={`price-${option}`} className="border-gray-400 text-blue-500" />
                  <Label htmlFor={`price-${option}`} className="cursor-pointer text-gray-200">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Вопрос 12 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium">12. Как часто вы бы планировали пользоваться нашим сервисом?</Label>
            <RadioGroup name="usage_frequency" className="flex flex-col gap-3 pt-2">
              {[
                "Каждый месяц (частые поездки)",
                "Несколько раз в год (сезонные отпуска)",
                "1 раз в год (большой отпуск)",
                "Только по особым поводам"
              ].map((option) => (
                <div key={option} className="flex items-center space-x-3">
                  <RadioGroupItem value={option} id={`freq-${option}`} className="border-gray-400 text-blue-500" />
                  <Label htmlFor={`freq-${option}`} className="cursor-pointer text-gray-200">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Вопрос 13 */}
          <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <Label className="text-lg font-medium text-emerald-400">13. Ваши дополнительные идеи и предложения по улучшению TraveLLM</Label>
            <p className="text-sm text-gray-400">Любые безумные идеи, фичи, которых вам не хватает, или просто пожелания команде разработчиков.</p>
            <Textarea 
              name="additional_ideas" 
              placeholder="Было бы круто, если бы добавили..." 
              className="bg-black/50 border-white/20 text-white placeholder:text-gray-500 min-h-[150px]"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white border-0 shadow-lg shadow-blue-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Отправка отзыва...
              </>
            ) : (
              "Отправить отзыв"
            )}
          </Button>

        </form>
      </CardContent>
    </Card>
  )
}
