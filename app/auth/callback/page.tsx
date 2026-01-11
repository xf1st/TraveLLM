"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
    const router = useRouter()

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                console.log("🔄 Handling auth callback...")
                
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()

                if (sessionError) {
                    console.error("❌ Session error:", sessionError)
                    router.push("/auth?error=session_failed")
                    return
                }

                if (session?.user) {
                    console.log("✅ User authenticated:", session.user.id)
                    
                    // Check if profile exists and has preferences
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('preferences')
                        .eq('id', session.user.id)
                        .single()

                    if (profileError) {
                        console.error("❌ Profile error:", profileError)
                        // Create profile if doesn't exist
                        if (profileError.code === 'PGRST116') {
                            const { error: insertError } = await supabase
                                .from('profiles')
                                .insert({ id: session.user.id, preferences: {} })
                            if (insertError) {
                                console.error("❌ Profile creation error:", insertError)
                                router.push("/auth?error=profile_creation_failed")
                            } else {
                                console.log("✅ Profile created")
                                router.push("/onboarding")
                            }
                        } else {
                            router.push("/auth?error=profile_fetch_failed")
                        }
                    } else if (profile?.preferences) {
                        console.log("✅ Profile with preferences exists")
                        router.push("/plan")
                    } else {
                        console.log("✅ Profile exists, no preferences")
                        router.push("/onboarding")
                    }
                } else {
                    console.log("❌ No session found")
                    router.push("/auth")
                }
            } catch (error) {
                console.error("❌ Auth callback error:", error)
                router.push("/auth?error=callback_failed")
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
