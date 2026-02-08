"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function toggleFavorite(tripId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                    } catch { }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    // Check if favorites exists
    const { data: existing, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .eq("trip_id", tripId)
        .single()

    if (existing) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("trip_id", tripId)
        return { favorited: false }
    } else {
        const { error: insertError } = await supabase.from("favorites").insert({ user_id: user.id, trip_id: tripId })
        if (insertError) return { error: insertError.message }
        return { favorited: true }
    }
}

export async function getFavorites() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    // Read-only usually in GET, but Next.js needs this
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from("favorites")
        .select("trip_id")
        .eq("user_id", user.id)

    return data?.map(f => f.trip_id) || []
}
