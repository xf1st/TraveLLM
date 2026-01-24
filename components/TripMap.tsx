"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { Badge } from "@/components/ui/badge"

// Fix Leaflet icons
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png"
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png"
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

// Custom icon for visited/active places with glow and pulse
const createCustomIcon = (color: string, isActive: boolean) => {
    return L.divIcon({
        className: 'custom-marker-wrapper',
        html: `
            <div class="marker-container ${isActive ? 'active' : ''}">
                <div class="marker-pulse" style="background-color: ${color}"></div>
                <div class="marker-inner" style="background-color: ${color}; border-color: ${isActive ? 'white' : 'rgba(255,255,255,0.8)'}"></div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    })
}

// Mock geocoding for demo purposes
const CITY_COORDS: Record<string, [number, number]> = {
    "Москва": [55.7558, 37.6173],
    "Санкт-Петербург": [59.9343, 30.3351],
    "Казань": [55.7963, 49.1088],
    "Сочи": [43.6028, 39.7342],
    "Париж": [48.8566, 2.3522],
    "Рим": [41.9028, 12.4964],
    "Лондон": [51.5074, -0.1278],
    "Токио": [35.6762, 139.6503],
    "Дубай": [25.2048, 55.2708],
    "Стамбул": [41.0082, 28.9784],
    "Нью-Йорк": [40.7128, -74.0060],
    "Бангкок": [13.7563, 100.5018],
    "Бали": [-8.3405, 115.0920],
    "Хельсинки": [60.1699, 24.9384],
    "Таллин": [59.4370, 24.7536],
    "Стокгольм": [59.3293, 18.0686],
    "Осло": [59.9139, 10.7522],
    "Копенгаген": [55.6761, 12.5683],
    "Берлин": [52.5200, 13.4050],
    "Амстердам": [52.3676, 4.9041],
    "Прага": [50.0755, 14.4378],
    "Вена": [48.2082, 16.3738],
    "Будапешт": [47.4979, 19.0402],
    "Варшава": [52.2297, 21.0122],
    "Минск": [53.9006, 27.5590],
    "Ереван": [40.1872, 44.5152],
    "Тбилиси": [41.7151, 44.8271],
    "Баку": [40.4093, 49.8671],
    "Астана": [51.1605, 71.4704],
    "Алматы": [43.2220, 76.8512],
    "Ташкент": [41.2995, 69.2401]
}

// Component to handle map view updates
function MapController({ activePlaceId, places }: { activePlaceId?: string, places: Place[] }) {
    const map = useMap()

    useEffect(() => {
        if (!activePlaceId) return

        const active = places.find(p => p.id === activePlaceId)
        if (active && active.coords) {
            map.flyTo(active.coords, 12, { duration: 1.5, easeLinearity: 0.25 })
        }
    }, [activePlaceId, places, map])

    return null
}

interface Place {
    id: string
    name: string
    description?: string
    status: 'visited' | 'active' | 'pending'
    day?: number
    coords?: [number, number]
}

interface TripMapProps {
    places: Place[]
    activePlaceId?: string
    onPlaceSelect?: (placeId: string) => void
}

export default function TripMap({ places, activePlaceId, onPlaceSelect }: TripMapProps) {
    // Enrich places with coords if missing (smart mock logic)
    const mappedPlaces = useMemo(() => {
        let lastValidCoord: [number, number] = [55.7558, 37.6173]

        return places.map((p, idx) => {
            if (p.coords) {
                lastValidCoord = p.coords
                return p
            }

            const foundCity = Object.keys(CITY_COORDS).find(city => p.name.includes(city) || (p.description && p.description.includes(city)))

            let baseCoord: [number, number]
            if (foundCity) {
                baseCoord = CITY_COORDS[foundCity]
                lastValidCoord = baseCoord
            } else {
                baseCoord = lastValidCoord
            }

            const noiseLat = (Math.sin(idx * 12.9898) * 43758.5453 % 1) * 0.04 - 0.02
            const noiseLng = (Math.cos(idx * 78.233) * 43758.5453 % 1) * 0.04 - 0.02

            return {
                ...p,
                coords: [
                    baseCoord[0] + noiseLat,
                    baseCoord[1] + noiseLng
                ] as [number, number]
            }
        })
    }, [places])

    const initialCenter = useMemo<[number, number]>(() => {
        if (mappedPlaces.length > 0 && mappedPlaces[0].coords) {
            return mappedPlaces[0].coords
        }
        return [55.7558, 37.6173]
    }, [])

    return (
        <div className="h-full w-full rounded-2xl overflow-hidden border border-border/50 shadow-2xl relative z-0 group">
            <style jsx global>{`
                .custom-marker-wrapper {
                    background: transparent !important;
                    border: none !important;
                }
                .marker-container {
                    position: relative;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .marker-inner {
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    z-index: 2;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .marker-pulse {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    opacity: 0.5;
                    z-index: 1;
                }
                .marker-container.active .marker-inner {
                    width: 18px;
                    height: 18px;
                    border-width: 3px;
                }
                .marker-container.active .marker-pulse {
                    animation: marker-pulse 2s infinite;
                }
                @keyframes marker-pulse {
                    0% { width: 14px; height: 14px; opacity: 0.6; }
                    100% { width: 50px; height: 50px; opacity: 0; }
                }
                .leaflet-container {
                    background: #0b0b0c !important;
                }
                .leaflet-popup-content-wrapper {
                    background: rgba(24, 24, 27, 0.9) !important;
                    backdrop-filter: blur(12px);
                    color: white !important;
                    border-radius: 16px !important;
                    border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5) !important;
                }
                .leaflet-popup-tip {
                    background: rgba(24, 24, 27, 0.9) !important;
                }
            `}</style>
            <MapContainer
                key="trip-map"
                center={initialCenter}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <MapController activePlaceId={activePlaceId} places={mappedPlaces} />

                {mappedPlaces.map(place => (
                    <Marker
                        key={place.id}
                        position={place.coords!}
                        icon={createCustomIcon(
                            place.status === 'active' ? '#3b82f6' :
                                place.status === 'visited' ? '#22c55e' : '#94a3b8',
                            place.id === activePlaceId
                        )}
                        eventHandlers={{
                            click: () => onPlaceSelect?.(place.id)
                        }}
                    >
                        <Popup>
                            <div className="p-1 min-w-[200px]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant={place.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5">
                                        {place.status === 'active' ? 'Сейчас здесь' : place.status === 'visited' ? 'Пройдено' : 'Скоро'}
                                    </Badge>
                                    {place.day && <span className="text-xs text-muted-foreground">День {place.day}</span>}
                                </div>
                                <h3 className="font-bold text-sm mb-1">{place.name}</h3>
                                {place.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{place.description}</p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}
