"use client"

import { useState } from "react"
import { submitBetaFeedback } from "@/app/actions/beta-feedback"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { appToast as toast } from "@/components/ui/sonner"
import { Loader2, Send, Sparkles, MessageSquareHeart } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

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
        router.push("/dashboard")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Произошла ошибка при отправке")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  }

  // Components for beautiful radio options
  const RatingScale = ({ name, max = 10, required = false, colorClass = "from-blue-500 to-cyan-500", activeColor = "border-cyan-500 bg-cyan-500/10 text-cyan-400" }: { name: string, max?: number, required?: boolean, colorClass?: string, activeColor?: string }) => (
    <RadioGroup name={name} required={required} className="flex flex-wrap gap-2 sm:gap-3 pt-4">
      {Array.from({ length: max }, (_, i) => i + 1).map((num) => (
        <div key={num} className="relative">
          <RadioGroupItem value={num.toString()} id={`${name}-${num}`} className="peer sr-only" />
          <Label 
            htmlFor={`${name}-${num}`} 
            className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-white/10 bg-white/5 cursor-pointer transition-all duration-200 ease-in-out hover:bg-white/10 hover:scale-105 peer-data-[state=checked]:${activeColor} peer-data-[state=checked]:border-2 peer-data-[state=checked]:shadow-[0_0_15px_rgba(34,211,238,0.2)] text-gray-300 peer-data-[state=checked]:font-bold text-lg`}
          >
            {num}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )

  const ChoiceList = ({ name, options, colorClass = "peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-500/10" }: { name: string, options: string[], colorClass?: string }) => (
    <RadioGroup name={name} className="grid grid-cols-1 gap-3 pt-4">
      {options.map((option, idx) => (
        <div key={idx} className="relative">
          <RadioGroupItem value={option} id={`${name}-${idx}`} className="peer sr-only" />
          <Label 
            htmlFor={`${name}-${idx}`} 
            className={`flex items-center w-full p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer transition-all duration-200 hover:bg-white/10 ${colorClass} text-gray-300 peer-data-[state=checked]:text-white`}
          >
            <div className="w-5 h-5 rounded-full border border-gray-400 mr-4 flex items-center justify-center peer-data-[state=checked]:border-transparent relative">
              {/* Fake custom radio circle for visual feedback */}
              <div className="absolute inset-0 rounded-full border-2 border-transparent peer-data-[state=checked]:border-current opacity-0 transition-opacity" />
              <div className="w-2.5 h-2.5 rounded-full bg-current opacity-0 scale-50 transition-all duration-200" />
            </div>
            {/* Real radio circle logic is handled via custom CSS or we just use simple dot */}
            <div className="flex-1 text-base">{option}</div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  )

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
      <Card className="max-w-4xl mx-auto my-8 bg-black/60 backdrop-blur-xl border border-white/10 text-white shadow-2xl overflow-hidden relative">
        {/* Glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[200px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[50%] h-[200px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

        <CardHeader className="text-center pb-8 pt-10 px-6 relative z-10">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
            <MessageSquareHeart className="w-8 h-8 text-emerald-400" />
          </div>
          <CardTitle className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-400">
            Опрос Бета-Тестера
          </CardTitle>
          <CardDescription className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Мы строим идеальный AI-навигатор для ваших путешествий. Помогите нам сделать TraveLLM безупречным, уделив всего пару минут.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 sm:px-12 pb-12 relative z-10">
          <form onSubmit={handleSubmit}>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-8"
            >
              {/* Вопрос 1 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">1</span>
                  Оцените общее впечатление от сгенерированных маршрутов <span className="text-red-400">*</span>
                </Label>
                <RatingScale name="rating_overall" required activeColor="border-blue-500 bg-blue-500/20 text-blue-300" />
              </motion.div>

              {/* Вопрос 2 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold">2</span>
                  Насколько релевантными и интересными были предложенные места?
                </Label>
                <ChoiceList 
                  name="rating_places" 
                  colorClass="peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-500/10 peer-data-[state=checked]:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  options={[
                    "Отлично - 100% попадание в мои интересы",
                    "Хорошо - большинство мест мне понравились",
                    "Удовлетворительно - слишком банально или слишком специфично",
                    "Плохо - совсем не то, что я ожидал"
                  ]} 
                />
              </motion.div>

              {/* Вопрос 3 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 text-sm font-bold">3</span>
                  Насколько точным оказался расчет бюджета?
                </Label>
                <ChoiceList 
                  name="budget_accuracy" 
                  colorClass="peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-500/10 peer-data-[state=checked]:shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                  options={[
                    "Очень точно - цены похожи на реальные",
                    "Слегка занижен - в реальности выйдет дороже",
                    "Слегка завышен - можно съездить дешевле",
                    "Абсолютно нереалистичные цены",
                    "Не обратил(а) внимания на бюджет"
                  ]} 
                />
              </motion.div>

              {/* Вопрос 4 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold">4</span>
                  Насколько удобен и понятен интерфейс сайта (UX/UI)?
                </Label>
                <RatingScale name="ui_rating" activeColor="border-purple-500 bg-purple-500/20 text-purple-300" />
              </motion.div>

              {/* Вопрос 5 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 text-sm font-bold">5</span>
                  Сталкивались ли вы с техническими ошибками (багами)?
                </Label>
                <p className="text-sm text-gray-400 pl-11 mb-4">Если да, пожалуйста, опишите их (не генерировался маршрут, зависал интерфейс и т.д.)</p>
                <div className="pl-11">
                  <Textarea 
                    name="bugs_encountered" 
                    placeholder="Все работало отлично / Столкнулся с проблемой..." 
                    className="bg-black/40 border-white/10 focus:border-rose-500/50 focus:ring-rose-500/20 text-white placeholder:text-gray-600 min-h-[120px] rounded-xl resize-y transition-all"
                  />
                </div>
              </motion.div>

              {/* Вопрос 6 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">6</span>
                  Чего, по вашему мнению, больше всего не хватает в маршрутах?
                </Label>
                <div className="pl-11 mt-4">
                  <Textarea 
                    name="missing_features" 
                    placeholder="Не хватает ссылок на билеты, больше фото, интеграции с календарем..." 
                    className="bg-black/40 border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20 text-white placeholder:text-gray-600 min-h-[120px] rounded-xl resize-y transition-all"
                  />
                </div>
              </motion.div>

              {/* Вопрос 7 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 text-sm font-bold">7</span>
                  Полезна ли была информация о визах и правилах въезда?
                </Label>
                <RatingScale name="visa_info_rating" max={5} activeColor="border-teal-500 bg-teal-500/20 text-teal-300" />
              </motion.div>

              {/* Вопрос 8 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold">8</span>
                  Воспользовались бы вы сервисом для реальной поездки?
                </Label>
                <ChoiceList 
                  name="would_use_again" 
                  colorClass="peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:bg-indigo-500/10 peer-data-[state=checked]:shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                  options={[
                    "Да, обязательно",
                    "Скорее да, как отправной точкой для идей",
                    "Возможно, если сервис станет лучше",
                    "Нет, предпочитаю планировать сам или через турагента"
                  ]} 
                />
              </motion.div>

              {/* Вопрос 9 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold">9</span>
                  Как вы оцениваете скорость генерации маршрута?
                </Label>
                <ChoiceList 
                  name="generation_speed" 
                  colorClass="peer-data-[state=checked]:border-cyan-500 peer-data-[state=checked]:bg-cyan-500/10 peer-data-[state=checked]:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  options={[
                    "Очень быстро, приятно удивлен",
                    "Нормально, готов подождать ради хорошего результата",
                    "Слишком долго, напрягает ожидание",
                    "Сервис выдавал тайм-аут или ошибку из-за долгого ожидания"
                  ]} 
                />
              </motion.div>

              {/* Вопрос 10 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-fuchsia-500/20 text-fuchsia-400 text-sm font-bold">10</span>
                  Насколько удобна 3D-карта для визуализации маршрута?
                </Label>
                <RatingScale name="map_convenience" activeColor="border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-300" />
              </motion.div>

              {/* Вопрос 11 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-400 text-sm font-bold">11</span>
                  Какую цену вы считаете справедливой за подписку на TraveLLM?
                </Label>
                <ChoiceList 
                  name="subscription_price" 
                  colorClass="peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-500/10 peer-data-[state=checked]:shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                  options={[
                    "До 300 рублей в месяц",
                    "300 - 500 рублей в месяц",
                    "500 - 1000 рублей в месяц",
                    "Готов платить больше за премиум функции",
                    "Предпочел бы разовую оплату за каждый сгенерированный маршрут"
                  ]} 
                />
              </motion.div>

              {/* Вопрос 12 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <Label className="text-xl font-medium flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 text-sm font-bold">12</span>
                  Как часто вы бы планировали пользоваться сервисом?
                </Label>
                <ChoiceList 
                  name="usage_frequency" 
                  colorClass="peer-data-[state=checked]:border-sky-500 peer-data-[state=checked]:bg-sky-500/10 peer-data-[state=checked]:shadow-[0_0_15px_rgba(14,165,233,0.15)]"
                  options={[
                    "Каждый месяц (частые поездки)",
                    "Несколько раз в год (сезонные отпуска)",
                    "1 раз в год (большой отпуск)",
                    "Только по особым поводам"
                  ]} 
                />
              </motion.div>

              {/* Вопрос 13 */}
              <motion.div variants={itemVariants} className="group p-6 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-24 h-24" /></div>
                <Label className="text-xl font-medium flex items-center gap-3 mb-2 text-emerald-400 relative z-10">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-bold">13</span>
                  Ваши смелые идеи и предложения
                </Label>
                <p className="text-sm text-gray-400 pl-11 mb-4 relative z-10">Любые безумные фичи, которых вам не хватает, или просто пожелания команде.</p>
                <div className="pl-11 relative z-10">
                  <Textarea 
                    name="additional_ideas" 
                    placeholder="Было бы круто, если бы добавили..." 
                    className="bg-black/60 border-emerald-500/20 focus:border-emerald-500 focus:ring-emerald-500/20 text-white placeholder:text-gray-500 min-h-[160px] rounded-xl resize-y transition-all text-base"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="pt-6">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-16 sm:h-20 text-xl font-bold rounded-2xl bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-500 hover:from-blue-500 hover:via-emerald-400 hover:to-teal-400 text-white border-0 shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                  <span className="relative z-10 flex items-center justify-center">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        Сохраняем...
                      </>
                    ) : (
                      <>
                        Отправить отзыв
                        <Send className="ml-3 h-6 w-6" />
                      </>
                    )}
                  </span>
                </Button>
                <p className="text-center text-sm text-gray-500 mt-6 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500/70" />
                  Спасибо, что помогаете создавать будущее путешествий
                  <Sparkles className="w-4 h-4 text-emerald-500/70" />
                </p>
              </motion.div>

            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}

