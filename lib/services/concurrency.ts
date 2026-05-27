import pLimit from 'p-limit'

const limiters = new Map<string, ReturnType<typeof pLimit>>()

export function getLimiter(name: string, concurrency: number) {
  const existing = limiters.get(name)
  if (existing) return existing

  const limiter = pLimit(concurrency)
  limiters.set(name, limiter)
  return limiter
}
