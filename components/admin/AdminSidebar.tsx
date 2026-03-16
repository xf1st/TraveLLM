'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Map, Settings, Activity, ArrowLeft, Image, MessageSquare, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/users', label: 'Пользователи', icon: Users },
    { href: '/admin/trips', label: 'Маршруты', icon: Map },
    { href: '/admin/feedback', label: 'Отзывы (Бета)', icon: MessageSquare },
    { href: '/admin/settings', label: 'Настройки', icon: Settings },
    { href: '/admin/health', label: 'Health Check', icon: Activity },
    { href: '/admin/images', label: 'Image Tester', icon: Image },
    { href: '/admin/ui-kit', label: 'UI Kit', icon: Palette },
]

export function AdminSidebar() {
    const pathname = usePathname()

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-zinc-950 border-r border-white/10 flex flex-col">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-white/10">
                <Link href="/admin" className="text-xl font-bold text-white">
                    TraveLLM <span className="text-primary">Admin</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3">
                <ul className="space-y-1">
                    {navItems.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href
                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-white/60 hover:text-white hover:bg-white/5'
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* Back to site */}
            <div className="p-3 border-t border-white/10">
                <Link
                    href="/"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    На сайт
                </Link>
            </div>
        </aside>
    )
}
