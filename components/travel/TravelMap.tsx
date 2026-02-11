"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Map, { Marker, NavigationControl, Source, Layer, MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { GlobeView } from "./GlobeView"

interface TravelMapProps {
    points: any[]
    arcs: any[]
    viewState: { lat: number, lng: number, zoom: number }
    onViewStateChange: (viewState: { lat: number, lng: number, zoom: number }) => void
    onPointClick?: (point: any) => void
    flyTo?: { lat: number, lng: number, altitude?: number } | null
}

export function TravelMap({ points, arcs, viewState, onViewStateChange, onPointClick, flyTo }: TravelMapProps) {
    const mapRef = useRef<MapRef>(null)
    const [opacity, setOpacity] = useState(0)
    const [showGlobe, setShowGlobe] = useState(true)

    // Calculate opacity based on zoom
    // Globe visible < 4, Mix 4-6, Map > 6
    useEffect(() => {
        const zoom = viewState.zoom
        if (zoom < 3) {
            setOpacity(0)
            setShowGlobe(true)
        } else if (zoom >= 3 && zoom <= 6) {
            // Fade in map
            const t = (zoom - 3) / 3 // 0 to 1
            setOpacity(t)
            setShowGlobe(true)
        } else {
            setOpacity(1)
            setShowGlobe(false) // Optimize performance
        }
    }, [viewState.zoom])

    // Sync Globe to Map
    const handleGlobeZoom = useCallback((altitude: number, lat: number, lng: number) => {
        // Convert altitude to zoom
        // Alt 2.5 -> Zoom 0
        // Alt 0.5 -> Zoom ~4
        const zoom = Math.max(0, Math.min(20, 4 + Math.log2(0.6 / (altitude || 0.001))))
        
        // Only drive if globe is dominant
        // We use a ref or check current state
        // Since we are inside callback, we need dependency on opacity/showGlobe? 
        // Actually, just calculation is enough. The parent will decide to update state.
        // We need to access the LATEST opacity. 
        // But opacity is derived from viewState.zoom.
        
        // Simpler: Just always emit. The check "if (opacity < 0.5)" inside render vs inside callback.
        // If we want to read state inside callback, we need it in dependency.
        // But that breaks true memoization stability if state changes fast.
        // Let's rely on functional update or Ref.
        
        onViewStateChange({ lat, lng, zoom })
       
    }, [onViewStateChange])

    // 3D Buildings Layer
    const buildingLayer = {
        id: '3d-buildings',
        source: 'carto',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 13,
        paint: {
            'fill-extrusion-color': '#263c4f',
            'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13,
                0,
                13.05,
                ['get', 'height']
            ],
            'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13,
                0,
                13.05,
                ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
        }
    }

    return (
        <div className="relative w-full h-full bg-black">
            {/* Globe Layer (Background) */}
            <div className="absolute inset-0 z-0 transition-opacity duration-300" style={{ opacity: showGlobe ? 1 : 0, pointerEvents: opacity < 0.9 ? 'auto' : 'none' }}>
                {showGlobe && (
                    <GlobeView 
                        points={points}
                        arcs={arcs}
                        onZoom={handleGlobeZoom}
                        flyTo={flyTo}
                        // Sync Globe Rotation to Map Center
                        // We actually let globe drive low zoom, so no forced props needed except points
                    />
                )}
            </div>

            {/* MapLibre Layer (Overlay) */}
            <div className="absolute inset-0 z-10" style={{ opacity: opacity, pointerEvents: opacity > 0.1 ? 'auto' : 'none' }}>
                <Map
                    ref={mapRef}
                    initialViewState={{
                        longitude: viewState.lng,
                        latitude: viewState.lat,
                        zoom: viewState.zoom
                    }}
                    {...viewState}
                    onMove={evt => onViewStateChange({ 
                        lat: evt.viewState.latitude, 
                        lng: evt.viewState.longitude, 
                        zoom: evt.viewState.zoom 
                    })}
                    mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                    attributionControl={false}
                >
                    {/* Markers */}
                    {points.map((p, i) => (
                        <Marker 
                            key={i} 
                            longitude={p.lng} 
                            latitude={p.lat}
                            anchor="bottom"
                            onClick={e => {
                                e.originalEvent.stopPropagation()
                                onPointClick?.(p)
                            }}
                        >
                            <div className="group relative cursor-pointer transform transition-transform hover:scale-110">
                                <div 
                                    className="w-4 h-4 rounded-full border-2 border-white shadow-lg relative z-10" 
                                    style={{ backgroundColor: p.color || '#ef4444' }} 
                                />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 rounded-full animate-ping opacity-0 group-hover:opacity-100" />
                                
                                {p.label && (
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                        {p.label}
                                    </div>
                                )}
                            </div>
                        </Marker>
                    ))}

                    <NavigationControl position="top-right" showCompass={false} />
                </Map>
            </div>
        </div>
    )
}
