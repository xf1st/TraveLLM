import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Shared helper — grants 7-day PRO trial if user is genuinely new.
 * Works for both OAuth (Google/Yandex) and email confirmation flows.
 */
async function maybeGrantProTrial(userId: string, profile: { preferences?: any; subscription_tier?: string | null } | null) {
    const hasPreferences = profile?.preferences && Object.keys(profile.preferences as object).length > 0
    if (hasPreferences) return // not a new user
    if (profile?.subscription_tier && profile.subscription_tier !== 'free') return // already has a paid tier

    try {
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const { error } = await serviceClient
            .from('profiles')
            .update({
                subscription_tier: 'pro',
                subscription_expires_at: expiresAt.toISOString(),
                site_access: true
            })
            .eq('id', userId)

        if (error) {
            console.error('[Auth] Failed to grant PRO trial:', error)
        } else {
            console.log('[Auth] Granted 7-day PRO trial to user:', userId)
        }
    } catch (e) {
        console.error('[Auth] Exception granting PRO trial:', e)
    }
}

export async function GET(request: Request) {
    const { searchParams, origin: requestOrigin, host } = new URL(request.url)
    const code = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') // 'email', 'recovery', 'invite', etc.
    const next = searchParams.get('next') ?? '/'

    // Use NEXT_PUBLIC_SITE_URL in production to avoid issues behind reverse proxies
    // where request.url may contain the internal container URL instead of the public domain
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || requestOrigin

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.delete({ name, ...options })
                },
            },
        }
    )

    let authError: any = null

    if (code) {
        // OAuth / PKCE code exchange (Google, Yandex via Supabase, magic link)
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        authError = error
    } else if (tokenHash && type) {
        // Email confirmation / password reset / invite links (Supabase token_hash flow)
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
        authError = error
    } else {
        // Nothing to process — redirect to error
        return NextResponse.redirect(`${siteUrl}/auth/auth-code-error`)
    }

    if (!authError) {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, preferences, subscription_tier')
                .eq('id', user.id)
                .single()

            const isAdminSubdomain = host.startsWith('admin.')
            const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

            if (isAdminSubdomain && isAdmin) {
                return NextResponse.redirect(`${siteUrl}/admin`)
            }

            // Grant 7-day PRO trial to new users regardless of auth method
            await maybeGrantProTrial(user.id, profile)

            if (next !== '/') {
                return NextResponse.redirect(`${siteUrl}${next}`)
            }

            return NextResponse.redirect(`${siteUrl}/plan`)
        }

        return NextResponse.redirect(`${siteUrl}/plan`)
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${siteUrl}/auth/auth-code-error`)
}
