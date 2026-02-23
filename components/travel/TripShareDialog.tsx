"use client"

import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  Download, 
  Share2, 
  Send, 
  Copy, 
  Check, 
  Instagram, 
  Smartphone,
  Quote,
  MapPin,
  Calendar,
  Zap,
  Star
} from "lucide-react"
import { toast } from "sonner"
import html2canvas from "html2canvas"
import { motion, AnimatePresence } from "framer-motion"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts"

interface TripShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripData: any
  aiStats: any
  radarData: any[]
}

export function TripShareDialog({
  open,
  onOpenChange,
  tripData,
  aiStats,
  radarData
}: TripShareDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Ссылка скопирована")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareTelegram = () => {
    const text = `Мой профиль путешественника: ${aiStats?.personality || "Исследователь"}! Посмотрите мой маршрут в ${tripData?.destination || "путешествии"}`
    const url = window.location.href
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank")
  }

  const handleDownloadImage = async () => {
    if (!cardRef.current) return
    
    setIsExporting(true)
    try {
      // Small delay to ensure everything is rendered
      await new Promise(r => setTimeout(r, 100))
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // High quality
        useCORS: true,
        backgroundColor: "#050505",
      })
      
      const link = document.createElement("a")
      link.download = `vettka-trip-${tripData?.destination || "story"}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      toast.success("Карточка сохранена")
    } catch (error) {
      console.error("Export failed:", error)
      toast.error("Не удалось создать изображение")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-white/10 bg-zinc-950 text-white p-0 overflow-hidden rounded-[2.5rem]">
        <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
          
          {/* Left: Preview Section */}
          <div className="flex-1 bg-[#050505] p-6 lg:p-10 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/5 relative overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(16,185,129,0.05),transparent)] pointer-events-none" />
            
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Smartphone className="w-3 h-3" /> Preview (9:16 Story)
            </div>

            {/* Story Card Target */}
            <div className="relative group shadow-2xl shadow-emerald-500/10">
              <div 
                ref={cardRef}
                className="w-[280px] h-[497px] bg-[#050505] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col relative"
                style={{ fontFamily: "sans-serif" }}
              >
                {/* Background effects */}
                <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-emerald-500/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-full h-[40%] bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
                
                {/* Content */}
                <div className="relative z-10 flex flex-col h-full p-6 pb-8">
                  
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">VETTKA TRAVEL</div>
                      <div className="text-lg font-black leading-tight">{tripData?.destination || "Adventure"}</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                       <Zap className="w-4 h-4 text-black fill-black" />
                    </div>
                  </div>

                  {/* Personality */}
                  <div className="mb-4">
                     <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Traveler Type</div>
                     <div className="text-xl font-black text-white">{aiStats?.personality || "Explorer"}</div>
                  </div>

                  {/* Radar Chart */}
                  <div className="h-[180px] w-full mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 8, fontWeight: 700 }} />
                        <Radar
                          name="Stats"
                          dataKey="A"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Quote */}
                  <div className="mb-auto">
                    <div className="bg-white/5 border-l border-emerald-500 p-3 rounded-r-lg relative">
                      <Quote className="absolute -top-1 -left-1 w-4 h-4 text-emerald-500/20 rotate-180" />
                      <p className="text-[10px] text-zinc-300 italic line-clamp-3">
                         {aiStats?.bestQuote || aiStats?.description || "Incredible journey through the heart of culture."}
                      </p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
                    <div className="text-center">
                      <div className="text-[10px] font-black text-white">{tripData?.itinerary?.length || 0}</div>
                      <div className="text-[6px] text-zinc-500 uppercase font-bold">Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-white">{radarData.length}</div>
                      <div className="text-[6px] text-zinc-500 uppercase font-bold">Areas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-white">100%</div>
                      <div className="text-[6px] text-zinc-500 uppercase font-bold">Vibe</div>
                    </div>
                  </div>

                  {/* QR/Call to action */}
                  <div className="mt-4 flex flex-col items-center">
                    <div className="text-[7px] font-medium text-zinc-500 uppercase tracking-widest">Create yours at vettka.app</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions Section */}
          <div className="w-full lg:w-[360px] p-8 flex flex-col justify-center gap-8 bg-zinc-900/50">
            <div>
              <h2 className="text-2xl font-black mb-3">Поделитесь моментом</h2>
              <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                Выберите один из форматов ниже, чтобы рассказать друзьям о своих приключениях.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleDownloadImage}
                disabled={isExporting}
                className="w-full h-14 bg-emerald-500 text-black hover:bg-emerald-400 font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/10"
              >
                {isExporting ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <Instagram className="w-5 h-5" />
                )}
                Скачать для Instagram / TikTok
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleShareTelegram}
                className="w-full h-14 border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-3"
              >
                <Send className="w-5 h-5 text-blue-400" />
                Отправить в Telegram
              </Button>

              <Button 
                variant="ghost"
                onClick={handleCopyLink}
                className="w-full h-14 text-zinc-400 hover:text-white hover:bg-white/5 font-bold rounded-2xl flex items-center justify-center gap-3"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                {copied ? "Скопировано" : "Копировать ссылку"}
              </Button>
            </div>

            <div className="pt-8 border-t border-white/5">
               <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                     <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tip</div>
                    <div className="text-xs text-zinc-300 font-medium leading-tight">
                      Изображение 9:16 идеально подходит для Stories.
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
