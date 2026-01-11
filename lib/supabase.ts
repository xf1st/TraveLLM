import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gsmdgtopofvklvkninfl.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbWRndG9wb2Z2a2x2a25pbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5OTUwNjMsImV4cCI6MjA4MzU3MTA2M30.YBHU74Z1riS8nUTb-ewVBVvfK6TiVGsHuAcuQVJcy6c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
})

export async function signInWithGoogle() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            },
        })
        return { data, error }
    } catch (err) {
        console.error('Google sign in error:', err)
        return { data: null, error: err }
    }
}

export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut()
        return { error }
    } catch (err) {
        console.error('Sign out error:', err)
        return { error: err }
    }
}

export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser()
        return { user, error }
    } catch (err) {
        console.error('Get current user error:', err)
        return { user: null, error: err }
    }
}
