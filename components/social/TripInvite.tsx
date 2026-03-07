"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Users, Copy, Check, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface TripInviteProps {
    tripId: string
    tripTitle: string
}

export function TripInvite({ tripId, tripTitle }: TripInviteProps) {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleCopyLink = () => {
        const link = `${window.location.origin}/trip/${tripId}/join`
        navigator.clipboard.writeText(link)
        setCopied(true)
        toast.success("Ссылка скопирована!")
        setTimeout(() => setCopied(false), 2000)
    }

    const handleInvite = async () => {
        if (!email) return
        setLoading(true)

        // Simulate generic invite for MVP (since we don't have email sending infra setup in Supabase yet)
        // In real app: call Edge Function to send email
        try {
            // Just checking if user exists would be nice, but for now we'll just mock the success
            // or actually insert if we can find them by email (requires admin privileges usually)

            await new Promise(resolve => setTimeout(resolve, 800))
            toast.success(`Приглашение отправлено на ${email}`)
            setEmail("")
        } catch (e) {
            toast.error("Не удалось отправить приглашение")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-full border-primary/20 bg-primary/5 hover:bg-primary/10">
                    <UserPlus className="h-4 w-4 text-primary" />
                    <span className="hidden sm:inline">Пригласить</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl bg-card/95 backdrop-blur-md md:backdrop-blur-xl border-white/10">
                <DialogHeader>
                    <DialogTitle>Пригласить друзей</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Отправить приглашение по почте</h4>
                        <div className="flex gap-2">
                            <Input
                                placeholder="friend@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="rounded-xl bg-muted/50 border-white/10"
                            />
                            <Button onClick={handleInvite} disabled={loading} className="rounded-xl">
                                {loading ? "..." : "Отправить"}
                            </Button>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Или</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Копировать ссылку</h4>
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-white/10">
                            <div className="flex-1 truncate text-sm text-muted-foreground font-mono">
                                {typeof window !== 'undefined' && tripId ? `${window.location.origin}/trip/${tripId.slice(0, 8)}...` : '...'}
                            </div>
                            <Button size="icon" variant="ghost" onClick={handleCopyLink} className="h-8 w-8 hover:bg-white/10 rounded-lg">
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
