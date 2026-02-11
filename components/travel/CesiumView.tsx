"use client"

import { useEffect, useState, useMemo } from "react"
import dynamic from "next/dynamic"

// Import Cesium CSS
import "cesium/Build/Cesium/Widgets/widgets.css"

// Dynamically import Resium components to avoid SSR issues
const Viewer = dynamic(() => import("resium").then(mod => mod.Viewer), { ssr: false })
const Entity = dynamic(() => import("resium").then(mod => mod.Entity), { ssr: false })
const CameraFlyTo = dynamic(() => import("resium").then(mod => mod.CameraFlyTo), { ssr: false })
const PointGraphics = dynamic(() => import("resium").then(mod => mod.PointGraphics), { ssr: false })
const PolylineGraphics = dynamic(() => import("resium").then(mod => mod.PolylineGraphics), { ssr: false })
const Globe = dynamic(() => import("resium").then(mod => mod.Globe), { ssr: false })
const ImageryLayer = dynamic(() => import("resium").then(mod => mod.ImageryLayer), { ssr: false })

// We need to import Cesium to use its types and static methods
import * as Cesium from "cesium"

// Set base URL to standard CDN to avoid local asset copying issues
if (typeof window !== "undefined") {
    (window as any).CESIUM_BASE_URL = "https://unpkg.com/cesium@1.118.2/Build/Cesium/";
}

interface CesiumViewProps {
    points: any[]
    arcs: any[]
    flyTo?: { lat: number, lng: number, altitude?: number } | null
}

// ... imports

// Force ArcGIS Satellite (High Value, Free, No Token)
function getBaseLayer() {
    if (typeof window === 'undefined') return null
    return new Cesium.UrlTemplateImageryProvider({
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        credit: "Esri, Maxar, Earthstar Geographics, and the GIS User Community"
    })
}

// Labels Overlay
function getLabelLayer() {
    if (typeof window === 'undefined') return null
    return new Cesium.UrlTemplateImageryProvider({
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
    })
}

export default function CesiumView({ points, arcs, flyTo }: CesiumViewProps) {
    const [mounted, setMounted] = useState(false)
    
    // Initialize immediately with Satellite + Labels
    const [imageryProvider] = useState<any>(getBaseLayer)
    const [labelProvider] = useState<any>(getLabelLayer)

    const [terrainProvider, setTerrainProvider] = useState<any>(() => {
        if (typeof window === 'undefined') return null
        return new Cesium.EllipsoidTerrainProvider()
    })

    useEffect(() => {
        setMounted(true)
    }, [])

    // Memoize Cartesian3 positions for points
    const pointEntities = useMemo(() => {
        return points.map((p, i) => ({
             id: `point-${i}`,
             position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat, 100), // Lift slightly above terrain
             color: Cesium.Color.fromCssColorString(p.color || "#ef4444"),
             label: p.label,
             desc: p.desc
        }))
    }, [points])

    // Memoize path positions
    const pathPositions = useMemo(() => {
        if (points.length < 2) return null
        // Create a single path connecting all points in order
        return Cesium.Cartesian3.fromDegreesArray(
            points.flatMap(p => [p.lng, p.lat])
        )
    }, [points])

    if (!mounted) return <div className="w-full h-full bg-blue-900 flex items-center justify-center text-white">Loading Globe...</div>

    return (
        <div className="w-full h-full absolute inset-0 z-0 cesium-container">
            <Viewer 
                full 
                timeline={false} 
                animation={false} 
                baseLayerPicker={false}
                // imageryProvider={false} <--- This prop doesn't exist on Resium Viewer, handled by children
                navigationHelpButton={false}
                homeButton={false}
                geocoder={false}
                sceneModePicker={false}
                selectionIndicator={false}
                infoBox={false}
                terrainProvider={terrainProvider || undefined} 
                shadows={false}
            >
                {/* 
                   Render Globe with Lighting OFF to prevent Night-Mode Blackness 
                   baseColor set to Blue in case imagery fails to load (Debugging)
                */}
                <Globe 
                    depthTestAgainstTerrain={false} 
                    enableLighting={false} 
                    showGroundAtmosphere={true}
                    baseColor={Cesium.Color.BLUE} 
                />
                
                {/* 1. Satellite Base */}
                {imageryProvider && (
                    <ImageryLayer imageryProvider={imageryProvider} />
                )}

                {/* 2. Labels Overlay */}
                {labelProvider && (
                    <ImageryLayer imageryProvider={labelProvider} />
                )}


                
                {/* Camera Control */}
                {flyTo && (
                    <CameraFlyTo 
                        destination={Cesium.Cartesian3.fromDegrees(flyTo.lng, flyTo.lat, flyTo.altitude || 5000000)}
                        duration={2}
                    />
                )}

                {/* Render Points */}
                {pointEntities.map(p => (
                    <Entity 
                        key={p.id} 
                        position={p.position}
                        name={p.label}
                        description={p.desc}
                    >
                        <PointGraphics 
                            pixelSize={12} 
                            color={p.color} 
                            outlineColor={Cesium.Color.WHITE} 
                            outlineWidth={2} 
                            disableDepthTestDistance={Number.POSITIVE_INFINITY} // Always visible on top
                        />
                    </Entity>
                ))}

                {/* Render Path (Route) */}
                {pathPositions && (
                    <Entity>
                        <PolylineGraphics 
                            positions={pathPositions}
                            width={4}
                            material={Cesium.Color.fromCssColorString("#a78bfa")}
                        />
                    </Entity>
                )}
            </Viewer>
        </div>
    )
}
