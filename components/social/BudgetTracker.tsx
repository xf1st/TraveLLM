"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, DollarSign, PieChart, Wallet, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/database.types"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type Expense = Database['public']['Tables']['budget_expenses']['Row'] & {
    profiles?: { full_name: string, email: string }
}

export function BudgetTracker({ tripId }: { tripId: string }) {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)

    // Form state
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState("food")

    useEffect(() => {
        fetchExpenses()

        // Realtime subscription
        const channel = supabase
            .channel('expenses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_expenses', filter: `trip_id=eq.${tripId}` }, () => {
                fetchExpenses()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tripId])

    const fetchExpenses = async () => {
        const { data, error } = await supabase
            .from('budget_expenses')
            .select(`
                *,
                created_by_user:created_by(email) -- Simple join if we can
            `)
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false })

        // Note: For MVP we might not get user details easily if profiles table isn't linked perfectly or RLS blocks
        // We'll just display what we have
        if (data) setExpenses(data as any)
        setLoading(false)
    }

    const handleAddExpense = async () => {
        if (!amount || !description) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast.error("Нужно войти в систему")
            return
        }

        const { error } = await supabase.from('budget_expenses').insert({
            trip_id: tripId,
            description,
            amount: parseFloat(amount),
            category,
            created_by: user.id,
            paid_by: user.id
        })

        if (error) {
            toast.error("Ошибка при добавлении: " + error.message)
        } else {
            toast.success("Расход добавлен")
            setIsOpen(false)
            setDescription("")
            setAmount("")
        }
    }

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('budget_expenses').delete().eq('id', id)
        if (error) toast.error("Ошибка удаления")
    }

    const total = expenses.reduce((sum, item) => sum + item.amount, 0)
    const myTotal = expenses.filter(e => e.paid_by /* Check logic later */).reduce((sum, item) => sum + item.amount, 0) // Simplified

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-white/10 shadow-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-400" />
                    Бюджет
                </CardTitle>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="rounded-full h-8 w-8 p-0 bg-primary/20 text-primary hover:bg-primary/30">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                        <DialogHeader>
                            <DialogTitle>Добавить расход</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <Input
                                placeholder="На что потратили? (Ужин, Такси)"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Сумма (₽)"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="flex-1"
                                />
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="food">Еда</SelectItem>
                                        <SelectItem value="transport">Транспорт</SelectItem>
                                        <SelectItem value="hotel">Отель</SelectItem>
                                        <SelectItem value="activity">Развлечения</SelectItem>
                                        <SelectItem value="other">Другое</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full rounded-xl" onClick={handleAddExpense}>
                                Сохранить
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border border-emerald-500/20">
                    <div className="text-sm text-emerald-300 font-medium mb-1">Всего потрачено</div>
                    <div className="text-3xl font-black text-emerald-400 tracking-tight">
                        {total.toLocaleString('ru-RU')} ₽
                    </div>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {expenses.map(expense => (
                        <div key={expense.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full bg-white/5 ${expense.category === 'food' ? 'text-orange-400' :
                                        expense.category === 'transport' ? 'text-blue-400' :
                                            expense.category === 'hotel' ? 'text-purple-400' : 'text-zinc-400'
                                    }`}>
                                    <DollarSign className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="font-bold text-sm">{expense.description}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{expense.category}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-emerald-400">
                                    {expense.amount.toLocaleString('ru-RU')}
                                </span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                    onClick={() => handleDelete(expense.id)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {expenses.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Пока нет расходов
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
