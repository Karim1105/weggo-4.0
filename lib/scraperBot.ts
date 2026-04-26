import axios from 'axios'

export type ScrapedObservation = {
  provider: string
  providerId: string
  url: string
  title?: string
  prices: number[]
  maxDetectedYear?: number
  recentSignalCount: number
  fetchedAt: string
}

export type ProviderConfig = {
  id: string
  label: string
  searchUrlTemplate: string
}

const DEFAULT_TIMEOUT_MS = 10000
const DEFAULT_DELAY_MS = 800
const ROBOTS_CACHE = new Map<string, { fetchedAt: number; content: string }>()
const ROBOTS_TTL_MS = 30 * 60 * 1000

const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'amazon-eg',
    label: 'Amazon Egypt',
    searchUrlTemplate: 'https://www.amazon.eg/s?k={query}',
  },
  {
    id: 'sigma-computer',
    label: 'Sigma Computer',
    searchUrlTemplate: 'https://sigma-computer.com/search?q={query}',
  },
  {
    id: 'dubizzle-eg',
    label: 'Dubizzle Egypt',
    searchUrlTemplate: 'https://www.dubizzle.com.eg/en/ads/?q={query}',
  },
  {
    id: 'opensooq-eg',
    label: 'OpenSooq Egypt',
    searchUrlTemplate: 'https://eg.opensooq.com/en/find?term={query}',
  },
]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseProviderListFromEnv(): ProviderConfig[] {
  const raw = process.env.SCRAPER_PROVIDERS_JSON
  if (!raw) return DEFAULT_PROVIDERS

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_PROVIDERS

    const cleaned = parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: String(item.id || '').trim(),
        label: String(item.label || item.id || '').trim(),
        searchUrlTemplate: String(item.searchUrlTemplate || '').trim(),
      }))
      .filter((item) => item.id && item.label && item.searchUrlTemplate)

    return cleaned.length > 0 ? cleaned : DEFAULT_PROVIDERS
  } catch {
    return DEFAULT_PROVIDERS
  }
}

function normalizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 120)
}

function renderSearchUrl(template: string, query: string): string {
  return template.replace('{query}', encodeURIComponent(query))
}

async function fetchRobotsTxt(origin: string): Promise<string> {
  const cached = ROBOTS_CACHE.get(origin)
  if (cached && Date.now() - cached.fetchedAt < ROBOTS_TTL_MS) {
    return cached.content
  }

  try {
    const robotsUrl = `${origin}/robots.txt`
    const response = await axios.get<string>(robotsUrl, {
      timeout: DEFAULT_TIMEOUT_MS,
      responseType: 'text',
      headers: {
        'User-Agent': 'WeggoPricingBot/1.0 (+https://weggo.local)',
      },
      validateStatus: (status) => status >= 200 && status < 500,
    })

    const content = response.status === 200 ? response.data : ''
    ROBOTS_CACHE.set(origin, { fetchedAt: Date.now(), content })
    return content
  } catch {
    return ''
  }
}

function canFetchPath(robotsText: string, path: string): boolean {
  if (!robotsText.trim()) return true

  const lines = robotsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  let appliesToStarAgent = false
  const disallowRules: string[] = []

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':')
    const key = (rawKey || '').trim().toLowerCase()
    const value = rest.join(':').trim()

    if (key === 'user-agent') {
      appliesToStarAgent = value === '*'
      continue
    }

    if (appliesToStarAgent && key === 'disallow') {
      if (value) disallowRules.push(value)
    }
  }

  for (const rule of disallowRules) {
    if (rule === '/') return false
    if (path.startsWith(rule)) return false
  }

  return true
}

function extractTitle(html: string): string | undefined {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (!titleMatch) return undefined
  return titleMatch[1].replace(/\s+/g, ' ').trim()
}

function extractDetectedYears(html: string): number[] {
  const years = new Set<number>()
  for (const match of html.matchAll(/\b(20\d{2})\b/g)) {
    const year = Number(match[1])
    if (Number.isFinite(year) && year >= 2016 && year <= 2030) {
      years.add(year)
    }
  }
  return [...years]
}

function countRecentSignals(html: string): number {
  const signals = [
    /today/gi,
    /yesterday/gi,
    /hours?\s+ago/gi,
    /days?\s+ago/gi,
    /new arrival/gi,
    /in stock/gi,
    /متوفر/gi,
    /اليوم/gi,
    /منذ\s+\d+\s+يوم/gi,
  ]

  let count = 0
  for (const pattern of signals) {
    const matches = html.match(pattern)
    if (matches) count += matches.length
  }
  return count
}

function parseNumeric(raw: string): number | null {
  const normalized = raw.replace(/[\s,]/g, '')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

function dedupeNumbers(values: number[]): number[] {
  const seen = new Set<number>()
  const result: number[] = []
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value)
      result.push(value)
    }
  }
  return result
}

function extractPrices(html: string): number[] {
  const prices: number[] = []

  const currencyAfter = /(\d[\d\s,]{1,12})\s*(EGP|LE|L\.E\.?|ج\.م|جنيه)/gi
  const currencyBefore = /(EGP|LE|L\.E\.?|ج\.م|جنيه)\s*(\d[\d\s,]{1,12})/gi
  const jsonLdPrice = /"price"\s*:\s*"?(\d[\d\s,]{1,12})"?/gi

  for (const match of html.matchAll(currencyAfter)) {
    const value = parseNumeric(match[1])
    if (value) prices.push(value)
  }

  for (const match of html.matchAll(currencyBefore)) {
    const value = parseNumeric(match[2])
    if (value) prices.push(value)
  }

  for (const match of html.matchAll(jsonLdPrice)) {
    const value = parseNumeric(match[1])
    if (value) prices.push(value)
  }

  const filtered = prices.filter((price) => price >= 20 && price <= 100000000)
  return dedupeNumbers(filtered).slice(0, 25)
}

async function fetchProviderPage(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    timeout: DEFAULT_TIMEOUT_MS,
    responseType: 'text',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    validateStatus: (status) => status >= 200 && status < 400,
  })

  return response.data
}

export async function scrapeQueryAcrossProviders(
  query: string,
  options?: {
    delayMs?: number
    providers?: ProviderConfig[]
  }
): Promise<ScrapedObservation[]> {
  const normalizedQuery = normalizeQuery(query)
  const providers = options?.providers && options.providers.length > 0 ? options.providers : parseProviderListFromEnv()
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS

  const results: ScrapedObservation[] = []

  for (const provider of providers) {
    const url = renderSearchUrl(provider.searchUrlTemplate, normalizedQuery)

    try {
      const parsed = new URL(url)
      const robots = await fetchRobotsTxt(parsed.origin)
      const canFetch = canFetchPath(robots, parsed.pathname)
      if (!canFetch) {
        continue
      }

      const html = await fetchProviderPage(url)
      const detectedYears = extractDetectedYears(html)
      const maxDetectedYear = detectedYears.length > 0 ? Math.max(...detectedYears) : undefined
      const recentSignalCount = countRecentSignals(html)

      const currentYear = new Date().getFullYear()
      const isLikelyStale = maxDetectedYear !== undefined && maxDetectedYear < currentYear - 2 && recentSignalCount === 0
      if (isLikelyStale) {
        await sleep(delayMs)
        continue
      }

      const prices = extractPrices(html)
      if (prices.length === 0) {
        await sleep(delayMs)
        continue
      }

      results.push({
        provider: provider.label,
        providerId: provider.id,
        url,
        title: extractTitle(html),
        prices,
        maxDetectedYear,
        recentSignalCount,
        fetchedAt: new Date().toISOString(),
      })
    } catch {
      // Keep scraping other providers.
    }

    await sleep(delayMs)
  }

  return results
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
  }
  return sorted[mid]
}

export function flattenPrices(observations: ScrapedObservation[]): number[] {
  return observations.flatMap((observation) => observation.prices)
}