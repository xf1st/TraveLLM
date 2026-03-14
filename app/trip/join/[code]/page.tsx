"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { appToast as toast } from "@/components/ui/sonner"
import { Loader2, Sparkles, MapPin } from "lucide-react"

export default function JoinTripPage() {
    const params = useParams()
    const router = useRouter()
    const [status, setStatus] = useState<'checking' | 'joining' | 'error'>('checking')

    useEffect(() => {
        const joinTrip = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                toast.info("Пожалуйста, войдите, чтобы присоединиться к поездке")
                router.push(`/auth?redirectTo=/trip/join/${params.code}`)
                return
            }

            setStatus('joining')

            // 1. Find the trip by invite code
            const { data: trip, error: tripError } = await supabase
                .from('trips')
                .select('id, title')
                .eq('invite_code', params.code)
                .single()

            if (tripError || !trip) {
                toast.error("Ссылка недействительна или срок ее действия истек")
                setStatus('error')
                return
            }

            // 2. Add user to trip_members
            const { error: joinError } = await supabase
                .from('trip_members')
                .insert({
                    trip_id: trip.id,
                    user_id: user.id,
                    role: 'viewer' // Default role for newcomers
                })

            if (joinError && joinError.code !== '23505') { // 23505 is unique violation (already a member)
                toast.error("Не удалось присоединиться к поездке")
                setStatus('error')
                return
            }

            toast.success(`Вы присоединились к поездке «${trip.title}»!`)
            router.push(`/trip/${trip.id}`)
        }

        joinTrip()
    }, [params.code])

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                    <MapPin className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-3xl font-black text-white mb-4">Упс! Что-то пошло не так</h1>
                <p className="text-zinc-500 max-w-sm mb-8">
                    Мы не смогли найти эту поездку. Возможно, ссылка неверна или владелец закрыл доступ.
                </p>
                <Button onClick={() => router.push('/plan')} className="rounded-xl bg-white text-black font-bold h-12 px-8">
                    Начать свое планирование
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-8">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl animate-pulse hidden md:block" />
                <div className="relative h-24 w-24 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center">
                    <Sparkles className="h-12 w-12 text-primary animate-bounce" />
                </div>
            </div>

            <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">
                {status === 'checking' ? 'Проверяем приглашение...' : 'Присоединяемся...'}
            </h1>
            <p className="text-zinc-500 font-medium animate-pulse">
                Еще секунду, мы настраиваем ваш доступ к маршруту
            </p>

            <div className="mt-12">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-700 mx-auto" />
            </div>
        </div>
    )
}

function Button({ children, onClick, className }: any) {
    return (
        <button
            onClick={onClick}
            className={`transition-all hover:scale-105 active:scale-95 ${className}`}
        >
            {children}
        </button>
    )
}
