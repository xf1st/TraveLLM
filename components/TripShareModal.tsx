"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Copy,
    Check,
    UserPlus,
    Shield,
    User,
    Trash2,
    MoreVertical,
    Share2,
    Users
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Member {
    id: string
    user_id: string
    role: 'owner' | 'editor' | 'viewer'
    profiles: {
        full_name: string
        avatar_url: string
        email: string
    }
}

interface TripShareModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    tripId: string
    tripTitle: string
    inviteCode: string
    isOwner: boolean
}

export function TripShareModal({
    isOpen,
    onOpenChange,
    tripId,
    tripTitle,
    inviteCode,
    isOwner
}: TripShareModalProps) {
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/trip/join/${inviteCode}`

    useEffect(() => {
        if (isOpen) {
            fetchMembers()
        }
    }, [isOpen, tripId])

    const fetchMembers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('trip_members')
            .select(`
                id,
                user_id,
                role,
                profiles:user_id (
                    full_name,
                    avatar_url,
                    email
                )
            `)
            .eq('trip_id', tripId)

        if (error) {
            toast.error("Не удалось загрузить участников")
        } else {
            setMembers(data as any)
        }
        setLoading(false)
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        toast.success("Ссылка скопирована!")
        setTimeout(() => setCopied(false), 2000)
    }

    const updateRole = async (memberId: string, newRole: string) => {
        const { error } = await supabase
            .from('trip_members')
            .update({ role: newRole })
            .eq('id', memberId)

        if (error) {
            toast.error("Ошибка при обновлении роли")
        } else {
            toast.success("Роль обновлена")
            fetchMembers()
        }
    }

    const removeMember = async (memberId: string) => {
        const { error } = await supabase
            .from('trip_members')
            .delete()
            .eq('id', memberId)

        if (error) {
            toast.error("Ошибка при удалении участника")
        } else {
            toast.success("Участник удален")
            fetchMembers()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] bg-zinc-900 border-white/10 text-white rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        <Share2 className="h-6 w-6 text-primary" />
                        Поделиться поездкой
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Пригласите друзей в «{tripTitle}», чтобы планировать вместе
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Invite Link Section */}
                    <div className="space-y-3">
                        <Label className="text-sm font-bold text-zinc-300 uppercase tracking-widest ml-1">
                            Ссылка для приглашения
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1 group">
                                <Input
                                    readOnly
                                    value={shareUrl}
                                    className="h-12 bg-white/5 border-white/10 rounded-xl pr-12 focus:border-primary/50 transition-all font-mono text-sm"
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={copyToClipboard}
                                    className="absolute right-1 top-1 h-10 w-10 text-zinc-400 hover:text-white"
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1.5 ml-1">
                            <Shield className="h-3 w-3" />
                            Любой, у кого есть эта ссылка, сможет просматривать маршрут
                        </p>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Members List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-zinc-300 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Участники ({members.length})
                            </Label>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {members.map((member) => (
                                <div key={member.id} className="group flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-white/10">
                                            <AvatarImage src={member.profiles?.avatar_url} />
                                            <AvatarFallback className="bg-primary/20 text-primary">
                                                {member.profiles?.full_name?.[0] || member.profiles?.email?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-bold text-sm flex items-center gap-2">
                                                {member.profiles?.full_name || "Трэвеллер"}
                                                {member.role === 'owner' && (
                                                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-primary/30 text-primary uppercase font-black">Владелец</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-500">{member.profiles?.email}</p>
                                        </div>
                                    </div>

                                    {isOwner && member.role !== 'owner' && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost" className="rounded-xl h-8 w-8 hover:bg-white/10">
                                                    <MoreVertical className="h-4 w-4 text-zinc-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white rounded-xl">
                                                <DropdownMenuItem
                                                    onClick={() => updateRole(member.id, member.role === 'editor' ? 'viewer' : 'editor')}
                                                    className="flex items-center gap-2 focus:bg-white/5 hover:bg-white/5 cursor-pointer rounded-lg"
                                                >
                                                    <Shield className="h-4 w-4" />
                                                    Сделать {member.role === 'editor' ? 'просмотрщиком' : 'редактором'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => removeMember(member.id)}
                                                    className="flex items-center gap-2 text-red-400 focus:bg-red-400/10 hover:bg-red-400/10 cursor-pointer rounded-lg"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Удалить
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            ))}

                            {members.length === 0 && !loading && (
                                <div className="text-center py-8 text-zinc-600 bg-white/5 rounded-3xl border border-dashed border-white/5">
                                    <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Пока нет других участников</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="w-full h-12 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold"
                    >
                        Готово
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
