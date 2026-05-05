"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { applyPendingReferral, captureReferralFromSearch } from "@/lib/referral-client"
import { applyPendingPartnerPromo, capturePartnerPromoFromSearch } from "@/lib/partner-promo-client"
import { LEGAL_DOCUMENT_VERSION } from "@/lib/legal"
import type { Session, User } from "@supabase/supabase-js"

interface AuthContextType {
    user: User | null
    session: Session | null
    isLoading: boolean
    refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
    refreshSession: async () => { },
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    // Force session refresh function
    const refreshSession = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/session", { credentials: "same-origin" })
            const data = (await res.json().catch(() => ({}))) as { user?: User | null }

            if (!res.ok || !data.user) {
                setUser(null)
                setSession(null)
                return
            }

            setSession(null)
            setUser(data.user)
        } catch (error) {
            console.error("Session refresh error:", error)
            setUser(null)
            setSession(null)
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Initial session only — refreshing on every pathname change + TOKEN_REFRESHED → router.refresh()
    // caused a loop with root loading.tsx on 404 and other transient routes.
    useEffect(() => {
        refreshSession()
    }, [refreshSession])

    useEffect(() => {
        if (typeof window === "undefined") return
        captureReferralFromSearch(window.location.search)
        capturePartnerPromoFromSearch(window.location.search)
    }, [pathname])

    useEffect(() => {
        if (!user || isLoading) return
        void Promise.all([applyPendingPartnerPromo(), applyPendingReferral()])
    }, [user?.id, isLoading])

    useEffect(() => {
        if (!user || isLoading || typeof window === "undefined") return

        const pending = window.localStorage.getItem("travellm_pending_pd_consent")
        if (!pending) return

        try {
            const parsed = JSON.parse(pending) as { version?: string; acceptedAt?: string; source?: string }
            const version = parsed.version || LEGAL_DOCUMENT_VERSION
            const acceptedAt = parsed.acceptedAt || new Date().toISOString()

            void fetch("/api/auth/consent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                    version,
                    acceptedAt,
                    source: parsed.source || "auth-oauth",
                }),
            }).then((res) => {
                if (res.ok) window.localStorage.removeItem("travellm_pending_pd_consent")
            })
        } catch {
            window.localStorage.removeItem("travellm_pending_pd_consent")
        }
    }, [user?.id, isLoading])

    // Keep auth state in sync without requiring browser access to Supabase.
    useEffect(() => {
        if (typeof window === "undefined") return

        const syncSession = () => {
            void refreshSession().then(() => router.refresh())
        }

        window.addEventListener("focus", syncSession)
        window.addEventListener("travellm-auth-refresh", syncSession)

        return () => {
            window.removeEventListener("focus", syncSession)
            window.removeEventListener("travellm-auth-refresh", syncSession)
        }
    }, [refreshSession, router])

    return (
        <AuthContext.Provider value={{ user, session, isLoading, refreshSession }}>
            {children}
        </AuthContext.Provider>
    )
}

