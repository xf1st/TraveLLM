"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, CloudRain, Sun, Snowflake, Wind, Shirt, FileText, Smartphone, Backpack, Umbrella, Waves, Mountain } from "lucide-react"

interface PackingItem {
  id: string
  label: string
  checked: boolean
}

interface PackingCategory {
  id: string
  title: string
  icon: any
  items: PackingItem[]
}

interface PackingChecklistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  destination: string
  tags?: string[]
}

export function PackingChecklistDialog({ open, onOpenChange, destination, tags = [] }: PackingChecklistDialogProps) {
  const [categories, setCategories] = useState<PackingCategory[]>([])

  // Init checklist
  useEffect(() => {
    if (!open) return
    const isBeach = tags.some((t) => t.toLowerCase().includes("пляж") || t.toLowerCase().includes("море"))
    const isMountain = tags.some((t) => t.toLowerCase().includes("горы") || t.toLowerCase().includes("природа"))
    const isActive = tags.some((t) => t.toLowerCase().includes("активный"))

    const baseCategories: PackingCategory[] = [
      {
        id: "docs",
        title: "Документы и деньги",
        icon: FileText,
        items: [
          { id: "d1", label: "Паспорт / Загранпаспорт", checked: false },
          { id: "d2", label: "Билеты", checked: false },
          { id: "d3", label: "Бронь жилья", checked: false },
          { id: "d4", label: "Медицинская страховка", checked: false },
          { id: "d5", label: "Наличные и карты", checked: false },
        ]
      },
      {
        id: "tech",
        title: "Электроника",
        icon: Smartphone,
        items: [
          { id: "t1", label: "Смартфон", checked: false },
          { id: "t2", label: "Зарядное устройство", checked: false },
          { id: "t3", label: "Powerbank", checked: false },
          { id: "t4", label: "Наушники", checked: false },
        ]
      },
      {
        id: "clothes",
        title: "Одежда и Обувь",
        icon: Shirt,
        items: [
          { id: "c1", label: "Нижнее бельё и носки", checked: false },
          { id: "c2", label: "Удобная обувь для прогулок", checked: false },
          { id: "c3", label: "Футболки / рубашки", checked: false },
          { id: "c4", label: "Брюки / джинсы / шорты", checked: false },
          { id: "c5", label: "Кофта / свитер", checked: false },
          { id: "c6", label: "Пижама / одежда для сна", checked: false },
        ]
      },
      {
        id: "essentials",
        title: "Аптечка и косметика",
        icon: Backpack,
        items: [
          { id: "e1", label: "Зубная щётка и паста", checked: false },
          { id: "e2", label: "Шампунь и гель для душа", checked: false },
          { id: "e3", label: "Индивидуальные лекарства", checked: false },
          { id: "e4", label: "Обезболивающее и жаропонижающее", checked: false },
          { id: "e5", label: "Пластыри", checked: false },
        ]
      }
    ]

    // Smart weather & activity additions
    if (isBeach) {
      baseCategories[2].items.push({ id: "c_beach1", label: "Купальник / плавки", checked: false })
      baseCategories[3].items.push({ id: "e_beach1", label: "Крем от солнца", checked: false })
      baseCategories[3].items.push({ id: "e_beach2", label: "Солнечные очки", checked: false })
    }

    if (isMountain || isActive) {
      baseCategories[2].items.push({ id: "c_mount1", label: "Треккинговая обувь", checked: false })
      baseCategories[2].items.push({ id: "c_mount2", label: "Ветровка / теплая куртка", checked: false })
      baseCategories[3].items.push({ id: "e_mount1", label: "Репеллент от насекомых", checked: false })
    }

    // Try to load state from localStorage if exists
    const saved = localStorage.getItem(`packing_${destination}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // merge saved checklist state with our base categories
        const mergedCategories = baseCategories.map(cat => {
          const savedCat = parsed.find((pc: any) => pc.id === cat.id)
          if (!savedCat) return cat
          return {
            ...cat,
            items: cat.items.map(item => {
              const savedItem = savedCat.items.find((si: any) => si.id === item.id)
              if (savedItem) return { ...item, checked: savedItem.checked }
              return item
            })
          }
        })
        setCategories(mergedCategories)
        return
      } catch {}
    }

    setCategories(baseCategories)
  }, [open, destination, tags])

  const toggleItem = (categoryId: string, itemId: string) => {
    setCategories(prev => {
      const next = prev.map(cat => {
        if (cat.id !== categoryId) return cat
        return {
          ...cat,
          items: cat.items.map(item => item.id === itemId ? { ...item, checked: !item.checked } : item)
        }
      })
      localStorage.setItem(`packing_${destination}`, JSON.stringify(next))
      return next
    })
  }

  const { total, checked } = useMemo(() => {
    let t = 0
    let c = 0
    categories.forEach(cat => {
      t += cat.items.length
      cat.items.forEach(i => { if (i.checked) c++ })
    })
    return { total: t, checked: c }
  }, [categories])

  const progress = total === 0 ? 0 : Math.round((checked / total) * 100)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 text-white border-white/10 p-0 overflow-hidden rounded-3xl sm:rounded-[2rem]">
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-sky-500/10 to-transparent pointer-events-none" />
        
        <DialogHeader className="p-6 md:p-8 pb-4 relative z-10 text-left">
          <DialogTitle className="text-2xl md:text-3xl font-extrabold tracking-tight flex-row flex items-center gap-3">
            <span className="p-2 bg-sky-500/20 rounded-xl text-sky-400">
              <Backpack size={24} />
            </span>
            Чек-лист в {destination}
          </DialogTitle>
          <div className="text-zinc-400 mt-2 font-medium">Собрано {checked} из {total} вещей</div>
          
          <div className="w-full h-2 bg-white/5 rounded-full mt-4 overflow-hidden shadow-inner">
            <motion.div 
              className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 15 }}
            />
          </div>
        </DialogHeader>

        <div className="p-6 md:p-8 pt-0 overflow-y-auto max-h-[60vh] space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {categories.map((cat, idx) => {
            const CatIcon = cat.icon
            const catProgress = cat.items.filter(i => i.checked).length === cat.items.length

            return (
              <motion.div 
                key={cat.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${catProgress ? 'text-emerald-400' : 'text-white'}`}>
                    <CatIcon size={20} className={catProgress ? 'text-emerald-400' : 'text-sky-400'} /> 
                    {cat.title}
                  </h3>
                  {catProgress && <Check size={20} className="text-emerald-400 line-through" />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cat.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(cat.id, item.id)}
                      className={`flex items-start text-left gap-3 p-3 rounded-xl border transition-all ${
                        item.checked 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' 
                          : 'bg-black/20 border-white/5 hover:border-white/20 text-zinc-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                        item.checked ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/20 bg-black/50'
                      }`}>
                        {item.checked && <Check size={14} strokeWidth={4} />}
                      </div>
                      <span className={`text-sm font-medium ${item.checked ? 'line-through opacity-70' : ''}`}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
