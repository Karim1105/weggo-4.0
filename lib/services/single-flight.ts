const inflight = new Map<string, Promise<unknown>>()

export async function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing

  const promise = fn().finally(() => {
    inflight.delete(key)
  })

  inflight.set(key, promise)
  return promise
}
