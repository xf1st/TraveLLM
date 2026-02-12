
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

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
  try {
    const { error } = await supabase.auth.signOut()
    // Игнорируем ошибку "Auth session missing!" - это нормальное поведение при выходе
    if (error?.message?.includes('Auth session missing')) {
      return { error: null }
    }
    return { error }
  } catch (error) {
    // Если произошла ошибка, но это не "Auth session missing", возвращаем её
    if (error instanceof Error && !error.message.includes('Auth session missing')) {
      return { error }
    }
    return { error: null }
  }
}
