"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import { AlertCircle, CheckCircle2, Info, Plane } from "lucide-react"
import { cn } from "@/lib/utils"
import React from "react"
import { useTranslations } from "next-intl"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = "system" } = useTheme()

    return (
        <Sonner
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            expand={true}
            visibleToasts={6}
            position="bottom-center"
            toastOptions={{
                duration: 4200,
                style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
            }}
            {...props}
        />
    )
}

interface TicketToastProps {
    type: 'success' | 'error' | 'info' | 'loading'
    msg: string
    source: ToastSource
}

type ToastSource = 'service' | 'settings' | 'profile' | 'planning' | 'trips' | 'trip' |
    'account' | 'preferences' | 'guide' | 'feedback' | 'support' | 'admin' | 'news' | 'reels'
type ToastOptions = { id?: string | number; source?: ToastSource }

// Capture the section when the notification is created, so navigation cannot
// relabel an existing notification as coming from a different page.
function currentToastSource(): ToastSource {
    if (typeof window === 'undefined') return 'service'
    const { pathname, search } = window.location
    const section = pathname.split('/')[1]
    if (section === 'profile' && new URLSearchParams(search).get('tab') === 'settings') return 'settings'
    const sources: Record<string, ToastSource> = {
        profile: 'profile', newprofile: 'profile', plan: 'planning',
        trips: 'trips', dashboard: 'trips', trip: 'trip', results: 'trip',
        auth: 'account', waitlist: 'account', onboarding: 'preferences',
        guide: 'guide', 'beta-feedback': 'feedback', support: 'support',
        admin: 'admin', news: 'news', reels: 'reels',
    }
    return sources[section] ?? 'service'
}

const TicketToast = ({ type, msg, source }: TicketToastProps) => {
    const t = useTranslations('toastSections')
    const colors = {
        success: "text-emerald-500 bg-emerald-500",
        error: "text-red-500 bg-red-500",
        info: "text-blue-500 bg-blue-500",
        loading: "text-amber-500 bg-amber-500"
    }

    const icons = {
        success: <CheckCircle2 className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
        loading: <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
    }

    return (
        <div 
            className="relative flex items-center min-w-[280px] max-w-[380px] select-none cursor-grab active:cursor-grabbing filter drop-shadow-xl"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
            {/* The Ticket Body */}
            <div className="flex w-full bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-black/5 dark:border-white/5 shadow-2xl">
                {/* Left Serrated Edge / Perforation Section */}
                <div className={cn("relative w-3 shrink-0 flex flex-col justify-around py-1", colors[type].split(' ')[1])}>
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900 -ml-1" />
                    ))}
                </div>

                {/* Main Content */}
                <div className="flex-1 flex items-center gap-4 px-4 py-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-opacity-10", colors[type].split(' ')[1], "bg-opacity-10")}>
                        <div className={colors[type].split(' ')[0]}>
                            {icons[type]}
                        </div>
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <Plane className="w-3 h-3 text-zinc-400 rotate-45" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">{t(source)}</span>
                        </div>
                        <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100 truncate leading-tight">
                            {msg}
                        </p>
                    </div>
                </div>

                {/* Right Decorative Cutout */}
                <div className="w-4 flex items-center justify-center pr-1 border-l border-dashed border-zinc-200 dark:border-zinc-800">
                    <div className="w-2.5 h-5 rounded-l-full bg-zinc-100 dark:bg-zinc-800/50" />
                </div>
            </div>
        </div>
    )
}

function showTicketToast(type: TicketToastProps['type'], msg: string, options?: string | number | ToastOptions) {
    const { id, source = currentToastSource() } = typeof options === 'object' ? options : { id: options }
    return toast.custom(() => <TicketToast type={type} msg={msg} source={source} />, { id })
}

// Existing toast IDs stay compatible; callers may specify their source section
// explicitly when an operation runs outside the currently displayed page.
const appToast = {
    success: (msg: string, options?: string | number | ToastOptions) => showTicketToast('success', msg, options),
    error: (msg: string, options?: string | number | ToastOptions) => showTicketToast('error', msg, options),
    info: (msg: string, options?: string | number | ToastOptions) => showTicketToast('info', msg, options),
    warning: (msg: string, options?: string | number | ToastOptions) => showTicketToast('error', msg, options),
    loading: (msg: string, options?: ToastOptions) => showTicketToast('loading', msg, options),
    dismiss: (id?: string | number) => toast.dismiss(id),
    custom: toast.custom
}

export { Toaster, appToast }
