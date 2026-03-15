"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"

// Dynamic imports with ssr:false are only allowed inside Client Components
// Both guards are "use client" with useEffect-only logic — no SSR content needed
const MaintenanceGuard = dynamic(
  () => import("@/components/admin/maintenance-guard").then(m => ({ default: m.MaintenanceGuard })),
  { ssr: false }
)
const UserAccessGuard = dynamic(
  () => import("@/components/admin/user-access-guard").then(m => ({ default: m.UserAccessGuard })),
  { ssr: false }
)

export function GuardsWrapper({ children }: { children: ReactNode }) {
  return (
    <MaintenanceGuard>
      <UserAccessGuard>
        {children}
      </UserAccessGuard>
    </MaintenanceGuard>
  )
}
