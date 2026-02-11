import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TripCompletedPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-xl w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>

        <h1 className="text-3xl font-bold mb-3">Спасибо, что путешествовали с нами</h1>
        <p className="text-white/70 mb-8">Ваше путешествие отмечено как завершённое. Надеемся, TraveLM сделал поездку проще и приятнее.</p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold">
            <Link href="/results">К маршрутам</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Link href="/">Главная</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
