export type RouteGenerationProvider = "gemini" | "deepseek"

const DEFAULT_ROUTE_GENERATION_PROVIDER: RouteGenerationProvider = "gemini"

export function normalizeRouteGenerationProvider(
  raw: unknown
): RouteGenerationProvider {
  return raw === "deepseek" ? "deepseek" : "gemini"
}

export function getDefaultRouteGenerationProvider(): RouteGenerationProvider {
  return normalizeRouteGenerationProvider(
    process.env.NEXT_PUBLIC_ROUTE_GENERATION_PROVIDER ??
      DEFAULT_ROUTE_GENERATION_PROVIDER
  )
}

export function getRouteGenerationEndpoint(
  provider: RouteGenerationProvider = getDefaultRouteGenerationProvider()
): "/api/gemini" | "/api/deepseek" {
  return provider === "deepseek" ? "/api/deepseek" : "/api/gemini"
}
