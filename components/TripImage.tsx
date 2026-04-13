"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin } from "lucide-react"
import { DEFAULT_TRAVEL_IMAGE, buildImageQuery, isProbablyBlockedImage, needsProxyImage } from "@/lib/image-utils"
import { cn } from "@/lib/utils"

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
    const [isProxied, setIsProxied] = useState(false)

    // Refs для безопасной работы с асинхронностью и таймаутами
    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)
    const isMounted = useRef(true)
    // Предотвращает бесконечный цикл: proxy fail → original fail → proxy fail → ...
    const hasTriedProxyRef = useRef(false)

    // Очистка при размонтировании
    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
            if (abortControllerRef.current) abortControllerRef.current.abort()
        }
    }, [])

    const fetchNewImage = useCallback(async () => {
        if (!isMounted.current) return

        setIsLoading(true)
        setError(false)
        setIsProxied(false) // Сбрасываем статус прокси для НОВОЙ картинки

        // Отменяем предыдущий запрос, если он был
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        try {
            const cacheKey = `${query}-${alt}`
            
            // Читаем актуальный кэш прямо перед использованием (защита от Race Condition)
            const cachedData = localStorage.getItem('trip-image-cache-v2')
            const parsedCache = cachedData ? JSON.parse(cachedData) : {}

            if (parsedCache[cacheKey] && !isProbablyBlockedImage(parsedCache[cacheKey])) {
                let cachedUrl = parsedCache[cacheKey]
                if (needsProxyImage(cachedUrl) && !cachedUrl.startsWith("/")) {
                    cachedUrl = `/api/proxy-image?url=${encodeURIComponent(cachedUrl)}`
                    setIsProxied(true)
                }
                setCurrentSrc(cachedUrl)
                return
            }

            const res = await fetch(`/api/image?query=${encodeURIComponent(buildImageQuery(query))}`, {
                signal: abortControllerRef.current.signal
            })
            
            const data = await res.json()
            
            if (!isMounted.current) return // Защита от утечки памяти

            if (data.url && !isProbablyBlockedImage(data.url)) {
                let finalUrl = data.url
                if (needsProxyImage(data.url)) {
                    finalUrl = `/api/proxy-image?url=${encodeURIComponent(data.url)}`
                    setIsProxied(true)
                } else {
                    // Пишем в кэш только успешные прямые URL, запрашивая свежий стейт
                    const freshCacheData = localStorage.getItem('trip-image-cache-v2')
                    const freshCache = freshCacheData ? JSON.parse(freshCacheData) : {}
                    freshCache[cacheKey] = data.url
                    localStorage.setItem('trip-image-cache-v2', JSON.stringify(freshCache))
                }
                setCurrentSrc(finalUrl)
            } else {
                setCurrentSrc(DEFAULT_TRAVEL_IMAGE)
                setError(false)
            }
        } catch (e: any) {
            if (e.name === 'AbortError' || !isMounted.current) return
            setCurrentSrc(DEFAULT_TRAVEL_IMAGE)
            setError(false)
        }
    }, [query, alt])

    const handleError = useCallback(() => {
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current)
        }

        // 1. Попытка проксировать ТЕКУЩУЮ картинку (только один раз — предотвращает петлю)
        if (!isProxied && !hasTriedProxyRef.current && currentSrc && !currentSrc.startsWith("/") && currentSrc !== DEFAULT_TRAVEL_IMAGE) {
            hasTriedProxyRef.current = true
            setIsProxied(true)
            setCurrentSrc(`/api/proxy-image?url=${encodeURIComponent(currentSrc)}`)
            setError(false)
            setIsLoading(true)
            return
        }

        // 2. Прокси не помог — пробуем оригинальный URL напрямую.
        //    Работает когда CDN доступен напрямую (Wikimedia, Unsplash CDN в РФ).
        if (isProxied && currentSrc && currentSrc.includes("/api/proxy-image")) {
            try {
                const original = decodeURIComponent(currentSrc.split("?url=")[1] ?? "")
                if (original && original !== DEFAULT_TRAVEL_IMAGE) {
                    setIsProxied(false)
                    setCurrentSrc(original)
                    setError(false)
                    setIsLoading(true)
                    return
                }
            } catch {}
        }

        // 3. Ищем НОВУЮ картинку (не более 1 раза)
        if (retryCount < 1) {
            setRetryCount((v) => v + 1)
            fetchNewImage()
            return
        }

        // 4. Сдаемся, показываем дефолтную заглушку
        setCurrentSrc(DEFAULT_TRAVEL_IMAGE)
        setError(true)
        setIsLoading(false)
    }, [isProxied, currentSrc, retryCount, fetchNewImage])

    // Первичная проверка src
    useEffect(() => {
        const raw = String(src || "").trim()
        const isHttp = /^https?:\/\//i.test(raw)
        const isLocal = raw.startsWith("/")
        
        const isInvalid = !raw || (!isHttp && !isLocal) || isProbablyBlockedImage(src)

        hasTriedProxyRef.current = false
        if (isInvalid) {
            fetchNewImage()
        } else {
            let finalSrc = src
            if (needsProxyImage(src) && !src?.startsWith("/")) {
                hasTriedProxyRef.current = true
                finalSrc = `/api/proxy-image?url=${encodeURIComponent(src!)}`
                setIsProxied(true)
            } else {
                setIsProxied(false)
            }
            setCurrentSrc(finalSrc)
            setIsLoading(true)
            setError(false)
            setRetryCount(0)
        }
    }, [src, fetchNewImage])

    // Таймаут зависаний (теперь работает стабильно)
    useEffect(() => {
        if (isLoading && currentSrc && currentSrc !== DEFAULT_TRAVEL_IMAGE) {
            loadingTimeoutRef.current = setTimeout(() => {
                console.warn(`[TripImage] Load timeout for ${currentSrc}, forcing error...`)
                handleError()
            }, 8000)
        }

        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current)
            }
        }
    }, [isLoading, currentSrc, handleError])

    if (error || !currentSrc) {
        const fallbackUrl = DEFAULT_TRAVEL_IMAGE
        return (
            <div className={`relative overflow-hidden bg-muted flex items-center justify-center ${className}`}>
                <img
                    src={fallbackUrl}
                    alt={alt}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white text-center z-10">
                    <MapPin className="h-6 w-6 mx-auto mb-2 text-white/80" />
                    <span className="text-sm font-medium opacity-90 block truncate px-2">{query}</span>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("relative overflow-hidden bg-muted", className)}>
            {isLoading && (
                <div className="absolute inset-0 z-10 w-full h-full">
                    <Skeleton className="w-full h-full" />
                </div>
            )}
            <img
                src={currentSrc}
                alt={alt}
                className={cn(
                    "w-full h-full object-cover transition-all duration-700 ease-in-out will-change-transform",
                    isLoading ? "opacity-0 scale-105 blur-sm" : "opacity-100 scale-100 blur-0",
                    error ? "opacity-0" : "opacity-100",
                    imgClassName
                )}
                onLoad={() => {
                    if (isMounted.current) {
                        setIsLoading(false)
                        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
                    }
                }}
                onError={handleError}
                loading={priority ? "eager" : "lazy"}
                decoding={priority ? "sync" : "async"}
            />
        </div>
    )
}