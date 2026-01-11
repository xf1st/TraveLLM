"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
    const router = useRouter()

    useEffect(() => {
        const handleAuthCallback = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                // Check if profile exists and has preferences
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('preferences')
                    .eq('id', session.user.id)
                    .single()

                if (profile?.preferences) {
                    router.push("/plan")
                } else {
                    router.push("/onboarding")
                }
            } else {
                router.push("/auth")
            }
        }

        handleAuthCallback()
    }, [router])

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="text-muted-foreground font-medium animate-pulse">Загружаем ваш профиль...</p>
            </div>
        </div>
    )
}
