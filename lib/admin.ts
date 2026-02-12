import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server-side Supabase client for admin operations
export async function getServerSupabase() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
  
  return supabase
}

// Check if current user is admin
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await getServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    return profile?.role === 'admin' || profile?.role === 'super_admin'
  } catch {
    return false
  }
}

// Get current user's profile with access check
export async function getCurrentUserProfile() {
  try {
    const supabase = await getServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    return profile
  } catch {
    return null
  }
}

// Check maintenance mode
export async function getMaintenanceMode() {
  try {
    const supabase = await getServerSupabase()
    const { data } = await supabase
      .from('app_settings')
      .select('maintenance_mode, maintenance_message, maintenance_allow_admin_bypass')
      .single()
    
    return data || {
      maintenance_mode: false,
      maintenance_message: null,
      maintenance_allow_admin_bypass: true
    }
  } catch {
    return {
      maintenance_mode: false,
      maintenance_message: null,
      maintenance_allow_admin_bypass: true
    }
  }
}

// Check user access mode
export async function getUserAccessMode(userId: string) {
  try {
    const supabase = await getServerSupabase()
    const { data } = await supabase
      .from('profiles')
      .select('access_mode, block_reason, blocked_until')
      .eq('id', userId)
      .single()
    
    return data || { access_mode: 'active', block_reason: null, blocked_until: null }
  } catch {
    return { access_mode: 'active', block_reason: null, blocked_until: null }
  }
}
