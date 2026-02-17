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
    <AdminGuard>
      <div className="min-h-screen bg-black text-white">
        <AdminSidebar />
        <div className="ml-60 min-h-screen flex flex-col">
          <AdminHeader />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  )
}
