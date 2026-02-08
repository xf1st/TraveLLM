import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin, host } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

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
                    .select('role, preferences')
                    .eq('id', user.id)
                    .single()

                const isAdminSubdomain = host.startsWith('admin.')
                const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

                if (isAdminSubdomain && isAdmin) {
                    return NextResponse.redirect(`${origin}/admin`)
                }

                if (!profile?.preferences) {
                    return NextResponse.redirect(`${origin}/onboarding`)
                }

                if (next !== '/') {
                    return NextResponse.redirect(`${origin}${next}`)
                }

                // Default redirect
                return NextResponse.redirect(`${origin}/plan`)
            }

            return NextResponse.redirect(`${origin}/plan`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
