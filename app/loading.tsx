import { Loader2 } from "lucide-react"
import { getTranslations } from "next-intl/server"

export default async function Loading() {
  const t = await getTranslations("common")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-wide">
          {t("loadingApp")}
        </p>
      </div>
    </div>
  )
}
