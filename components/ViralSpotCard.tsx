"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Camera, X, Maximize2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface ViralSpotCardProps {
    name: string
    desc?: string
    description?: string
    mapLink?: string
}

export function ViralSpotCard({ name, desc, description, mapLink }: ViralSpotCardProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [imageError, setImageError] = useState(false)

    const displayDesc = desc || description || ""

    useEffect(() => {
        const fetchImage = async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/gallery?query=${encodeURIComponent(name)}&count=1`)
                const data = await res.json()
                if (data.images && data.images.length > 0) {
                    setImageUrl(data.images[0])
                }
            } catch (e) {
                console.error("Failed to fetch viral spot image")
            } finally {
                setLoading(false)
            }
        }
        fetchImage()
    }, [name])

    useEffect(() => {
        if (isPreviewOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isPreviewOpen])

    return (
        <>
            <Card className="p-4 bg-black/40 border border-white/10 backdrop-blur-md hover:border-pink-500/50 transition-colors overflow-hidden">
                <div className="flex gap-4">
                    {/* Left: Text content */}
                    <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg leading-tight text-white/90 line-clamp-2 pr-2">{name}</h3>
                            <Badge variant="outline" className="text-[10px] text-pink-400 border-pink-500/30 whitespace-nowrap shrink-0">Viral</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">{displayDesc}</p>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="w-full text-xs font-bold rounded-lg"
                            onClick={() => mapLink && window.open(mapLink, '_blank')}
                        >
                            <MapPin className="h-3 w-3 mr-2 text-pink-500" />
                            Показать на карте
                        </Button>
                    </div>

                    {/* Right: Image thumbnail */}
                    <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden border border-white/10 relative group cursor-pointer"
                        onClick={() => imageUrl && setIsPreviewOpen(true)}
                    >
                        {loading ? (
                            <Skeleton className="w-full h-full" />
                        ) : imageUrl && !imageError ? (
                            <>
                                <img
                                    src={imageUrl}
                                    alt={name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    onError={() => setImageError(true)}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 className="h-5 w-5 text-white" />
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                                <Camera className="h-8 w-8 text-pink-400/50" />
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Fullscreen Preview Modal */}
            {typeof document !== 'undefined' && imageUrl && createPortal(
                <AnimatePresence>
                    {isPreviewOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
                            onClick={() => setIsPreviewOpen(false)}
                        >
                            <button
                                className="absolute top-6 right-6 text-white hover:bg-white/10 rounded-full p-2 z-50"
                                onClick={() => setIsPreviewOpen(false)}
                            >
                                <X className="h-6 w-6" />
                            </button>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative w-full h-full flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <img
                                    src={imageUrl}
                                    alt={name}
                                    className="max-w-full max-h-full md:max-w-[95vw] md:max-h-[85vh] object-contain rounded-lg shadow-2xl"
                                />

                                <div className="absolute bottom-0 inset-x-0 p-8 text-center pointer-events-none">
                                    <h3 className="text-2xl font-black text-white drop-shadow-lg tracking-tighter">{name}</h3>
                                    <span className="text-white/60 text-sm font-medium mt-1 block">{displayDesc}</span>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    )
}
