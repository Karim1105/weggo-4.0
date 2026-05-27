export type CircuitBreakerState = 'closed' | 'open' | 'half_open'

export class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceUnavailableError'
  }
}

export interface CircuitBreakerOptions {
  failureThreshold?: number
  halfOpenProbes?: number
  openDurationMs?: number
  rollingWindowMs?: number
}

class CircuitBreaker {
  private failureThreshold: number
  private halfOpenProbes: number
  private openDurationMs: number
  private rollingWindowMs: number
  private failures: number[] = []
  private halfOpenInFlight = 0
  private openedAt = 0
  private state: CircuitBreakerState = 'closed'

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5
    this.halfOpenProbes = options.halfOpenProbes ?? 1
    this.openDurationMs = options.openDurationMs ?? 15_000
    this.rollingWindowMs = options.rollingWindowMs ?? 10_000
  }

  getState() {
    this.refreshState()
    return this.state
  }

  private pruneFailures() {
    const cutoff = Date.now() - this.rollingWindowMs
    this.failures = this.failures.filter((timestamp) => timestamp >= cutoff)
  }

  private refreshState() {
    if (this.state === 'open' && Date.now() - this.openedAt >= this.openDurationMs) {
      this.state = 'half_open'
      this.halfOpenInFlight = 0
    }
  }

  private onSuccess() {
    this.failures = []
    this.openedAt = 0
    this.state = 'closed'
    this.halfOpenInFlight = 0
  }

  private onFailure() {
    const now = Date.now()
    this.failures.push(now)
    this.pruneFailures()
    this.halfOpenInFlight = 0

    if (this.state === 'half_open' || this.failures.length >= this.failureThreshold) {
      this.state = 'open'
      this.openedAt = now
    }
  }

  async run<T>(label: string, fn: () => Promise<T>) {
    this.refreshState()

    if (this.state === 'open') {
      throw new ServiceUnavailableError(`${label} is temporarily unavailable`)
    }

    if (this.state === 'half_open') {
      if (this.halfOpenInFlight >= this.halfOpenProbes) {
        throw new ServiceUnavailableError(`${label} is temporarily unavailable`)
      }
      this.halfOpenInFlight += 1
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
}

const registry = new Map<string, CircuitBreaker>()

export function getCircuitBreaker(name: string, options?: CircuitBreakerOptions) {
  if (!registry.has(name)) {
    registry.set(name, new CircuitBreaker(options))
  }

  return registry.get(name)!
}
