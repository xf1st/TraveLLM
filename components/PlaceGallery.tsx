"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, Maximize2, X, Camera, ChevronRight } from "lucide-react"

interface PlaceGalleryProps {
    query: string
    specificQuery?: string
    count?: number
    showProviderBadge?: boolean
    displayTitle?: string
}

function detectProvider(url: string): { label: string; color: string } {
    if (url.includes("pexels.com")) return { label: "pexels", color: "bg-emerald-500" }
    if (url.includes("unsplash.com")) return { label: "unsplash", color: "bg-sky-500" }
    if (url.includes("wikimedia.org")) return { label: "wiki", color: "bg-purple-500" }
    if (url.includes("googleusercontent.com") || url.includes("googleapis.com")) return { label: "google", color: "bg-blue-500" }
    return { label: "local", color: "bg-slate-500" }
}

export function PlaceGallery({ query, specificQuery, count = 4, showProviderBadge = false, displayTitle }: PlaceGalleryProps) {
    const [images, setImages] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [activeIndex, setActiveIndex] = useState(0)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    useEffect(() => {
        if (isPreviewOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isPreviewOpen])

    useEffect(() => {
        const fetchImages = async () => {
            setLoading(true)
            try {
                const specificParam = specificQuery ? `&specific=${encodeURIComponent(specificQuery)}` : ""
                const res = await fetch(`/api/gallery?query=${encodeURIComponent(query)}&count=${count}${specificParam}`)
                const data = await res.json()
                if (data.images && data.images.length > 0) {
                    setImages(data.images)
                }
            } catch (e) {
                console.error("Gallery fetch failed")
            } finally {
                setLoading(false)
            }
        }
        fetchImages()
    }, [query, count])

    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-2 mt-4">
                {[...Array(count)].map((_, i) => (
                    <Skeleton key={i} className="aspect-video rounded-xl" />
                ))}
            </div>
        )
    }

    if (images.length === 0) return null

    return (
        <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                    <Camera className="h-3 w-3" />
                    Галерея места
                </h4>
                {images.length > 1 && (
                    <div className="flex gap-1">
                        {images.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-4 bg-primary' : 'w-1 bg-white/20'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className={`grid gap-2 ${
                images.length === 1 ? 'grid-cols-1' :
                images.length === 2 ? 'grid-cols-2' :
                images.length === 3 ? 'grid-cols-2' :
                'grid-cols-4'
            }`}>
                {images.map((img, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ scale: 0.98 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative rounded-xl overflow-hidden border border-white/5 cursor-pointer group 
                            ${images.length === 1 ? 'aspect-video' : 'aspect-square'}
                            ${images.length === 3 && i === 0 ? 'col-span-2 aspect-video' : ''}
                            ${images.length >= 4 && i === 0 ? 'col-span-2 row-span-2' : ''}
                        `}
                        onClick={() => {
                            setActiveIndex(i)
                            setIsPreviewOpen(true)
                        }}
                    >
                        <img
                            src={img}
                            alt={`Gallery ${i}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {showProviderBadge && (() => {
                            const p = detectProvider(img)
                            return (
                                <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full z-10 opacity-80 ${p.color}`}>
                                    {p.label}
                                </span>
                            )
                        })()}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="h-5 w-5 text-white" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isPreviewOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
                            onClick={() => setIsPreviewOpen(false)}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-6 right-6 text-white hover:bg-white/10 rounded-full z-50"
                                onClick={() => setIsPreviewOpen(false)}
                            >
                                <X className="h-6 w-6" />
                            </Button>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative w-full h-full flex items-center justify-center"
                                onClick={(e: any) => e.stopPropagation()}
                            >
                                <img
                                    src={images[activeIndex]}
                                    alt="Preview"
                                    className="max-w-full max-h-full md:max-w-[95vw] md:max-h-[85vh] object-contain rounded-lg shadow-2xl"
                                />

                                <div className="absolute top-0 inset-x-0 p-8 flex items-center justify-between pointer-events-none">
                                    <div className="pointer-events-auto">
                                        <h3 className="text-2xl font-black text-white drop-shadow-lg tracking-tighter uppercase">{displayTitle || "Галерея места"}</h3>
                                        <span className="text-white/60 text-sm font-bold uppercase tracking-widest mt-1 block">Фото {activeIndex + 1} / {images.length}</span>
                                    </div>
                                    <div className="flex gap-3 pointer-events-auto">
                                        <Button
                                            variant="outline"
                                            className="rounded-full bg-white/10 border-white/10 hover:bg-white/20 text-white"
                                            onClick={() => window.open(images[activeIndex], '_blank')}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Large Navigation Arrows */}
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 pointer-events-none">
                                    <Button
                                        variant="outline"
                                        className="h-14 w-14 rounded-full bg-white/5 border-white/10 hover:bg-white/20 text-white pointer-events-auto"
                                        onClick={(e: any) => {
                                            e.stopPropagation()
                                            setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                                        }}
                                    >
                                        <ChevronRight className="h-6 w-6 rotate-180" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-14 w-14 rounded-full bg-white/5 border-white/10 hover:bg-white/20 text-white pointer-events-auto"
                                        onClick={(e: any) => {
                                            e.stopPropagation()
                                            setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                                        }}
                                    >
                                        <ChevronRight className="h-6 w-6" />
                                    </Button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}

function Button({ children, onClick, className, variant = "ghost", size = "default" }: any) {
    const variants = {
        ghost: "hover:bg-accent hover:text-accent-foreground",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
    } as any
    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        icon: "h-10 w-10"
    } as any

    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
        >
            {children}
        </button>
    )
}
