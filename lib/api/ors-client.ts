/**
 * OpenRouteService (ORS) API Client
 * 
 * Отвечает за проверку "проезжаемости" маршрута по земле.
 * Лимиты: 2500 запросов в день (Free tier).
 */

const ORS_API_KEY = process.env.ORS_API_KEY || "";
const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions";

export interface GroundRouteResult {
    isPossible: boolean;      // Можно ли проехать по земле?
    distanceKm: number;       // Расстояние в км
    durationHours: number;    // Примерное время в пути
    reason?: string;          // Причина, если невозможно (например, "Океан")
}

/**
 * Проверяет возможность доехать от точки А до точки Б на автомобиле.
 * Если на машине доехать нельзя (море, нет дорог), то и на поезде/автобусе нельзя.
 */
export async function checkGroundFeasibility(
    fromLat: number, fromLng: number,
    toLat: number, toLng: number
): Promise<GroundRouteResult> {
    if (!ORS_API_KEY) {
        console.warn("[ORS] ORS_API_KEY не установлен. Пропускаем проверку.");
        return { isPossible: true, distanceKm: 0, durationHours: 0 }; // Fallback
    }

    try {
        // ORS ожидает координаты в формате [longitude, latitude]!
        const coordinates = [[fromLng, fromLat], [toLng, toLat]];
        
        const response = await fetch(`${ORS_BASE_URL}/driving-car`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ORS_API_KEY,
                'Accept': 'application/json, application/geo+json'
            },
            body: JSON.stringify({ coordinates })
        });

        if (!response.ok) {
            // Ошибки типа 404 обычно означают, что путь не найден (например, острова)
            const errorData = await response.json().catch(() => ({}));
            console.log(`[ORS] Route not found or error: ${response.status}`, errorData);
            return {
                isPossible: false,
                distanceKm: 0,
                durationHours: 0,
                reason: "Нет сухопутного маршрута (возможно, острова или нет дорог)"
            };
        }

        const data = await response.json();
        
        // Извлекаем дистанцию (в метрах) и время (в секундах)
        const summary = data.routes?.[0]?.summary;
        if (!summary) {
            return { isPossible: false, distanceKm: 0, durationHours: 0, reason: "Ответ API не содержит маршрута" };
        }

        const distanceKm = Math.round(summary.distance / 1000);
        const durationHours = Math.round((summary.duration / 3600) * 10) / 10;

        return {
            isPossible: true,
            distanceKm,
            durationHours
        };

    } catch (error) {
        console.error("[ORS] Ошибка при обращении к API:", error);
        return { isPossible: true, distanceKm: 0, durationHours: 0 }; // Fallback в случае сбоя сети
    }
}
