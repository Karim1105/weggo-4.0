import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { flattenPrices, median, scrapeQueryAcrossProviders, ScrapedObservation } from '@/lib/scraperBot'

type DatasetRow = {
  title: string
  description: string
  price: number
  category: string
  subcategory?: string
  condition: string
  location: string
  images: string[]
  status: string
}

type DatasetPayload = {
  items: DatasetRow[]
  [key: string]: unknown
}

type EnrichedRow = DatasetRow & {
  market: {
    query: string
    sourceCount: number
    priceSampleCount: number
    newestDetectedYear?: number
    medianPrice?: number
    minPrice?: number
    maxPrice?: number
    observations: Array<{
      provider: string
      url: string
      title?: string
      sampleCount: number
    }>
  }
  trainingTargetPrice: number
}

function parseArgValue(args: string[], key: string): string | null {
  const direct = args.find((arg) => arg.startsWith(`${key}=`))
  if (direct) return direct.slice(key.length + 1)

  const index = args.findIndex((arg) => arg === key)
  if (index >= 0 && index + 1 < args.length) return args[index + 1]

  return null
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function buildSearchQuery(row: DatasetRow): string {
  const currentYear = new Date().getFullYear()
  const prevYear = currentYear - 1
  const titleTokens = row.title.split(/\s+/).slice(0, 8).join(' ')
  const scope = [row.category, row.subcategory, row.location].filter(Boolean).join(' ')
  return `${titleTokens} ${scope} price EGP Egypt ${currentYear} ${prevYear}`.replace(/\s+/g, ' ').trim()
}

function summarizeObservations(observations: ScrapedObservation[]) {
  return observations.map((observation) => ({
    provider: observation.provider,
    url: observation.url,
    title: observation.title,
    sampleCount: observation.prices.length,
  }))
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (sorted.length - 1) * p
  const low = Math.floor(idx)
  const high = Math.ceil(idx)
  if (low === high) return sorted[low]
  const weight = idx - low
  return sorted[low] * (1 - weight) + sorted[high] * weight
}

function filterPricesByQuality(prices: number[], expectedPrice: number): number[] {
  if (prices.length === 0) return prices

  const ratioFiltered = prices.filter((price) => {
    const ratio = price / Math.max(1, expectedPrice)
    return ratio >= 0.25 && ratio <= 4.0
  })

  const baseline = ratioFiltered.length >= 3 ? ratioFiltered : prices
  const sorted = [...baseline].sort((a, b) => a - b)
  if (sorted.length < 4) return sorted

  const q1 = percentile(sorted, 0.25)
  const q3 = percentile(sorted, 0.75)
  const iqr = q3 - q1
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr

  const iqrFiltered = sorted.filter((value) => value >= lower && value <= upper)
  return iqrFiltered.length >= 3 ? iqrFiltered : sorted
}

function computeTrainingTarget(basePrice: number, marketMedian: number | null): number {
  if (marketMedian === null) return basePrice
  const blended = Math.round(basePrice * 0.4 + marketMedian * 0.6)
  return Math.max(20, blended)
}

async function run() {
  const args = process.argv.slice(2)
  const input = parseArgValue(args, '--input') || 'private/data/products-preview.json'
  const output = parseArgValue(args, '--out') || 'private/data/products-scraped.json'
  const limitArg = Number(parseArgValue(args, '--limit') || '40')
  const delayArg = Number(parseArgValue(args, '--delay-ms') || '900')

  const limit = Number.isFinite(limitArg) ? clamp(limitArg, 1, 5000) : 40
  const delayMs = Number.isFinite(delayArg) ? clamp(delayArg, 100, 10000) : 900

  const inPath = resolve(process.cwd(), input)
  const outPath = resolve(process.cwd(), output)

  const payload = JSON.parse(readFileSync(inPath, 'utf8')) as DatasetPayload
  if (!Array.isArray(payload.items)) {
    throw new Error('Input file is missing items array.')
  }

  const selected = payload.items.slice(0, limit)
  const enrichedItems: EnrichedRow[] = []

  console.log(`Scraping ${selected.length} items from ${inPath}`)

  for (let index = 0; index < selected.length; index += 1) {
    const row = selected[index]
    const query = buildSearchQuery(row)

    const observations = await scrapeQueryAcrossProviders(query, { delayMs })
    const newestDetectedYear = observations
      .map((observation) => observation.maxDetectedYear || 0)
      .reduce((acc, current) => Math.max(acc, current), 0)

    const sampledPricesRaw = flattenPrices(observations)
    const sampledPrices = filterPricesByQuality(sampledPricesRaw, row.price)
    const marketMedian = median(sampledPrices)

    const minPrice = sampledPrices.length > 0 ? Math.min(...sampledPrices) : undefined
    const maxPrice = sampledPrices.length > 0 ? Math.max(...sampledPrices) : undefined

    const enriched: EnrichedRow = {
      ...row,
      market: {
        query,
        sourceCount: observations.length,
        priceSampleCount: sampledPrices.length,
        newestDetectedYear: newestDetectedYear || undefined,
        medianPrice: marketMedian ?? undefined,
        minPrice,
        maxPrice,
        observations: summarizeObservations(observations),
      },
      trainingTargetPrice: computeTrainingTarget(row.price, marketMedian),
    }

    enrichedItems.push(enriched)

    const progress = `${index + 1}/${selected.length}`
    console.log(`[${progress}] ${row.category} | ${row.title} | samples=${sampledPrices.length}`)
  }

  const outPayload = {
    generatedAt: new Date().toISOString(),
    inputPath: input,
    totalInputItems: payload.items.length,
    scrapedItems: enrichedItems.length,
    delayMs,
    items: enrichedItems,
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(outPayload, null, 2), 'utf8')

  console.log(`Saved enriched dataset to ${outPath}`)
}

run().catch((error) => {
  console.error('Scrape job failed:', error)
  process.exitCode = 1
})