/**
 * AeroDataBox API Client (via RapidAPI)
 * 
 * Отвечает за проверку статуса аэропортов (координаты, живое табло).
 * Лимиты: 600 юнитов в месяц (Free tier).
 */

import { ProxyAgent } from "undici";

const RAPIDAPI_KEY = process.env.RAPIDAPI_AERODATABOX_KEY || "";
const HOST = "aerodatabox.p.rapidapi.com";
const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;

export interface AirportInfo {
    iata: string;
    name: string;
    location: {
        lat: number;
        lon: number;
    };
    countryCode: string;
}

export interface AirportLiveStatus {
    isOpen: boolean;
    reason?: string;
}

const defaultHeaders = {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': HOST
};

// Create a singleton dispatcher for the proxy
const proxyDispatcher = httpProxy ? new ProxyAgent(httpProxy) : undefined;

async function proxiedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const fetchOptions: any = { ...options };
    if (proxyDispatcher) {
        fetchOptions.dispatcher = proxyDispatcher;
    }
    return fetch(url, fetchOptions);
}

/**
 * Multi-airport city codes that should not be checked for "closed" status
 * as they don't have a single FIDS board.
 */
const CITY_CODES = ["MOW", "LON", "PAR", "NYC", "TYO", "BER", "ROM", "STO", "SEL", "BJS", "SHA", "OSA", "YTO", "SAO", "BUE", "MIL", "REK"];

/**
 * Получает информацию об аэропорте (координаты)
 * Стоимость: ~1 API Unit
 */
export async function getAirportInfo(iataCode: string): Promise<AirportInfo | null> {
    if (!RAPIDAPI_KEY) return null;

    try {
        const response = await proxiedFetch(`https://${HOST}/airports/iata/${iataCode}`, { headers: defaultHeaders });
        if (!response.ok) return null;
        
        const data = await response.json();
        return {
            iata: data.iata,
            name: data.name,
            location: {
                lat: data.location.lat,
                lon: data.location.lon
            },
            countryCode: data.countryCode
        };
    } catch (error) {
        console.error(`[AeroDataBox] Ошибка получения инфо для ${iataCode}:`, error);
        return null;
    }
}

/**
 * Проверяет живое табло (FIDS). Если есть рейсы сегодня - аэропорт открыт.
 * Стоимость: ~2-6 API Units. Использовать только как Fallback!
 */
export async function checkAirportLiveStatus(iataCode: string): Promise<AirportLiveStatus> {
    const code = (iataCode || "").toUpperCase().trim();
    
    // 1. Skip check for multi-airport city codes
    if (CITY_CODES.includes(code)) {
        return { isOpen: true, reason: "City code, assuming open" };
    }

    if (!RAPIDAPI_KEY) {
        return { isOpen: true, reason: "API key missing, assuming open" };
    }

    try {
        // Проверяем прилеты (Arrivals) на ближайшие 12 часов
        // Формат времени: YYYY-MM-DDTHH:mm
        const now = new Date();
        const fromLocal = now.toISOString().substring(0, 16);
        const later = new Date(now.getTime() + 12 * 60 * 60 * 1000);
        const toLocal = later.toISOString().substring(0, 16);

        const url = `https://${HOST}/flights/airports/iata/${code}/${fromLocal}/${toLocal}?withLeg=false&direction=Both`;
        
        const response = await proxiedFetch(url, { 
            headers: defaultHeaders,
            signal: AbortSignal.timeout(8000)
        });
        
        if (response.status === 404 || response.status === 204) {
             // 404/204 от этого API часто означает пустой ответ (нет рейсов)
             // Для стабильности системы НЕ считаем это закрытием аэропорта
             return { isOpen: true, reason: "No flight data found (possibly small airport), assuming open" };
        }

        if (!response.ok) {
            console.warn(`[AeroDataBox] FIDS error ${response.status} for ${code}`);
            // В случае сбоя API предполагаем, что открыт, чтобы не блокировать систему ложно
            return { isOpen: true, reason: "API error, assuming open" };
        }

        const data = await response.json();
        const departures = data.departures || [];
        const arrivals = data.arrivals || [];

        if (departures.length > 0 || arrivals.length > 0) {
            return { isOpen: true };
        } else {
            // Если даже на 12 часов нет ни одного рейса - это подозрительно, 
            // но мы всё равно возвращаем true, чтобы не создавать "ложных тревог"
            // за исключением известных закрытых зон.
            return { isOpen: true, reason: "Empty board, assuming open" };
        }

    } catch (error) {
        console.error(`[AeroDataBox] Ошибка статуса для ${code}:`, error);
        return { isOpen: true, reason: "Fetch error, assuming open" };
    }
}
