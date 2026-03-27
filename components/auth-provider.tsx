"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { applyPendingReferral, captureReferralFromSearch } from "@/lib/referral-client"
import { applyPendingPartnerPromo, capturePartnerPromoFromSearch } from "@/lib/partner-promo-client"
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
            // Use getUser() which validates the session with the server
            // This is more reliable than getSession() for detecting expired/invalid sessions
            const { data: { user }, error } = await supabase.auth.getUser()

            if (error) {
                // Session is invalid or expired
                setUser(null)
                setSession(null)
                return
            }

            // Also get the session for the token
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            setUser(user)
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

    // Listen for auth state changes (login, logout, token refresh)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // console.log("Auth State Change:", event)

                setSession(session)
                setUser(session?.user || null)
                setIsLoading(false)

                if (event === "SIGNED_IN") {
                    router.refresh()
                }

                if (event === "SIGNED_OUT") {
                    setUser(null)
                    setSession(null)
                    router.refresh()
                }
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [router])

    return (
        <AuthContext.Provider value={{ user, session, isLoading, refreshSession }}>
            {children}
        </AuthContext.Provider>
    )
}

