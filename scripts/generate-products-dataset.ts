import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { categories, subcategoriesByCategory } from '@/lib/taxonomy'
import { LOCATIONS } from '@/lib/locations'

type Condition = 'New' | 'Like New' | 'Excellent' | 'Good' | 'Fair' | 'Poor'

type ProductDatasetRow = {
  title: string
  description: string
  price: number
  category: string
  subcategory?: string
  condition: Condition
  location: string
  images: string[]
  status: 'active'
}

type CategoryPriceProfile = {
  min: number
  max: number
}

type CategoryVocabulary = {
  brands: string[]
  itemNouns: string[]
  features: string[]
  qualifiers: string[]
}

type DatasetSummary = {
  count: number
  minPrice: number
  maxPrice: number
  avgPrice: number
}

const CATEGORY_PRICE_PROFILES: Record<string, CategoryPriceProfile> = {
  electronics: { min: 1200, max: 68000 },
  furniture: { min: 450, max: 22000 },
  vehicles: { min: 5000, max: 1400000 },
  fashion: { min: 120, max: 8500 },
  home: { min: 140, max: 18000 },
  sports: { min: 180, max: 26000 },
  books: { min: 35, max: 1800 },
  toys: { min: 45, max: 4500 },
  music: { min: 300, max: 70000 },
  gaming: { min: 180, max: 98000 },
}

const CATEGORY_VOCABULARY: Record<string, CategoryVocabulary> = {
  electronics: {
    brands: ['Samsung', 'Apple', 'Xiaomi', 'Huawei', 'Lenovo', 'Dell', 'HP', 'Sony'],
    itemNouns: ['device', 'unit', 'setup', 'bundle', 'system'],
    features: ['battery health 92%', 'clean screen', 'fast performance', 'no major scratches', 'all ports working'],
    qualifiers: ['family use', 'light use', 'office use', 'student use', 'personal use'],
  },
  furniture: {
    brands: ['IKEA', 'Nefertiti Home', 'Local Carpentry', 'Homzmart', 'Kabbani'],
    itemNouns: ['piece', 'set', 'table', 'sofa', 'chair'],
    features: ['solid frame', 'stable legs', 'clean fabric', 'fresh polish', 'strong storage'],
    qualifiers: ['living room use', 'guest room use', 'studio use', 'family use', 'office use'],
  },
  vehicles: {
    brands: ['Toyota', 'Hyundai', 'Nissan', 'Kia', 'Chevrolet', 'Honda', 'Yamaha', 'Suzuki'],
    itemNouns: ['vehicle', 'car', 'bike', 'unit', 'model'],
    features: ['regular maintenance', 'licensed papers', 'low mileage', 'engine in good shape', 'clean interior'],
    qualifiers: ['daily commute', 'family trips', 'city driving', 'weekend use', 'personal use'],
  },
  fashion: {
    brands: ['Zara', 'H&M', 'Nike', 'Adidas', 'LC Waikiki', 'Defacto', 'Local Brand'],
    itemNouns: ['item', 'piece', 'set', 'pair', 'collection'],
    features: ['clean fabric', 'comfortable fit', 'original stitching', 'nice finish', 'ready to wear'],
    qualifiers: ['daily wear', 'special occasions', 'light use', 'seasonal use', 'personal use'],
  },
  home: {
    brands: ['Philips', 'Tornado', 'Fresh', 'Ariston', 'Bosch', 'Black+Decker', 'Generic'],
    itemNouns: ['item', 'tool', 'appliance', 'set', 'piece'],
    features: ['works perfectly', 'clean condition', 'energy efficient', 'easy setup', 'well maintained'],
    qualifiers: ['home use', 'kitchen use', 'garden use', 'apartment use', 'family use'],
  },
  sports: {
    brands: ['Decathlon', 'Nike', 'Adidas', 'Under Armour', 'Puma', 'Local Sports'],
    itemNouns: ['gear', 'item', 'equipment', 'set', 'bundle'],
    features: ['good grip', 'strong material', 'balanced weight', 'comfortable use', 'ready for training'],
    qualifiers: ['regular training', 'home workout', 'outdoor use', 'weekend use', 'light use'],
  },
  books: {
    brands: ['Dar El Shorouk', 'AUC Press', 'Penguin', 'Oxford', 'McGraw-Hill', 'Generic'],
    itemNouns: ['book', 'set', 'copy', 'volume', 'bundle'],
    features: ['clean pages', 'no missing pages', 'clear print', 'good binding', 'minimal notes'],
    qualifiers: ['study use', 'personal reading', 'reference use', 'collection use', 'gift use'],
  },
  toys: {
    brands: ['Lego', 'Fisher-Price', 'Hasbro', 'Mattel', 'Playmobil', 'Local Toys'],
    itemNouns: ['toy', 'set', 'bundle', 'piece', 'game'],
    features: ['safe edges', 'complete set', 'clean parts', 'working pieces', 'good quality plastic'],
    qualifiers: ['kids use', 'family play', 'indoor use', 'gift use', 'light use'],
  },
  music: {
    brands: ['Yamaha', 'Casio', 'Roland', 'Fender', 'Ibanez', 'Korg', 'Local Music'],
    itemNouns: ['instrument', 'unit', 'setup', 'bundle', 'gear'],
    features: ['clear sound', 'stable tuning', 'clean body', 'all keys working', 'good response'],
    qualifiers: ['practice use', 'studio use', 'home use', 'live use', 'student use'],
  },
  gaming: {
    brands: ['Sony', 'Microsoft', 'Nintendo', 'Razer', 'Logitech', 'SteelSeries', 'Corsair'],
    itemNouns: ['console', 'game', 'accessory', 'setup', 'bundle'],
    features: ['smooth gameplay', 'no overheating', 'quiet fan', 'clean body', 'fully functional'],
    qualifiers: ['daily gaming', 'weekend gaming', 'competitive use', 'casual use', 'family use'],
  },
}

const CONDITION_WEIGHTS: Array<{ value: Condition; weight: number }> = [
  { value: 'New', weight: 0.12 },
  { value: 'Like New', weight: 0.2 },
  { value: 'Excellent', weight: 0.23 },
  { value: 'Good', weight: 0.27 },
  { value: 'Fair', weight: 0.12 },
  { value: 'Poor', weight: 0.06 },
]

const CONDITION_MULTIPLIERS: Record<Condition, number> = {
  New: 1,
  'Like New': 0.88,
  Excellent: 0.78,
  Good: 0.64,
  Fair: 0.48,
  Poor: 0.33,
}

const RELEASE_OR_MODEL_YEAR = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017]
const WARRANTY_TEXT = ['with receipt', 'without receipt', 'with box', 'without box', 'with original accessories']
const SELLER_REASON = ['upgrading to newer model', 'moving and clearing space', 'no longer needed', 'bought recently but unused', 'switching category']

function parseArgValue(args: string[], key: string): string | null {
  const direct = args.find((arg) => arg.startsWith(`${key}=`))
  if (direct) return direct.slice(key.length + 1)

  const index = args.findIndex((arg) => arg === key)
  if (index >= 0 && index + 1 < args.length) return args[index + 1]

  return null
}

function stringToSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createRng(seedInput: number): () => number {
  let seed = seedInput || 1
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickOne<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

function pickDifferent(items: string[], rng: () => number, first: string): string {
  if (items.length < 2) return first
  let candidate = pickOne(items, rng)
  let attempts = 0
  while (candidate === first && attempts < 10) {
    candidate = pickOne(items, rng)
    attempts += 1
  }
  return candidate
}

function weightedPick<T>(items: Array<{ value: T; weight: number }>, rng: () => number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  const threshold = rng() * total
  let current = 0

  for (const item of items) {
    current += item.weight
    if (threshold <= current) return item.value
  }

  return items[items.length - 1].value
}

function skewedRandom(rng: () => number): number {
  return (rng() + rng() + rng()) / 3
}

function normalizeForTitle(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildTitle(args: {
  category: string
  subcategory?: string
  vocabulary: CategoryVocabulary
  rng: () => number
  index: number
}): string {
  const brand = pickOne(args.vocabulary.brands, args.rng)
  const subcategoryLabel = args.subcategory ? normalizeForTitle(args.subcategory) : normalizeForTitle(args.category)
  const year = pickOne(RELEASE_OR_MODEL_YEAR, args.rng)
  const label = pickOne(['clean', 'verified', 'ready', 'well kept', 'lightly used'], args.rng)
  const specTag = pickOne(['standard', 'plus', 'pro', 'max', 'edition'], args.rng)
  const quality = pickOne(['clean', 'well kept', 'great shape', 'ready', 'verified'], args.rng)

  return `${brand} ${subcategoryLabel} ${specTag} ${year} ${label} #${args.index + 1} ${quality}`
}

function buildDescription(args: {
  category: string
  subcategory?: string
  condition: Condition
  vocabulary: CategoryVocabulary
  location: string
  rng: () => number
}): string {
  const subcategoryLabel = args.subcategory ? normalizeForTitle(args.subcategory) : normalizeForTitle(args.category)
  const featureA = pickOne(args.vocabulary.features, args.rng)
  const featureB = pickDifferent(args.vocabulary.features, args.rng, featureA)
  const qualifier = pickOne(args.vocabulary.qualifiers, args.rng)
  const warranty = pickOne(WARRANTY_TEXT, args.rng)
  const reason = pickOne(SELLER_REASON, args.rng)
  const ageMonths = 2 + Math.floor(args.rng() * 36)

  return [
    `${subcategoryLabel} listing in ${args.condition} condition, used for ${qualifier}.`,
    `Main points: ${featureA}, ${featureB}, and stored carefully in ${args.location}.`,
    `Age: around ${ageMonths} months, ${warranty}. Selling because ${reason}.`,
  ].join(' ')
}

function generatePrice(args: {
  category: string
  condition: Condition
  rng: () => number
}): number {
  const profile = CATEGORY_PRICE_PROFILES[args.category] || { min: 100, max: 2000 }
  const distribution = skewedRandom(args.rng)
  const base = profile.min + (profile.max - profile.min) * distribution
  const volatility = 0.92 + args.rng() * 0.2
  const priced = base * CONDITION_MULTIPLIERS[args.condition] * volatility
  const rounded = Math.round(priced / 5) * 5
  return Math.max(35, rounded)
}

function buildRows(perCategory: number, seed: number): ProductDatasetRow[] {
  const rng = createRng(seed)
  const rows: ProductDatasetRow[] = []
  const seenTitles = new Set<string>()

  for (const category of categories) {
    const subcategories = subcategoriesByCategory[category.id] || []

    for (let index = 0; index < perCategory; index += 1) {
      const chosenSubcategory = subcategories.length > 0 ? pickOne(subcategories, rng).id : undefined
      const condition = weightedPick(CONDITION_WEIGHTS, rng)
      const location = pickOne(LOCATIONS.map((item) => item.label), rng)
      const vocabulary = CATEGORY_VOCABULARY[category.id] || CATEGORY_VOCABULARY.home

      let title = buildTitle({
        category: category.id,
        subcategory: chosenSubcategory,
        vocabulary,
        rng,
        index,
      })

      if (seenTitles.has(title)) {
        title = `${title} v${Math.floor(rng() * 1000)}`
      }

      seenTitles.add(title)

      rows.push({
        title,
        description: buildDescription({
          category: category.id,
          subcategory: chosenSubcategory,
          condition,
          vocabulary,
          location,
          rng,
        }),
        price: generatePrice({
          category: category.id,
          condition,
          rng,
        }),
        category: category.id,
        subcategory: chosenSubcategory,
        condition,
        location,
        images: [],
        status: 'active',
      })
    }
  }

  return rows
}

function summarize(rows: ProductDatasetRow[]): Record<string, DatasetSummary> {
  const map = new Map<string, number[]>()

  for (const row of rows) {
    const prices = map.get(row.category) || []
    prices.push(row.price)
    map.set(row.category, prices)
  }

  return Object.fromEntries(
    Array.from(map.entries()).map(([category, prices]) => {
      const count = prices.length
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const avgPrice = Math.round(prices.reduce((sum, current) => sum + current, 0) / count)
      return [
        category,
        {
          count,
          minPrice,
          maxPrice,
          avgPrice,
        },
      ]
    })
  )
}

function run() {
  const args = process.argv.slice(2)
  const modeArg = (parseArgValue(args, '--mode') || 'preview').toLowerCase()
  const mode = modeArg === 'full' ? 'full' : 'preview'
  const perCategoryDefault = mode === 'full' ? 500 : 10
  const perCategory = Number(parseArgValue(args, '--per-category') || perCategoryDefault)

  if (!Number.isFinite(perCategory) || perCategory < 1) {
    throw new Error('Invalid --per-category value. It must be a positive number.')
  }

  const seedRaw = parseArgValue(args, '--seed') || `${Date.now()}`
  const numericSeed = Number.isFinite(Number(seedRaw)) ? Number(seedRaw) : stringToSeed(seedRaw)

  const outArg = parseArgValue(args, '--out')
  const defaultOut = mode === 'full' ? 'private/data/products-full.json' : 'private/data/products-preview.json'
  const outputPath = resolve(process.cwd(), outArg || defaultOut)

  const rows = buildRows(perCategory, numericSeed)
  const summary = summarize(rows)

  const payload = {
    generatedAt: new Date().toISOString(),
    mode,
    seed: seedRaw,
    perCategory,
    categoryCount: categories.length,
    totalItems: rows.length,
    summary,
    items: rows,
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8')

  console.log(`Generated ${rows.length} items (${perCategory} per category).`)
  console.log(`Saved dataset to ${outputPath}`)
}

run()