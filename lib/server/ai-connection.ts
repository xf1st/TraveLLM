import { ProxyAgent } from "undici"
import { getHttpProxyUrl, getConfiguredHttpProxyUrl } from "../http-proxy.ts"
import { isProxyDisabled, areProxySettingsAvailable } from "../proxy-config.ts"

export type AiConnectionMode = "configured" | "direct" | "proxy"
const dispatchers = new Map<string, ProxyAgent>()

export async function getAiConnection(mode: AiConnectionMode = "configured", forceRefresh = false) {
  const disabled = mode === "configured" ? await isProxyDisabled(forceRefresh) : mode === "direct"
  const url = mode === "proxy" ? getConfiguredHttpProxyUrl() : disabled ? undefined : getHttpProxyUrl()
  if (mode === "proxy" && !url) throw Object.assign(new Error("Proxy is not configured"), { code: "PROXY_NOT_CONFIGURED" })
  let dispatcher: ProxyAgent | undefined
  if (url) {
    try {
      dispatcher = dispatchers.get(url)
      if (!dispatcher) { dispatcher = new ProxyAgent(url); dispatchers.set(url, dispatcher) }
    } catch { throw Object.assign(new Error("Proxy configuration is invalid"), { code: "PROXY_CONFIG_INVALID" }) }
  }
  return {
    dispatcher,
    status: {
      configured: Boolean(getConfiguredHttpProxyUrl()), active: Boolean(dispatcher),
      mode: dispatcher ? "proxy" as const : "direct" as const,
      settingsAvailable: areProxySettingsAvailable(),
      environmentDisablesProxy: process.env.TRAVELLM_HTTP_PROXY !== undefined && !getHttpProxyUrl(),
    },
  }
}

export function describeConnectionError(error: unknown): { code: string; message: string } {
  const err = error as { name?: string; code?: string; message?: string; cause?: { code?: string } }
  if (err.code === "PROVIDER_DISABLED") return { code: err.code, message: "Провайдер выключен в настройках администратора." }
  if (err.code === "PROXY_NOT_CONFIGURED") return { code: err.code, message: "Прокси не задан в переменных Timeweb." }
  if (err.code === "PROXY_CONFIG_INVALID") return { code: err.code, message: "Некорректный формат адреса прокси." }
  if (err.name === "TimeoutError" || err.name === "AbortError") return { code: "TIMEOUT", message: "Сервер не получил ответ за 15 секунд." }
  const status = err.message?.match(/(?:Error|error)\s*\((\d{3})\)/)?.[1]
  if (status === "401") return { code: "AUTH", message: "API отклонил ключ. Проверьте ключ провайдера в Timeweb." }
  if (status === "402") return { code: "BALANCE", message: "Провайдер сообщает о недостаточном балансе." }
  if (status === "403") return { code: "ACCESS", message: "Провайдер отклонил доступ. Возможны ограничения региона или аккаунта." }
  if (status === "429") return { code: "RATE_LIMIT", message: "Провайдер ограничил частоту запросов." }
  if (/not configured/i.test(err.message || "")) return { code: "KEY_MISSING", message: "API-ключ провайдера не задан в Timeweb." }
  if (status) return { code: `HTTP_${status}`, message: `Ошибка провайдера: HTTP ${status}.` }
  const code = err.cause?.code || err.code
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return { code: "DNS", message: "Сервер не смог определить адрес провайдера или прокси." }
  return { code: "CONNECTION", message: "Ошибка соединения с провайдером или прокси. Проверьте доступ с сервера." }
}
