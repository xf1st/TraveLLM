"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"

// Dynamically import Globe to avoid SSR issues with window/document
const Globe = dynamic(() => import("react-globe.gl"), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-black/90 flex items-center justify-center text-white">Loading Globe...</div>
})

interface RoutePoint {
    lat: number
    lng: number
    label?: string
    color?: string
}

interface RouteArc {
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    color?: string | string[]
    dashLength?: number
    dashGap?: number
    animateTime?: number
}

interface GlobeViewProps {
    points: any[]
    arcs: any[]
    onPointClick?: (point: any) => void
    onZoom?: (altitude: number, lat: number, lng: number) => void
    flyTo?: { lat: number, lng: number, altitude?: number } | null
}

const GlobeView = ({ points, arcs, onPointClick, onZoom, flyTo }: GlobeViewProps) => {
    const globeEl = useRef<any>(null)
    const [mounted, setMounted] = useState(false)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

    useEffect(() => {
        setMounted(true)
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight
        })

        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            })
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (globeEl.current && flyTo) {
            globeEl.current.pointOfView({
                lat: flyTo.lat,
                lng: flyTo.lng,
                altitude: flyTo.altitude || 0.6
            }, 1000)
        }
    }, [flyTo])

    useEffect(() => {
        if (globeEl.current) {
            const controls = globeEl.current.controls()
            if (controls) {
                const handleChange = () => {
                    const pov = globeEl.current.pointOfView()
                    onZoom?.(pov.altitude, pov.lat, pov.lng)
                }
                controls.addEventListener('change', handleChange)
                return () => controls.removeEventListener('change', handleChange)
            }
        }
    }, [])

    if (!mounted) return null

    return (
        <div className="w-full h-full bg-black absolute inset-0 z-0 touch-none">
            <Globe
                ref={globeEl}
                width={dimensions.width}
                height={dimensions.height}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                atmosphereColor="#3a228a"
                atmosphereAltitude={0.15}
                animateIn={true}
                
                // Points
                pointsData={points}
                pointLat="lat"
                pointLng="lng"
                pointColor={(d: any) => d.color || "#f43f5e"}
                pointAltitude={0.05}
                pointRadius={0.5}
                onPointClick={onPointClick as any}

                // Arcs
                arcsData={arcs}
                arcStartLat="startLat"
                arcStartLng="startLng"
                arcEndLat="endLat"
                arcEndLng="endLng"
                arcColor={(d: any) => d.color || ["#d946ef", "#8b5cf6"]}
                arcDashLength={0.4}
                arcDashGap={2}
                arcDashAnimateTime={(d: any) => d.animateTime || 2000}
                arcStroke={0.5}
            />
        </div>
    )
}

export { GlobeView }
