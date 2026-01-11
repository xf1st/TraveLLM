import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gsmdgtopofvklvkninfl.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbWRndG9wb2Z2a2x2a25pbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5OTUwNjMsImV4cCI6MjA4MzU3MTA2M30.YBHU74Z1riS8nUTb-ewVBVvfK6TiVGsHuAcuQVJcy6c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    })
    return { data, error }
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
}
