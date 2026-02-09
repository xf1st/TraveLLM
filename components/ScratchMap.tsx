"use client"

import { useEffect, useState } from 'react'
import { MapContainer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

// Mapping for RU -> EN names to match GeoJSON
const COUNTRY_MAPPING: Record<string, string> = {
    "россия": "Russia", "рф": "Russia",
    "сша": "United States of America", "америка": "United States of America",
    "китай": "China",
    "япония": "Japan",
    "германия": "Germany",
    "франция": "France",
    "великобритания": "United Kingdom", "англия": "United Kingdom",
    "италия": "Italy",
    "испания": "Spain",
    "турция": "Turkey",
    "оаэ": "United Arab Emirates", "эмираты": "United Arab Emirates",
    "египет": "Egypt",
    "тайланд": "Thailand", "таиланд": "Thailand",
    "индия": "India",
    "бразилия": "Brazil",
    "канада": "Canada",
    "австралия": "Australia",
    "южная корея": "South Korea", "корея": "South Korea",
    "вьетнам": "Vietnam",
    "индонезия": "Indonesia", "бали": "Indonesia",
    "грузия": "Georgia",
    "армения": "Armenia",
    "казахстан": "Kazakhstan",
    "сербия": "Serbia",
    "финляндия": "Finland",
    "швеция": "Sweden",
    "норвегия": "Norway",
    "нидерланды": "Netherlands", "голландия": "Netherlands",
    "швейцария": "Switzerland",
    "австрия": "Austria",
    "греция": "Greece",
    "кипр": "Cyprus",
    "португалия": "Portugal",
    "мексика": "Mexico",
    "аргентина": "Argentina",
    "марокко": "Morocco"
}

// Reverse mapping for saving (EN -> RU preferred if exists in mapping, else EN)
const REVERSE_COUNTRY_MAPPING: Record<string, string> = 
    Object.entries(COUNTRY_MAPPING).reduce((acc, [ru, en]) => {
        if (!acc[en]) acc[en] = ru.charAt(0).toUpperCase() + ru.slice(1);
        return acc;
    }, {} as Record<string, string>);


interface ScratchMapProps {
    visitedCountries: string[]
    onToggle?: (country: string) => void
}

export default function ScratchMap({ visitedCountries, onToggle }: ScratchMapProps) {
    const [geoJson, setGeoJson] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Use JSDelivr to proxy GitHub raw content (avoids direct raw.githubusercontent issues)
        fetch('https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json')
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok')
                return res.json()
            })
            .then(data => {
                setGeoJson(data)
                setLoading(false)
            })
            .catch(err => {
                console.error("Failed to load map data", err)
                setLoading(false)
            })
    }, [])

    const isVisited = (featureName: string) => {
        if (!featureName) return false
        const normalizedFeature = featureName.toLowerCase()
        
        return visitedCountries.some(c => {
            const raw = c.trim().toLowerCase()
            // Direct match
            if (raw === normalizedFeature) return true
            // Mapped match
            if (COUNTRY_MAPPING[raw] && COUNTRY_MAPPING[raw].toLowerCase() === normalizedFeature) return true
            // Reverse mapping check
            if (raw.includes(normalizedFeature)) return true
            return false
        })
    }

    const style = (feature: any) => {
        const visited = isVisited(feature?.properties?.name)
        return {
            fillColor: visited ? '#10b981' : '#e4e4e7', // Emerald-500 vs Zinc-200
            weight: 1,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: visited ? 0.8 : 0.3,
            cursor: onToggle ? 'pointer' : 'default'
        }
    }

    const onEachFeature = (feature: any, layer: any) => {
        const name = feature.properties.name
        const visited = isVisited(name)
        
        layer.bindTooltip(`${name} ${visited ? '✅' : ''}`, {
            sticky: true,
            direction: 'top'
        })
        
        if (onToggle) {
            layer.on({
                click: () => {
                   // Prefer Russian name if available, else English name
                   const saveName = REVERSE_COUNTRY_MAPPING[name] || name;
                   console.log(`Toggling country: ${name} -> ${saveName}`);
                   onToggle(saveName);
                },
                mouseover: (e: any) => {
                    const layer = e.target;
                    layer.setStyle({
                        weight: 2,
                        color: '#666',
                        dashArray: '',
                        fillOpacity: 0.7
                    });
                },
                mouseout: (e: any) => {
                    const layer = e.target;
                    // Reset style, but we need to know if it is visited to reset correctly
                    // simpler hack: just reset to default style logic by calling setStyle again with function? 
                    // Leaflet doesn't support passing function to setStyle easily for reset.
                    // Instead we use the 'style' function logic manually:
                    const isV = isVisited(name);
                    layer.setStyle({
                        fillColor: isV ? '#10b981' : '#e4e4e7',
                        weight: 1,
                        color: 'white',
                        dashArray: '3',
                        fillOpacity: isV ? 0.8 : 0.3
                    });
                }
            })
        }
    }

    if (loading) {
        return <div className="h-[400px] w-full flex items-center justify-center bg-muted/20 rounded-xl"><Loader2 className="animate-spin text-muted-foreground" /></div>
    }

    if (!geoJson) {
        return (
            <Card className="h-[400px] w-full flex flex-col items-center justify-center bg-muted/5 border-dashed border-2 text-center p-6 gap-2">
                <p className="text-muted-foreground font-medium">Не удалось загрузить карту</p>
                <p className="text-xs text-muted-foreground/60">Проверьте подключение к интернету или попробуйте позже.</p>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden border-0 shadow-none bg-transparent">
            <div className="h-[400px] w-full rounded-xl overflow-hidden relative z-0">
                <MapContainer 
                    center={[20, 0]} 
                    zoom={2} 
                    scrollWheelZoom={false} 
                    style={{ height: '100%', width: '100%', background: 'transparent' }}
                    attributionControl={false}
                >
                    {geoJson && (
                        <GeoJSON 
                            key={visitedCountries.join(',')} // Force re-render on prop change to update styles
                            data={geoJson} 
                            style={style}
                            onEachFeature={onEachFeature}
                        />
                    )}
                </MapContainer>
                
                {/* Overlay Hint */}
                 <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-black/80 backdrop-blur-sm p-2 rounded-lg text-xs z-[1000] border border-black/5 pointer-events-none">
                    <span className="opacity-70">Нажмите на страну, чтобы отметить</span>
                </div>

                {/* Legend Overlay */}
                <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-black/80 backdrop-blur-sm p-2 rounded-lg text-xs z-[1000] border border-black/5 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                        <span>Я здесь был</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-zinc-200 dark:bg-zinc-700 rounded-sm"></div>
                        <span>Еще предстоит</span>
                    </div>
                </div>
            </div>
        </Card>
    )
}
