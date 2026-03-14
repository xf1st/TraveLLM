"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import { AlertCircle, CheckCircle2, Info, Plane } from "lucide-react"
import { cn } from "@/lib/utils"
import React from "react"

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
}

const TicketToast = ({ type, msg }: TicketToastProps) => {
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
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Boarding Pass</span>
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

// Custom wrapper to replace default toast calls with Ticket toasts
const appToast = {
    success: (msg: string, id?: string | number) => toast.custom((t) => (
        <TicketToast type="success" msg={msg} />
    ), { id }),
    
    error: (msg: string, id?: string | number) => toast.custom((t) => (
        <TicketToast type="error" msg={msg} />
    ), { id }),
    
    info: (msg: string, id?: string | number) => toast.custom((t) => (
        <TicketToast type="info" msg={msg} />
    ), { id }),
    
    warning: (msg: string, id?: string | number) => toast.custom((t) => (
        <TicketToast type="error" msg={msg} /> // Using error style for warning for now
    ), { id }),
    
    loading: (msg: string) => toast.custom((t) => (
        <TicketToast type="loading" msg={msg} />
    )),
    dismiss: (id?: string | number) => toast.dismiss(id),
    custom: toast.custom
}

export { Toaster, appToast }
