import { useState, useEffect, useRef } from 'react'
import { Send, X, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TripChatProps {
    tripId: string
    isOpen: boolean
    onClose: () => void
    currentUser: any
}

export function TripChat({ tripId, isOpen, onClose, currentUser }: TripChatProps) {
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isOpen) return

        setLoading(true)

        // Initial fetch
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('trip_chat')
                .select(`
          *,
          user:user_id (
            email,
            user_metadata
          )
        `)
                .eq('trip_id', tripId)
                .order('created_at', { ascending: true })

            if (data) setMessages(data)
            setLoading(false)
            scrollToBottom()
        }

        fetchMessages()

        // Realtime subscription
        const channel = supabase
            .channel(`chat:${tripId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'trip_chat', filter: `trip_id=eq.${tripId}` },
                async (payload) => {
                    // Fetch user details for the new message
                    const { data: userData } = await supabase.from('auth.users').select('email, raw_user_meta_data').eq('id', payload.new.user_id).single()
                    // Note: direct access to auth.users might be restricted. 
                    // Better to rely on a public profile table or trigger, but for now let's try a simpler approach 
                    // or just show "User" if we can't get metadata immediately.
                    // Actually, we can just fetch the profile if we have a profiles table, OR just use the hook.
                    // Let's stick to the simplest valid approach: optimistic update or re-fetch.

                    // Re-fetching is safer for consistent data
                    const { data: newMsg } = await supabase
                        .from('trip_chat')
                        .select(`*, user:user_id(email, user_metadata)`)
                        .eq('id', payload.new.id)
                        .single()

                    if (newMsg) {
                        setMessages(prev => [...prev, newMsg])
                        scrollToBottom()
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tripId, isOpen])

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'smooth' })
            }
        }, 100)
    }

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !currentUser) return

        const msg = newMessage.trim()
        setNewMessage('') // Optimistic clear

        const { error } = await supabase
            .from('trip_chat')
            .insert({
                trip_id: tripId,
                user_id: currentUser.id,
                message: msg
            })

        if (error) {
            console.error('Error sending message:', error)
            setNewMessage(msg)
            toast.error('Не удалось отправить сообщение')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-y-0 right-0 z-50 w-full md:w-96 bg-zinc-900 border-l border-white/10 shadow-md md:shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/50 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-white">Чат поездки</h3>
                    <span className="text-xs text-zinc-500 ml-2">{messages.length} сообщений</span>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-zinc-950/30">
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center text-zinc-500 py-10">Загрузка сообщений...</div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-zinc-500 py-10">
                            <p>Сообщений пока нет.</p>
                            <p className="text-sm opacity-70">Напишите первое сообщение!</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.user_id === currentUser?.id
                            // Fallback for user name
                            const userName = msg.user?.user_metadata?.full_name || msg.user?.email?.split('@')[0] || "Гость"

                            return (
                                <div key={msg.id} className={cn("flex gap-3 max-w-[85%]", isMe ? "ml-auto flex-row-reverse" : "")}>
                                    <Avatar className="h-8 w-8 border border-white/10">
                                        <AvatarImage src={msg.user?.user_metadata?.avatar_url} />
                                        <AvatarFallback className="bg-zinc-800 text-xs">{userName[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-xs font-medium text-zinc-400">{userName}</span>
                                            <span className="text-[10px] text-zinc-600">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className={cn(
                                            "rounded-2xl px-4 py-2 text-sm shadow-sm",
                                            isMe
                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                : "bg-zinc-800 text-zinc-100 rounded-tl-none"
                                        )}>
                                            {msg.message}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-zinc-900">
                <form onSubmit={sendMessage} className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Напишите сообщение..."
                        className="bg-zinc-800/50 border-white/10 rounded-full focus-visible:ring-primary/50"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim()} className="rounded-full shrink-0">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    )
}
