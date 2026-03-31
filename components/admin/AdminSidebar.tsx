'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { href: '/admin/users', label: 'Пользователи', icon: 'group' },
    { href: '/admin/reels', label: 'Trip Reels', icon: 'movie' },
    { href: '/admin/trips', label: 'Маршруты', icon: 'navigation' },
    { href: '/admin/feedback', label: 'Отзывы', icon: 'reviews' },
    { href: '/admin/settings', label: 'Настройки', icon: 'settings' },
    { href: '/admin/health', label: 'Health Check', icon: 'monitor_heart' },
    { href: '/admin/images', label: 'Image Tester', icon: 'image_search' },
]

const mobileNavItems = [
    { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { href: '/admin/users', label: 'Пользователи', icon: 'group' },
    { href: '/admin/trips', label: 'Маршруты', icon: 'navigation' },
    { href: '/admin/settings', label: 'Настройки', icon: 'settings' },
    { href: '/', label: 'На сайт', icon: 'logout' },
]

export function AdminSidebar() {
    const pathname = usePathname()

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#191c22] border-r border-white/5 hidden lg:flex flex-col">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0">
                    <Link href="/admin" className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ddb7ff] to-[#adc6ff] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#10131a] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                                travel_explore
                            </span>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-sm font-bold bg-gradient-to-r from-[#ddb7ff] to-[#adc6ff] bg-clip-text text-transparent" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                TraveLLM
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-[#988d9f] mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                Admin Panel
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    <ul className="space-y-0.5">
                        {navItems.map(({ href, label, icon }) => {
                            const isActive = pathname === href
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        className={cn(
                                            'flex items-center gap-3 px-6 py-3 text-sm transition-all duration-150',
                                            isActive
                                                ? 'text-[#ddb7ff] bg-[#272a31] border-r-4 border-[#ddb7ff]'
                                                : 'text-slate-400 hover:bg-[#272a31] hover:text-[#ddb7ff] border-r-4 border-transparent'
                                        )}
                                        style={{ fontFamily: "'Inter', sans-serif" }}
                                    >
                                        <span
                                            className="material-symbols-outlined text-xl leading-none shrink-0"
                                            style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                                        >
                                            {icon}
                                        </span>
                                        {label}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                {/* Back to site */}
                <div className="border-t border-white/5 p-3 shrink-0">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-[#272a31] hover:text-[#ddb7ff] transition-all duration-150"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        <span className="material-symbols-outlined text-xl leading-none">open_in_new</span>
                        На сайт
                    </Link>
                </div>
            </aside>

            {/* Mobile bottom nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#191c22] border-t border-white/10 flex lg:hidden">
                {mobileNavItems.map(({ href, label, icon }) => {
                    const isActive = pathname === href && href !== '/'
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] transition-colors',
                                isActive
                                    ? 'text-[#ddb7ff]'
                                    : 'text-slate-500 hover:text-[#ddb7ff]'
                            )}
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            <span
                                className="material-symbols-outlined text-xl leading-none"
                                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                            >
                                {icon}
                            </span>
                            <span>{label}</span>
                        </Link>
                    )
                })}
            </nav>
        </>
    )
}
