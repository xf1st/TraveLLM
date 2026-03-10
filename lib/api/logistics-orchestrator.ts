import { checkDirectFlightsLive, getIataCode } from "../travelpayouts";
import { getAirportInfo, checkAirportLiveStatus } from "./aerodatabox-client";
import { checkGroundFeasibility } from "./ors-client";

// Можем использовать Haversine для быстрой первичной отбраковки, чтобы не дергать ORS зря
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export interface TransportDecision {
    mode: "flight" | "train" | "bus" | "blocked";
    reason: string;
    warning?: string;
    distanceKm?: number;
    durationHours?: number;
}

/**
 * ГЛАВНЫЙ МОЗГ АВТОНОМНОЙ ЛОГИСТИКИ
 * Принимает решение, как добираться из города А в город Б.
 */
export async function determineOptimalTransport(
    originCity: string,
    destinationCity: string,
    targetDate?: string
): Promise<TransportDecision> {
    
    console.log(`[LogisticsOrchestrator] Анализ маршрута: ${originCity} -> ${destinationCity}`);

    const originIata = getIataCode(originCity) || originCity;
    const destIata = getIataCode(destinationCity) || destinationCity;

    // ШАГ 1: Проверка коммерческой реальности (Travelpayouts) - БЕСПЛАТНО
    // Если билеты продаются - город открыт, аэропорт работает.
    if (originIata !== originCity && destIata !== destinationCity) {
        const flightData = await checkDirectFlightsLive(originCity, destinationCity, targetDate);
        if (flightData.hasDirect) {
            return {
                mode: "flight",
                reason: "Найдены прямые авиабилеты",
            };
        }
    }

    // Если прямых билетов нет, нам нужно понять: 
    // 1. Аэропорт закрыт?
    // 2. Или просто нет прямых рейсов (нужна пересадка)?
    // 3. Можно ли доехать на поезде?

    // ШАГ 2: Получение координат городов (AeroDataBox) - ~2 Units (за оба)
    const originInfo = await getAirportInfo(originIata);
    const destInfo = await getAirportInfo(destIata);

    if (!originInfo || !destInfo) {
        // Если не нашли координаты, fallback на самолет с пересадкой
        return {
            mode: "flight",
            reason: "Нет данных по координатам, предполагаем рейс с пересадкой"
        };
    }

    // ШАГ 3: Фильтр здравого смысла (Haversine) - БЕСПЛАТНО
    const directDistance = calculateHaversineDistance(
        originInfo.location.lat, originInfo.location.lon,
        destInfo.location.lat, destInfo.location.lon
    );

    // Если по прямой больше 1500 км - поезд мы даже не рассматриваем (за редким исключением вроде Транссиба)
    if (directDistance > 1500) {
        // Проверим, жив ли вообще аэропорт?
        const liveStatus = await checkAirportLiveStatus(destIata);
        
        if (liveStatus.isOpen) {
            return {
                mode: "flight",
                reason: `Расстояние ${Math.round(directDistance)}км, аэропорт открыт. Нужен рейс с пересадкой.`
            };
        } else {
            return {
                mode: "blocked",
                reason: `Аэропорт ${destinationCity} закрыт (${liveStatus.reason}), а ехать по земле слишком далеко (${Math.round(directDistance)}км). Маршрут невозможен.`
            };
        }
    }

    // ШАГ 4: Проверка физической реальности (ORS) - БЕСПЛАТНО
    // Расстояние < 1500 км. Давайте проверим, есть ли дорога.
    const groundRoute = await checkGroundFeasibility(
        originInfo.location.lat, originInfo.location.lon,
        destInfo.location.lat, destInfo.location.lon
    );

    if (!groundRoute.isPossible) {
        // Дороги нет (остров, закрытая граница, нет парома)
        // Значит ТОЛЬКО самолет.
        return {
            mode: "flight",
            reason: `Наземный путь невозможен (${groundRoute.reason}). Только перелет (возможно, с пересадкой).`
        };
    }

    // Дорога есть! 
    // Проверим статус аэропорта, чтобы понять, это добровольный выбор поезда или вынужденный.
    const destStatus = await checkAirportLiveStatus(destIata);

    if (!destStatus.isOpen) {
        return {
            mode: "train",
            reason: "Аэропорт закрыт, но есть наземный маршрут",
            distanceKm: groundRoute.distanceKm,
            durationHours: groundRoute.durationHours,
            warning: `⚠️ ВНИМАНИЕ: Аэропорт ${destinationCity} закрыт. Предлагается наземный переезд (${groundRoute.durationHours}ч).`
        };
    }

    // Если аэропорт открыт и дорога есть:
    // Если ехать меньше 10 часов - предлагаем поезд (или автобус), это удобнее, чем пересадки.
    if (groundRoute.durationHours < 10) {
        return {
            mode: "train",
            reason: "Прямых рейсов нет, но на поезде/автобусе быстрее, чем с пересадкой.",
            distanceKm: groundRoute.distanceKm,
            durationHours: groundRoute.durationHours
        };
    }

    // Если ехать долго - лучше лететь с пересадкой
    return {
        mode: "flight",
        reason: `Прямых рейсов нет. Наземный путь долгий (${groundRoute.durationHours}ч). Лучше перелет с пересадкой.`
    };
}
