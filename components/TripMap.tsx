"use client"

import { useMemo, useState } from "react"
import { TravelMap } from "./travel/TravelMap"

interface TripMapProps {
    places: any[]
    activePlaceId?: string
    onPlaceSelect?: (placeId: string) => void
}

// Mock coordinates for fallback
const MOCK_COORDS: Record<string, { lat: number, lng: number }> = {
    "Paris": { lat: 48.8566, lng: 2.3522 },
    "London": { lat: 51.5074, lng: -0.1278 },
    "Dubai": { lat: 25.2048, lng: 55.2708 },
    "Tokyo": { lat: 35.6762, lng: 139.6503 },
    "New York": { lat: 40.7128, lng: -74.0060 },
    "Moscow": { lat: 55.7558, lng: 37.6173 },
    "Rome": { lat: 41.9028, lng: 12.4964 },
    "Berlin": { lat: 52.5200, lng: 13.4050 },
    "Istanbul": { lat: 41.0082, lng: 28.9784 },
    "Bangkok": { lat: 13.7563, lng: 100.5018 },
}

export default function TripMap({ places, activePlaceId, onPlaceSelect }: TripMapProps) {
    const [viewState, setViewState] = useState({ lat: 20, lng: 0, zoom: 1.5 })

    const { points, arcs } = useMemo(() => {
        if (!places || places.length === 0) return { points: [], arcs: [] }

        const newPoints: any[] = []
        const newArcs: any[] = []

        // Mock Coords logic
        const getCityCoords = (name: string) => {
            if (!name) return null
            const key = Object.keys(MOCK_COORDS).find(k => name.includes(k))
            return key ? MOCK_COORDS[key] : null
        }

        let currentLat = 48.8566
        let currentLng = 2.3522

        // Try to start at a known location
        const startPlace = places[0]
        const startCity = getCityCoords(startPlace?.name) || getCityCoords(startPlace?.description) 
        if (startCity) {
            currentLat = startCity.lat
            currentLng = startCity.lng
        }

        places.forEach((place, i) => {
            // Check if place has explicit coordinates
            if (place.lat && place.lng) {
                currentLat = place.lat
                currentLng = place.lng
            } else {
                // Try to resolve city from name
                const city = getCityCoords(place.name)
                if (city) {
                    currentLat = city.lat
                    currentLng = city.lng
                } else {
                    // Add noise to separate points in same city
                    currentLat += (Math.random() - 0.5) * 0.05
                    currentLng += (Math.random() - 0.5) * 0.05
                }
            }

            const point = {
                lat: currentLat,
                lng: currentLng,
                label: place.name,
                color: place.status === 'active' || place.id === activePlaceId ? '#ef4444' : '#3b82f6',
                data: place 
            }
            newPoints.push(point)

            // Create arc from previous point
            if (i > 0) {
                const prev = newPoints[i - 1]
                newArcs.push({
                    startLat: prev.lat,
                    startLng: prev.lng,
                    endLat: point.lat,
                    endLng: point.lng,
                    color: '#8b5cf6'
                })
            }
        })

        return { points: newPoints, arcs: newArcs }
    }, [places, activePlaceId])

    const handlePointClick = (point: any) => {
        if (point.data?.id && onPlaceSelect) {
            onPlaceSelect(point.data.id)
        }
    }

    return (
        <TravelMap
            points={points}
            arcs={arcs}
            viewState={viewState}
            onViewStateChange={setViewState}
            onPointClick={handlePointClick}
        />
    )
}
