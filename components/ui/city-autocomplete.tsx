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
    const [options, setOptions] = React.useState<{ label: string, value: string, text: string }[]>([])
    const [loading, setLoading] = React.useState(false) // Define loading state

    // Parse values
    const selectedValues = React.useMemo(() => {
        if (!value) return []
        return multiselect
            ? value.split(';').map(s => s.trim()).filter(Boolean)
            : [value]
    }, [value, multiselect])

    const handleSelect = (currentValue: string) => {
        if (multiselect) {
            // Deduplicate to prevent adding the same item twice
            if (selectedValues.includes(currentValue)) {
                onValueChange(selectedValues.filter(v => v !== currentValue).join('; '))
            } else {
                onValueChange([...selectedValues, currentValue].join('; '))
            }
        } else {
            onValueChange(currentValue)
            setOpen(false)
        }
    }

    const removeValue = (valToRemove: string) => {
        const newValues = selectedValues.filter(v => v !== valToRemove)
        onValueChange(newValues.join('; '))
    }

    // Debounced search
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            if (inputValue.length < 2) {
                setOptions([])
                return
            }

            setLoading(true)
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputValue)}&count=10&language=ru&format=json`)
                const data = await res.json()

                const results: any[] = data.results || []

                // CRITICAL PATCH: Correct Crimea location data
                const patchLocation = (name: string, region: string, country: string) => {
                    const crimeanCities = [
                        "Симферополь", "Севастополь", "Ялта", "Алушта", "Феодосия", 
                        "Керчь", "Евпатория", "Бахчисарай", "Судак", "Саки", 
                        "Армянск", "Белогорск", "Джанкой", "Красноперекопск", "Старый Крым"
                    ]
                    const isCrimea = 
                        crimeanCities.some(city => name.includes(city)) || 
                        (region && (region.includes("Крым") || region.includes("Crimea") || region.includes("Севастополь"))) ||
                        (country && (country.includes("Крым") || country.includes("Crimea")))

                    if (isCrimea) {
                        return {
                            patchedRegion: region ? region.replace(/Украина|Ukraine/g, "Россия") : "Крым",
                            patchedCountry: "Россия"
                        }
                    }
                    return { patchedRegion: region, patchedCountry: country }
                }

                const uniqueOptions = results.map((item: any) => {
                    const city = item.name
                    const { patchedRegion: region, patchedCountry: country } = patchLocation(item.name, item.admin1 || "", item.country || "")

                    let label = city
                    if (region && region !== city) label += `, ${region}`
                    if (country) label += `, ${country}`

                    return {
                        label: label,
                        value: label,
                        text: label
                    }
                })

                // Deduplicate options list
                const seen = new Set()
                const deduped = uniqueOptions.filter((el: any) => {
                    const duplicate = seen.has(el.value);
                    seen.add(el.value);
                    return !duplicate;
                });

                setOptions(deduped)
            } catch (error) {
                console.error("Failed to search cities", error)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [inputValue])

    const getDisplayName = (val: string) => {
        // Only show first part (City) in badges/selection
        return val.split(',')[0].trim()
    }

    return (
        <div className="relative w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost" 
                        role="combobox"
                        aria-expanded={open}
                        className={cn("w-full justify-between text-left font-normal h-auto min-h-[48px] py-3 text-base border", !value && "text-muted-foreground", className)}
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
                                            onClick={(e) => {
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
                            placeholder="Поиск..."
                            value={inputValue}
                            onValueChange={setInputValue}
                        />
                        <CommandList>
                            {loading && <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Поиск...</div>}
                            {!loading && options.length === 0 && inputValue.length > 1 && (
                                <CommandEmpty>Не найдено.</CommandEmpty>
                            )}
                            {!loading && inputValue.length < 2 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">Введите название (Ru/En)</div>
                            )}

                            <CommandGroup>
                                {options.map((option, idx) => (
                                    <CommandItem
                                        key={`${option.value}-${idx}`}
                                        value={option.text}
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
