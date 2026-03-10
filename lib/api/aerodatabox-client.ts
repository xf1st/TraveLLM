/**
 * AeroDataBox API Client (via RapidAPI)
 * 
 * Отвечает за проверку статуса аэропортов (координаты, живое табло).
 * Лимиты: 600 юнитов в месяц (Free tier).
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_AERODATABOX_KEY || "";
const HOST = "aerodatabox.p.rapidapi.com";

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

/**
 * Получает информацию об аэропорте (координаты)
 * Стоимость: ~1 API Unit
 */
export async function getAirportInfo(iataCode: string): Promise<AirportInfo | null> {
    if (!RAPIDAPI_KEY) return null;

    try {
        const response = await fetch(`https://${HOST}/airports/iata/${iataCode}`, { headers: defaultHeaders });
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
    if (!RAPIDAPI_KEY) {
        return { isOpen: true, reason: "API key missing, assuming open" };
    }

    try {
        // Проверяем прилеты (Arrivals) на ближайшие 12 часов
        // Формат времени: YYYY-MM-DDTHH:mm
        const now = new Date();
        const fromLocal = now.toISOString().substring(0, 16);
        now.setHours(now.getHours() + 12);
        const toLocal = now.toISOString().substring(0, 16);

        const url = `https://${HOST}/flights/airports/iata/${iataCode}/${fromLocal}/${toLocal}?withLeg=false&direction=Arrival`;
        
        const response = await fetch(url, { headers: defaultHeaders });
        
        if (response.status === 404 || response.status === 204) {
             // 404/204 от этого API часто означает пустой ответ (нет рейсов)
             return { isOpen: false, reason: "Нет запланированных рейсов (Аэропорт закрыт)" };
        }

        if (!response.ok) {
            console.warn(`[AeroDataBox] FIDS error ${response.status} for ${iataCode}`);
            // В случае сбоя API предполагаем, что открыт, чтобы не блокировать систему ложно
            return { isOpen: true, reason: "API error, assuming open" };
        }

        const data = await response.json();
        const arrivals = data.arrivals || [];

        if (arrivals.length > 0) {
            return { isOpen: true };
        } else {
            return { isOpen: false, reason: "Табло пустое (Аэропорт закрыт)" };
        }

    } catch (error) {
        console.error(`[AeroDataBox] Ошибка статуса для ${iataCode}:`, error);
        return { isOpen: true, reason: "Fetch error, assuming open" };
    }
}
