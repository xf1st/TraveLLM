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

function oauthReturnBaseUrl(): string {
  const current = window.location.origin.replace(/\/$/, '')
  const ref = typeof document !== 'undefined' ? document.referrer?.trim() : ''
  if (!ref) return current
  try {
    const fromRef = new URL(ref).origin.replace(/\/$/, '')
    if (fromRef === current) return fromRef
  } catch {
    /* ignore malformed referrer */
  }
  return current
}

export async function signInWithGoogle() {
  const siteUrl = oauthReturnBaseUrl()
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
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    })

    try {
      await supabase.auth.signOut({ scope: "local" })
    } catch {
      /* Server logout already cleared cookies. */
    }

    if (!res.ok) return { error: new Error(`Logout failed (${res.status})`) }
    return { error: null }
  } catch (error) {
    if (error instanceof Error && !error.message.includes('Auth session missing')) {
      return { error }
    }
    return { error: null }
  }
}
