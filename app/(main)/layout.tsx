import type React from "react"
import { MobileBottomNav } from "@/components/MobileBottomNav"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-dvh bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      {children}
      <MobileBottomNav />
    </div>
  )
}
