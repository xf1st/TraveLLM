"use client"

import { useState, useEffect, type ReactNode } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Lightbulb } from "lucide-react"

interface TourHintProps {
  /** Уникальный идентификатор подсказки для хранения в localStorage */
  id: string
  /** Заголовок подсказки */
  title: string
  /** Описание подсказки */
  description: string
  /** Элемент, к которому прикрепляется подсказка */
  children: ReactNode
  /** Сторона появления popover */
  side?: "top" | "bottom" | "left" | "right"
  /** Сдвиг popover от края */
  sideOffset?: number
}

const LS_PREFIX = "travellm_hint_"

export function TourHint({
  id,
  title,
  description,
  children,
  side = "top",
  sideOffset = 10,
}: TourHintProps) {
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(LS_PREFIX + id)
      setVisible(!dismissed)
    } catch {
      setVisible(false)
    }
  }, [id])

  const dismiss = () => {
    try {
      localStorage.setItem(LS_PREFIX + id, "1")
    } catch {}
    setVisible(false)
    setOpen(false)
  }

  if (!visible) return <>{children}</>

  return (
    <div className="relative">
      {children}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="absolute -top-2 -right-2 z-20 h-5 w-5 flex items-center justify-center rounded-full focus:outline-none"
            aria-label="Подсказка"
          >
            {/* Пульсирующее кольцо */}
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400/50 animate-ping" />
            {/* Иконка */}
            <span className="relative inline-flex h-5 w-5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/30 items-center justify-center">
              <Lightbulb className="h-3 w-3 text-white" />
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          side={side}
          sideOffset={sideOffset}
          className="w-64 rounded-2xl p-4 shadow-2xl border-border bg-card"
        >
          <div className="flex gap-2.5 mb-3">
            <div className="h-7 w-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Lightbulb className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground mb-0.5">{title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{description}</div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={dismiss}
            className="w-full rounded-xl text-xs h-8"
          >
            Понятно ✓
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}
