import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
            return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
        }

        // Auth check: verify caller is admin
        const cookieStore = await cookies()
        const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        })
        const { data: { user } } = await authClient.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: profile } = await authClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()
        if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Use admin auth API to get all users with their identities
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // listUsers supports pagination; fetch up to 1000
        const { data: { users }, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Build map: userId -> providers[]
        const providerMap: Record<string, string[]> = {}
        for (const u of users) {
            const providers: string[] = []

            if (Array.isArray(u.identities)) {
                for (const identity of u.identities) {
                    if (identity.provider && !providers.includes(identity.provider)) {
                        providers.push(identity.provider)
                    }
                }
            }

            // Fallback to app_metadata
            if (providers.length === 0 && u.app_metadata?.provider) {
                providers.push(u.app_metadata.provider)
            }

            providerMap[u.id] = providers.length > 0 ? providers : ["email"]
        }

        return NextResponse.json({ providers: providerMap })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
