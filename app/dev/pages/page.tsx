
import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function SitemapPage() {
    if (process.env.NODE_ENV === 'production') {
        notFound()
    }

    const routes = [
        { category: "Public", pages: [
            { path: "/", name: "Landing Page", desc: "Main entry point" },
            { path: "/plan", name: "Plan Trip", desc: "Create new itinerary" },
            { path: "/guide", name: "AI Guide", desc: "Chat with AI" },
            { path: "/results", name: "Results", desc: "My Trips list (legacy?)" },
            { path: "/support", name: "Support", desc: "Support center" },
            { path: "/news", name: "News", desc: "Travel news" },
            { path: "/privacy", name: "Privacy Policy", desc: "Legal" },
            { path: "/terms", name: "Terms of Service", desc: "Legal" },
        ]},
        { category: "User", pages: [
             { path: "/dashboard", name: "Dashboard", desc: "User dashboard" },
             { path: "/profile", name: "Profile", desc: "User profile settings" },
             { path: "/onboarding", name: "Onboarding", desc: "New user flow" },
        ]},

        { category: "Trip", pages: [
             { path: "/trip/completed", name: "Trip Completed", desc: "Success page" },
             { path: "/trip/123", name: "Trip Detail (Example)", desc: "Dynamic route [id]" },
             { path: "/trip/join/CODE123", name: "Join Trip (Example)", desc: "Dynamic route [code]" },
        ]},
        { category: "Admin", pages: [
             { path: "/admin", name: "Admin Home", desc: "Dashboard" },
             { path: "/admin/users", name: "Users", desc: "Manage users" },
             { path: "/admin/trips", name: "Trips", desc: "Manage trips" },
             { path: "/admin/settings", name: "Settings", desc: "App settings" },
             { path: "/admin/health", name: "Health", desc: "System status" },
        ]},
        { category: "Auth", pages: [
             { path: "/auth", name: "Auth", desc: "Login/Register" },
             { path: "/auth/verify-email", name: "Verify Email", desc: "" },
             { path: "/auth/auth-code-error", name: "Auth Error", desc: "" },
        ]},
        // "Test / Dev" category removed entirely as requested
    ]

    return (
        <div className="container mx-auto py-10 px-4">
             <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Structure & Sitemap</h1>
                <p className="text-muted-foreground">
                    Overview of all pages in the application. Use this to identify redundant pages or check navigation flow.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {routes.map((group) => (
                    <Card key={group.category} className="overflow-hidden">
                        <CardHeader className="bg-muted/50 pb-4">
                            <CardTitle>{group.category}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ul className="divide-y">
                                {group.pages.map((page) => (
                                    <li key={page.path} className="group relative">
                                        <Link 
                                            href={page.path} 
                                            className="block p-4 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="font-medium text-blue-500 group-hover:underline break-all">
                                                    {page.path}
                                                </div>
                                                {page.path.includes('[') && (
                                                     <Badge variant="outline" className="text-[10px] shrink-0">Dynamic</Badge>
                                                )}
                                            </div>
                                            {(page.name || page.desc) && (
                                                <div className="mt-1 text-sm text-muted-foreground flex gap-2">
                                                    <span className="font-medium text-foreground">{page.name}</span>
                                                    {page.desc && <span>— {page.desc}</span>}
                                                </div>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
