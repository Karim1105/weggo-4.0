import crypto from 'crypto'
import type { IProduct } from '@/models/Product'
import type {
  LancedbListingPayload,
  TranslationServiceListingInput,
  TranslationServiceListingOutput,
} from '@/types/ai'

const ARABIC_CHAR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function stableHash(value: unknown) {
  return crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex')
}

export function detectProductSourceLanguage(product: Pick<IProduct, 'title' | 'description' | 'sourceLanguage'>) {
  if (product.sourceLanguage) return product.sourceLanguage
  if (ARABIC_CHAR_RE.test(product.title) || ARABIC_CHAR_RE.test(product.description)) {
    return 'ar' as const
  }
  return 'en' as const
}

export function buildTranslationListingPayload(product: Pick<
  IProduct,
  'title' | 'description' | 'category' | 'subcategory' | 'condition' | 'price' | 'averageRating'
>): TranslationServiceListingInput {
  return {
    title: normalizeString(product.title),
    description: normalizeString(product.description),
    category: normalizeString(product.category),
    subcategory: normalizeString(product.subcategory),
    condition: normalizeString(product.condition),
    price: product.price,
    sellerProfile: {
      rating: typeof product.averageRating === 'number' ? product.averageRating : null,
    },
  }
}

export function hashListingSourcePayload(product: Pick<
  IProduct,
  'title' | 'description' | 'category' | 'subcategory' | 'condition' | 'price' | 'averageRating'
>) {
  return stableHash(buildTranslationListingPayload(product))
}

function getLocalizedValue(
  preferred: string | undefined,
  fallback: string,
) {
  return normalizeString(preferred) || normalizeString(fallback)
}

export function hasCompleteTranslations(product: Partial<IProduct>) {
  return Boolean(
    normalizeString(product.title_en) &&
    normalizeString(product.title_ar) &&
    normalizeString(product.description_en) &&
    normalizeString(product.description_ar) &&
    normalizeString(product.category_en) &&
    normalizeString(product.category_ar) &&
    normalizeString(product.condition_en) &&
    normalizeString(product.condition_ar)
  )
}

export function buildLancedbListingPayload(product: Partial<IProduct> & Pick<IProduct, '_id' | 'title' | 'description' | 'category' | 'condition' | 'price' | 'averageRating'>): LancedbListingPayload {
  const sourceLanguage = detectProductSourceLanguage({
    title: product.title,
    description: product.description,
    sourceLanguage: product.sourceLanguage,
  })

  const titleEn = sourceLanguage === 'en'
    ? normalizeString(product.title)
    : getLocalizedValue(product.title_en, '')
  const titleAr = sourceLanguage === 'ar'
    ? normalizeString(product.title)
    : getLocalizedValue(product.title_ar, '')
  const descriptionEn = sourceLanguage === 'en'
    ? normalizeString(product.description)
    : getLocalizedValue(product.description_en, '')
  const descriptionAr = sourceLanguage === 'ar'
    ? normalizeString(product.description)
    : getLocalizedValue(product.description_ar, '')
  const categoryEn = sourceLanguage === 'en'
    ? normalizeString(product.category)
    : getLocalizedValue(product.category_en, '')
  const categoryAr = sourceLanguage === 'ar'
    ? normalizeString(product.category)
    : getLocalizedValue(product.category_ar, '')
  const conditionEn = sourceLanguage === 'en'
    ? normalizeString(product.condition)
    : getLocalizedValue(product.condition_en, '')
  const conditionAr = sourceLanguage === 'ar'
    ? normalizeString(product.condition)
    : getLocalizedValue(product.condition_ar, '')
  const subcategoryEn = sourceLanguage === 'en'
    ? normalizeString(product.subcategory)
    : getLocalizedValue(product.subcategory_en, '')
  const subcategoryAr = sourceLanguage === 'ar'
    ? normalizeString(product.subcategory)
    : getLocalizedValue(product.subcategory_ar, '')

  return {
    id: product._id.toString(),
    title_en: titleEn,
    title_ar: titleAr,
    description_en: descriptionEn,
    description_ar: descriptionAr,
    category_en: categoryEn,
    category_ar: categoryAr,
    subcategory_en: subcategoryEn,
    subcategory_ar: subcategoryAr,
    condition_en: conditionEn,
    condition_ar: conditionAr,
    price_en: product.price,
    price_ar: product.price,
    sellerProfile: {
      rating_en: typeof product.averageRating === 'number' ? product.averageRating : null,
      rating_ar: typeof product.averageRating === 'number' ? product.averageRating : null,
    },
  }
}

export function hashLancedbPayload(payload: LancedbListingPayload) {
  return stableHash(payload)
}

export function applyTranslatedFields(
  product: Partial<IProduct>,
  translated: TranslationServiceListingOutput
) {
  product.sourceLanguage = translated._sourceLanguage
  product.targetLanguage = translated._targetLanguage
  product.title_en = translated.title_en
  product.title_ar = translated.title_ar
  product.description_en = translated.description_en
  product.description_ar = translated.description_ar
  product.category_en = translated.category_en
  product.category_ar = translated.category_ar
  product.subcategory_en = translated.subcategory_en
  product.subcategory_ar = translated.subcategory_ar
  product.condition_en = translated.condition_en
  product.condition_ar = translated.condition_ar
}
