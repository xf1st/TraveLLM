import { useMemo } from "react"
import dynamic from "next/dynamic"
import { ErrorBoundary } from "@/components/ErrorBoundary"

const MapLibreView = dynamic(() => import("./travel/MapLibreView"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-black/10 animate-pulse" />
})

interface TripMapProps {
    places: any[]
    activePlaceId?: string
    onPlaceSelect?: (placeId: string) => void
}

// Comprehensive IATA → city centre coordinates
const IATA_COORDS: Record<string, { lat: number; lng: number }> = {
    // Russia
    "MOW": { lat: 55.7558, lng: 37.6173 }, "SVO": { lat: 55.9736, lng: 37.4125 },
    "DME": { lat: 55.4088, lng: 37.9063 }, "VKO": { lat: 55.5915, lng: 37.2615 },
    "ZIA": { lat: 55.5533, lng: 38.1500 }, "LED": { lat: 59.9311, lng: 30.3609 },
    "AER": { lat: 43.4499, lng: 39.9566 }, "KZN": { lat: 55.7887, lng: 49.1221 },
    "SVX": { lat: 56.8431, lng: 60.6454 }, "OVB": { lat: 54.9833, lng: 82.8964 },
    "KGD": { lat: 54.7104, lng: 20.5087 }, "VVO": { lat: 43.3900, lng: 132.1480 },
    "GOJ": { lat: 56.3287, lng: 44.0020 }, "KUF": { lat: 53.2067, lng: 50.1500 },
    "UFA": { lat: 54.7388, lng: 55.9721 }, "ROV": { lat: 47.2357, lng: 39.7015 },
    "MRV": { lat: 44.2251, lng: 43.0816 }, "KJA": { lat: 56.0153, lng: 92.8932 },
    // Europe
    "VIE": { lat: 48.2082, lng: 16.3738 }, "IST": { lat: 41.0082, lng: 28.9784 },
    "SAW": { lat: 40.8986, lng: 29.3092 }, "PAR": { lat: 48.8566, lng: 2.3522 },
    "CDG": { lat: 49.0097, lng: 2.5479 }, "ORY": { lat: 48.7233, lng: 2.3794 },
    "LON": { lat: 51.5074, lng: -0.1278 }, "LHR": { lat: 51.4700, lng: -0.4543 },
    "LGW": { lat: 51.1537, lng: -0.1821 }, "STN": { lat: 51.8850, lng: 0.2350 },
    "BER": { lat: 52.5200, lng: 13.4050 }, "MAD": { lat: 40.4168, lng: -3.7038 },
    "BCN": { lat: 41.3851, lng: 2.1734 }, "AMS": { lat: 52.3676, lng: 4.9041 },
    "PRG": { lat: 50.0755, lng: 14.4378 }, "BUD": { lat: 47.4979, lng: 19.0402 },
    "WAW": { lat: 52.2297, lng: 21.0122 }, "ATH": { lat: 37.9838, lng: 23.7275 },
    "LIS": { lat: 38.7223, lng: -9.1393 }, "ROM": { lat: 41.9028, lng: 12.4964 },
    "FCO": { lat: 41.8003, lng: 12.2389 }, "MIL": { lat: 45.4642, lng: 9.1900 },
    "MXP": { lat: 45.6306, lng: 8.7281 }, "MUC": { lat: 48.1351, lng: 11.5820 },
    "ZRH": { lat: 47.3769, lng: 8.5417 }, "BEG": { lat: 44.7866, lng: 20.4489 },
    "LCA": { lat: 34.9009, lng: 33.6234 }, "MSQ": { lat: 53.9045, lng: 27.5615 },
    "HEL": { lat: 60.1699, lng: 24.9384 }, "STO": { lat: 59.3293, lng: 18.0686 },
    "OSL": { lat: 59.9139, lng: 10.7522 }, "CPH": { lat: 55.6761, lng: 12.5683 },
    "DUB": { lat: 53.3498, lng: -6.2603 }, "BRU": { lat: 50.8503, lng: 4.3517 },
    "ZAG": { lat: 45.8150, lng: 15.9819 }, "OTP": { lat: 44.5711, lng: 26.0854 },
    "LJU": { lat: 46.0569, lng: 14.5058 }, "TGD": { lat: 42.4304, lng: 19.2638 },
    "SOF": { lat: 42.6977, lng: 23.3219 }, "TIA": { lat: 41.3275, lng: 19.8187 },
    "SKG": { lat: 40.5179, lng: 22.9709 }, "RHO": { lat: 36.4053, lng: 28.0864 },
    // Middle East & Africa
    "DXB": { lat: 25.2048, lng: 55.2708 }, "DWC": { lat: 24.8967, lng: 55.1722 },
    "DOH": { lat: 25.2854, lng: 51.5310 }, "AUH": { lat: 24.4539, lng: 54.3773 },
    "TLV": { lat: 32.0853, lng: 34.7818 }, "TBS": { lat: 41.7151, lng: 44.8271 },
    "EVN": { lat: 40.1772, lng: 44.5035 }, "GYD": { lat: 40.3783, lng: 49.8920 },
    "TAS": { lat: 41.2995, lng: 69.2401 }, "ALA": { lat: 43.2220, lng: 76.8512 },
    "AMM": { lat: 31.9454, lng: 35.9284 }, "MCT": { lat: 23.5880, lng: 58.3829 },
    "RAK": { lat: 31.6295, lng: -7.9811 }, "CAI": { lat: 30.0444, lng: 31.2357 },
    "CPT": { lat: -33.9249, lng: 18.4241 }, "CMB": { lat: 6.9271, lng: 79.8612 },
    "MLE": { lat: 4.1755, lng: 73.5093 }, "BEY": { lat: 33.8938, lng: 35.5018 },
    // Asia
    "BKK": { lat: 13.7563, lng: 100.5018 }, "DMK": { lat: 13.9126, lng: 100.6066 },
    "TYO": { lat: 35.6762, lng: 139.6503 }, "NRT": { lat: 35.7719, lng: 140.3929 },
    "HND": { lat: 35.5494, lng: 139.7798 }, "SEL": { lat: 37.5665, lng: 126.9780 },
    "ICN": { lat: 37.4602, lng: 126.4407 }, "BJS": { lat: 39.9042, lng: 116.4074 },
    "PEK": { lat: 40.0799, lng: 116.6031 }, "SHA": { lat: 31.2304, lng: 121.4737 },
    "PVG": { lat: 31.1443, lng: 121.8083 }, "SIN": { lat: 1.3521, lng: 103.8198 },
    "HKG": { lat: 22.3193, lng: 114.1694 }, "DPS": { lat: -8.6705, lng: 115.2126 },
    "HKT": { lat: 7.8804, lng: 98.3923 }, "DEL": { lat: 28.6139, lng: 77.2090 },
    "BOM": { lat: 19.0760, lng: 72.8777 }, "HAN": { lat: 21.0278, lng: 105.8342 },
    "SGN": { lat: 10.8231, lng: 106.6297 }, "KUL": { lat: 3.1390, lng: 101.6869 },
    // Americas
    "NYC": { lat: 40.7128, lng: -74.0060 }, "JFK": { lat: 40.6413, lng: -73.7781 },
    "EWR": { lat: 40.6895, lng: -74.1745 }, "LAX": { lat: 34.0522, lng: -118.2437 },
    "MIA": { lat: 25.7617, lng: -80.1918 }, "LAS": { lat: 36.1699, lng: -115.1398 },
    "YTO": { lat: 43.6532, lng: -79.3832 }, "YYZ": { lat: 43.6777, lng: -79.6248 },
    "MEX": { lat: 19.4326, lng: -99.1332 }, "SAO": { lat: -23.5505, lng: -46.6333 },
    "GRU": { lat: -23.4356, lng: -46.4731 }, "BUE": { lat: -34.6037, lng: -58.3816 },
    // Oceania
    "SYD": { lat: -33.8688, lng: 151.2093 }, "MEL": { lat: -37.8136, lng: 144.9631 },
}

/** Extract first IATA code from a string like "Москва (SVO)" → "SVO" */
function extractIata(text: string): string | null {
    if (!text) return null
    const m = text.match(/\(([A-Z]{3})\)/)
    return m ? m[1] : null
}

/** Get city coordinates from IATA code */
function coordsFromIata(iata?: string | null): { lat: number; lng: number } | null {
    if (!iata) return null
    return IATA_COORDS[iata] || null
}

export default function TripMap({ places, activePlaceId, onPlaceSelect }: TripMapProps) {
    const { points, arcs } = useMemo(() => {
        if (!places || places.length === 0) return { points: [], arcs: [] }

        const newPoints: any[] = []
        const newArcs: any[] = []

        // Fallback: last resolved city coords
        let fallbackLat = 55.7558  // Moscow
        let fallbackLng = 37.6173

        places.forEach((place, i) => {
            let lat: number
            let lng: number
            const isFlight = place.type === "transport" || /перелёт|перелет|рейс|flight/i.test(place.name || "")

            // 1) Explicit coords — skip for flights (AI sets destination coords on transport activities)
            if (typeof place.lat === "number" && typeof place.lng === "number" && !isFlight) {
                lat = place.lat
                lng = place.lng
            // 2) For flight: use ORIGIN iata coordinates (where the plane DEPARTS from)
            } else if (isFlight && place.originIata && IATA_COORDS[place.originIata]) {
                lat = IATA_COORDS[place.originIata].lat
                lng = IATA_COORDS[place.originIata].lng
            // 3) For flight: try to extract origin IATA from title
            } else if (isFlight) {
                // "Перелёт Москва (SVO) → Вена (VIE)" — origin is before →
                const beforeArrow = (place.name || "").split(/→|->|—>/)[0]
                const originIata = extractIata(beforeArrow)
                const c = coordsFromIata(originIata)
                if (c) {
                    lat = c.lat
                    lng = c.lng
                } else {
                    lat = fallbackLat + (Math.random() - 0.5) * 0.01
                    lng = fallbackLng + (Math.random() - 0.5) * 0.01
                }
            // 4) Non-flight: small jitter around fallback (same city)
            } else {
                lat = fallbackLat + (Math.random() - 0.5) * 0.04
                lng = fallbackLng + (Math.random() - 0.5) * 0.04
            }

            // Build the arc
            if (isFlight) {
                // Flight arc: origin → destination
                let destLat: number | null = null
                let destLng: number | null = null

                const destIata = place.destIata ||
                    extractIata((place.name || "").split(/→|->|—>/)[1] || "")
                const dc = coordsFromIata(destIata)
                if (dc) { destLat = dc.lat; destLng = dc.lng }

                if (destLat !== null && destLng !== null) {
                    newArcs.push({
                        startLat: lat, startLng: lng,
                        endLat: destLat, endLng: destLng,
                        mode: "flight", icon: "✈",
                    })
                    // Update fallback to destination (next activities are there)
                    fallbackLat = destLat
                    fallbackLng = destLng
                } else {
                    fallbackLat = lat
                    fallbackLng = lng
                }
            } else {
                // Regular arc from previous point
                if (newPoints.length > 0) {
                    const prev = newPoints[newPoints.length - 1]
                    newArcs.push({
                        startLat: prev.lat, startLng: prev.lng,
                        endLat: lat, endLng: lng,
                        mode: "road",
                    })
                }
                fallbackLat = lat
                fallbackLng = lng
            }

            newPoints.push({
                lat, lng,
                label: i + 1,
                title: place.name,
                desc: place.description,
                image: place.image,
                price: place.price,
                time: place.time,
                bookingLink: place.bookingLink,
                day: place.day,
                color: place.status === "active" || place.id === activePlaceId ? "#ef4444" : "#3b82f6",
                data: place,
            })
        })

        return { points: newPoints, arcs: newArcs }
    }, [places, activePlaceId])

    const handlePointClick = (point: any) => {
        if (point.data?.id && onPlaceSelect) {
            onPlaceSelect(point.data.id)
        }
    }

    return (
        <ErrorBoundary fallback={
            <div className="relative w-full h-full bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
                <div className="text-center text-white/50 p-6">
                    <div className="text-2xl mb-2">🗺️</div>
                    <p className="text-sm">Карта временно недоступна</p>
                </div>
            </div>
        }>
            <div className="relative w-full h-full bg-zinc-900 rounded-2xl overflow-hidden border border-white/10">
                <MapLibreView
                    points={points}
                    arcs={arcs}
                    settings={{
                        showGlobe: true,
                        mapStyle: "satellite",
                        showLabels: true,
                        showSocialLayer: false,
                        show3DBuildings: false
                    }}
                    onPointClick={handlePointClick}
                    flyTo={points.length > 0 && points[0].lat ? { lat: points[0].lat, lng: points[0].lng, altitude: 4 } : undefined}
                />
            </div>
        </ErrorBoundary>
    )
}
