"use client"

import * as React from "react"
import { Check, ChevronsUpDown, MapPin, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface CityAutocompleteProps {
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    multiselect?: boolean
}

// ---------------------------------------------------------------------------
// Curated list: popular destinations that Open-Meteo misses or ranks poorly.
// Entries are matched case-insensitively against the user's query (ru + en).
// ---------------------------------------------------------------------------
const CURATED: { aliases: string[]; label: string; value: string }[] = [
    // Indonesia
    { aliases: ["бали", "bali"], label: "Бали, Индонезия", value: "Бали, Индонезия" },
    { aliases: ["джакарта", "jakarta"], label: "Джакарта, Индонезия", value: "Джакарта, Индонезия" },
    { aliases: ["ломбок", "lombok"], label: "Ломбок, Индонезия", value: "Ломбок, Индонезия" },
    // Thailand islands
    { aliases: ["пхукет", "phuket"], label: "Пхукет, Таиланд", value: "Пхукет, Таиланд" },
    { aliases: ["самуи", "samui", "ko samui"], label: "Ко-Самуи, Таиланд", value: "Ко-Самуи, Таиланд" },
    { aliases: ["паттайя", "pattaya"], label: "Паттайя, Таиланд", value: "Паттайя, Таиланд" },
    { aliases: ["краби", "krabi"], label: "Краби, Таиланд", value: "Краби, Таиланд" },
    // Maldives / islands
    { aliases: ["мальдив", "maldiv", "maldive"], label: "Мальдивы", value: "Мальдивы" },
    { aliases: ["маврикий", "mauritius"], label: "Маврикий", value: "Маврикий" },
    { aliases: ["сейшел", "seychell", "seychel"], label: "Сейшелы", value: "Сейшелы" },
    { aliases: ["занзибар", "zanzibar"], label: "Занзибар, Танзания", value: "Занзибар, Танзания" },
    // Turkey
    { aliases: ["каппадок", "cappadoc"], label: "Каппадокия, Турция", value: "Каппадокия, Турция" },
    { aliases: ["бодрум", "bodrum"], label: "Бодрум, Турция", value: "Бодрум, Турция" },
    { aliases: ["аланья", "alanya"], label: "Аланья, Турция", value: "Аланья, Турция" },
    { aliases: ["анталья", "antalya"], label: "Анталья, Турция", value: "Анталья, Турция" },
    // CIS
    { aliases: ["алмат", "almaty"], label: "Алматы, Казахстан", value: "Алматы, Казахстан" },
    { aliases: ["самарканд", "samarkand"], label: "Самарканд, Узбекистан", value: "Самарканд, Узбекистан" },
    { aliases: ["бухар", "bukhara"], label: "Бухара, Узбекистан", value: "Бухара, Узбекистан" },
    // Russia highlights
    { aliases: ["байкал", "baikal", "lake baikal"], label: "Байкал, Россия", value: "Байкал, Россия" },
    { aliases: ["суздал", "suzdal"], label: "Суздаль, Россия", value: "Суздаль, Россия" },
    { aliases: ["карелия", "karelia"], label: "Карелия, Россия", value: "Карелия, Россия" },
    { aliases: ["алтай", "altai", "altay"], label: "Алтай, Россия", value: "Алтай, Россия" },
    { aliases: ["камчатк", "kamchatk"], label: "Камчатка, Россия", value: "Камчатка, Россия" },
    // Others
    { aliases: ["гоа", "goa"], label: "Гоа, Индия", value: "Гоа, Индия" },
    { aliases: ["дубровник", "dubrovnik"], label: "Дубровник, Хорватия", value: "Дубровник, Хорватия" },
    { aliases: ["сантор", "santor"], label: "Санторини, Греция", value: "Санторини, Греция" },
    { aliases: ["миконос", "mykonos"], label: "Миконос, Греция", value: "Миконос, Греция" },
    { aliases: ["сингапур", "singapore"], label: "Сингапур", value: "Сингапур" },
    { aliases: ["катманд", "kathmand"], label: "Катманду, Непал", value: "Катманду, Непал" },
    { aliases: ["марракеш", "marrakesh", "marrakech"], label: "Марракеш, Марокко", value: "Марракеш, Марокко" },
    { aliases: ["рейкьявик", "reykjavik"], label: "Рейкьявик, Исландия", value: "Рейкьявик, Исландия" },
    { aliases: ["пражск", "prague", "прага", "praha"], label: "Прага, Чехия", value: "Прага, Чехия" },
]

function getCuratedMatches(query: string): { label: string; value: string }[] {
    const q = query.toLowerCase().trim()
    if (q.length < 2) return []
    return CURATED.filter(c => c.aliases.some(a => a.startsWith(q) || q.startsWith(a)))
        .map(c => ({ label: c.label, value: c.value }))
}

export function CityAutocomplete({
    value,
    onValueChange,
    placeholder = "Выберите город...",
    className,
    disabled,
    multiselect = false
}: CityAutocompleteProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")
    const [apiOptions, setApiOptions] = React.useState<{ label: string; value: string }[]>([])
    const [loading, setLoading] = React.useState(false)

    const selectedValues = React.useMemo(() => {
        if (!value) return []
        return multiselect
            ? value.split(";").map(s => s.trim()).filter(Boolean)
            : [value]
    }, [value, multiselect])

    // Merge curated + API results (curated on top, dedup)
    const options = React.useMemo(() => {
        const curated = getCuratedMatches(inputValue)
        const curatedValues = new Set(curated.map(c => c.value))
        const apiDeduped = apiOptions.filter(o => !curatedValues.has(o.value))
        return [...curated, ...apiDeduped]
    }, [inputValue, apiOptions])

    const handleSelect = (currentValue: string) => {
        if (multiselect) {
            if (selectedValues.includes(currentValue)) {
                onValueChange(selectedValues.filter(v => v !== currentValue).join("; "))
            } else {
                onValueChange([...selectedValues, currentValue].join("; "))
            }
        } else {
            onValueChange(currentValue)
            setOpen(false)
        }
    }

    const removeValue = (valToRemove: string) => {
        onValueChange(selectedValues.filter(v => v !== valToRemove).join("; "))
    }

    // Debounced API search
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            if (inputValue.length < 2) {
                setApiOptions([])
                return
            }
            setLoading(true)
            try {
                const res = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputValue)}&count=10&language=ru&format=json`
                )
                const data = await res.json()
                const results: any[] = data.results || []

                const patchLocation = (name: string, region: string, country: string) => {
                    const crimean = ["Симферополь","Севастополь","Ялта","Алушта","Феодосия","Керчь","Евпатория","Бахчисарай","Судак","Саки","Армянск","Белогорск","Джанкой","Красноперекопск","Старый Крым"]
                    const isCrimea = crimean.some(c => name.includes(c))
                        || (region && (region.includes("Крым") || region.includes("Crimea") || region.includes("Севастополь")))
                        || (country && (country.includes("Крым") || country.includes("Crimea")))
                    if (isCrimea) return {
                        patchedRegion: region ? region.replace(/Украина|Ukraine/g, "Россия") : "Крым",
                        patchedCountry: "Россия"
                    }
                    return { patchedRegion: region, patchedCountry: country }
                }

                const seen = new Set<string>()
                const opts = results.reduce<{ label: string; value: string }[]>((acc, item) => {
                    const { patchedRegion: region, patchedCountry: country } = patchLocation(item.name, item.admin1 || "", item.country || "")
                    let label = item.name
                    if (region && region !== item.name) label += `, ${region}`
                    if (country) label += `, ${country}`
                    if (!seen.has(label)) { seen.add(label); acc.push({ label, value: label }) }
                    return acc
                }, [])

                setApiOptions(opts)
            } catch {
                console.error("Failed to search cities")
            } finally {
                setLoading(false)
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [inputValue])

    const getDisplayName = (val: string) => val.split(",")[0].trim()

    return (
        <div className="relative w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "w-full justify-between text-left font-normal h-auto min-h-[48px] py-3 text-base border",
                            !value && "text-muted-foreground",
                            className
                        )}
                        disabled={disabled}
                    >
                        <div className="flex flex-wrap gap-2 items-center">
                            {selectedValues.length > 0 ? (
                                multiselect ? (
                                    selectedValues.map((val, idx) => (
                                        <Badge
                                            key={`${val}-${idx}`}
                                            variant="secondary"
                                            className="mr-1"
                                            onClick={e => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                removeValue(val)
                                            }}
                                        >
                                            {getDisplayName(val)}
                                            <X className="ml-1 h-3 w-3 hover:text-destructive cursor-pointer" />
                                        </Badge>
                                    ))
                                ) : (
                                    <span>{getDisplayName(selectedValues[0])}</span>
                                )
                            ) : (
                                <span>{placeholder}</span>
                            )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Поиск... (Ru/En)"
                            value={inputValue}
                            onValueChange={setInputValue}
                        />
                        <CommandList>
                            {loading && (
                                <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Поиск...
                                </div>
                            )}
                            {!loading && options.length === 0 && inputValue.length > 1 && (
                                <CommandEmpty>Не найдено. Попробуйте на английском.</CommandEmpty>
                            )}
                            {!loading && inputValue.length < 2 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    Введите название (Ru/En)
                                </div>
                            )}
                            <CommandGroup>
                                {options.map((option, idx) => (
                                    <CommandItem
                                        key={`${option.value}-${idx}`}
                                        value={option.value}
                                        onSelect={() => handleSelect(option.value)}
                                    >
                                        <MapPin className="mr-2 h-4 w-4 opacity-50" />
                                        {option.label}
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                selectedValues.includes(option.value) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                        <div className="p-2 border-t md:hidden">
                            <Button className="w-full h-10 rounded-xl" onClick={() => setOpen(false)}>
                                Готово
                            </Button>
                        </div>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}
