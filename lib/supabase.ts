import { createBrowserClient } from '@supabase/ssr'

const normalizeSupabaseUrl = (raw: string) => {
  const cleaned = String(raw || "")
    .trim()
    .replace(/^['\"]|['\"]$/g, "")
    .replace(/\uFEFF/g, "")

  if (!cleaned) return ""

  const withProtocol = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`

  try {
    return new URL(withProtocol).toString().replace(/\/$/, "")
  } catch {
    return ""
  }
}

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] Missing or invalid public config', {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
  })
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export async function signInWithGoogle() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || window.location.origin
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  })
  return { data, error }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    // Ignore "Auth session missing" during logout.
    if (error?.message?.includes('Auth session missing')) {
      return { error: null }
    }
    return { error }
  } catch (error) {
    if (error instanceof Error && !error.message.includes('Auth session missing')) {
      return { error }
    }
    return { error: null }
  }
}
