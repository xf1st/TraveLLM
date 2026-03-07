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
  Star,
  Moon,
  Sun,
  Camera,
  BarChart2
} from "lucide-react"
import { toast } from "sonner"
import { toPng } from "html-to-image"
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
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [storyType, setStoryType] = useState<"stats" | "photos">("stats")

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
      
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2, // High quality
        skipFonts: true, // Bypass cross-origin font/stylesheet issues
        style: {
          backgroundColor: theme === "dark" ? "#050505" : "#ffffff",
        }
      })
      
      const link = document.createElement("a")
      link.download = `travellm-trip-${tripData?.destination || "story"}.png`
      link.href = dataUrl
      link.click()
      toast.success("Карточка сохранена")
    } catch (error) {
      console.error("Export failed:", error)
      toast.error("Не удалось создать изображение")
    } finally {
      setIsExporting(false)
    }
  }

  const memoryPhotos = tripData?.memory_photos || []
  const displayPhotos = memoryPhotos.slice(0, 4)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-white/10 bg-zinc-950 text-white p-0 overflow-y-auto max-h-[90vh] rounded-[2.5rem]">
        <DialogTitle className="sr-only">Поделиться профилем</DialogTitle>
        <div className="flex flex-col lg:flex-row">

          {/* Left: Preview Section */}
          <div className="flex-1 bg-[#050505] p-4 sm:p-6 lg:p-10 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/5 relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(16,185,129,0.05),transparent)] pointer-events-none" />
            
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Smartphone className="w-3 h-3" /> Preview (9:16 Story)
            </div>

            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-20 flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full bg-zinc-900 border-white/10 text-white hover:bg-zinc-800 h-8 w-8"
                title="Toggle UI Theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>

            {/* Story Card Target */}
            <div className="relative group shadow-md md:shadow-2xl shadow-emerald-500/10">
              <div
                ref={cardRef}
                className={`w-[220px] h-[391px] sm:w-[280px] sm:h-[497px] ${theme === 'dark' ? 'bg-[#050505]' : 'bg-white'} border ${theme === 'dark' ? 'border-white/10' : 'border-zinc-200'} rounded-[2rem] overflow-hidden flex flex-col relative`}
                style={{ fontFamily: "sans-serif" }}
              >
                {/* Background effects */}
                <div className={`absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b ${theme === 'dark' ? 'from-emerald-500/20' : 'from-emerald-500/10'} to-transparent pointer-events-none`} />
                <div className={`absolute bottom-0 right-0 w-full h-[40%] bg-gradient-to-t ${theme === 'dark' ? 'from-emerald-500/10' : 'from-emerald-500/5'} to-transparent pointer-events-none`} />
                
                {storyType === "stats" ? (
                  /* STATS VARIANT */
                  <div className="relative z-10 flex flex-col h-full p-4 sm:p-6 pb-6 sm:pb-8">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">TRAVELLM</div>
                        <div className={`text-lg font-black leading-tight ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{tripData?.destination || "Adventure"}</div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                         <Zap className="w-4 h-4 text-black fill-black" />
                      </div>
                    </div>

                    {/* Personality */}
                    <div className="mb-4">
                       <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Traveler Type</div>
                       <div className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{aiStats?.personality || "Explorer"}</div>
                    </div>

                    {/* Radar Chart */}
                    <div className="h-[120px] sm:h-[180px] w-full mb-3 sm:mb-4">
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
                      <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-emerald-50'} border-l border-emerald-500 p-3 rounded-r-lg relative`}>
                        <Quote className="absolute -top-1 -left-1 w-4 h-4 text-emerald-500/20 rotate-180" />
                        <p className={`text-[10px] ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'} italic line-clamp-3`}>
                           {aiStats?.bestQuote || aiStats?.description || "Incredible journey through the heart of culture."}
                        </p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className={`grid grid-cols-3 gap-2 mt-4 pt-4 border-t ${theme === 'dark' ? 'border-white/5' : 'border-zinc-200'}`}>
                      <div className="text-center">
                        <div className={`text-[10px] font-black ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{tripData?.itinerary?.length || 0}</div>
                        <div className="text-[6px] text-zinc-500 uppercase font-bold">Days</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-[10px] font-black ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{radarData.length}</div>
                        <div className="text-[6px] text-zinc-500 uppercase font-bold">Areas</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-[10px] font-black ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>100%</div>
                        <div className="text-[6px] text-zinc-500 uppercase font-bold">Vibe</div>
                      </div>
                    </div>

                    {/* QR/Call to action */}
                    <div className="mt-4 flex flex-col items-center">
                      <div className="text-[7px] font-medium text-zinc-500 uppercase tracking-widest">Create yours at TraveLLM.ru</div>
                    </div>
                  </div>
                ) : (
                  /* PHOTOS VARIANT */
                  <div className="relative z-10 flex flex-col h-full p-4 sm:p-5">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                      <div>
                        <div className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-0.5">Memories</div>
                        <div className="text-sm font-black leading-tight text-white uppercase italic">{tripData?.destination || "Adventure"}</div>
                      </div>
                      <Camera className="w-5 h-5 text-emerald-400" />
                    </div>

                    {/* Photo Collage */}
                    <div className="flex-1 w-full rounded-2xl overflow-hidden relative mb-4">
                      {displayPhotos.length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/50 border border-white/10 rounded-2xl">
                          <Camera className="w-8 h-8 text-zinc-600 mb-2" />
                          <span className="text-[10px] text-zinc-500 font-medium">Нет загруженных фото</span>
                        </div>
                      ) : displayPhotos.length === 1 ? (
                        <img src={displayPhotos[0]} alt="" className="w-full h-full object-cover rounded-2xl" />
                      ) : displayPhotos.length === 2 ? (
                        <div className="flex flex-col h-full gap-2">
                          <img src={displayPhotos[0]} alt="" className="w-full h-1/2 object-cover rounded-2xl" />
                          <img src={displayPhotos[1]} alt="" className="w-full h-1/2 object-cover rounded-2xl" />
                        </div>
                      ) : displayPhotos.length === 3 ? (
                        <div className="flex flex-col h-full gap-2">
                          <img src={displayPhotos[0]} alt="" className="w-full h-1/2 object-cover rounded-2xl" />
                          <div className="flex w-full h-1/2 gap-2">
                            <img src={displayPhotos[1]} alt="" className="w-1/2 h-full object-cover rounded-2xl" />
                            <img src={displayPhotos[2]} alt="" className="w-1/2 h-full object-cover rounded-2xl" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 grid-rows-2 h-full gap-2">
                          <img src={displayPhotos[0]} alt="" className="w-full h-full object-cover rounded-2xl" />
                          <img src={displayPhotos[1]} alt="" className="w-full h-full object-cover rounded-2xl" />
                          <img src={displayPhotos[2]} alt="" className="w-full h-full object-cover rounded-2xl" />
                          <img src={displayPhotos[3]} alt="" className="w-full h-full object-cover rounded-2xl" />
                        </div>
                      )}
                    </div>

                    {/* Footer Info */}
                    <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} border ${theme === 'dark' ? 'border-white/10' : 'border-black/10'} flex justify-between items-center`}>
                       <div className="flex gap-3">
                         <div>
                           <div className="text-[7px] text-zinc-500 uppercase font-bold">Дней</div>
                           <div className={`text-xs font-black ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{tripData?.itinerary?.length || 0}</div>
                         </div>
                         <div>
                           <div className="text-[7px] text-zinc-500 uppercase font-bold">Фото</div>
                           <div className={`text-xs font-black ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{memoryPhotos.length}</div>
                         </div>
                       </div>
                       <div className="text-[7px] font-black text-emerald-500 uppercase tracking-[0.2em] text-right">
                         TraveLLM.ru
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions Section */}
          <div className="w-full lg:w-[360px] p-6 sm:p-8 flex flex-col justify-start lg:justify-center gap-6 sm:gap-8 bg-zinc-900/50">
            <div>
              <h2 className="text-2xl font-black mb-3">Поделитесь моментом</h2>
              <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                Выберите один из форматов ниже, чтобы рассказать друзьям о своих приключениях.
              </p>
            </div>

            {/* Template Toggle */}
            <div className="bg-black/40 p-1.5 rounded-2xl flex border border-white/5">
              <button
                onClick={() => setStoryType("stats")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  storyType === "stats" 
                    ? "bg-emerald-500 text-black shadow-md" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <BarChart2 className="w-4 h-4" /> Статистика
              </button>
              <button
                onClick={() => setStoryType("photos")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  storyType === "photos" 
                    ? "bg-emerald-500 text-black shadow-md" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Camera className="w-4 h-4" /> Фотографии
              </button>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleDownloadImage}
                disabled={isExporting}
                className="w-full h-14 bg-emerald-500 text-black hover:bg-emerald-400 font-black rounded-2xl flex items-center justify-center gap-3 shadow-md md:shadow-xl shadow-emerald-500/10"
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
                      Изображение 9:16 идеально подходит для Stories. Вы можете переключать варианты дизайна выше.
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

