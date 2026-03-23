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

    Moon,
    Sun,

    // Newspaper,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    MapPin,
    Map,
    Sparkles,
    Users,
    Shield,
    Globe,
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
import { appToast as toast } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { GlobalSearch } from "@/components/GlobalSearch"
import { useTranslations } from "next-intl"

export function AppSidebar() {
    const t = useTranslations("nav")
    const tCommon = useTranslations("common")
    const pathname = usePathname()
    const { user } = useAuth()
    const [recentTrips, setRecentTrips] = useState<any[]>([])
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [tripsOpen, setTripsOpen] = useState(true)
    const { setTheme, resolvedTheme } = useTheme()
    const [isAdmin, setIsAdmin] = useState(false)
    const [userData, setUserData] = useState<{ full_name?: string, avatar_url?: string } | null>(null)
    const [searchOpen, setSearchOpen] = useState(false)
    const [genUsage, setGenUsage] = useState<{ used: number; limit: number } | null>(null)

    const navItems = [
        { title: t("plan"), href: "/plan", icon: Compass },
        { title: t("routes"), href: "/trips", icon: Map },
    ]

    // Load collapsed state from localStorage
    useEffect(() => {
        try {
            const savedCollapsed = localStorage.getItem('sidebar-collapsed')
            if (savedCollapsed) {
                setIsCollapsed(savedCollapsed === 'true')
            }
        } catch { }
    }, [])

    // Load trips and check admin role when user changes
    useEffect(() => {
        const loadUserData = async () => {
            if (user) {
                loadRecentTrips(user.id)
                // Check if user is admin
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, full_name, avatar_url, gen_limit_override')
                    .eq('id', user.id)
                    .maybeSingle()

                if (profile) {
                    setIsAdmin(profile.role === 'admin' || profile.role === 'super_admin')
                    setUserData({
                        full_name: profile.full_name || user.user_metadata?.full_name,
                        avatar_url: profile.avatar_url || user.user_metadata?.avatar_url
                    })
                    // Fetch monthly generation usage
                    const now = new Date()
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
                    const { count } = await supabase
                        .from('ai_usage_events')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .eq('source', 'route-generation')
                        .gte('created_at', monthStart)
                    const limit = profile.gen_limit_override ?? 10
                    setGenUsage({ used: count ?? 0, limit })
                } else {
                    setUserData({
                        full_name: user.user_metadata?.full_name,
                        avatar_url: user.user_metadata?.avatar_url
                    })
                    setGenUsage({ used: 0, limit: 10 })
                }
            } else {
                setRecentTrips([])
                setIsAdmin(false)
                setUserData(null)
            }
        }

        loadUserData()

        // Listen for profile updates
        const handleProfileUpdate = () => {
            loadUserData()
        }
        window.addEventListener('profile_updated', handleProfileUpdate)
        return () => window.removeEventListener('profile_updated', handleProfileUpdate)
    }, [user])

    const loadRecentTrips = async (userId: string) => {
        const { data } = await supabase
            .from('trips')
            .select('id, title, destination')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5)
        if (data) setRecentTrips(data)
    }

    useEffect(() => {
        const handleSearchKey = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setSearchOpen((prev) => !prev)
            }
        }
        document.addEventListener("keydown", handleSearchKey)
        return () => document.removeEventListener("keydown", handleSearchKey)
    }, [])

    const handleLogout = async () => {
        try {
            const { error } = await signOut()

            if (error && !error.message?.includes('Auth session missing')) {
                toast.error(t("signOut") + ": " + error.message)
                return
            }

            localStorage.removeItem("user")
            // Auth state will be updated by AuthProvider via onAuthStateChange
            await supabase.auth.signOut({ scope: 'local' })

            toast.success(t("signOut"))

            setTimeout(() => {
                window.location.href = "/"
            }, 1000)
        } catch (error) {
            toast.error(tCommon("error"))
            console.error("Logout error:", error)
        }
    }

    const toggleCollapsed = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        try {
            localStorage.setItem('sidebar-collapsed', String(newState))
        } catch { }
        window.dispatchEvent(new Event('sidebar-change'))
    }

    return (
        <aside
            className={cn(
                "hidden lg:flex flex-col fixed top-0 left-0 h-screen sidebar-glass transition-all duration-300 z-40",
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
                        <span className="text-xl font-semibold tracking-tight text-foreground">
                            TraveLLM
                        </span>
                    )}
                </Link>
                {!isCollapsed && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={toggleCollapsed}
                        aria-label={t("collapsePanel")}
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
                        aria-label={t("expandPanel")}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {/* Search Button */}
                <button
                    onClick={() => setSearchOpen(true)}
                    title={isCollapsed ? `${t("search")} (⌘K)` : undefined}
                    className={cn(
                        "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 w-full text-muted-foreground hover:bg-accent hover:text-foreground mb-1",
                        isCollapsed ? "justify-center px-2 py-3" : "px-4 py-2.5"
                    )}
                >
                    <Search className="h-5 w-5 shrink-0" />
                    {!isCollapsed && (
                        <>
                            <span className="flex-1 text-left">{t("search")}</span>
                            <kbd className="flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground/70">
                                ⌘K
                            </kbd>
                        </>
                    )}
                </button>

                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const isCreateTrip = item.href === '/plan'
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? item.title : undefined}
                            className={cn(
                                "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-300 group",
                                isCollapsed ? "justify-center px-2 py-3" : "px-4 py-3",
                                isCreateTrip
                                    ? "relative hover:scale-[1.02] hover:bg-accent/50 text-foreground shadow-sm hover:shadow-md"
                                    : isActive
                                        ? "bg-accent/80 text-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            {isCreateTrip && (
                                <>
                                    <div 
                                        className="absolute inset-0 rounded-xl pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{
                                            padding: '1.5px',
                                            background: 'linear-gradient(to right, #3b82f6, #6366f1, #a855f7)',
                                            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                            WebkitMaskComposite: 'xor',
                                            maskComposite: 'exclude'
                                        } as React.CSSProperties}
                                    />
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300 -z-10 pointer-events-none" />
                                </>
                            )}
                            <item.icon className={cn("h-5 w-5 shrink-0 z-10 relative", isCreateTrip && "text-indigo-500 animate-pulse")} />
                            {!isCollapsed && (
                                <span className={cn(
                                    "z-10 relative",
                                    isCreateTrip && "bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent font-bold"
                                )}>
                                    {item.title}
                                </span>
                            )}
                        </Link>
                    )
                })}

                {/* Admin Panel Link - Always visible for admins */}
                {isAdmin && (
                    <Link
                        href="/admin"
                        title={isCollapsed ? t("adminPanel") : undefined}
                        className={cn(
                            "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 mt-2",
                            isCollapsed ? "justify-center px-2 py-3" : "px-4 py-3",
                            pathname.startsWith('/admin')
                                ? "bg-orange-500 text-white shadow-sm"
                                : "text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 border border-orange-500/30"
                        )}
                    >
                        <Shield className="h-5 w-5 shrink-0" />
                        {!isCollapsed && t("adminPanel")}
                    </Link>
                )}

                {/* Recent Trips Section */}
                {!isCollapsed && recentTrips.length > 0 && (
                    <Collapsible open={tripsOpen} onOpenChange={setTripsOpen} className="mt-4">
                        <CollapsibleTrigger asChild>
                            <button
                                className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={tripsOpen ? t("hideTrips") : t("showTrips")}
                            >
                                <span>{t("recentTrips")}</span>
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
                                            ? "bg-primary/10 text-primary font-semibold shadow-sm border border-primary/20"
                                            : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
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
                                        ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                        : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
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
                            <Button
                                variant="ghost"
                                className="w-full flex items-center justify-start gap-3 p-2 h-auto rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                            >
                                {resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                                <span>{resolvedTheme === 'dark' ? t("darkTheme") : t("lightTheme")}</span>
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground"
                                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                                aria-label={t("darkTheme")}
                            >
                                {resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                            </Button>
                        )}

                        {/* User Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={cn(
                                    "flex items-center gap-3 w-full rounded-xl transition-colors hover:bg-accent p-2",
                                    isCollapsed && "justify-center"
                                )}
                                    aria-label={t("userMenu")}
                                >
                                    <Avatar className="h-9 w-9 rounded-xl shrink-0">
                                        <AvatarImage src={userData?.avatar_url || user.user_metadata?.avatar_url} alt={user.email} />
                                        <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-sm font-medium">
                                            {user.email?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {!isCollapsed && (
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-sm font-medium truncate text-foreground">
                                                {userData?.full_name || user.user_metadata?.full_name || tCommon("traveler")}
                                            </p>
                                            <p className="text-xs truncate text-muted-foreground dark:text-zinc-300">
                                                {user.email}
                                            </p>
                                        </div>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-60 rounded-2xl p-2 bg-card/95 backdrop-blur-md md:backdrop-blur-xl border-border/50 shadow-md md:shadow-2xl animate-in slide-in-from-left-2" align={isCollapsed ? "center" : "end"} side="top">
                                <DropdownMenuLabel className="font-normal p-3 bg-muted/30 rounded-xl mb-1">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-semibold text-primary">{userData?.full_name || user.user_metadata?.full_name || tCommon("traveler")}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                    </div>
                                    {genUsage && (
                                        <div className="mt-2.5 pt-2 border-t border-border/30">
                                            <div className="flex items-center justify-between text-xs mb-1.5">
                                                <span className="text-muted-foreground">{t("generationsMonth")}</span>
                                                <span className={genUsage.used >= genUsage.limit ? "text-destructive font-semibold" : "font-medium"}>
                                                    {genUsage.used}/{genUsage.limit}
                                                </span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${genUsage.used >= genUsage.limit ? "bg-destructive" : genUsage.used >= genUsage.limit * 0.8 ? "bg-amber-500" : "bg-primary"}`}
                                                    style={{ width: `${Math.min(100, (genUsage.used / genUsage.limit) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </DropdownMenuLabel>
                                <DropdownMenuGroup className="space-y-1">
                                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors">
                                        <Link href="/profile" className="w-full flex items-center py-2.5 px-3">
                                            <User className="mr-3 h-4 w-4" />
                                            {t("myProfile")}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors">
                                        <Link href="/profile?tab=settings" className="w-full flex items-center py-2.5 px-3">
                                            <Settings className="mr-3 h-4 w-4" />
                                            {t("settings")}
                                        </Link>
                                    </DropdownMenuItem>
                                    {isAdmin && (
                                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors">
                                            <Link href="/admin" className="w-full flex items-center py-2.5 px-3">
                                                <Shield className="mr-3 h-4 w-4" />
                                                {t("adminPanel")}
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator className="bg-border/50 my-1" />
                                <DropdownMenuItem className="rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer py-2.5 px-3" onClick={handleLogout}>
                                    <LogOut className="mr-3 h-4 w-4" />
                                    {t("signOut")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ) : (
                    <Button asChild className={cn("w-full rounded-xl", isCollapsed && "px-2")}>
                        <Link href="/auth">{isCollapsed ? <User className="h-4 w-4" /> : t("signIn")}</Link>
                    </Button>
                )}
            </div>

            <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        </aside>
    )
}


