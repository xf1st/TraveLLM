import { AdminGuard } from "@/components/admin/admin-guard"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Админ-панель — TraveLLM",
  description: "Управление пользователями и маршрутами",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <AdminGuard>
        <div className="min-h-screen bg-[#10131a] text-[#e1e2eb]">
          <AdminSidebar />

          {/* Mobile sticky header */}
          <header className="bg-[#10131a]/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden border-b border-white/5">
            <span
              className="text-sm font-bold bg-gradient-to-r from-[#ddb7ff] to-[#adc6ff] bg-clip-text text-transparent"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              TraveLLM Admin
            </span>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ddb7ff] to-[#adc6ff] flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[#10131a] text-base"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                travel_explore
              </span>
            </div>
          </header>

          <div className="lg:ml-64 min-h-screen flex flex-col">
            <div className="hidden lg:block">
              <AdminHeader />
            </div>
            <main className="flex-1 p-4 lg:p-6 overflow-auto pb-20 lg:pb-6">
              {children}
            </main>
          </div>
        </div>
      </AdminGuard>
    </>
  )
}
