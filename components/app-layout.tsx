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
}

export function AppLayout({ children, title, description }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Header - visible on small screens */}
            <div className="lg:hidden">
                <Header />
            </div>

            {/* Desktop Sidebar - hidden on mobile, fixed position */}
            <AppSidebar />

            {/* Main Content - offset for fixed sidebar on desktop */}
            {/* Uses lg:ml-64 for expanded sidebar width (256px) */}
            <main className="min-h-screen lg:ml-64 transition-[margin] duration-300">
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
        </div>
    )
}
