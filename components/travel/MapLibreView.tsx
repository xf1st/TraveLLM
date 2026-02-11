"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { DEFAULT_TRAVEL_IMAGE } from "@/lib/image-utils"

interface MapLibreViewProps {
  points: any[]
  arcs: any[]
  refreshToken?: string | number
  flyTo?: { lat: number; lng: number; altitude?: number } | null
  routingLine?: {
    geometry: { type: "LineString"; coordinates: [number, number][] }
    mode: "flight" | "walk" | "road" | "rail"
    transportLabel?: string
    distanceKm?: number
    durationMin?: number
    targetTitle?: string
  } | null
  settings?: {
    showLabels: boolean
    show3DBuildings: boolean
    showSocialLayer: boolean
    showGlobe: boolean
    mapStyle: "dark" | "satellite" | "street"
  }
  nearbyPoints?: any[]
}

export default function MapLibreView({ points, arcs, refreshToken, flyTo, routingLine, settings, nearbyPoints = [] }: MapLibreViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const currentSettingsRef = useRef(settings)
  const routePointsRef = useRef<any[]>(points || [])
  const routeArcsRef = useRef<any[]>(arcs || [])
  const nearbyPointsRef = useRef<any[]>(nearbyPoints || [])
  const routingLineRef = useRef<MapLibreViewProps["routingLine"]>(routingLine || null)
  const appliedStyleRef = useRef<"dark" | "satellite" | "street" | null>(null)
  const appliedProjectionRef = useRef<"globe" | "mercator" | null>(null)
  const socialDataRef = useRef<any[]>([])
  const socialFetchAbortRef = useRef<AbortController | null>(null)
  const socialFetchKeyRef = useRef<string>("")
  const socialFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getStyle = (style: string) => {
    const layers: any[] = []
    let sources: any = {}

    if (style === "satellite") {
      sources = {
        "satellite-source": {
          type: "raster",
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
          maxzoom: 19,
        },
        "satellite-labels": {
          type: "raster",
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
          maxzoom: 13,
        },
      }
      layers.push({ id: "satellite-layer", type: "raster", source: "satellite-source", paint: {} })
      layers.push({ id: "satellite-labels-layer", type: "raster", source: "satellite-labels", paint: {} })
    } else if (style === "street") {
      sources = {
        "osm-source": {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "&copy; OpenStreetMap Contributors",
          maxzoom: 19,
        },
      }
      layers.push({ id: "osm-layer", type: "raster", source: "osm-source", paint: {} })
    } else {
      sources = {
        "carto-dark": {
          type: "raster",
          tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"],
          tileSize: 256,
          attribution: "&copy; CARTO",
          maxzoom: 19,
        },
      }
      layers.push({ id: "carto-layer", type: "raster", source: "carto-dark", paint: {} })
    }

    return {
      version: 8,
      sources,
      layers,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    }
  }

  useEffect(() => {
    currentSettingsRef.current = settings
  }, [settings])

  useEffect(() => {
    routePointsRef.current = Array.isArray(points) ? points : []
    routeArcsRef.current = Array.isArray(arcs) ? arcs : []
  }, [points, arcs])

  useEffect(() => {
    nearbyPointsRef.current = Array.isArray(nearbyPoints) ? nearbyPoints : []
  }, [nearbyPoints])

  useEffect(() => {
    routingLineRef.current = routingLine || null
  }, [routingLine])

  const ensureRouteLayersOnTop = () => {
    if (!map.current) return
    ;["route-line", "route-segment-icons", "route-points", "point-labels"].forEach((layerId) => {
      if (map.current?.getLayer(layerId)) {
        map.current.moveLayer(layerId)
      }
    })
  }

  const addCoreLayers = () => {
    if (!map.current || !map.current.isStyleLoaded()) return
    const currentSettings = currentSettingsRef.current

    if (!map.current.getSource("route-data")) {
      map.current.addSource("route-data", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
    }
    if (!map.current.getSource("nearby-data")) {
      map.current.addSource("nearby-data", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
    }
    if (!map.current.getSource("routing-data")) {
      map.current.addSource("routing-data", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
    }
    if (!map.current.getSource("social-data")) {
      map.current.addSource("social-data", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
    }

    if (!map.current.getLayer("route-line")) {
      map.current.addLayer({
        id: "route-line",
        type: "line",
        source: "route-data",
        filter: ["==", "$type", "LineString"],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": [
            "coalesce",
            ["get", "lineColor"],
            ["match", ["get", "mode"], "flight", "#38bdf8", "walk", "#a16207", "rail", "#facc15", "road", "#facc15", "#a78bfa"],
          ],
          "line-width": ["match", ["get", "mode"], "flight", 2.6, "walk", 3.4, "rail", 3.6, "road", 3.6, 3],
          "line-opacity": 0.9,
          "line-dasharray": [
            "match",
            ["get", "mode"],
            "flight",
            ["literal", [1.4, 1.3]],
            "walk",
            ["literal", [0.4, 1.1]],
            "rail",
            ["literal", [1, 0.6]],
            "road",
            ["literal", [1.8, 0.8]],
            ["literal", [1, 0]],
          ],
        },
      })
    }

    if (!map.current.getLayer("route-segment-icons")) {
      map.current.addLayer({
        id: "route-segment-icons",
        type: "symbol",
        source: "route-data",
        filter: ["==", "$type", "LineString"],
        layout: {
          "symbol-placement": "line-center",
          "text-field": ["coalesce", ["get", "icon"], ""],
          "text-font": ["Open Sans Bold"],
          "text-size": 16,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
        },
      })
    }

    if (!map.current.getLayer("route-points")) {
      map.current.addLayer({
        id: "route-points",
        type: "circle",
        source: "route-data",
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 8.5,
          "circle-color": ["coalesce", ["get", "color"], "#14b8a6"],
          "circle-stroke-width": 2.2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.98,
        },
      })
    }

    if (!map.current.getLayer("point-labels")) {
      map.current.addLayer({
        id: "point-labels",
        type: "symbol",
        source: "route-data",
        filter: ["==", "$type", "Point"],
        layout: {
          "text-field": ["get", "title"],
          "text-font": ["Open Sans Bold"],
          "text-offset": [0, -2],
          "text-anchor": "bottom",
          "text-size": 12,
          "text-max-width": 12,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          visibility: currentSettings?.showLabels ? "visible" : "none",
        },
        paint: {
          "text-color": "#ecfeff",
          "text-halo-color": "#001012",
          "text-halo-width": 2.2,
          "text-halo-blur": 1,
        },
      })
    }

    if (!map.current.getLayer("nearby-points")) {
      map.current.addLayer({
        id: "nearby-points",
        type: "circle",
        source: "nearby-data",
        paint: {
          "circle-radius": 5,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      })
    }

    if (!map.current.getLayer("routing-line")) {
      map.current.addLayer({
        id: "routing-line",
        type: "line",
        source: "routing-data",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["match", ["get", "mode"], "walk", "#a16207", "road", "#facc15", "rail", "#facc15", "#3b82f6"],
          "line-width": 3.4,
          "line-opacity": 0.9,
          "line-dasharray": ["match", ["get", "mode"], "walk", ["literal", [0.4, 1.1]], ["literal", [1.8, 0.8]]],
        },
      })
    }

    if (!map.current.getLayer("social-roads")) {
      map.current.addLayer({
        id: "social-roads",
        type: "line",
        source: "social-data",
        filter: ["==", ["get", "kind"], "road"],
        minzoom: 6,
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: currentSettings?.showSocialLayer ? "visible" : "none",
        },
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#d1d5db"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.7, 10, 1.2, 13, 2, 16, 3],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.35, 12, 0.65, 16, 0.85],
        },
      })
    }

    if (!map.current.getLayer("social-pois")) {
      map.current.addLayer({
        id: "social-pois",
        type: "circle",
        source: "social-data",
        filter: ["==", ["get", "kind"], "poi"],
        minzoom: 7,
        layout: {
          visibility: currentSettings?.showSocialLayer ? "visible" : "none",
        },
        paint: {
          "circle-color": [
            "match",
            ["get", "category"],
            "food",
            "#fb923c",
            "culture",
            "#60a5fa",
            "nature",
            "#34d399",
            "shopping",
            "#a78bfa",
            "fun",
            "#ec4899",
            "#22d3ee",
          ],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 2.2, 10, 3.5, 13, 5],
          "circle-stroke-width": 0.8,
          "circle-stroke-color": "#f8fafc",
          "circle-opacity": 0.8,
        },
      })
    }

    if (!map.current.getLayer("social-poi-labels")) {
      map.current.addLayer({
        id: "social-poi-labels",
        type: "symbol",
        source: "social-data",
        filter: ["==", ["get", "kind"], "poi"],
        minzoom: 12,
        layout: {
          "text-field": ["get", "title"],
          "text-font": ["Open Sans Semibold"],
          "text-size": 10,
          "text-anchor": "top",
          "text-offset": [0, 0.9],
          "text-max-width": 12,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          visibility: currentSettings?.showSocialLayer ? "visible" : "none",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
          "text-halo-blur": 0.5,
        },
      })
    }

    ensureRouteLayersOnTop()
  }

  const updateRouteData = () => {
    if (!map.current) return
    if (!map.current.getSource("route-data")) {
      addCoreLayers()
      if (!map.current.getSource("route-data")) {
        map.current.once("idle", updateRouteData)
        return
      }
    }

    const activePoints = routePointsRef.current
    const activeArcs = routeArcsRef.current

    const features: any[] = []
    if (Array.isArray(activePoints) && activePoints.length > 0) {
      if (Array.isArray(activeArcs) && activeArcs.length > 0) {
        activeArcs.forEach((segment: any) => {
          const coordinates =
            Array.isArray(segment?.coordinates) && segment.coordinates.length > 1
              ? segment.coordinates
              : Number.isFinite(segment?.startLng) && Number.isFinite(segment?.startLat) && Number.isFinite(segment?.endLng) && Number.isFinite(segment?.endLat)
                ? [
                    [segment.startLng, segment.startLat],
                    [segment.endLng, segment.endLat],
                  ]
                : null

          if (!coordinates) return
          features.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates },
            properties: {
              mode: segment.mode || "road",
              icon: segment.icon || "",
              lineColor: segment.lineColor || "",
              fromTitle: segment.fromTitle || "",
              toTitle: segment.toTitle || "",
              distanceKm: Number.isFinite(segment.distanceKm) ? segment.distanceKm : null,
              durationMin: Number.isFinite(segment.durationMin) ? segment.durationMin : null,
            },
          })
        })
      } else if (activePoints.length > 1) {
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: activePoints.map((p) => [p.lng, p.lat]) },
          properties: { mode: "road", icon: "🚗", lineColor: "#facc15" },
        })
      }

      activePoints.forEach((p) => {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: {
            kind: "route",
            sourceType: "route",
            title: p.title || p.label || "",
            description: p.desc || "",
            image: p.image || DEFAULT_TRAVEL_IMAGE,
            price: p.price || "",
            time: p.time || "",
            day: p.day || 1,
            bookingLink: p.bookingLink || "",
            color: p.color || "#ef4444",
          },
        })
      })
    }

    ;(map.current.getSource("route-data") as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features,
    })
  }

  const updateNearbyData = () => {
    if (!map.current) return
    if (!map.current.getSource("nearby-data")) {
      addCoreLayers()
      if (!map.current.getSource("nearby-data")) {
        map.current.once("idle", updateNearbyData)
        return
      }
    }
    const activeNearby = nearbyPointsRef.current
    const features = Array.isArray(activeNearby)
      ? activeNearby.map((p: any) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: {
            title: p.title || p.label || "Место",
            description: p.desc || "",
            color: p.color || "#34d399",
            category: p.type || "nearby",
            source: "nearby",
            day: p.day || 1,
            time: p.time || "Сейчас",
            distanceKm: Number.isFinite(Number(p.distanceKm)) ? Number(p.distanceKm) : null,
          },
        }))
      : []

    ;(map.current.getSource("nearby-data") as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: features as any,
    })
  }

  const updateRoutingData = () => {
    if (!map.current) return
    if (!map.current.getSource("routing-data")) {
      addCoreLayers()
      if (!map.current.getSource("routing-data")) {
        map.current.once("idle", updateRoutingData)
        return
      }
    }
    const features: any[] = []
    const activeRoutingLine = routingLineRef.current
    if (
      activeRoutingLine?.geometry?.type === "LineString" &&
      Array.isArray(activeRoutingLine.geometry.coordinates) &&
      activeRoutingLine.geometry.coordinates.length > 1
    ) {
      features.push({
        type: "Feature",
        geometry: activeRoutingLine.geometry,
        properties: {
          mode: activeRoutingLine.mode || "road",
          transportLabel: activeRoutingLine.transportLabel || "",
          distanceKm: Number.isFinite(activeRoutingLine.distanceKm) ? activeRoutingLine.distanceKm : null,
          durationMin: Number.isFinite(activeRoutingLine.durationMin) ? activeRoutingLine.durationMin : null,
          targetTitle: activeRoutingLine.targetTitle || "",
        },
      })
    }
    ;(map.current.getSource("routing-data") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features })
  }

  const updateSocialData = () => {
    if (!map.current) return
    if (!map.current.getSource("social-data")) {
      addCoreLayers()
      if (!map.current.getSource("social-data")) {
        map.current.once("idle", updateSocialData)
        return
      }
    }

    ;(map.current.getSource("social-data") as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: socialDataRef.current as any,
    })
  }

  const setSocialLayerVisibility = (visible: boolean) => {
    if (!map.current) return
    const target = visible ? "visible" : "none"
    ;["social-roads", "social-pois", "social-poi-labels"].forEach((layerId) => {
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, "visibility", target)
      }
    })
    ensureRouteLayersOnTop()
  }

  const fetchSocialLayerData = async () => {
    if (!map.current) return

    const socialEnabled = !!currentSettingsRef.current?.showSocialLayer
    if (!socialEnabled) {
      socialFetchKeyRef.current = ""
      socialDataRef.current = []
      updateSocialData()
      return
    }

    const zoom = map.current.getZoom()
    if (!Number.isFinite(zoom) || zoom < 6) {
      socialDataRef.current = []
      updateSocialData()
      return
    }

    const bounds = map.current.getBounds()
    const south = Number(bounds.getSouth().toFixed(4))
    const west = Number(bounds.getWest().toFixed(4))
    const north = Number(bounds.getNorth().toFixed(4))
    const east = Number(bounds.getEast().toFixed(4))
    const roundedZoom = Math.round(zoom * 2) / 2
    const fetchKey = `${roundedZoom}:${south}:${west}:${north}:${east}`

    if (socialFetchKeyRef.current === fetchKey) return
    socialFetchKeyRef.current = fetchKey

    socialFetchAbortRef.current?.abort()
    const abortController = new AbortController()
    socialFetchAbortRef.current = abortController

    try {
      const response = await fetch("/api/social-layer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          bbox: { south, west, north, east },
          zoom: roundedZoom,
        }),
      })

      if (!response.ok) return
      const payload = await response.json()
      if (!Array.isArray(payload?.features)) return

      socialDataRef.current = payload.features
      updateSocialData()
    } catch (error: any) {
      if (error?.name === "AbortError") return
      console.warn("Social layer fetch failed:", error)
    }
  }

  const scheduleSocialLayerFetch = () => {
    if (socialFetchTimerRef.current) {
      clearTimeout(socialFetchTimerRef.current)
    }
    socialFetchTimerRef.current = setTimeout(() => {
      void fetchSocialLayerData()
    }, 260)
  }

  const ensureDataLayersReady = () => {
    if (!map.current) return

    if (!map.current.isStyleLoaded()) {
      map.current.once("idle", ensureDataLayersReady)
      return
    }

    addCoreLayers()

    const latestSettings = currentSettingsRef.current
    if (latestSettings && map.current.getLayer("point-labels")) {
      map.current.setLayoutProperty("point-labels", "visibility", latestSettings.showLabels ? "visible" : "none")
    }
    ;["route-points", "route-line", "route-segment-icons"].forEach((layerId) => {
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, "visibility", "visible")
      }
    })
    setSocialLayerVisibility(!!latestSettings?.showSocialLayer)

    updateRouteData()
    updateNearbyData()
    updateRoutingData()
    updateSocialData()
    scheduleSocialLayerFetch()
  }

  const bindPointPopupEvents = () => {
    if (!map.current) return

    const onPointClick = (e: any) => {
      const features = map.current?.queryRenderedFeatures(e.point, { layers: ["route-points", "nearby-points", "social-pois"] })
      if (!features || features.length === 0) return

      const priorityByLayer: Record<string, number> = {
        "route-points": 3,
        "nearby-points": 2,
        "social-pois": 1,
      }
      const feature =
        features
          .slice()
          .sort((a: any, b: any) => (priorityByLayer[b?.layer?.id] || 0) - (priorityByLayer[a?.layer?.id] || 0))[0] || features[0]
      const layerId = feature?.layer?.id
      const props = feature.properties || {}
      const coords = (feature.geometry as any)?.coordinates?.slice?.() || []
      if (!coords || coords.length < 2 || Number.isNaN(coords[0]) || Number.isNaN(coords[1])) return

      const popupNode = document.createElement("div")
      const safeTitle = String(props.title || "Точка").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;")
      const dayRaw = Number(props.day)
      const day = Number.isFinite(dayRaw) && dayRaw > 0 ? dayRaw : null
      const time = String(props.time || (layerId === "social-pois" ? "Рядом" : "Днём"))
      const price = String(props.price || "")
      const description = String(props.description || "Интересное место")
      const image = String(props.image || "")
      const safeImage = image.replace(/"/g, "&quot;")
      const canOpenDetails = layerId === "route-points"
      const source = layerId === "nearby-points" ? "nearby" : layerId === "social-pois" ? "social" : "route"
      const category = String(props.category || "")
      const distanceRaw = Number(props.distanceKm)
      const distanceKm = Number.isFinite(distanceRaw) ? distanceRaw : null
      const poiDetailEncoded = encodeURIComponent(
        JSON.stringify({
          source,
          category,
          title: String(props.title || "Точка"),
          description: String(props.description || ""),
          day,
          time,
          lat: coords[1],
          lng: coords[0],
          distanceKm,
        }),
      )
      const leftAction = canOpenDetails
        ? `<button onclick="window.dispatchEvent(new CustomEvent('map-show-detail', {detail: {day: ${day}, title: '${safeTitle}'}}))" class="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border border-emerald-500/20 text-center cursor-pointer">
            Подробнее
          </button>`
        : `<button onclick="window.dispatchEvent(new CustomEvent('map-open-poi', {detail: JSON.parse(decodeURIComponent('${poiDetailEncoded}'))}))" class="flex-1 py-2 bg-white/10 hover:bg-white/15 text-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border border-white/10 text-center cursor-pointer">
            Открыть
          </button>`

      popupNode.innerHTML = `
        <div class="w-[260px] max-w-[calc(100vw-32px)] bg-neutral-900/95 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl border border-white/10 font-sans">
          <div class="h-36 bg-zinc-800 relative overflow-hidden">
            ${
              image
                ? `<img src="${safeImage}" class="absolute inset-0 w-full h-full object-cover" alt="${safeTitle}" onerror="this.onerror=null;this.src='${DEFAULT_TRAVEL_IMAGE}'" />`
                : `<img src="${DEFAULT_TRAVEL_IMAGE}" class="absolute inset-0 w-full h-full object-cover" alt="${safeTitle}" />`
            }
            <div class="absolute inset-0 bg-gradient-to-t from-neutral-900/90 via-transparent to-transparent"></div>
            <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] uppercase font-bold text-emerald-400 border border-white/10 shadow-lg flex gap-2">
              ${price ? `<span class="text-white">${price}</span> <span class="text-white/30">|</span>` : ""}
              <span>${day ? `День ${day} • ${time}` : time}</span>
            </div>
          </div>
          <div class="p-4 relative -mt-6 z-10">
            <h3 class="font-bold text-sm text-white leading-tight mb-1.5 truncate pr-2 drop-shadow-md">${safeTitle}</h3>
            <div class="text-xs text-gray-300 line-clamp-2 leading-relaxed mb-3 min-h-[2.5em]">${description}</div>
            <div class="flex gap-2">
              ${leftAction}
              <button onclick="window.dispatchEvent(new CustomEvent('map-route-to', {detail: {lat: ${coords[1]}, lng: ${coords[0]}, title: '${safeTitle}'}}))" class="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-300 transition-all border border-blue-500/20 cursor-pointer text-[10px] font-bold uppercase tracking-wide">
                Маршрут
              </button>
            </div>
          </div>
        </div>
      `

      const popup = new maplibregl.Popup({ closeButton: false, className: "map-popup-glass" }).setLngLat(coords).setDOMContent(popupNode).addTo(map.current!)
      popup.on("close", () => {
        window.dispatchEvent(new CustomEvent("map-clear-route"))
      })
    }

    map.current.on("click", "route-points", onPointClick)
    map.current.on("click", "nearby-points", onPointClick)
    map.current.on("click", "social-pois", onPointClick)
    map.current.on("mouseenter", "route-points", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer"
    })
    map.current.on("mouseleave", "route-points", () => {
      if (map.current) map.current.getCanvas().style.cursor = ""
    })
    map.current.on("mouseenter", "nearby-points", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer"
    })
    map.current.on("mouseleave", "nearby-points", () => {
      if (map.current) map.current.getCanvas().style.cursor = ""
    })
    map.current.on("mouseenter", "social-pois", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer"
    })
    map.current.on("mouseleave", "social-pois", () => {
      if (map.current) map.current.getCanvas().style.cursor = ""
    })
  }

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const initialStyle = settings?.mapStyle || "satellite"
    const handleMoveEnd = () => {
      scheduleSocialLayerFetch()
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getStyle(initialStyle) as any,
      center: [0, 20],
      zoom: 1.5,
      maxZoom: 18.8,
      renderWorldCopies: false,
      attributionControl: false,
    })
    appliedStyleRef.current = initialStyle as "dark" | "satellite" | "street"

    map.current.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      "bottom-right",
    )

    map.current.on("load", () => {
      const latestSettings = currentSettingsRef.current
      const projection: "globe" | "mercator" = latestSettings?.showGlobe ? "globe" : "mercator"
      map.current?.setProjection({ type: projection })
      appliedProjectionRef.current = projection
      bindPointPopupEvents()
      ensureDataLayersReady()
      scheduleSocialLayerFetch()
    })

    map.current.on("styledata", () => {
      ensureDataLayersReady()
    })
    map.current.on("moveend", handleMoveEnd)

    return () => {
      if (socialFetchTimerRef.current) clearTimeout(socialFetchTimerRef.current)
      socialFetchAbortRef.current?.abort()
      map.current?.off("moveend", handleMoveEnd)
      map.current?.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!map.current || !settings) return

    const mapInstance = map.current
    const targetProjection: "globe" | "mercator" = settings.showGlobe ? "globe" : "mercator"
    const targetStyle: "dark" | "satellite" | "street" = settings.mapStyle
    let cancelled = false

    const applySettings = () => {
      if (cancelled || !map.current) return

      if (!map.current.isStyleLoaded()) {
        map.current.once("idle", applySettings)
        return
      }

      try {
        if (appliedStyleRef.current !== targetStyle) {
          map.current.setStyle(getStyle(targetStyle) as any)
          appliedStyleRef.current = targetStyle
          map.current.once("idle", ensureDataLayersReady)
          map.current.once("idle", applySettings)
          return
        }

        if (appliedProjectionRef.current !== targetProjection) {
          map.current.setProjection({ type: targetProjection })
          appliedProjectionRef.current = targetProjection
        }
      } catch (error) {
        console.warn("Map settings apply deferred:", error)
        map.current.once("idle", applySettings)
      }
    }

    if (!mapInstance.isStyleLoaded()) {
      mapInstance.once("idle", applySettings)
    } else {
      applySettings()
    }

    return () => {
      cancelled = true
    }
  }, [settings?.showGlobe, settings?.mapStyle])

  useEffect(() => {
    if (!map.current || !settings) return
    if (map.current.getLayer("point-labels")) {
      map.current.setLayoutProperty("point-labels", "visibility", settings.showLabels ? "visible" : "none")
    }
  }, [settings?.showLabels])

  useEffect(() => {
    if (!map.current || !settings) return
    setSocialLayerVisibility(!!settings.showSocialLayer)
    if (settings.showSocialLayer) {
      scheduleSocialLayerFetch()
    } else {
      socialDataRef.current = []
      updateSocialData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.showSocialLayer])

  useEffect(() => {
    updateRouteData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, arcs])

  useEffect(() => {
    updateNearbyData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyPoints])

  useEffect(() => {
    updateRoutingData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routingLine])

  useEffect(() => {
    if (!map.current || !flyTo) return
    map.current.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: 12,
      speed: 1.2,
      essential: true,
    })
  }, [flyTo])

  useEffect(() => {
    if (!map.current || !routingLine?.geometry?.coordinates?.length) return

    const bounds = new maplibregl.LngLatBounds()
    routingLine.geometry.coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]))
    if (bounds.isEmpty()) return

    map.current.fitBounds(bounds, {
      padding: 80,
      duration: 900,
      maxZoom: 14,
      essential: true,
    })
  }, [routingLine])

  useEffect(() => {
    if (!map.current) return
    const timer = setTimeout(() => {
      if (!map.current) return
      map.current.resize()
      ensureDataLayersReady()
      updateRouteData()
      updateNearbyData()
      updateRoutingData()
      ensureRouteLayersOnTop()
    }, 40)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken])

  return <div ref={mapContainer} className="w-full h-full absolute inset-0 z-0 bg-black" />
}

