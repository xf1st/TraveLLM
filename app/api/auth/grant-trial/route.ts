import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/grant-trial
 *
 * Grants a 7-day PRO trial to the currently authenticated user.
 * Called client-side when email signup completes without email confirmation
 * (i.e. Supabase returns a session immediately from signUp()).
 *
 * Idempotent: if the user already has PRO or has onboarding preferences,
 * the request is a no-op.
 */
export async function POST() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
                remove(name: string, options: CookieOptions) { cookieStore.delete({ name, ...options }) },
            },
        }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read current profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('preferences, subscription_tier')
        .eq('id', user.id)
        .single()

    // Idempotency checks
    const hasPreferences = profile?.preferences && Object.keys(profile.preferences as object).length > 0
    if (hasPreferences) {
        return NextResponse.json({ skipped: true, reason: 'already_onboarded' })
    }
    if (profile?.subscription_tier && profile.subscription_tier !== 'free') {
        return NextResponse.json({ skipped: true, reason: 'already_subscribed' })
    }

    // Grant trial with service role (bypasses RLS)
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
            site_access: true,
        })
        .eq('id', user.id)

    if (error) {
        console.error('[grant-trial] DB error:', error)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
    }

    console.log('[grant-trial] PRO trial granted to email user:', user.email)
    return NextResponse.json({ granted: true, expires_at: expiresAt.toISOString() })
}
