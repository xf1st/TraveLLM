
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

export async function getWeatherForLocation(lat: number, lon: number, startDate: Date, endDate: Date): Promise<WeatherData[]> {
  try {
    const startStr = startDate.toISOString()
    const endStr = endDate.toISOString()
    
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}&start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`)
    if (!res.ok) {
        console.error('Failed to fetch weather via proxy API', res.statusText)
        throw new Error('Failed to fetch weather')
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("Weather fetch error:", error)
    return []
  }
}
