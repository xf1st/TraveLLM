"use client"

import { cn } from "@/lib/utils"
import { ChevronDown, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "./ui/button"

interface MobileDrawerProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    className?: string
}

export function MobileDrawer({ isOpen, onClose, title, children, className }: MobileDrawerProps) {
    const [visible, setVisible] = useState(isOpen)

    useEffect(() => {
        if (isOpen) setVisible(true)
        else setTimeout(() => setVisible(false), 300) // Wait for animation
    }, [isOpen])

    if (!visible && !isOpen) return null

    return (
        <div className={cn("fixed inset-0 z-50 flex flex-col justify-end lg:hidden pointer-events-none", isOpen ? "pointer-events-auto" : "")}>
            {/* Backdrop */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/40 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={cn(
                "bg-background rounded-t-3xl shadow-md md:shadow-xl w-full max-h-[85vh] flex flex-col transition-transform duration-300 ease-out transform",
                isOpen ? "translate-y-0" : "translate-y-full",
                className
            )}>
                {/* Handle */}
                <div className="p-4 border-b flex items-center justify-between shrink-0" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-muted rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
                    <h3 className="font-semibold text-lg mt-2">{title}</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {children}
                </div>
            </div>
        </div>
    )
}
