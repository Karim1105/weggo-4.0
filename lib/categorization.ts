// Smart categorization system with brand detection and AI-powered classification
import { getSubcategoryOptions } from '@/lib/taxonomy'

export interface ProductCategory {
  id: string
  name: string
  nameAr: string
  keywords: string[]
  brands: string[]
  subcategories: string[]
}

export interface BrandInfo {
  name: string
  category: string
  keywords: string[]
  priceRange: { min: number; max: number }
}

export interface CategorizationResult {
  category: string
  subcategory: string
  brand: string | null
  confidence: number
  suggestedTags: string[]
}

// Comprehensive brand database for Egyptian market
const BRAND_DATABASE: BrandInfo[] = [
  // Electronics - Phones
  { name: 'iPhone', category: 'electronics', keywords: ['iphone', 'apple'], priceRange: { min: 8000, max: 50000 } },
  { name: 'Samsung', category: 'electronics', keywords: ['samsung', 'galaxy'], priceRange: { min: 3000, max: 25000 } },
  { name: 'Huawei', category: 'electronics', keywords: ['huawei', 'honor'], priceRange: { min: 2000, max: 15000 } },
  { name: 'Xiaomi', category: 'electronics', keywords: ['xiaomi', 'redmi', 'poco'], priceRange: { min: 1500, max: 8000 } },
  { name: 'OnePlus', category: 'electronics', keywords: ['oneplus', 'one plus'], priceRange: { min: 5000, max: 20000 } },
  { name: 'Oppo', category: 'electronics', keywords: ['oppo', 'realme'], priceRange: { min: 2000, max: 12000 } },
  { name: 'Vivo', category: 'electronics', keywords: ['vivo'], priceRange: { min: 2000, max: 10000 } },
  
  // Electronics - Laptops
  { name: 'MacBook', category: 'electronics', keywords: ['macbook', 'mac book', 'apple laptop'], priceRange: { min: 20000, max: 80000 } },
  { name: 'Dell', category: 'electronics', keywords: ['dell', 'inspiron', 'xps', 'latitude'], priceRange: { min: 8000, max: 50000 } },
  { name: 'HP', category: 'electronics', keywords: ['hp', 'hewlett', 'pavilion', 'elitebook'], priceRange: { min: 6000, max: 40000 } },
  { name: 'Lenovo', category: 'electronics', keywords: ['lenovo', 'thinkpad', 'ideapad', 'yoga'], priceRange: { min: 5000, max: 35000 } },
  { name: 'ASUS', category: 'electronics', keywords: ['asus', 'rog', 'zenbook', 'vivobook'], priceRange: { min: 4000, max: 30000 } },
  { name: 'Acer', category: 'electronics', keywords: ['acer', 'aspire', 'nitro', 'swift'], priceRange: { min: 3000, max: 25000 } },
  
  // Electronics - Gaming
  { name: 'PlayStation', category: 'gaming', keywords: ['playstation', 'ps4', 'ps5', 'sony'], priceRange: { min: 2000, max: 15000 } },
  { name: 'Xbox', category: 'gaming', keywords: ['xbox', 'microsoft'], priceRange: { min: 2000, max: 12000 } },
  { name: 'Nintendo', category: 'gaming', keywords: ['nintendo', 'switch'], priceRange: { min: 3000, max: 8000 } },
  
  // Electronics - Cameras
  { name: 'Canon', category: 'electronics', keywords: ['canon', 'eos'], priceRange: { min: 5000, max: 50000 } },
  { name: 'Nikon', category: 'electronics', keywords: ['nikon', 'dslr'], priceRange: { min: 4000, max: 40000 } },
  { name: 'Sony', category: 'electronics', keywords: ['sony', 'alpha'], priceRange: { min: 3000, max: 30000 } },
  
  // Fashion - Clothing
  { name: 'Nike', category: 'fashion', keywords: ['nike', 'air max', 'jordan'], priceRange: { min: 200, max: 2000 } },
  { name: 'Adidas', category: 'fashion', keywords: ['adidas', 'originals'], priceRange: { min: 200, max: 1500 } },
  { name: 'Zara', category: 'fashion', keywords: ['zara'], priceRange: { min: 100, max: 800 } },
  { name: 'H&M', category: 'fashion', keywords: ['h&m', 'h and m'], priceRange: { min: 50, max: 500 } },
  { name: 'Uniqlo', category: 'fashion', keywords: ['uniqlo'], priceRange: { min: 100, max: 600 } },
  
  // Furniture
  { name: 'IKEA', category: 'furniture', keywords: ['ikea'], priceRange: { min: 500, max: 5000 } },
  { name: 'Ashley', category: 'furniture', keywords: ['ashley'], priceRange: { min: 1000, max: 10000 } },
  
  // Vehicles
  { name: 'BMW', category: 'vehicles', keywords: ['bmw'], priceRange: { min: 200000, max: 2000000 } },
  { name: 'Mercedes', category: 'vehicles', keywords: ['mercedes', 'benz'], priceRange: { min: 250000, max: 2500000 } },
  { name: 'Toyota', category: 'vehicles', keywords: ['toyota', 'camry', 'corolla'], priceRange: { min: 150000, max: 800000 } },
  { name: 'Honda', category: 'vehicles', keywords: ['honda', 'civic', 'accord'], priceRange: { min: 120000, max: 600000 } },
  { name: 'Hyundai', category: 'vehicles', keywords: ['hyundai', 'elantra', 'sonata'], priceRange: { min: 100000, max: 500000 } },
  { name: 'Kia', category: 'vehicles', keywords: ['kia', 'cerato', 'optima'], priceRange: { min: 80000, max: 400000 } },
]

// Enhanced category definitions
const CATEGORIES: ProductCategory[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    nameAr: 'إلكترونيات',
    keywords: ['phone', 'mobile', 'laptop', 'computer', 'camera', 'headphones', 'speaker', 'tablet', 'watch', 'gaming', 'console'],
    brands: ['iPhone', 'Samsung', 'Huawei', 'Xiaomi', 'OnePlus', 'MacBook', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Canon', 'Nikon', 'Sony'],
    subcategories: ['phones', 'laptops', 'cameras', 'audio', 'gaming', 'accessories', 'smartwatches']
  },
  {
    id: 'furniture',
    name: 'Furniture',
    nameAr: 'أثاث',
    keywords: ['sofa', 'chair', 'table', 'bed', 'desk', 'cabinet', 'shelf', 'dining', 'office', 'living room', 'bedroom'],
    brands: ['IKEA', 'Ashley'],
    subcategories: ['living room', 'bedroom', 'dining room', 'office', 'outdoor', 'storage']
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    nameAr: 'مركبات',
    keywords: ['car', 'motorcycle', 'bike', 'scooter', 'truck', 'van', 'auto', 'vehicle'],
    brands: ['BMW', 'Mercedes', 'Toyota', 'Honda', 'Hyundai', 'Kia'],
    subcategories: ['cars', 'motorcycles', 'bicycles', 'scooters', 'commercial']
  },
  {
    id: 'fashion',
    name: 'Fashion',
    nameAr: 'أزياء',
    keywords: ['clothes', 'shirt', 'dress', 'pants', 'shoes', 'bag', 'jacket', 'jeans', 'sneakers', 'boots'],
    brands: ['Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo'],
    subcategories: ['men', 'women', 'kids', 'shoes', 'accessories', 'bags', 'jewelry']
  },
  {
    id: 'home',
    name: 'Home & Garden',
    nameAr: 'منزل وحديقة',
    keywords: ['home', 'garden', 'kitchen', 'bathroom', 'decor', 'plants', 'tools', 'appliances'],
    brands: [],
    subcategories: ['kitchen', 'bathroom', 'garden', 'decor', 'appliances', 'tools']
  },
  {
    id: 'sports',
    name: 'Sports & Outdoors',
    nameAr: 'رياضة',
    keywords: ['sports', 'fitness', 'gym', 'outdoor', 'camping', 'hiking', 'swimming', 'football', 'basketball'],
    brands: ['Nike', 'Adidas'],
    subcategories: ['fitness', 'outdoor', 'team sports', 'water sports', 'winter sports']
  },
  {
    id: 'books',
    name: 'Books & Media',
    nameAr: 'كتب',
    keywords: ['book', 'magazine', 'cd', 'dvd', 'vinyl', 'comic', 'novel', 'textbook'],
    brands: [],
    subcategories: ['fiction', 'non-fiction', 'textbooks', 'magazines', 'music', 'movies']
  },
  {
    id: 'toys',
    name: 'Toys & Games',
    nameAr: 'ألعاب',
    keywords: ['toy', 'game', 'puzzle', 'doll', 'action figure', 'board game', 'video game'],
    brands: [],
    subcategories: ['action figures', 'dolls', 'board games', 'puzzles', 'educational', 'outdoor toys']
  },
  {
    id: 'music',
    name: 'Music',
    nameAr: 'موسيقى',
    keywords: ['guitar', 'piano', 'drums', 'violin', 'microphone', 'amplifier', 'music', 'instrument'],
    brands: [],
    subcategories: ['instruments', 'audio equipment', 'vinyl', 'cds', 'accessories']
  },
  {
    id: 'gaming',
    name: 'Gaming',
    nameAr: 'ألعاب فيديو',
    keywords: ['gaming', 'console', 'controller', 'headset', 'keyboard', 'mouse', 'monitor'],
    brands: ['PlayStation', 'Xbox', 'Nintendo'],
    subcategories: ['consoles', 'pc gaming', 'accessories', 'games', 'vr']
  }
]

const SUBCATEGORY_KEYWORDS: Record<string, Array<{ id: string; keywords: string[] }>> = {
  electronics: [
    { id: 'smartphones', keywords: ['phone', 'mobile', 'iphone', 'android', 'galaxy', 'smartphone'] },
    { id: 'laptops', keywords: ['laptop', 'macbook', 'notebook', 'thinkpad', 'vivobook'] },
    { id: 'cameras', keywords: ['camera', 'dslr', 'canon', 'nikon', 'sony alpha'] },
    { id: 'tablets', keywords: ['tablet', 'ipad'] },
    { id: 'audio', keywords: ['speaker', 'headphones', 'earbuds', 'microphone', 'amp', 'amplifier'] },
    { id: 'tv-monitors', keywords: ['tv', 'monitor', 'display', 'screen'] },
  ],
  furniture: [
    { id: 'sofas', keywords: ['sofa', 'couch'] },
    { id: 'tables', keywords: ['table', 'desk', 'dining table'] },
    { id: 'chairs', keywords: ['chair', 'stool'] },
    { id: 'beds', keywords: ['bed', 'mattress'] },
    { id: 'storage', keywords: ['cabinet', 'wardrobe', 'dresser', 'shelf', 'storage'] },
  ],
  vehicles: [
    { id: 'cars', keywords: ['car', 'sedan', 'hatchback', 'suv'] },
    { id: 'motorcycles', keywords: ['motorcycle', 'motorbike', 'bike'] },
    { id: 'bicycles', keywords: ['bicycle', 'cycle'] },
    { id: 'parts', keywords: ['part', 'tire', 'tyre', 'rim', 'engine', 'battery'] },
  ],
  fashion: [
    { id: 'clothing', keywords: ['shirt', 'dress', 'pants', 'jacket', 'jeans', 'clothes'] },
    { id: 'shoes', keywords: ['shoe', 'sneaker', 'boots', 'sandals'] },
    { id: 'bags', keywords: ['bag', 'backpack', 'purse', 'handbag'] },
    { id: 'watches', keywords: ['watch'] },
    { id: 'accessories', keywords: ['accessory', 'belt', 'hat', 'scarf', 'glasses'] },
  ],
  home: [
    { id: 'kitchen', keywords: ['kitchen', 'cookware', 'fridge', 'oven', 'microwave'] },
    { id: 'garden', keywords: ['garden', 'plant', 'outdoor'] },
    { id: 'decor', keywords: ['decor', 'lamp', 'rug', 'curtain', 'mirror'] },
    { id: 'tools', keywords: ['tool', 'drill', 'hammer', 'screwdriver'] },
  ],
  sports: [
    { id: 'fitness', keywords: ['fitness', 'gym', 'dumbbell', 'barbell', 'treadmill'] },
    { id: 'outdoor', keywords: ['outdoor', 'camping', 'hiking'] },
    { id: 'cycling', keywords: ['cycling', 'bike', 'helmet'] },
  ],
  books: [
    { id: 'books', keywords: ['book', 'novel', 'textbook'] },
    { id: 'magazines', keywords: ['magazine'] },
    { id: 'media', keywords: ['dvd', 'cd', 'vinyl', 'movie'] },
  ],
  gaming: [
    { id: 'consoles', keywords: ['console', 'playstation', 'xbox', 'switch'] },
    { id: 'games', keywords: ['game disc', 'game', 'fifa', 'controller game'] },
    { id: 'accessories', keywords: ['controller', 'headset', 'keyboard', 'mouse', 'vr'] },
  ],
  toys: [
    { id: 'toys', keywords: ['toy', 'doll', 'figure'] },
    { id: 'games', keywords: ['game', 'board game', 'puzzle'] },
  ],
  music: [
    { id: 'instruments', keywords: ['guitar', 'piano', 'drums', 'violin', 'instrument'] },
    { id: 'equipment', keywords: ['microphone', 'mixer', 'speaker', 'audio interface', 'equipment'] },
  ],
}

function detectSubcategory(text: string, categoryId: string): string {
  const categoryCandidates = SUBCATEGORY_KEYWORDS[categoryId] || []
  let bestId: string | null = null
  let bestScore = 0

  categoryCandidates.forEach((candidate) => {
    const score = candidate.keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0)
    if (score > bestScore) {
      bestId = candidate.id
      bestScore = score
    }
  })

  if (bestId) {
    return bestId
  }

  return getSubcategoryOptions(categoryId)[0]?.id || 'general'
}

// AI-powered categorization function
export function categorizeProduct(title: string, description: string): CategorizationResult {
  const text = `${title} ${description}`.toLowerCase()
  
  // Find brand
  let detectedBrand: BrandInfo | null = null
  let brandConfidence = 0
  
  for (const brand of BRAND_DATABASE) {
    const brandKeywords = brand.keywords.map(k => k.toLowerCase())
    const matches = brandKeywords.filter(keyword => text.includes(keyword))
    
    if (matches.length > 0) {
      const confidence = matches.length / brandKeywords.length
      if (confidence > brandConfidence) {
        detectedBrand = brand
        brandConfidence = confidence
      }
    }
  }
  
  // Find category
  let bestCategory = 'electronics' // default
  let categoryConfidence = 0
  
  for (const category of CATEGORIES) {
    const categoryKeywords = category.keywords.map(k => k.toLowerCase())
    const matches = categoryKeywords.filter(keyword => text.includes(keyword))
    
    if (matches.length > 0) {
      const confidence = matches.length / categoryKeywords.length
      if (confidence > categoryConfidence) {
        bestCategory = category.id
        categoryConfidence = confidence
      }
    }
  }
  
  // If brand was detected, use its category if more confident
  if (detectedBrand && brandConfidence > categoryConfidence) {
    bestCategory = detectedBrand.category
    categoryConfidence = brandConfidence
  }
  
  // Find subcategory
  const category = CATEGORIES.find(c => c.id === bestCategory)
  const subcategory = detectSubcategory(text, bestCategory)
  
  // Generate suggested tags
  const suggestedTags: string[] = []
  
  // Add brand tag
  if (detectedBrand) {
    suggestedTags.push(detectedBrand.name)
  }
  
  // Add category-specific tags
  if (category) {
    const relevantKeywords = category.keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    )
    suggestedTags.push(...relevantKeywords.slice(0, 3))
  }
  
  // Add condition-based tags
  if (text.includes('new') || text.includes('unused')) {
    suggestedTags.push('new')
  } else if (text.includes('excellent') || text.includes('perfect')) {
    suggestedTags.push('excellent')
  } else if (text.includes('good') || text.includes('used')) {
    suggestedTags.push('good')
  }
  
  return {
    category: bestCategory,
    subcategory,
    brand: detectedBrand?.name || null,
    confidence: Math.max(categoryConfidence, brandConfidence),
    suggestedTags: [...new Set(suggestedTags)] // remove duplicates
  }
}

// Enhanced search function for AI chatbot
export function searchProducts(query: string, products: any[]): any[] {
  const queryLower = query.toLowerCase()
  
  return products.filter(product => {
    const searchText = `${product.title} ${product.description} ${product.category} ${product.brand || ''}`.toLowerCase()
    
    // Exact matches get highest priority
    if (searchText.includes(queryLower)) {
      return true
    }
    
    // Partial word matches
    const queryWords = queryLower.split(' ')
    const textWords = searchText.split(' ')
    
    const matches = queryWords.filter(qWord => 
      textWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))
    )
    
    return matches.length >= queryWords.length * 0.5 // 50% of words must match
  }).sort((a, b) => {
    // Sort by relevance
    const aText = `${a.title} ${a.description}`.toLowerCase()
    const bText = `${b.title} ${b.description}`.toLowerCase()
    
    const aMatches = queryLower.split(' ').filter(word => aText.includes(word)).length
    const bMatches = queryLower.split(' ').filter(word => bText.includes(word)).length
    
    return bMatches - aMatches
  })
}

// Get category suggestions for search
export function getCategorySuggestions(query: string): string[] {
  const queryLower = query.toLowerCase()
  const suggestions: string[] = []
  
  for (const category of CATEGORIES) {
    if (category.keywords.some(keyword => queryLower.includes(keyword))) {
      suggestions.push(category.name)
    }
  }
  
  return suggestions
}

// Get brand suggestions for search
export function getBrandSuggestions(query: string): string[] {
  const queryLower = query.toLowerCase()
  const suggestions: string[] = []
  
  for (const brand of BRAND_DATABASE) {
    if (brand.keywords.some(keyword => queryLower.includes(keyword))) {
      suggestions.push(brand.name)
    }
  }
  
  return suggestions
}

export { CATEGORIES, BRAND_DATABASE }

