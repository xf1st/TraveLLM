import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin: requestOrigin, host } = new URL(request.url)
    const code = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') // 'email', 'recovery', 'invite', etc.
    const next = searchParams.get('next') ?? '/'

    // Host user landed on (multi-domain); do not use NEXT_PUBLIC_SITE_URL — OAuth return URL must match this origin.
    const siteUrl = requestOrigin.replace(/\/$/, '')

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
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        authError = error
    } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
        authError = error
    } else {
        return NextResponse.redirect(`${siteUrl}/auth/auth-code-error`)
    }

    if (!authError) {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            const isAdminSubdomain = host.startsWith('admin.')
            const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

            if (isAdminSubdomain && isAdmin) {
                return NextResponse.redirect(`${siteUrl}/admin`)
            }

            if (next !== '/') {
                return NextResponse.redirect(`${siteUrl}${next}`)
            }

            return NextResponse.redirect(`${siteUrl}/plan`)
        }

        return NextResponse.redirect(`${siteUrl}/plan`)
    }

    return NextResponse.redirect(`${siteUrl}/auth/auth-code-error`)
}
