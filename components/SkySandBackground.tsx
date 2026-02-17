"use client"

import React, { useEffect, useState } from "react"
import {
  Plane,
  MapPin,
  Compass,
  Mountain,
  Palmtree,
  Anchor,
  Tent,
  Ship,
  Sunset,
  Camera,
  Globe,
  CloudSun,
} from "lucide-react"

const ICONS = [
  Plane,
  MapPin,
  Compass,
  Mountain,
  Palmtree,
  Anchor,
  Tent,
  Ship,
  Sunset,
  Camera,
  Globe,
  CloudSun,
]

// To avoid hydration mismatch, we define the structure but populate on client only
interface FloatingIconData {
  id: number
  Icon: any
  style: React.CSSProperties
}

export function SkySandBackground() {
  const [icons, setIcons] = useState<FloatingIconData[]>([])

  useEffect(() => {
    // Generate icons on client side
    const newIcons: FloatingIconData[] = Array.from({ length: 15 }).map((_, i) => {
      const Icon = ICONS[Math.floor(Math.random() * ICONS.length)]
      const left = Math.random() * 100
      const delay = Math.random() * 20
      const duration = 15 + Math.random() * 20
      const size = 16 + Math.random() * 24
      
      return {
        id: i,
        Icon,
        style: {
          position: 'absolute',
          left: `${left}%`,
          // Start below viewport, animation moves it up
          top: '110vh', 
          width: `${size}px`,
          height: `${size}px`,
          animation: `floatIcon ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
          opacity: 0, // start invisible (fade in via keyframe at 10%)
        }
      }
    })
    setIcons(newIcons)
  }, [])

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      {/* 
        Background Gradient: Sky & Sand 
        Start: #0e7fd6
        Mid: #53b1f7
        End: #f5e6d3
        Angle: 160deg
      */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(160deg, #0e7fd6 0%, #53b1f7 40%, #f5e6d3 100%)`
        }}
      />

      {/* Floating Icons Layer */}
      {icons.map(({ id, Icon, style }) => (
        <div
          key={id}
          className="text-white/20 dark:text-white/10"
          style={style}
        >
          <Icon className="w-full h-full" strokeWidth={1.5} />
        </div>
      ))}

      {/* Glowing Orbs */}
      {/* Orb 1: Top Left - Accent Glow */}
      <div 
        className="fixed rounded-full blur-[100px] z-0 opacity-60 mix-blend-screen pointer-events-none"
        style={{
            width: '500px',
            height: '500px',
            background: 'rgba(88, 196, 255, 0.4)',
            top: '10%',
            left: '-10%',
            animation: 'orbFloat1 18s ease-in-out infinite'
        }}
      />

      {/* Orb 2: Bottom Right - CTA Glow */}
      <div 
        className="fixed rounded-full blur-[100px] z-0 opacity-50 mix-blend-screen pointer-events-none"
        style={{
            width: '400px',
            height: '400px',
            background: 'rgba(14, 127, 214, 0.3)',
            bottom: '10%',
            right: '-5%',
            animation: 'orbFloat2 22s ease-in-out infinite'
        }}
      />
    </div>
  )
}
