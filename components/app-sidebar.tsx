"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/logo"
import {
    Compass,
    Search,
    User,
    Settings,
    LogOut,
    Sun,
    Moon,
    Monitor,
    Newspaper,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    MapPin,
    Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { supabase, signOut } from "@/lib/supabase"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const navItems = [
    {
        title: "Создать маршрут",
        href: "/plan",
        icon: Compass,
    },
    {
        title: "Мои маршруты",
        href: "/results",
        icon: Search,
    },
    {
        title: "Лента",
        href: "/news",
        icon: Newspaper,
    },
    {
        title: "ИИ-гид",
        href: "/guide",
        icon: Sparkles,
    },
]

export function AppSidebar() {
    const pathname = usePathname()
    const [user, setUser] = useState<any>(null)
    const [recentTrips, setRecentTrips] = useState<any[]>([])
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [tripsOpen, setTripsOpen] = useState(true)
    const { theme, setTheme } = useTheme()

    useEffect(() => {
        // Load collapsed state from localStorage
        const savedCollapsed = localStorage.getItem('sidebar-collapsed')
        if (savedCollapsed) {
            setIsCollapsed(savedCollapsed === 'true')
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null)
            if (session?.user) {
                loadRecentTrips(session.user.id)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null)
            if (session?.user) {
                loadRecentTrips(session.user.id)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const loadRecentTrips = async (userId: string) => {
        const { data } = await supabase
            .from('trips')
            .select('id, title, destination')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5)
        if (data) setRecentTrips(data)
    }

    const handleLogout = async () => {
        try {
            const { error } = await signOut()

            if (error && !error.message?.includes('Auth session missing')) {
                toast.error("Ошибка при выходе: " + error.message)
                return
            }

            localStorage.removeItem("user")
            setUser(null)
            await supabase.auth.signOut({ scope: 'local' })

            toast.success("Вы успешно вышли из аккаунта")

            setTimeout(() => {
                window.location.href = "/"
            }, 1000)
        } catch (error) {
            toast.error("Произошла ошибка при выходе")
            console.error("Logout error:", error)
        }
    }

    const toggleCollapsed = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem('sidebar-collapsed', String(newState))
        window.dispatchEvent(new Event('sidebar-change'))
    }

    return (
        <aside
            className={cn(
                "hidden lg:flex flex-col fixed top-0 left-0 h-screen border-r border-border/50 bg-card/95 backdrop-blur-md transition-all duration-300 z-40",
                isCollapsed ? "w-[72px]" : "w-64"
            )}
        >
            {/* Header: Logo + Collapse Button */}
            <div className={cn(
                "p-4 border-b border-border/50 flex items-center",
                isCollapsed ? "justify-center" : "justify-between"
            )}>
                <Link href="/" className={cn(
                    "flex items-center gap-2.5 transition-opacity hover:opacity-80",
                    isCollapsed && "justify-center"
                )}>
                    <Logo size={40} className="shrink-0" />
                    {!isCollapsed && (
                        <span className="text-xl font-semibold tracking-tight">TraveLM</span>
                    )}
                </Link>
                {!isCollapsed && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={toggleCollapsed}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Expand button when collapsed */}
            {isCollapsed && (
                <div className="p-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-full h-10 rounded-xl"
                        onClick={toggleCollapsed}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? item.title : undefined}
                            className={cn(
                                "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
                                isCollapsed ? "justify-center px-2 py-3" : "px-4 py-3",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {!isCollapsed && item.title}
                        </Link>
                    )
                })}

                {/* Recent Trips Section */}
                {!isCollapsed && recentTrips.length > 0 && (
                    <Collapsible open={tripsOpen} onOpenChange={setTripsOpen} className="mt-4">
                        <CollapsibleTrigger asChild>
                            <button className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                                <span>Последние маршруты</span>
                                <ChevronDown className={cn(
                                    "h-4 w-4 transition-transform",
                                    tripsOpen && "rotate-180"
                                )} />
                            </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 mt-1">
                            {recentTrips.map((trip) => (
                                <Link
                                    key={trip.id}
                                    href={`/trip/${trip.id}`}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors",
                                        pathname === `/trip/${trip.id}`
                                            ? "bg-accent text-foreground"
                                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                    )}
                                >
                                    <MapPin className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{trip.title || trip.destination}</span>
                                </Link>
                            ))}
                        </CollapsibleContent>
                    </Collapsible>
                )}

                {/* Collapsed: show trip icons */}
                {isCollapsed && recentTrips.length > 0 && (
                    <div className="mt-4 space-y-1">
                        {recentTrips.slice(0, 3).map((trip) => (
                            <Link
                                key={trip.id}
                                href={`/trip/${trip.id}`}
                                title={trip.title || trip.destination}
                                className={cn(
                                    "flex items-center justify-center px-2 py-2.5 rounded-xl transition-colors",
                                    pathname === `/trip/${trip.id}`
                                        ? "bg-accent text-foreground"
                                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                )}
                            >
                                <MapPin className="h-4 w-4" />
                            </Link>
                        ))}
                    </div>
                )}
            </nav>

            {/* Bottom Section: User Menu */}
            <div className="p-3 border-t border-border/50">
                {user ? (
                    <div className="space-y-2">
                        {/* Theme Toggle */}
                        {!isCollapsed ? (
                            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn("flex-1 h-8 rounded-lg gap-2", theme === 'light' && 'bg-background shadow-sm')}
                                    onClick={() => setTheme('light')}
                                >
                                    <Sun className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn("flex-1 h-8 rounded-lg gap-2", theme === 'system' && 'bg-background shadow-sm')}
                                    onClick={() => setTheme('system')}
                                >
                                    <Monitor className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn("flex-1 h-8 rounded-lg gap-2", theme === 'dark' && 'bg-background shadow-sm')}
                                    onClick={() => setTheme('dark')}
                                >
                                    <Moon className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-full h-10 rounded-xl"
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            >
                                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </Button>
                        )}

                        {/* User Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={cn(
                                    "flex items-center gap-3 w-full rounded-xl transition-colors hover:bg-accent p-2",
                                    isCollapsed && "justify-center"
                                )}>
                                    <Avatar className="h-9 w-9 rounded-xl shrink-0">
                                        <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                                        <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-sm font-medium">
                                            {user.email?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {!isCollapsed && (
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-sm font-medium truncate">
                                                {user.user_metadata?.full_name || "Путешественник"}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 rounded-xl" align={isCollapsed ? "center" : "end"} side="top">
                                <DropdownMenuLabel className="font-normal p-3">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium">{user.user_metadata?.full_name || "Путешественник"}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                        <Link href="/profile" className="w-full flex items-center">
                                            <User className="mr-2 h-4 w-4" />
                                            Мой профиль
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                        <Link href="/profile?tab=settings" className="w-full flex items-center">
                                            <Settings className="mr-2 h-4 w-4" />
                                            Настройки
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="rounded-lg text-destructive cursor-pointer" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Выйти
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ) : (
                    <Button asChild className={cn("w-full rounded-xl", isCollapsed && "px-2")}>
                        <Link href="/auth">{isCollapsed ? <User className="h-4 w-4" /> : "Войти"}</Link>
                    </Button>
                )}
            </div>
        </aside>
    )
}
