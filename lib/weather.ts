
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
    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]
    const today = new Date()

    // Determine if we need forecast or historical data
    // Open-Meteo Forecast is good for 16 days. If longer, we probably need Climate API or just generic historical.
    // Logic:
    // 1. If dates are in the past -> Archive API
    // 2. If dates are within next 14 days -> Forecast API
    // 3. If dates are far in the future -> Archive API for same dates last year (approximation)

    const isPast = endDate < today
    const isNearFuture = startDate > today && (startDate.getTime() - today.getTime()) < 14 * 24 * 60 * 60 * 1000

    let url = ''

    if (isPast) {
       url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&timezone=auto`
    } else if (isNearFuture) {
       url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&current_weather=true&timezone=auto`
    } else {
       // Far future: use historical data from last year as an approximation
       const lastYearStart = new Date(startDate)
       lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
       const lastYearEnd = new Date(endDate)
       lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)
       
       const lyStartStr = lastYearStart.toISOString().split('T')[0]
       const lyEndStr = lastYearEnd.toISOString().split('T')[0]

       // Use archive for last year
       url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${lyStartStr}&end_date=${lyEndStr}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&timezone=auto`
    }

    const res = await fetch(url)
    if (!res.ok) {
        console.error('Failed to fetch weather from', url, res.statusText)
        throw new Error('Failed to fetch weather')
    }
    const data = await res.json()

    if (!data.daily || !data.daily.time) return []

    return data.daily.time.map((time: string, index: number) => ({
      date: time,
      maxTemp: data.daily.temperature_2m_max[index],
      minTemp: data.daily.temperature_2m_min[index],
      weatherCode: data.daily.weather_code[index],
      precipitationSum: data.daily.precipitation_sum?.[index] || 0,
      currentTemp: (index === 0 && data.current_weather && startStr === today.toISOString().split('T')[0]) ? data.current_weather.temperature : undefined
    }))

  } catch (error) {
    console.error("Weather fetch error:", error)
    return []
  }
}
