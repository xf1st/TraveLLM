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

const createUserIcon = () => {
    return L.divIcon({
        className: 'user-marker-wrapper',
        html: `
            <div class="user-marker">
                <div class="user-pulse"></div>
                <div class="user-avatar">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    })
}

// Mock geocoding for demo purposes
const CITY_COORDS: Record<string, [number, number]> = {
    // Russia & CIS
    "Москва": [55.7558, 37.6173], "Санкт-Петербург": [59.9343, 30.3351], "Казань": [55.7963, 49.1088],
    "Сочи": [43.6028, 39.7342], "Екатеринбург": [56.8389, 60.6057], "Калининград": [54.7104, 20.4522],
    "Минск": [53.9006, 27.5590], "Астана": [51.1605, 71.4704], "Алматы": [43.2220, 76.8512],
    "Ташкент": [41.2995, 69.2401], "Ереван": [40.1872, 44.5152], "Баку": [40.4093, 49.8671],
    "Тбилиси": [41.7151, 44.8271], "Батуми": [41.6168, 41.6367],

    // Europe
    "Париж": [48.8566, 2.3522], "Рим": [41.9028, 12.4964], "Лондон": [51.5074, -0.1278],
    "Берлин": [52.5200, 13.4050], "Амстердам": [52.3676, 4.9041], "Прага": [50.0755, 14.4378],
    "Вена": [48.2082, 16.3738], "Будапешт": [47.4979, 19.0402], "Варшава": [52.2297, 21.0122],
    "Барселона": [41.3851, 2.1734], "Мадрид": [40.4168, -3.7038], "Лиссабон": [38.7223, -9.1393],
    "Афины": [37.9838, 23.7275], "Венеция": [45.4408, 12.3155], "Милан": [45.4642, 9.1900],
    "Стокгольм": [59.3293, 18.0686], "Осло": [59.9139, 10.7522], "Хельсинки": [60.1699, 24.9384],
    "Копенгаген": [55.6761, 12.5683], "Цюрих": [47.3769, 8.5417], "Женева": [46.2044, 6.1432],

    // Asia
    "Токио": [35.6762, 139.6503], "Киото": [35.0116, 135.7681], "Осака": [34.6937, 135.5023],
    "Сеул": [37.5665, 126.9780], "Пекин": [39.9042, 116.4074], "Шанхай": [31.2304, 121.4737],
    "Бангкок": [13.7563, 100.5018], "Пхукет": [7.9519, 98.3381], "Бали": [-8.3405, 115.0920],
    "Сингапур": [1.3521, 103.8198], "Дубай": [25.2048, 55.2708], "Абу-Даби": [24.4539, 54.3773],
    "Мумбаи": [19.0760, 72.8777], "Дели": [28.7041, 77.1025], "Ханой": [21.0285, 105.8542],

    // Americas
    "Нью-Йорк": [40.7128, -74.0060], "Лос-Анджелес": [34.0522, -118.2437], "Сан-Франциско": [37.7749, -122.4194],
    "Майами": [25.7617, -80.1918], "Лас-Вегас": [36.1699, -115.1398], "Торонто": [43.6532, -79.3832],
    "Ванкувер": [49.2827, -123.1207], "Мехико": [19.4326, -99.1332], "Рио-де-Жанейро": [-22.9068, -43.1729],

    // Africa & Oceania
    "Каир": [30.0444, 31.2357], "Кейптаун": [-33.9249, 18.4241], "Марракеш": [31.6295, -7.9811],
    "Сидней": [-33.8688, 151.2093], "Мельбурн": [-37.8136, 144.9631], "Окленд": [-36.8485, 174.7633]
}

// Component to handle map view updates
function MapController({ activePlaceId, places, userLocation }: { activePlaceId?: string, places: Place[], userLocation?: [number, number] }) {
    const map = useMap()

    useEffect(() => {
        if (userLocation) {
            // Smoothly pan to user
            map.flyTo(userLocation, 14, { duration: 1, easeLinearity: 0.25 })
            return
        }

        if (!activePlaceId) return

        const active = places.find(p => p.id === activePlaceId)
        if (active && active.coords) {
            map.flyTo(active.coords, 12, { duration: 1.5, easeLinearity: 0.25 })
        }
    }, [activePlaceId, places, map, userLocation])

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
    userLocation?: [number, number]
}

export default function TripMap({ places, activePlaceId, onPlaceSelect, userLocation }: TripMapProps) {
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
                .user-marker-wrapper {
                    background: transparent !important;
                    border: none !important;
                    z-index: 1000 !important;
                }
                .user-marker {
                    position: relative;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .user-avatar {
                    width: 24px;
                    height: 24px;
                    background: #ec4899;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid white;
                    box-shadow: 0 4px 10px rgba(236, 72, 153, 0.5);
                    z-index: 2;
                }
                .user-pulse {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: #ec4899;
                    opacity: 0.4;
                    z-index: 1;
                    animation: user-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
                @keyframes user-ping {
                    75%, 100% {
                        transform: translate(-50%, -50%) scale(2);
                        opacity: 0;
                    }
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

                <MapController activePlaceId={activePlaceId} places={mappedPlaces} userLocation={userLocation} />

                {userLocation && (
                    <Marker
                        position={userLocation}
                        icon={createUserIcon()}
                        zIndexOffset={100}
                    />
                )}

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
