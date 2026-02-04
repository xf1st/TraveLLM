"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin } from "lucide-react"

interface TripImageProps {
    src?: string
    alt: string
    className?: string
    query: string
    priority?: boolean
}

export function TripImage({ src, alt, className, query, priority = false }: TripImageProps) {
    const [currentSrc, setCurrentSrc] = useState<string | undefined>(src)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(false)

    // Check if initial src is invalid (blocked domain or empty)
    useEffect(() => {
        const isInvalid = !src ||
            src.includes('pexels.com') ||
            src.includes('pollinations.ai') ||
            src.includes('loremflickr.com');

        if (isInvalid) {
            fetchNewImage();
        } else {
            setCurrentSrc(src);
            setIsLoading(false);
        }
    }, [src]);

    const fetchNewImage = async () => {
        setIsLoading(true);
        setError(false);
        try {
            const res = await fetch(`/api/image?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.url) {
                setCurrentSrc(data.url);
            } else {
                setError(true);
            }
        } catch (e) {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleError = () => {
        if (!error) {
            // First retry - fetch a new one
            console.log("Image load failed, fetching new:", currentSrc)
            fetchNewImage();
        } else {
            // Already retried or failed fetch -> permanent error
            setError(true)
        }
    };

    if (error || !currentSrc) {
        // Use guaranteed static fallback image
        // Updated fallback to a reliable Unsplash ID or internal asset if possible, keeping Wikimedia for now but wrapped nicely
        const fallbackUrl = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800"; // Travel placeholder
        return (
            <div className={`relative overflow-hidden bg-muted flex items-center justify-center ${className}`}>
                <img
                    src={fallbackUrl}
                    alt={alt}
                    className="w-full h-full object-cover opacity-80 mix-blend-overlay"
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
                className={`w-full h-full object-cover transition-all duration-700 ${isLoading ? 'scale-105 blur-sm' : 'scale-100 blur-0'} ${error ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setIsLoading(false)}
                onError={handleError}
                loading={priority ? "eager" : "lazy"}
            />
        </div>
    )
}
