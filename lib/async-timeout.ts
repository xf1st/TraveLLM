export class OperationTimeoutError extends Error {
  code = "GENERATION_TIMEOUT"
  constructor(label: string) {
    super(`${label} timed out`)
    this.name = "TimeoutError"
  }
}

/** Deadlines also protect operations whose dependencies do not support abort. */
export async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new OperationTimeoutError(label)), timeoutMs) }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export async function optionalWithTimeout<T>(operation: Promise<T>, timeoutMs: number, fallback: T, label: string): Promise<T> {
  try {
    return await withTimeout(operation, timeoutMs, label)
  } catch {
    console.warn(`[Generation] ${label} unavailable; continuing without optional data`)
    return fallback
  }
}
