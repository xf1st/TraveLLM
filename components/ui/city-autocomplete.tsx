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
import { useTranslations, useLocale } from "next-intl"

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
const CURATED: { aliases: string[]; ru: string; en: string }[] = [
    // Indonesia
    { aliases: ["бали", "bali"], ru: "Бали, Индонезия", en: "Bali, Indonesia" },
    { aliases: ["джакарта", "jakarta"], ru: "Джакарта, Индонезия", en: "Jakarta, Indonesia" },
    { aliases: ["ломбок", "lombok"], ru: "Ломбок, Индонезия", en: "Lombok, Indonesia" },
    // Thailand islands
    { aliases: ["пхукет", "phuket"], ru: "Пхукет, Таиланд", en: "Phuket, Thailand" },
    { aliases: ["самуи", "samui", "ko samui"], ru: "Ко-Самуи, Таиланд", en: "Ko Samui, Thailand" },
    { aliases: ["паттайя", "pattaya"], ru: "Паттайя, Таиланд", en: "Pattaya, Thailand" },
    { aliases: ["краби", "krabi"], ru: "Краби, Таиланд", en: "Krabi, Thailand" },
    // Maldives / islands
    { aliases: ["мальдив", "maldiv", "maldive"], ru: "Мальдивы", en: "Maldives" },
    { aliases: ["маврикий", "mauritius"], ru: "Маврикий", en: "Mauritius" },
    { aliases: ["сейшел", "seychell", "seychel"], ru: "Сейшелы", en: "Seychelles" },
    { aliases: ["занзибар", "zanzibar"], ru: "Занзибар, Танзания", en: "Zanzibar, Tanzania" },
    // Turkey
    { aliases: ["каппадок", "cappadoc"], ru: "Каппадокия, Турция", en: "Cappadocia, Turkey" },
    { aliases: ["бодрум", "bodrum"], ru: "Бодрум, Турция", en: "Bodrum, Turkey" },
    { aliases: ["аланья", "alanya"], ru: "Аланья, Турция", en: "Alanya, Turkey" },
    { aliases: ["анталья", "antalya"], ru: "Анталья, Турция", en: "Antalya, Turkey" },
    // CIS
    { aliases: ["алмат", "almaty"], ru: "Алматы, Казахстан", en: "Almaty, Kazakhstan" },
    { aliases: ["самарканд", "samarkand"], ru: "Самарканд, Узбекистан", en: "Samarkand, Uzbekistan" },
    { aliases: ["бухар", "bukhara"], ru: "Бухара, Узбекистан", en: "Bukhara, Uzbekistan" },
    // Russia highlights
    { aliases: ["байкал", "baikal", "lake baikal"], ru: "Байкал, Россия", en: "Lake Baikal, Russia" },
    { aliases: ["суздал", "suzdal"], ru: "Суздаль, Россия", en: "Suzdal, Russia" },
    { aliases: ["карелия", "karelia"], ru: "Карелия, Россия", en: "Karelia, Russia" },
    { aliases: ["алтай", "altai", "altay"], ru: "Алтай, Россия", en: "Altai, Russia" },
    { aliases: ["камчатк", "kamchatk"], ru: "Камчатка, Россия", en: "Kamchatka, Russia" },
    // Others
    { aliases: ["гоа", "goa"], ru: "Гоа, Индия", en: "Goa, India" },
    { aliases: ["дубровник", "dubrovnik"], ru: "Дубровник, Хорватия", en: "Dubrovnik, Croatia" },
    { aliases: ["сантор", "santor"], ru: "Санторини, Греция", en: "Santorini, Greece" },
    { aliases: ["миконос", "mykonos"], ru: "Миконос, Греция", en: "Mykonos, Greece" },
    { aliases: ["сингапур", "singapore"], ru: "Сингапур", en: "Singapore" },
    { aliases: ["катманд", "kathmand"], ru: "Катманду, Непал", en: "Kathmandu, Nepal" },
    { aliases: ["марракеш", "marrakesh", "marrakech"], ru: "Марракеш, Марокко", en: "Marrakech, Morocco" },
    { aliases: ["рейкьявик", "reykjavik"], ru: "Рейкьявик, Исландия", en: "Reykjavik, Iceland" },
    { aliases: ["пражск", "prague", "прага", "praha"], ru: "Прага, Чехия", en: "Prague, Czech Republic" },
]

function getCuratedMatches(query: string, locale: string): { label: string; value: string }[] {
    const q = query.toLowerCase().trim()
    if (q.length < 2) return []
    return CURATED.filter(c => c.aliases.some(a => a.startsWith(q) || q.startsWith(a)))
        .map(c => {
            const label = locale === "en" ? c.en : c.ru
            return { label, value: label }
        })
}

export function CityAutocomplete({
    value,
    onValueChange,
    placeholder,
    className,
    disabled,
    multiselect = false
}: CityAutocompleteProps) {
    const t = useTranslations("citySearch")
    const locale = useLocale()
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
        const curated = getCuratedMatches(inputValue, locale)
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
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputValue)}&count=10&language=${locale}&format=json`
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
                            "w-full justify-between gap-2 text-left font-normal h-auto min-h-[48px] py-3 text-base border",
                            !value && "text-muted-foreground",
                            className
                        )}
                        disabled={disabled}
                    >
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
                            placeholder={t("placeholder")}
                            value={inputValue}
                            onValueChange={setInputValue}
                        />
                        <CommandList>
                            {loading && (
                                <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
                                </div>
                            )}
                            {!loading && options.length === 0 && inputValue.length > 1 && (
                                <CommandEmpty>{t("notFound")}</CommandEmpty>
                            )}
                            {!loading && inputValue.length < 2 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    {placeholder ?? t("enterName")}
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
