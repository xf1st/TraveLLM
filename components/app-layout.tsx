"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

interface AppLayoutProps {
    children: React.ReactNode
    /** Page title for the header area */
    title?: string
    /** Page description */
    description?: string
    /** Custom class for the root element */
    className?: string
}

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function AppLayout({ children, title, description, className }: AppLayoutProps) {
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [showScrollTop, setShowScrollTop] = useState(false)

    useEffect(() => {
        const checkSidebarState = () => {
            const saved = localStorage.getItem('sidebar-collapsed') === 'true'
            setSidebarCollapsed(saved)
        }

        checkSidebarState()
        window.addEventListener('sidebar-change', checkSidebarState)
        return () => window.removeEventListener('sidebar-change', checkSidebarState)
    }, [])

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 400)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <div className={cn("min-h-screen", className?.includes("trip-bg") ? "" : "bg-background", className)}>
            {/* Mobile Header - visible on small screens */}
            <div className="lg:hidden">
                <Header />
            </div>

            {/* Desktop Sidebar - hidden on mobile, fixed position */}
            <AppSidebar />

            {/* Main Content - offset for fixed sidebar on desktop */}
            <main
                className={`min-h-screen transition-[margin] duration-300 ${isSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
                    }`}
            >
                {/* Page Header - optional title area */}
                {(title || description) && (
                    <div className="border-b border-border/50 bg-card/30">
                        <div className="px-6 py-8 lg:px-10">
                            {title && (
                                <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
                                    {title}
                                </h1>
                            )}
                            {description && (
                                <p className="mt-2 text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Page Content */}
                <div className="p-4 lg:p-8">
                    {children}
                </div>
                <Footer />
            </main>

            {/* Scroll to top button */}
            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-xl"
                    aria-label="Наверх"
                >
                    <span className="material-symbols-outlined text-lg">arrow_upward</span>
                </button>
            )}
        </div>
    )
}
