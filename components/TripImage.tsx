"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin } from "lucide-react"
import { DEFAULT_TRAVEL_IMAGE, buildImageQuery, isProbablyBlockedImage } from "@/lib/image-utils"

interface TripImageProps {
    src?: string
    alt: string
    className?: string
    imgClassName?: string
    query: string
    priority?: boolean
}

export function TripImage({ src, alt, className, imgClassName = "", query, priority = false }: TripImageProps) {
    const [currentSrc, setCurrentSrc] = useState<string | undefined>(src)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(false)
    const [retryCount, setRetryCount] = useState(0)

    // Check if initial src is invalid (blocked domain or empty)
    useEffect(() => {
        const raw = String(src || "").trim()
        const isHttp = /^https?:\/\//i.test(raw)
        const isLocal = raw.startsWith("/")
        const isInvalid = !raw || !isHttp && !isLocal || isProbablyBlockedImage(src)

        if (isInvalid) {
            fetchNewImage();
        } else {
            setCurrentSrc(src);
            setIsLoading(false);
            setError(false);
            setRetryCount(0);
        }
    }, [src, query, alt]);

    const fetchNewImage = async () => {
        setIsLoading(true);
        setError(false);
        try {
            const res = await fetch(`/api/image?query=${encodeURIComponent(buildImageQuery(query, alt))}`);
            const data = await res.json();
            if (data.url && !isProbablyBlockedImage(data.url)) {
                setCurrentSrc(data.url);
            } else {
                setCurrentSrc(DEFAULT_TRAVEL_IMAGE);
                setError(false);
            }
        } catch (e) {
            setCurrentSrc(DEFAULT_TRAVEL_IMAGE);
            setError(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleError = () => {
        if (currentSrc !== DEFAULT_TRAVEL_IMAGE && retryCount < 1) {
            setRetryCount((v) => v + 1)
            fetchNewImage()
            return
        }
        setCurrentSrc(DEFAULT_TRAVEL_IMAGE)
        setError(true)
        setIsLoading(false)
    };

    if (error || !currentSrc) {
        // Use guaranteed static fallback image
        const fallbackUrl = DEFAULT_TRAVEL_IMAGE;
        return (
            <div className={`relative overflow-hidden bg-muted flex items-center justify-center ${className}`}>
                <img
                    src={fallbackUrl}
                    alt={alt}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white text-center">
                    <MapPin className="h-6 w-6 mx-auto mb-2 text-white/80" />
                    <span className="text-sm font-medium opacity-90 block truncate px-2">{query}</span>
                </div>
            </div>
        )
    }

    return (
        <div className={`relative overflow-hidden bg-muted ${className}`}>
            {isLoading && <Skeleton className="absolute inset-0 z-10 w-full h-full" />}
            <img
                src={currentSrc}
                alt={alt}
                className={`w-full h-full object-cover transition-all duration-700 ${isLoading ? 'scale-105 blur-sm' : 'scale-100 blur-0'} ${error ? 'opacity-0' : 'opacity-100'} ${imgClassName}`}
                onLoad={() => setIsLoading(false)}
                onError={handleError}
                loading={priority ? "eager" : "lazy"}
            />
        </div>
    )
}
