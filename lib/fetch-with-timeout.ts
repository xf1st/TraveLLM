/** Bound connection and body reads while preserving caller cancellation/proxy options. */
export function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") return AbortSignal.any(signals)
  const controller = new AbortController()
  const listeners: Array<[AbortSignal, () => void]> = []
  const abort = (signal: AbortSignal) => {
    controller.abort(signal.reason)
    listeners.forEach(([source, listener]) => source.removeEventListener("abort", listener))
  }
  for (const signal of signals) {
    if (signal.aborted) { abort(signal); break }
    const listener = () => abort(signal)
    listeners.push([signal, listener])
    signal.addEventListener("abort", listener, { once: true })
  }
  return controller.signal
}

export function fetchWithTimeout(input: string | URL | Request, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const inherited = init.signal ?? (input instanceof Request ? input.signal : undefined)
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = inherited ? combineAbortSignals([inherited, timeout]) : timeout
  return globalThis.fetch(input, { ...init, signal })
}
