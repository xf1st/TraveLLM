export interface WeatherData {
  date: string
  maxTemp: number
  minTemp: number
  weatherCode: number
  precipitationSum?: number
  currentTemp?: number
}

// WMO Weather interpretation codes
export const getWeatherDescription = (code: number): string => {
  switch (code) {
    case 0: return 'Ясно'
    case 1: return 'Преимущественно ясно'
    case 2: return 'Переменная облачность'
    case 3: return 'Пасмурно'
    case 45: return 'Туман'
    case 48: return 'Изморозь'
    case 51: return 'Морось'
    case 53: return 'Умеренная морось'
    case 55: return 'Сильная морось'
    case 56: return 'Ледяная морось'
    case 57: return 'Сильная ледяная морось'
    case 61: return 'Дождь'
    case 63: return 'Умеренный дождь'
    case 65: return 'Сильный дождь'
    case 66: return 'Ледяной дождь'
    case 67: return 'Сильный ледяной дождь'
    case 71: return 'Снегопад'
    case 73: return 'Умеренный снегопад'
    case 75: return 'Сильный снегопад'
    case 77: return 'Снежные зерна'
    case 80: return 'Ливень'
    case 81: return 'Сильный ливень'
    case 82: return 'Очень сильный ливень'
    case 85: return 'Снежный ливень'
    case 86: return 'Сильный снежный ливень'
    case 95: return 'Гроза'
    case 96: return 'Гроза с градом'
    case 99: return 'Сильная гроза с градом'
    default: return 'Неизвестно'
  }
}

export function getWeatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦️'
  if (code <= 99) return '⛈️'
  return '🌡️'
}

/** YYYY-MM-DD in UTC — короткий формат для query, без «+» в ISO (избегаем поломки query string). */
function toUtcDateOnly(d: Date): string | null {
  if (!d || Number.isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export async function getWeatherForLocation(lat: number, lon: number, startDate: Date, endDate: Date): Promise<WeatherData[]> {
  try {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return []

    let s = startDate
    let e = endDate
    if (e.getTime() < s.getTime()) {
      const t = s
      s = e
      e = t
    }

    const startStr = toUtcDateOnly(s)
    const endStr = toUtcDateOnly(e)
    if (!startStr || !endStr) return []

    const res = await fetch(
      `/api/weather?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&start=${startStr}&end=${endStr}`
    )
    if (!res.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[weather] API returned", res.status, res.statusText)
      }
      return []
    }
    let data: unknown
    try {
      data = await res.json()
    } catch {
      return []
    }
    return Array.isArray(data) ? data : []
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Weather fetch error:", error)
    }
    return []
  }
}
