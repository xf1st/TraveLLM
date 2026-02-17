"use client"

import { motion } from "framer-motion"

interface Props {
  theme: "light" | "dark"
}

export default function PaperMesh({ theme }: Props) {
  // Light Theme Colors (Requested): #5289ff (Blue), #b3fffc (Cyan), #ebd6ff (Lavender), #ffffff (White)
  // Dark Theme Colors: Deep Blue, Deep Purple, Cyan/Teal, Dark Slate background
  const isDark = theme === 'dark'

  return (
    <div className={`absolute inset-0 z-0 overflow-hidden transition-colors duration-700 ${isDark ? 'bg-[#020617]' : 'bg-[#ffffff]'}`}>
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isDark ? 'opacity-100 blur-[40px]' : 'opacity-100 blur-[40px] sm:blur-[60px]'}`}>
            {/* Color 1: Blue / Deep Blue */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    backgroundColor: isDark ? '#1e40af' : '#5289ff',
                    width: '60vw', height: '60vw', top: '-10%', left: '-10%',
                    opacity: isDark ? 0.8 : 1.0
                }}
                animate={{
                    x: [0, 100, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.2, 1],
                    rotate: [0, 45, 0]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Color 2: Cyan / Teal */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    backgroundColor: isDark ? '#0e7490' : '#b3fffc',
                    width: '50vw', height: '50vw', top: '20%', right: '-10%',
                    opacity: isDark ? 0.7 : 1.0
                }}
                  animate={{
                    x: [0, -100, 0],
                    y: [0, 100, 0],
                    scale: [1, 1.1, 1],
                    rotate: [0, -30, 0]
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Color 3: Lavender / Deep Purple */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    backgroundColor: isDark ? '#581c87' : '#ebd6ff',
                    width: '55vw', height: '55vw', bottom: '-10%', left: '20%',
                    opacity: isDark ? 0.8 : 1.0
                }}
                 animate={{
                    x: [0, 50, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.3, 1],
                 }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
             {/* Color 4: White / Overlay Highlight */}
             <motion.div
                className="absolute rounded-full mix-blend-overlay"
                style={{
                    backgroundColor: isDark ? '#ffffff' : '#ffffff', // Keep white for mix-blend-overlay in both but vary opacity
                    width: '40vw', height: '40vw', top: '40%', left: '40%',
                    opacity: isDark ? 0.2 : 0.8
                }}
                 animate={{
                    scale: [1, 1.5, 1],
                    opacity: isDark ? [0.2, 0.4, 0.2] : [0.5, 0.9, 0.5]
                 }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
        
        {/* Grain Overlay */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} />
    </div>
  )
}
