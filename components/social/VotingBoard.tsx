"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Vote, Plus, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/database.types"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

type Poll = Database['public']['Tables']['voting_polls']['Row'] & {
    poll_options: (Database['public']['Tables']['poll_options']['Row'] & {
        poll_votes: { user_id: string }[]
    })[]
}

export function VotingBoard({ tripId }: { tripId: string }) {
    const [polls, setPolls] = useState<Poll[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [question, setQuestion] = useState("")
    const [optionsInput, setOptionsInput] = useState("") // Line separated
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null))
        fetchPolls()

        // Subscription
        const channel = supabase
            .channel('polls')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, fetchPolls)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'voting_polls' }, fetchPolls)
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [tripId])

    const fetchPolls = async () => {
        const { data } = await supabase
            .from('voting_polls')
            .select(`
                *,
                poll_options (
                    id, text,
                    poll_votes (user_id)
                )
            `)
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false })

        if (data) setPolls(data as any)
    }

    const handleCreatePoll = async () => {
        if (!question || !optionsInput) return

        const { data: poll, error } = await supabase
            .from('voting_polls')
            .insert({ trip_id: tripId, question })
            .select()
            .single()

        if (poll) {
            const options = optionsInput.split('\n').filter(Boolean).map(text => ({
                poll_id: poll.id,
                text
            }))
            await supabase.from('poll_options').insert(options)
            toast.success("Опрос создан")
            setIsOpen(false)
            setQuestion("")
            setOptionsInput("")
            fetchPolls()
        }
    }

    const handleVote = async (pollId: string, optionId: string) => {
        if (!userId) return toast.error("Войдите в систему")

        // Optimistic UI could come here, but for now simple await
        // Remove previous vote for this poll if exists (Single Choice for MVP)
        // Actually, let's just insert and catch unique violation or handle logic
        // But for simplicity: Toggle vote.

        // 1. Check if voted
        const { data: existing } = await supabase
            .from('poll_votes')
            .select('id')
            .eq('poll_id', pollId)
            .eq('user_id', userId)
            .single()

        if (existing) {
            await supabase.from('poll_votes').delete().eq('id', existing.id)
        }

        const { error } = await supabase.from('poll_votes').insert({
            poll_id: pollId,
            option_id: optionId,
            user_id: userId
        })

        if (!error) {
            fetchPolls()
        }
    }

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-white/10 shadow-xl overflow-hidden h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Vote className="h-5 w-5 text-purple-400" />
                    Голосования
                </CardTitle>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="rounded-full h-8 w-8 p-0 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                        <DialogHeader>
                            <DialogTitle>Создать опрос</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <Input
                                placeholder="Вопрос (например: Куда идем вечером?)"
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                            />
                            <textarea
                                className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                                placeholder="Варианты ответа (каждый с новой строки)"
                                value={optionsInput}
                                onChange={e => setOptionsInput(e.target.value)}
                            />
                            <Button className="w-full rounded-xl" onClick={handleCreatePoll}>
                                Создать
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {polls.map(poll => {
                        const totalVotes = poll.poll_options.reduce((sum, opt) => sum + opt.poll_votes.length, 0)

                        return (
                            <div key={poll.id} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <h3 className="font-bold mb-3">{poll.question}</h3>
                                <div className="space-y-3">
                                    {poll.poll_options.map(option => {
                                        const count = option.poll_votes.length
                                        const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0
                                        const isVoted = option.poll_votes.some(v => v.user_id === userId)

                                        return (
                                            <div
                                                key={option.id}
                                                className={`relative cursor-pointer group`}
                                                onClick={() => handleVote(poll.id, option.id)}
                                            >
                                                <div className="flex justify-between text-sm mb-1 relative z-10">
                                                    <span className={isVoted ? "font-bold text-purple-300" : ""}>{option.text}</span>
                                                    <span className="text-muted-foreground">{count}</span>
                                                </div>
                                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${isVoted ? "bg-purple-500" : "bg-white/20 group-hover:bg-purple-500/50"}`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                    {polls.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Нет активных голосований
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
