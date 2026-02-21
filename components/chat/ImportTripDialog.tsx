"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Map, Download, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

export function ImportTripDialog({ onImport }: { onImport: (trip: any) => void }) {
  const [open, setOpen] = useState(false)
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadTrips()
    }
  }, [open])

  const loadTrips = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const authUser = session?.user

      const localTrips: any[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('trip-') || key === 'lastGeneratedRoute')) {
          try {
            const tripData = JSON.parse(localStorage.getItem(key) || '{}')
            if (tripData.title) {
              const id = key === 'lastGeneratedRoute' ? 'ai-last' : key.replace('trip-', '')
              localTrips.push({
                id,
                ...tripData,
                created_at: tripData.created_at || new Date().toISOString()
              })
            }
          } catch (e) {}
        }
      }

      let allRoutes = [...localTrips]

      if (authUser) {
        const { data: dbTrips, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })

        if (!error && dbTrips) {
          dbTrips.forEach(dbTrip => {
            const isDup = allRoutes.find(lt => 
              lt.id === dbTrip.id || 
              (lt.title === dbTrip.title && Math.abs(new Date(lt.created_at).getTime() - new Date(dbTrip.created_at).getTime()) < 60000)
            )
            if (!isDup) allRoutes.push(dbTrip)
          })
        }
      }

      setTrips(allRoutes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (e) {
      console.error("Error loading trips:", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl text-primary bg-primary/5 hover:bg-primary/10 border-primary/20">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Импорт маршрута</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Выбрать существующий маршрут</DialogTitle>
          <DialogDescription>
            Загрузите свой предыдущий маршрут, чтобы обсудить или изменить его с ИИ-ассистентом.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : trips.length === 0 ? (
             <div className="text-center py-10 opacity-70 flex flex-col items-center">
               <Map className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
               <p className="text-sm text-muted-foreground">У вас пока нет сохраненных маршрутов.</p>
             </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {trips.map(trip => (
                  <button
                    key={trip.id}
                    onClick={() => {
                      onImport(trip)
                      setOpen(false)
                    }}
                    className="w-full flex items-start text-left p-3 rounded-xl border hover:bg-muted/50 transition-colors"
                  >
                    <div className="bg-primary/10 p-2 rounded-lg mr-3">
                      <Map className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{trip.title || trip.destination || "Без названия"}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {trip.created_at ? format(new Date(trip.created_at), "d MMM yyyy", { locale: ru }) : "Неизвестно"}
                        {trip.itinerary ? ` • ${trip.itinerary.length} дней` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
