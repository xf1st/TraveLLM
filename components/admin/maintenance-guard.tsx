"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Wrench, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface MaintenanceGuardProps {
  children: React.ReactNode
}

export function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const [loading, setLoading] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [allowBypass, setAllowBypass] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        // Check if user is admin
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          
          setIsAdmin(profile?.role === 'admin' || profile?.role === 'super_admin')
        }

        // Check maintenance mode
        const { data } = await supabase
          .from('app_settings')
          .select('maintenance_mode, maintenance_message, maintenance_allow_admin_bypass')
          .single()

        setMaintenanceMode(data?.maintenance_mode || false)
        setMessage(data?.maintenance_message || null)
        setAllowBypass(data?.maintenance_allow_admin_bypass ?? true)
      } catch (error) {
        console.error('Maintenance check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkMaintenance()

    // Subscribe to changes
    const channel = supabase
      .channel('app_settings_changes')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'app_settings' },
        () => checkMaintenance()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return null
  }

  // If maintenance mode is on and user is not admin (or bypass disabled)
  if (maintenanceMode && (!isAdmin || !allowBypass)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 text-white">
        <Card className="max-w-md w-full mx-4 border-yellow-500/50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <Wrench className="h-16 w-16 text-yellow-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold">Техническое обслуживание</h1>
            {message ? (
              <p className="text-muted-foreground">{message}</p>
            ) : (
              <p className="text-muted-foreground">
                Мы проводим технические работы. Сервис будет доступен в ближайшее время.
              </p>
            )}
            {isAdmin && allowBypass && (
              <Link href="/admin">
                <Button variant="outline" className="mt-4">
                  Войти в админку
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
