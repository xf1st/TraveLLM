import { BetaFeedbackForm } from "@/components/BetaFeedbackForm"
import { GlobalBackground } from "@/components/GlobalBackground"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Опрос для бета-тестеров | TraveLLM",
  description: "Помогите нам улучшить TraveLLM, ответив на несколько вопросов.",
}

export default function BetaFeedbackPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <GlobalBackground />
      <div className="container relative z-10 mx-auto px-4 py-12 md:py-24">
        <div className="max-w-3xl mx-auto mb-8">
          <BetaFeedbackForm />
        </div>
      </div>
    </div>
  )
}
