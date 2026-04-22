/**
 * Real-time validation orchestrator for route generation.
 * Combines airport, visa, and budget checks into one result payload.
 */

import {
  getMinFlightBudget,
  validateFlightRoute,
  type FlightValidationResult,
} from "./api/flight-validator"
import {
  suggestAlternativeAirport,
  validateAirports,
  type AirportValidationResult,
} from "./api/airport-validator"
import {
  validateMultipleVisas,
  validateVisa,
  type VisaValidationResult,
} from "./api/visa-validator"
import {
  computeValidationBudgetFloor,
  shouldUseAirValidation,
} from "./route-generation-utils"
import type { TravelMode } from "./travel-mode"

export interface ValidationBlocker {
  code: string
  message: string
  details?: Record<string, any>
}

export interface ValidationWarning {
  code: string
  message: string
  suggestion?: string
}

export interface BudgetAdjustment {
  original: number
  adjusted: number
  reason: string
  breakdown?: string[]
}

export interface ValidationResult {
  canProceed: boolean
  blockers: ValidationBlocker[]
  warnings: ValidationWarning[]
  budgetAdjustment: BudgetAdjustment | null
  adjustedBudget?: number
  flightData: FlightValidationResult | null
  visaData: Record<string, VisaValidationResult>
  airportData: AirportValidationResult | null
  validatedAt: string
}

export interface ValidationRequest {
  departureCity: string
  destinations: string[]
  startDate?: string
  endDate?: string
  budget: number
  citizenship?: string
  travelStyle?: string[]
  travelMode?: TravelMode
}

const MIN_DAILY_BUDGETS: Record<string, number> = {
  russia: 5000,
  russia_premium: 15000,
  cis: 4000,
  turkey: 8000,
  uae: 15000,
  israel: 12000,
  europe_east: 10000,
  europe_west: 15000,
  europe_premium: 25000,
  asia_budget: 6000,
  asia_mid: 10000,
  japan: 20000,
  korea: 15000,
  usa: 20000,
  latam: 12000,
  default: 10000,
}

const COUNTRY_REGIONS: Record<string, string> = {
  "россия": "russia",
  russia: "russia",
  "казахстан": "cis",
  "узбекистан": "cis",
  "грузия": "cis",
  "армения": "cis",
  "азербайджан": "cis",
  "киргизия": "cis",
  "турция": "turkey",
  turkey: "turkey",
  "оаэ": "uae",
  "дубай": "uae",
  uae: "uae",
  "израиль": "israel",
  israel: "israel",
  "сербия": "europe_east",
  "болгария": "europe_east",
  "румыния": "europe_east",
  "венгрия": "europe_east",
  "чехия": "europe_east",
  "польша": "europe_east",
  "германия": "europe_west",
  "франция": "europe_west",
  "италия": "europe_west",
  "испания": "europe_west",
  "нидерланды": "europe_west",
  "бельгия": "europe_west",
  "австрия": "europe_west",
  "швейцария": "europe_premium",
  "великобритания": "europe_west",
  "таиланд": "asia_budget",
  "вьетнам": "asia_budget",
  "индонезия": "asia_budget",
  "бали": "asia_budget",
  "камбоджа": "asia_budget",
  "филиппины": "asia_budget",
  "китай": "asia_mid",
  "малайзия": "asia_mid",
  "сингапур": "asia_mid",
  "индия": "asia_mid",
  "япония": "japan",
  japan: "japan",
  "южная корея": "korea",
  "корея": "korea",
  "сша": "usa",
  usa: "usa",
  "америка": "usa",
  "мексика": "latam",
  "аргентина": "latam",
  "бразилия": "latam",
}

function getRegion(destination: string): string {
  return COUNTRY_REGIONS[destination.toLowerCase().trim()] || "default"
}

function getMinDailyBudget(destinations: string[]): number {
  if (destinations.length === 0) return MIN_DAILY_BUDGETS.default

  let maxBudget = 0
  for (const destination of destinations) {
    const region = getRegion(destination)
    const budget = MIN_DAILY_BUDGETS[region] || MIN_DAILY_BUDGETS.default
    maxBudget = Math.max(maxBudget, budget)
  }
  return maxBudget
}

export async function validateRouteRequest(
  request: ValidationRequest
): Promise<ValidationResult> {
  const {
    departureCity,
    destinations,
    startDate,
    endDate,
    budget,
    citizenship = "RU",
    travelMode = "flight",
  } = request

  const blockers: ValidationBlocker[] = []
  const warnings: ValidationWarning[] = []
  let budgetAdjustment: BudgetAdjustment | null = null
  let flightData: FlightValidationResult | null = null
  let visaData: Record<string, VisaValidationResult> = {}
  let airportData: AirportValidationResult | null = null

  let durationDays = 7
  if (startDate && endDate) {
    durationDays =
      Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
  }

  console.log(
    `[Validation] Starting for: ${departureCity} → ${destinations.join(", ")} (${durationDays} days, mode=${travelMode})`
  )

  const runAirValidation = shouldUseAirValidation(travelMode)

  if (runAirValidation) {
    try {
      const allCities = [departureCity, ...destinations]
      airportData = await validateAirports(allCities)

      if (airportData.closedAirports.length > 0) {
        for (const closed of airportData.closedAirports) {
          const cityName = closed.split(":")[0].trim()
          const alternatives = suggestAlternativeAirport(cityName)

          if (alternatives.needsAlternative && alternatives.alternatives.length > 0) {
            warnings.push({
              code: "AIRPORT_CLOSED_ALT",
              message: `Аэропорт ${cityName} закрыт`,
              suggestion: `Альтернативы: ${alternatives.alternatives.join(", ")}`,
            })
          } else {
            blockers.push({
              code: "AIRPORT_CLOSED",
              message: closed,
              details: { city: cityName },
            })
          }
        }
      }

      for (const restricted of airportData.restrictedAirports) {
        warnings.push({
          code: "AIRPORT_RESTRICTED",
          message: restricted,
        })
      }
    } catch (error: any) {
      console.error("[Validation] Airport check failed:", error.message)
      warnings.push({
        code: "AIRPORT_CHECK_FAILED",
        message: "Не удалось проверить статус аэропортов",
      })
    }
  }

  try {
    const countries = destinations.map((destination) => {
      const parts = destination.split(",").map((part) => part.trim())
      return parts.length > 1 ? parts[parts.length - 1] : parts[0]
    })

    const visaResults = await validateMultipleVisas(countries, citizenship)
    visaData = visaResults.results

    for (const blocker of visaResults.blockers) {
      blockers.push({
        code: "VISA_BLOCKED",
        message: blocker,
      })
    }

    for (const warning of visaResults.warnings) {
      warnings.push({
        code: "VISA_WARNING",
        message: warning,
      })
    }
  } catch (error: any) {
    console.error("[Validation] Visa check failed:", error.message)
    warnings.push({
      code: "VISA_CHECK_FAILED",
      message: "Не удалось проверить визовые требования",
    })
  }

  try {
    let flightMinBudget = 0
    let flightBudgetDetails: string[] = []

    if (runAirValidation && destinations.length > 0) {
      const mainDestination = destinations[0]
      flightData = await validateFlightRoute({
        originCity: departureCity,
        destinationCity: mainDestination,
        departDate: startDate,
        returnDate: endDate,
      })

      if (!flightData.flightsExist) {
        warnings.push({
          code: "FLIGHTS_NOT_VERIFIED",
          message:
            flightData.error ||
            `Не удалось проверить рейсы ${departureCity} → ${mainDestination}`,
          suggestion: "Рейсы будут предложены ИИ на основе известных маршрутов",
        })
      }

      const flightBudget = await getMinFlightBudget(
        departureCity,
        destinations,
        startDate,
        endDate
      )
      flightMinBudget = flightBudget.minBudget
      flightBudgetDetails = flightBudget.details
    }

    const minDailyBudget = getMinDailyBudget(destinations)
    const minTotalBudget = computeValidationBudgetFloor({
      durationDays,
      flightMinBudget,
      minDailyBudget,
      travelMode,
    })

    if (budget < minTotalBudget && minTotalBudget > 0) {
      budgetAdjustment = {
        original: budget,
        adjusted: minTotalBudget,
        reason: `Минимальный бюджет для ${destinations.join(", ")} на ${durationDays} дней`,
        breakdown: [
          ...(runAirValidation
            ? [`Перелёты: ~${flightMinBudget.toLocaleString("ru-RU")} ₽`]
            : []),
          `Проживание и питание: ~${(minDailyBudget * durationDays).toLocaleString("ru-RU")} ₽`,
          ...flightBudgetDetails,
        ],
      }

      warnings.push({
        code: "BUDGET_ADJUSTED",
        message: `Бюджет скорректирован: ${budget.toLocaleString("ru-RU")} ₽ → ${minTotalBudget.toLocaleString("ru-RU")} ₽`,
        suggestion: budgetAdjustment.reason,
      })
    }
  } catch (error: any) {
    console.error("[Validation] Flight check failed:", error.message)
    warnings.push({
      code: "FLIGHT_CHECK_FAILED",
      message: "Не удалось проверить доступность рейсов",
    })
  }

  const canProceed = blockers.length === 0

  console.log(
    `[Validation] Complete: canProceed=${canProceed}, blockers=${blockers.length}, warnings=${warnings.length}`
  )

  return {
    canProceed,
    blockers,
    warnings,
    budgetAdjustment,
    adjustedBudget: budgetAdjustment?.adjusted,
    flightData,
    visaData,
    airportData,
    validatedAt: new Date().toISOString(),
  }
}

export async function quickValidate(
  departureCity: string,
  destination: string
): Promise<{ ok: boolean; reason?: string }> {
  const airports = await validateAirports([departureCity, destination])
  if (!airports.allOpen) {
    return { ok: false, reason: airports.closedAirports[0] }
  }

  const visa = await validateVisa(destination)
  if (visa.isBlocker) {
    return { ok: false, reason: visa.requirement.notes }
  }

  const flight = await validateFlightRoute({
    originCity: departureCity,
    destinationCity: destination,
  })
  if (!flight.flightsExist) {
    return { ok: false, reason: flight.error }
  }

  return { ok: true }
}
