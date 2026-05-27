import crypto from 'crypto'
import Product, { type IProduct } from '@/models/Product'
import TranslationCache from '@/models/TranslationCache'
import { applyTranslatedFields, buildTranslationListingPayload, detectProductSourceLanguage, hasCompleteTranslations, hashListingSourcePayload } from '@/lib/search/listing-payload'
import { translateListings } from '@/lib/translation/client'
import type { TranslationServiceListingOutput } from '@/types/ai'

type TranslatedField = 'title' | 'description' | 'category' | 'subcategory' | 'condition'

const TRANSLATABLE_FIELDS: TranslatedField[] = [
  'title',
  'description',
  'category',
  'subcategory',
  'condition',
]

function hashTranslationText(srcLang: 'en' | 'ar', text: string) {
  return crypto.createHash('sha1').update(`${srcLang}|${text}`).digest('hex')
}

function getOppositeLanguage(lang: 'en' | 'ar') {
  return lang === 'en' ? 'ar' : 'en'
}

function buildCachedTranslationOutput(product: IProduct, cacheMap: Map<string, string>): TranslationServiceListingOutput | null {
  const sourceLanguage = detectProductSourceLanguage(product)
  const targetLanguage = getOppositeLanguage(sourceLanguage)
  const result: TranslationServiceListingOutput = {
    ...buildTranslationListingPayload(product),
    _sourceLanguage: sourceLanguage,
    _targetLanguage: targetLanguage,
  }

  for (const field of TRANSLATABLE_FIELDS) {
    const originalValue = product[field]
    if (typeof originalValue !== 'string' || !originalValue.trim()) continue

    const cacheKey = `${hashTranslationText(sourceLanguage, originalValue)}:${targetLanguage}`
    const translatedValue = cacheMap.get(cacheKey)
    if (!translatedValue) {
      return null
    }

    ;(result as Record<string, unknown>)[`${field}_${sourceLanguage}`] = originalValue
    ;(result as Record<string, unknown>)[`${field}_${targetLanguage}`] = translatedValue
  }

  return result
}

async function storeTranslationCacheEntries(translated: TranslationServiceListingOutput) {
  const sourceLanguage = translated._sourceLanguage
  const targetLanguage = translated._targetLanguage
  if (!sourceLanguage || !targetLanguage) return

  const operations = TRANSLATABLE_FIELDS.flatMap((field) => {
    const sourceValue = translated[`${field}_${sourceLanguage}` as keyof TranslationServiceListingOutput]
    const targetValue = translated[`${field}_${targetLanguage}` as keyof TranslationServiceListingOutput]

    if (typeof sourceValue !== 'string' || !sourceValue.trim() || typeof targetValue !== 'string' || !targetValue.trim()) {
      return []
    }

    return [{
      updateOne: {
        filter: {
          textHash: hashTranslationText(sourceLanguage, sourceValue),
          tgtLang: targetLanguage,
        },
        update: {
          $set: {
            srcLang: sourceLanguage,
            tgtLang: targetLanguage,
            srcText: sourceValue,
            tgtText: targetValue,
          },
        },
        upsert: true,
      },
    }]
  })

  if (operations.length > 0) {
    await TranslationCache.bulkWrite(operations)
  }
}

export async function ensureTranslated(products: IProduct[], signal?: AbortSignal) {
  if (products.length === 0) return products

  const staleProducts = products.filter((product) => {
    const payloadHash = hashListingSourcePayload(product)
    return !hasCompleteTranslations(product) || product.translationPayloadHash !== payloadHash
  })

  if (staleProducts.length === 0) return products

  const cacheLookupEntries = staleProducts.flatMap((product) => {
    const sourceLanguage = detectProductSourceLanguage(product)
    const targetLanguage = getOppositeLanguage(sourceLanguage)

    return TRANSLATABLE_FIELDS.flatMap((field) => {
      const value = product[field]
      if (typeof value !== 'string' || !value.trim()) return []

      return [{
        textHash: hashTranslationText(sourceLanguage, value),
        tgtLang: targetLanguage,
      }]
    })
  })

  const cachedRows = cacheLookupEntries.length === 0
    ? []
    : await TranslationCache.find({
      $or: cacheLookupEntries,
    })
      .select('textHash tgtLang tgtText')
      .lean()

  const cacheMap = new Map<string, string>()
  for (const row of cachedRows) {
    cacheMap.set(`${row.textHash}:${row.tgtLang}`, row.tgtText)
  }

  const cachedResults = new Map<string, TranslationServiceListingOutput>()
  const serviceBatch: IProduct[] = []

  for (const product of staleProducts) {
    const cachedTranslation = buildCachedTranslationOutput(product, cacheMap)
    if (cachedTranslation) {
      cachedResults.set(product._id.toString(), cachedTranslation)
    } else {
      serviceBatch.push(product)
    }
  }

  let translatedBatch: TranslationServiceListingOutput[] = []
  if (serviceBatch.length > 0) {
    translatedBatch = await translateListings(
      serviceBatch.map((product) => buildTranslationListingPayload(product)),
      signal
    )
  }

  for (let index = 0; index < serviceBatch.length; index += 1) {
    const product = serviceBatch[index]
    const translated = translatedBatch[index]
    if (!translated) continue
    cachedResults.set(product._id.toString(), translated)
    await storeTranslationCacheEntries(translated)
  }

  const bulkUpdates = []

  for (const product of staleProducts) {
    const translated = cachedResults.get(product._id.toString())
    if (!translated) continue

    applyTranslatedFields(product, translated)
    const payloadHash = hashListingSourcePayload(product)
    product.translationPayloadHash = payloadHash
    product.translationUpdatedAt = new Date()
    product.translationFailedAt = null

    bulkUpdates.push({
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            sourceLanguage: product.sourceLanguage,
            targetLanguage: product.targetLanguage,
            title_en: product.title_en,
            title_ar: product.title_ar,
            description_en: product.description_en,
            description_ar: product.description_ar,
            category_en: product.category_en,
            category_ar: product.category_ar,
            subcategory_en: product.subcategory_en,
            subcategory_ar: product.subcategory_ar,
            condition_en: product.condition_en,
            condition_ar: product.condition_ar,
            translationPayloadHash: product.translationPayloadHash,
            translationUpdatedAt: product.translationUpdatedAt,
            translationFailedAt: null,
          },
        },
      },
    })
  }

  if (bulkUpdates.length > 0) {
    await Product.bulkWrite(bulkUpdates)
  }

  return products
}
