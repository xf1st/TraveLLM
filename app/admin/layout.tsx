import { AdminGuard } from "@/components/admin/admin-guard"
import { AdminHeader } from "@/components/admin/AdminHeader"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Админ-панель — TraveLM",
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
        <AdminHeader />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </AdminGuard>
  )
}
