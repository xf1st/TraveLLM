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
            src.includes('unsplash.com') ||
            src.includes('pexels.com') ||
            src.includes('pollinations.ai') ||
            src.includes('loremflickr.com');

        if (isInvalid) {
            fetchNewImage();
        } else {
            setCurrentSrc(src);
            setIsLoading(false); // Assume it's reliable if it's not in blacklist, but onError will catch if not
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
            // If basic load failed, try fetching a fresh one via proxy
            fetchNewImage();
        }
    };

    if (error || !currentSrc) {
        // Use guaranteed static fallback image
        const fallbackUrl = "https://upload.wikimedia.org/wikipedia/commons/c/cc/Travel_022.jpg";
        return (
            <div className={`relative overflow-hidden ${className}`}>
                <img
                    src={fallbackUrl}
                    alt={alt}
                    className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {query}
                </div>
            </div>
        )
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {isLoading && <Skeleton className="absolute inset-0 z-10" />}
            <img
                src={currentSrc}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setIsLoading(false)}
                onError={handleError}
                loading={priority ? "eager" : "lazy"}
            />
        </div>
    )
}
