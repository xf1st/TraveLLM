import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin: requestOrigin, host } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    // Use NEXT_PUBLIC_SITE_URL in production to avoid issues behind reverse proxies
    // where request.url may contain the internal container URL instead of the public domain
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || requestOrigin

    if (code) {
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

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Check for profile completion to decide redirect
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

                if (!profile?.preferences) {
                    // This is a new user proceeding to onboarding. Check and grant 7-day PRO trial
                    if (!profile?.subscription_tier || profile.subscription_tier === 'free') {
                        const serviceClient = createClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.SUPABASE_SERVICE_ROLE_KEY!
                        )
                        const expiresAt = new Date()
                        expiresAt.setDate(expiresAt.getDate() + 7)
                        
                        await serviceClient
                            .from('profiles')
                            .update({ 
                                subscription_tier: 'pro',
                                subscription_expires_at: expiresAt.toISOString(),
                                site_access: true
                            })
                            .eq('id', user.id)
                    }
                    return NextResponse.redirect(`${siteUrl}/onboarding`)
                }

                if (next !== '/') {
                    return NextResponse.redirect(`${siteUrl}${next}`)
                }

                // Default redirect
                return NextResponse.redirect(`${siteUrl}/plan`)
            }

            return NextResponse.redirect(`${siteUrl}/plan`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${siteUrl}/auth/auth-code-error`)
}
