"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

function AuthCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Check if on admin subdomain
    const isAdminSubdomain = typeof window !== 'undefined' && window.location.host.startsWith('admin.')
    const defaultRedirect = isAdminSubdomain ? '/admin' : '/plan'

    useEffect(() => {
        const handleAuthCallback = async () => {
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error) {
                toast.error("Ошибка при подтверждении email")
                router.push("/auth")
                return
            }

            if (session?.user) {
                // Check if profile exists and has preferences
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('preferences')
                    .eq('id', session.user.id)
                    .single()

                toast.success("Email успешно подтвержден!")

                if (profile?.preferences) {
                    router.push(defaultRedirect)
                } else {
                    router.push("/onboarding")
                }
            } else {
                // Проверяем, это подтверждение email или просто возврат
                const type = searchParams.get('type')
                if (type === 'signup') {
                    toast.error("Ссылка для подтверждения недействительна или устарела")
                }
                router.push("/auth")
            }
        }

        handleAuthCallback()
    }, [router, searchParams, defaultRedirect])

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="text-muted-foreground font-medium animate-pulse">Подтверждаем ваш email...</p>
            </div>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                    <p className="text-muted-foreground font-medium animate-pulse">Загрузка...</p>
                </div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    )
}
