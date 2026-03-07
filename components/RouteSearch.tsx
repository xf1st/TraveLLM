"use client"

import * as React from "react"
import { Search, MapPin, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface RouteSearchProps {
    className?: string
}

export function RouteSearch({ className }: RouteSearchProps) {
    const router = useRouter()
    const [query, setQuery] = React.useState("")
    const [results, setResults] = React.useState<any[]>([])
    const [isOpen, setIsOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const wrapperRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    React.useEffect(() => {
        const searchRoutes = async () => {
            if (!query.trim()) {
                setResults([])
                return
            }

            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('trips')
                    .select('id, title, destination, total_cost')
                    .or(`title.ilike.%${query}%,destination.ilike.%${query}%`)
                    .limit(5)

                if (!error && data) {
                    setResults(data)
                    setIsOpen(true)
                }
            } catch (e) {
                console.error("Search error:", e)
            } finally {
                setLoading(false)
            }
        }

        const timer = setTimeout(searchRoutes, 300)
        return () => clearTimeout(timer)
    }, [query])

    const handleSelect = (id: string) => {
        router.push(`/trip/${id}`)
        setIsOpen(false)
        setQuery("")
    }

    return (
        <div ref={wrapperRef} className={cn("relative w-full max-w-sm", className)}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query && setIsOpen(true)}
                    className="h-10 w-full rounded-full bg-white/10 dark:bg-black/10 pl-9 pr-4 backdrop-blur-sm transition-all focus:bg-white/20 dark:focus:bg-black/20 focus:shadow-lg ring-0 border-none placeholder:text-muted-foreground/70"
                    placeholder="Поиск маршрутов..."
                />
            </div>

            {isOpen && (results.length > 0 || loading) && (
                <div className="absolute top-full right-0 mt-4 w-[300px] sm:w-[350px] overflow-hidden rounded-3xl border border-border/50 bg-background/95 p-2 shadow-md md:shadow-2xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                            <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Ищем...
                        </div>
                    ) : results.length > 0 ? (
                        <ScrollArea className="max-h-[300px]">
                            <div className="space-y-1 p-1">
                                {results.map((route) => (
                                    <button
                                        key={route.id}
                                        onClick={() => handleSelect(route.id)}
                                        className="flex w-full flex-col items-start gap-1 rounded-lg p-3 text-left transition-colors hover:bg-muted/50 group"
                                    >
                                        <div className="flex w-full items-center justify-between">
                                            <span className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">{route.title}</span>
                                            <span className="text-xs font-mono text-muted-foreground">{route.total_cost || "—"}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            {route.destination}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            Ничего не найдено
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
