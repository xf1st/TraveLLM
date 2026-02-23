"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, DollarSign, Wallet, Trash2, PieChart, TrendingDown, Info, Bot, Sparkles, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/database.types"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Cell, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip } from "recharts"

type Expense = Database['public']['Tables']['budget_expenses']['Row'] & {
    profiles?: { full_name: string, email: string }
}

interface EconomistAdvice {
    status: "warning" | "ok" | "critical"
    message: string
    advice: string
    burnRate: string
}

export function BudgetTracker({ tripId }: { tripId: string }) {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [advice, setAdvice] = useState<EconomistAdvice | null>(null)
    const [loadingAdvice, setLoadingAdvice] = useState(false)

    // Form state
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState("food")
    const [currency, setCurrency] = useState("RUB")

    useEffect(() => {
        fetchExpenses()

        const channel = supabase
            .channel('expenses-' + tripId)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'budget_expenses', 
                filter: `trip_id=eq.${tripId}` 
            }, () => {
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
            .select(`*`)
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false })

        if (data) setExpenses(data as any)
        setLoading(false)
    }

    const fetchAiAdvice = async () => {
        setLoadingAdvice(true)
        try {
            const res = await fetch(`/api/budget-ai?tripId=${tripId}`)
            const data = await res.json()
            if (data.economist) {
                setAdvice(data.economist)
            }
        } catch (error) {
            console.error("Advice fetch failed:", error)
        } finally {
            setLoadingAdvice(false)
        }
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
            currency,
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

    const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0)

    const chartData = useMemo(() => {
        const categories = {
            food: { name: "Еда", value: 0, color: "#f97316" },
            transport: { name: "Транспорт", value: 0, color: "#3b82f6" },
            hotel: { name: "Отель", value: 0, color: "#a855f7" },
            activity: { name: "Развлечения", value: 0, color: "#10b981" },
            other: { name: "Другое", value: 0, color: "#71717a" }
        }

        expenses.forEach(e => {
            const cat = e.category || 'other'
            if (categories[cat as keyof typeof categories]) {
                categories[cat as keyof typeof categories].value += Number(e.amount)
            }
        })

        return Object.values(categories).filter(c => c.value > 0)
    }, [expenses])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'warning': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            default: return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        }
    }

    return (
        <Card className="bg-card/40 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-emerald-400" />
                        Бюджет поездки
                    </CardTitle>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Учёт расходов</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="icon" className="rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">
                            <Plus className="h-5 w-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl border-white/10 bg-zinc-950/90 backdrop-blur-xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">Новый расход</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Что купили?</label>
                                <Input
                                    placeholder="Ужин в ресторане, Такси..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="rounded-2xl bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Сколько?</label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="rounded-2xl bg-white/5 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Валюта</label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-white/10 bg-zinc-900 z-[10000]">
                                            <SelectItem value="RUB">RUB (₽)</SelectItem>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                            <SelectItem value="EUR">EUR (€)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Категория</label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="rounded-2xl bg-white/5 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-white/10 bg-zinc-900 z-[10000]">
                                        <SelectItem value="food">🍱 Еда</SelectItem>
                                        <SelectItem value="transport">🚕 Транспорт</SelectItem>
                                        <SelectItem value="hotel">🏨 Отель</SelectItem>
                                        <SelectItem value="activity">🎡 Развлечения</SelectItem>
                                        <SelectItem value="other">📦 Другое</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-bold text-lg" onClick={handleAddExpense}>
                                Добавить расход
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Visual Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative p-6 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/10 border border-emerald-500/10 overflow-hidden">
                        <div className="relative z-10">
                            <div className="text-xs font-black text-emerald-300/70 uppercase tracking-tighter mb-1">Всего потрачено</div>
                            <div className="text-4xl font-black text-white tracking-tighter">
                                {total.toLocaleString('ru-RU')} <span className="text-emerald-400 text-2xl font-bold ml-1">₽</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-400/60 transition-all cursor-default">
                                <TrendingDown className="h-4 w-4" />
                                {expenses.length} транзакций
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-8 opacity-10 scale-150">
                            <DollarSign className="h-24 w-24 text-emerald-400" />
                        </div>
                    </div>

                    <div className="h-[140px] flex items-center justify-center bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={chartData}
                                        innerRadius={35}
                                        outerRadius={55}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                </RePieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center gap-2 opacity-30">
                                <PieChart className="h-8 w-8" />
                                <span className="text-[10px] uppercase font-bold tracking-widest">Нет данных</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Economist Advice */}
                <AnimatePresence mode="wait">
                    {advice ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-3xl border flex gap-4 ${getStatusColor(advice.status)}`}
                        >
                            <div className="p-3 rounded-2xl bg-white/10 h-fit">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div className="space-y-1 w-full relative">
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-sm uppercase tracking-tight">{advice.message}</span>
                                    <Sparkles className="h-3 w-3 animate-pulse" />
                                </div>
                                <p className="text-xs font-medium leading-relaxed opacity-80">{advice.advice}</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="text-[10px] font-bold uppercase opacity-50 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {advice.burnRate}
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 text-[10px] uppercase font-bold px-2 rounded-full hover:bg-white/10"
                                        onClick={fetchAiAdvice}
                                        disabled={loadingAdvice}
                                    >
                                        {loadingAdvice ? 'Анализ...' : 'Обновить анализ'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Button 
                                variant="outline" 
                                className="w-full h-14 rounded-3xl border-white/10 bg-transparent hover:bg-white/5 flex items-center gap-3 text-emerald-400 hover:text-emerald-300"
                                onClick={fetchAiAdvice}
                                disabled={loadingAdvice}
                            >
                                <Bot className={`h-5 w-5 ${loadingAdvice ? 'animate-pulse' : ''}`} />
                                <span className="font-black uppercase tracking-tight">
                                    {loadingAdvice ? 'Изучаю ваши траты...' : 'Анализ расходов от AI-экономиста'}
                                </span>
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Expenses List */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Последние операции</span>
                        <div className="flex gap-2">
                             {/* Categories legend could go here if needed */}
                        </div>
                    </div>
                
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {expenses.map((expense, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={expense.id} 
                                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl bg-white/5 shadow-inner ${expense.category === 'food' ? 'text-orange-400' :
                                            expense.category === 'transport' ? 'text-blue-400' :
                                                expense.category === 'hotel' ? 'text-purple-400' : 
                                                expense.category === 'activity' ? 'text-emerald-400' : 'text-zinc-400'
                                        }`}>
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm tracking-tight">{expense.description}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                {expense.category === 'food' ? '🥞 Еда' :
                                                 expense.category === 'transport' ? '🚕 Путь' :
                                                 expense.category === 'hotel' ? '🏨 Жилье' :
                                                 expense.category === 'activity' ? '🎢 Рофл' : '📦 Иное'}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 font-medium">
                                                {new Date(expense.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className="font-black text-white block">
                                            - {Number(expense.amount).toLocaleString('ru-RU')}
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-500 block">
                                            {expense.currency}
                                        </span>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-xl"
                                        onClick={() => handleDelete(expense.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                        
                        {expenses.length === 0 && !loading && (
                            <div className="text-center py-16 flex flex-col items-center gap-4 border-2 border-dashed border-white/5 rounded-3xl">
                                <div className="p-4 rounded-full bg-white/5">
                                    <Wallet className="h-10 w-10 text-zinc-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-sm uppercase tracking-tighter opacity-50">Бюджет пуст</p>
                                    <p className="text-xs text-muted-foreground">Добавьте свой первый расход кнопкой выше</p>
                                </div>
                            </div>
                        )}
                        
                        {loading && (
                           <div className="space-y-2">
                               {[1,2,3].map(i => (
                                   <div key={i} className="h-20 w-full rounded-2xl bg-white/5 animate-pulse" />
                               ))}
                           </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
