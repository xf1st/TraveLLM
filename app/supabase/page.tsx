"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle, Database } from "lucide-react"

export default function SupabaseDebugPage() {
    const [status, setStatus] = useState<"loading" | "connected" | "error">("loading")
    const [trips, setTrips] = useState<any[]>([])
    const [errorMsg, setErrorMsg] = useState("")
    const [writeTestResult, setWriteTestResult] = useState<string | null>(null)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        checkConnection()
    }, [])

    const checkConnection = async () => {
        try {
            setStatus("loading")

            // 1. Check Auth
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            setUser(user)

            // 2. Check Read (Fetch latest 5 trips)
            // Note: If RLS is on, and no user, we might see 0 trips, which is valid but we want to know if it errors.
            const { data, error } = await supabase
                .from('trips')
                .select('id, title, created_at, user_id')
                .order('created_at', { ascending: false })
                .limit(5)

            if (error) throw error

            setTrips(data || [])
            setStatus("connected")
        } catch (e: any) {
            console.error(e)
            setStatus("error")
            setErrorMsg(e.message || "Unknown error")
        }
    }

    const runWriteTest = async () => {
        setWriteTestResult("Testing write...")
        try {
            // Need user for most writes due to policies
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setWriteTestResult("❌ Error: Must be logged in to test write (RLS policies usually require auth)")
                return
            }

            // Attempt to create a dummy trip
            const dummyTrip = {
                title: "DEBUG_TEST_TRIP_" + Date.now(),
                destination: "Test City",
                user_id: user.id,
                // Minimal required fields
            }

            const { data, error } = await supabase
                .from('trips')
                .insert(dummyTrip)
                .select()
                .single()

            if (error) throw error

            setWriteTestResult(`✅ Write Successful! Created Trip ID: ${data.id}`)
            // Cleanup
            await supabase.from('trips').delete().eq('id', data.id)
            setWriteTestResult(prev => prev + " (and successfully cleaned up/deleted)")

            checkConnection() // Refresh list
        } catch (e: any) {
            setWriteTestResult(`❌ Write Failed: ${e.message}`)
        }
    }

    return (
        <div className="container mx-auto py-10 space-y-8 max-w-4xl">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <Database className="h-8 w-8 text-primary" />
                Диагностика Supabase
            </h1>

            {/* Connection Status */}
            <Card className={status === "connected" ? "border-green-500/50 bg-green-500/10" : status === "error" ? "border-red-500/50 bg-red-500/10" : ""}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {status === "loading" && <Loader2 className="animate-spin" />}
                        {status === "connected" && <CheckCircle className="text-green-500" />}
                        {status === "error" && <XCircle className="text-red-500" />}
                        Статус подключения
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="font-mono text-sm">
                        URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Configured" : "❌ Missing"}<br />
                        KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Configured" : "❌ Missing"}
                    </p>
                    {errorMsg && <p className="text-red-500 mt-2 font-bold">Error: {errorMsg}</p>}
                </CardContent>
            </Card>

            {/* User Session */}
            <Card>
                <CardHeader><CardTitle>Текущая сессия (Auth)</CardTitle></CardHeader>
                <CardContent>
                    {user ? (
                        <div className="text-green-400">
                            Logged in as: <span className="font-mono text-foreground">{user.email}</span> (ID: {user.id})
                        </div>
                    ) : (
                        <div className="text-amber-400">
                            Not logged in (Guest). RLS policies may hide data.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Write Test */}
            <Card>
                <CardHeader>
                    <CardTitle>Тест записи (Write)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={runWriteTest} disabled={!user}>
                        Создать тестовую запись
                    </Button>
                    {!user && <p className="text-xs text-muted-foreground">Войдите в систему, чтобы тестировать запись.</p>}

                    {writeTestResult && (
                        <pre className="p-4 rounded-xl bg-black/40 text-xs overflow-x-auto border border-white/10">
                            {writeTestResult}
                        </pre>
                    )}
                </CardContent>
            </Card>

            {/* Data Preview */}
            <Card>
                <CardHeader>
                    <CardTitle>Последние поездки в БД (Read)</CardTitle>
                </CardHeader>
                <CardContent>
                    {trips.length === 0 ? (
                        <p className="text-muted-foreground italic">Нет данных (или доступ запрещен RLS)</p>
                    ) : (
                        <div className="space-y-2">
                            {trips.map(trip => (
                                <div key={trip.id} className="p-3 bg-muted rounded-lg flex justify-between items-center">
                                    <div>
                                        <div className="font-bold">{trip.title || "Untitled"}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{trip.id}</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(trip.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
