"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Bot, Navigation, Settings, FileText, Wallet } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MapControlsProps {
  viewState: "IDLE" | "SELECTION" | "ACTIVE"
  onOpenAI: () => void
  onOpenRoute: () => void
  onOpenNearby: () => void
  onOpenSettings: () => void
  onOpenBudget: () => void
}

export function MapControls({ viewState, onOpenAI, onOpenRoute, onOpenNearby, onOpenSettings, onOpenBudget }: MapControlsProps) {
  const buttons = [
    { icon: Bot, label: "AI-гид", onClick: onOpenAI, color: "text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]", show: viewState === "ACTIVE" },
    { icon: Wallet, label: "Бюджет", onClick: onOpenBudget, color: "text-emerald-400", show: viewState === "ACTIVE" },
    { icon: viewState === "ACTIVE" ? FileText : Navigation, label: viewState === "ACTIVE" ? "Маршрут" : "Открыть маршрут", onClick: onOpenRoute, color: "text-blue-400", show: true },
    { icon: Navigation, label: "Рядом", onClick: onOpenNearby, color: "text-amber-400", show: viewState === "ACTIVE" },
    { icon: Settings, label: "Настройки", onClick: onOpenSettings, color: "text-gray-400", show: true },
  ].filter((b) => b.show)

  return (
    <div className="absolute right-4 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] md:bottom-auto md:top-1/2 md:-translate-y-1/2 flex flex-col gap-3 md:gap-4 pointer-events-auto">
      <TooltipProvider delayDuration={0}>
        {buttons.map((btn, index) => (
          <motion.div key={btn.label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className={`h-12 w-12 md:h-12 md:w-12 rounded-full backdrop-blur-md border hover:scale-110 transition-all font-bold group shadow-lg ${
                    btn.label === "AI-гид"
                      ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.15)] animate-[pulse_3s_ease-in-out_infinite]"
                      : "bg-black/40 border-white/10 hover:bg-white/10"
                  }`}
                  onClick={btn.onClick}
                >
                  <btn.icon className={`h-6 w-6 ${btn.color} group-hover:text-white transition-colors`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-black/80 text-white border-white/10 backdrop-blur-md">
                <p>{btn.label}</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        ))}
      </TooltipProvider>
    </div>
  )
}
