"use client"

import { useTranslations } from "next-intl"
import { AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export function EconomyRouteDialog({ open, onOpenChange, onChoose }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (strict: boolean) => void
}) {
  const t = useTranslations("plan.economyWarning")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-amber-500" />{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {([true, false] as const).map((strict) => (
            <button key={String(strict)} type="button" onClick={() => onChoose(strict)} className="w-full rounded-2xl border border-border bg-muted/30 p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5">
              <p className="text-sm font-bold">{t(strict ? "strict" : "flexible")}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(strict ? "strictHint" : "flexibleHint")}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
