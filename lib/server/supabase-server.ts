import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  return { url, anonKey, serviceRoleKey }
}

export async function createCookieAuthClient() {
  const { url, anonKey } = getSupabaseConfig()
  if (!url || !anonKey) return null

  const cookieStore = await cookies()
  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options)
      },
      remove(name: string, options: any) {
        cookieStore.set(name, "", { ...options, maxAge: 0 })
      },
    },
  })
}

export function createServiceRoleClient() {
  const { url, serviceRoleKey } = getSupabaseConfig()
  if (!url || !serviceRoleKey) return null

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getServerUser() {
  const authClient = await createCookieAuthClient()
  if (!authClient) return { user: null, error: "Supabase auth is not configured" }

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser()

  return { user: user ?? null, error: error?.message ?? null }
}
