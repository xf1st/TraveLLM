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
    /**
     * Full-bleed immersive shell: no mobile header, no page padding, no footer (e.g. Trip Reels).
     */
    variant?: "default" | "immersive"
}

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function AppLayout({ children, title, description, className, variant = "default" }: AppLayoutProps) {
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

    const immersive = variant === "immersive"

    return (
        <div
            className={cn(
                "min-h-screen",
                immersive && "flex flex-col",
                className?.includes("trip-bg") ? "" : !immersive && "bg-background",
                className,
            )}
        >
            {/* Mobile Header - hidden in immersive (TikTok-style reels) */}
            {!immersive && (
                <div className="lg:hidden">
                    <Header />
                </div>
            )}

            {/* Desktop Sidebar - hidden on mobile, fixed position */}
            <AppSidebar />

            {/* Main Content - offset for fixed sidebar on desktop */}
            <main
                className={cn(
                    "transition-[margin] duration-300",
                    isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64",
                    immersive
                        ? "flex flex-col min-h-0 h-[calc(100dvh-5rem)] lg:h-[calc(100dvh)] bg-black"
                        : "min-h-screen",
                )}
            >
                {/* Page Header - optional title area */}
                {(title || description) && (
                    <div className="border-b border-border/50 bg-card/30">
                        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
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
                <div
                    className={cn(
                        immersive ? "flex flex-1 flex-col min-h-0 overflow-hidden p-0" : "min-w-0 max-w-[100vw] overflow-x-hidden p-3 sm:p-4 lg:p-8",
                    )}
                >
                    {children}
                </div>
                {!immersive && <Footer />}
            </main>

            {/* Scroll to top button */}
            {!immersive && showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 md:bottom-6 md:right-6 z-40 h-10 w-10 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md md:shadow-xl lg:bottom-6"
                    aria-label="Наверх"
                >
                    <span className="material-symbols-outlined text-lg">arrow_upward</span>
                </button>
            )}
        </div>
    )
}
