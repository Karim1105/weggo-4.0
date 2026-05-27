// RAG (Retrieval-Augmented Generation) system for AI chatbot
// This provides context-aware responses based on actual product data

import { searchProducts, getCategorySuggestions, getBrandSuggestions } from './categorization'
import type {
  LanceDbSearchFilters,
  RetrievalProduct,
  RetrievalSearchContext,
  RetrievalSearchResult,
} from '@/types/ai'

export type Product = RetrievalProduct
export type SearchContext = RetrievalSearchContext

// Mock product database (in production, this would come from your database)
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    title: 'iPhone 13 Pro Max 256GB Space Gray',
    description: 'Excellent condition iPhone 13 Pro Max with 256GB storage. Barely used, comes with original box, charger, and case. No scratches or damage.',
    price: 15000,
    location: 'Cairo, Nasr City',
    condition: 'Like New',
    category: 'electronics',
    subcategory: 'phones',
    brand: 'iPhone',
    images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500'],
    seller: {
      id: 'seller1',
      name: 'Ahmed M.',
      rating: 4.8,
      totalSales: 45
    },
    postedAt: '2 hours ago',
    tags: ['iphone', 'apple', 'smartphone', 'like new', 'cairo']
  },
  {
    id: '2',
    title: 'Samsung Galaxy S22 Ultra 128GB Phantom Black',
    description: 'Samsung Galaxy S22 Ultra in perfect condition. Used for 6 months, well maintained. Includes S Pen, charger, and protective case.',
    price: 14000,
    location: 'Alexandria, Smouha',
    condition: 'Good',
    category: 'electronics',
    subcategory: 'phones',
    brand: 'Samsung',
    images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500'],
    seller: {
      id: 'seller2',
      name: 'Fatma K.',
      rating: 4.6,
      totalSales: 23
    },
    postedAt: '5 hours ago',
    tags: ['samsung', 'galaxy', 'smartphone', 'good', 'alexandria']
  },
  {
    id: '3',
    title: 'MacBook Pro M2 16-inch 2023',
    description: 'Brand new MacBook Pro M2 with 16-inch display. Still in original packaging. Perfect for professionals and students.',
    price: 42000,
    location: 'Cairo, New Cairo',
    condition: 'New',
    category: 'electronics',
    subcategory: 'laptops',
    brand: 'MacBook',
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'],
    seller: {
      id: 'seller3',
      name: 'Omar H.',
      rating: 4.9,
      totalSales: 67
    },
    postedAt: '1 hour ago',
    tags: ['macbook', 'apple', 'laptop', 'new', 'cairo']
  },
  {
    id: '4',
    title: 'Dell XPS 15 9520 Gaming Laptop',
    description: 'High-performance Dell XPS 15 with RTX 3050 graphics. Great for gaming and video editing. Used for 1 year, excellent condition.',
    price: 18000,
    location: 'Giza, Sheikh Zayed',
    condition: 'Good',
    category: 'electronics',
    subcategory: 'laptops',
    brand: 'Dell',
    images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500'],
    seller: {
      id: 'seller4',
      name: 'Yasmine A.',
      rating: 4.7,
      totalSales: 34
    },
    postedAt: '3 hours ago',
    tags: ['dell', 'xps', 'laptop', 'gaming', 'giza']
  },
  {
    id: '5',
    title: 'Modern L-Shaped Sofa Gray',
    description: 'Beautiful L-shaped sofa in excellent condition. Perfect for living room. Very comfortable and stylish. No stains or damage.',
    price: 8000,
    location: 'Cairo, Maadi',
    condition: 'Excellent',
    category: 'furniture',
    subcategory: 'living room',
    brand: 'IKEA',
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500'],
    seller: {
      id: 'seller5',
      name: 'Mohamed S.',
      rating: 4.5,
      totalSales: 12
    },
    postedAt: '6 hours ago',
    tags: ['sofa', 'furniture', 'living room', 'excellent', 'cairo']
  },
  {
    id: '6',
    title: 'Sony PlayStation 5 Console',
    description: 'Sony PS5 in like new condition. Used for 3 months, includes 2 controllers and 3 games. Perfect for gaming enthusiasts.',
    price: 9500,
    location: 'Alexandria, Miami',
    condition: 'Like New',
    category: 'gaming',
    subcategory: 'consoles',
    brand: 'PlayStation',
    images: ['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500'],
    seller: {
      id: 'seller6',
      name: 'Ali R.',
      rating: 4.8,
      totalSales: 28
    },
    postedAt: '4 hours ago',
    tags: ['playstation', 'ps5', 'gaming', 'console', 'alexandria']
  },
  {
    id: '7',
    title: 'Canon EOS R6 Mirrorless Camera',
    description: 'Professional Canon EOS R6 camera with 24-70mm lens. Used by photographer, excellent condition. Great for professional photography.',
    price: 32000,
    location: 'Cairo, Zamalek',
    condition: 'Excellent',
    category: 'electronics',
    subcategory: 'cameras',
    brand: 'Canon',
    images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500'],
    seller: {
      id: 'seller7',
      name: 'Nour E.',
      rating: 4.9,
      totalSales: 15
    },
    postedAt: '7 hours ago',
    tags: ['canon', 'camera', 'photography', 'professional', 'cairo']
  },
  {
    id: '8',
    title: 'BMW 320i 2019 Automatic',
    description: 'BMW 320i 2019 model in excellent condition. Well maintained, single owner. Perfect for daily driving and long trips.',
    price: 450000,
    location: 'Cairo, Heliopolis',
    condition: 'Excellent',
    category: 'vehicles',
    subcategory: 'cars',
    brand: 'BMW',
    images: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=500'],
    seller: {
      id: 'seller8',
      name: 'Karim F.',
      rating: 4.7,
      totalSales: 8
    },
    postedAt: '1 day ago',
    tags: ['bmw', 'car', 'automatic', 'excellent', 'cairo']
  }
]

// RAG-powered search function
export function searchWithRAG(query: string, context: SearchContext): RetrievalSearchResult {
  // Search products using the categorization system
  const foundProducts = searchProducts(query, context.products)
  
  // Get category and brand suggestions
  const categories = getCategorySuggestions(query)
  const brands = getBrandSuggestions(query)
  
  // Generate smart suggestions based on query
  const suggestions = generateSmartSuggestions(query, foundProducts)
  
  return {
    products: foundProducts,
    suggestions,
    categories,
    brands
  }
}

// Generate smart suggestions based on search results
function generateSmartSuggestions(query: string, products: Product[]): string[] {
  const suggestions: string[] = []
  const queryLower = query.toLowerCase()
  
  // Price-based suggestions
  if (products.length > 0) {
    const prices = products.map(p => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    
    if (minPrice < 5000) {
      suggestions.push('Budget-friendly options available')
    }
    if (maxPrice > 20000) {
      suggestions.push('Premium options available')
    }
  }
  
  // Location-based suggestions
  const locations = [...new Set(products.map(p => p.location.split(',')[0]))]
  if (locations.length > 1) {
    suggestions.push(`Available in ${locations.join(', ')}`)
  }
  
  // Condition-based suggestions
  const conditions = [...new Set(products.map(p => p.condition))]
  if (conditions.includes('New')) {
    suggestions.push('New items available')
  }
  if (conditions.includes('Like New')) {
    suggestions.push('Like new items available')
  }
  
  // Brand-based suggestions
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))]
  if (brands.length > 0) {
    suggestions.push(`Popular brands: ${brands.slice(0, 3).join(', ')}`)
  }
  
  return suggestions
}

// Generate AI response with RAG context
export function generateAIResponseWithRAG(query: string, context: SearchContext): string {
  const searchResult = searchWithRAG(query, context)
  const { products, suggestions, categories, brands } = searchResult
  
  if (products.length === 0) {
    return generateNoResultsResponse(query, categories, brands)
  }
  
  return generateResultsResponse(query, products, suggestions)
}

// Generate response when no products found
function generateNoResultsResponse(query: string, categories: string[], brands: string[]): string {
  let response = `I couldn't find any items matching "${query}" right now.\n\n`
  
  if (categories.length > 0) {
    response += `However, I found these related categories: ${categories.join(', ')}\n\n`
  }
  
  if (brands.length > 0) {
    response += `Popular brands you might like: ${brands.join(', ')}\n\n`
  }
  
  response += `Try searching for:\n`
  response += `• Different keywords\n`
  response += `• Broader categories\n`
  response += `• Check back later for new listings\n\n`
  response += `Or ask me to help you find something specific!`
  
  return response
}

// Generate response with search results
function generateResultsResponse(query: string, products: Product[], suggestions: string[]): string {
  let response = `I found ${products.length} item${products.length > 1 ? 's' : ''} matching "${query}":\n\n`
  
  // Show top 3 products
  const topProducts = products.slice(0, 3)
  
  topProducts.forEach((product, index) => {
    const emoji = getProductEmoji(product.category)
    const price = formatPrice(product.price)
    const condition = product.condition
    const location = product.location.split(',')[0]
    
    response += `${emoji} **${product.title}**\n`
    response += `💰 ${price} • ${condition} • ${location}\n`
    response += `⭐ ${product.seller.rating}/5 (${product.seller.totalSales} sales)\n`
    if (product.brand) {
      response += `🏷️ ${product.brand}\n`
    }
    response += `\n`
  })
  
  if (products.length > 3) {
    response += `... and ${products.length - 3} more items!\n\n`
  }
  
  // Add suggestions
  if (suggestions.length > 0) {
    response += `💡 **Suggestions:**\n`
    suggestions.forEach(suggestion => {
      response += `• ${suggestion}\n`
    })
    response += `\n`
  }
  
  response += `Would you like to see more details about any of these items?`
  
  return response
}

// Get emoji for product category
function getProductEmoji(category: string): string {
  const emojis: Record<string, string> = {
    electronics: '📱',
    furniture: '🛋️',
    vehicles: '🚗',
    fashion: '👕',
    home: '🏠',
    sports: '⚽',
    books: '📚',
    toys: '🧸',
    music: '🎵',
    gaming: '🎮'
  }
  return emojis[category] || '📦'
}

// Format price in EGP
function formatPrice(price: number): string {
  return `${price.toLocaleString()} EGP`
}

// Get context for AI chatbot
export function getSearchContext(): SearchContext {
  return {
    products: MOCK_PRODUCTS,
    query: '',
    userLocation: 'Cairo', // Default location
    userPreferences: {
      categories: [],
      priceRange: { min: 0, max: 1000000 },
      brands: []
    }
  }
}

// Enhanced search with filters
export function searchWithFilters(
  query: string,
  filters: LanceDbSearchFilters
): Product[] {
  let results = MOCK_PRODUCTS
  
  // Apply text search
  if (query) {
    results = searchProducts(query, results)
  }
  
  // Apply filters
  if (filters.category) {
    results = results.filter(p => p.category === filters.category)
  }
  
  if (filters.minPrice !== undefined) {
    results = results.filter(p => p.price >= filters.minPrice!)
  }
  
  if (filters.maxPrice !== undefined) {
    results = results.filter(p => p.price <= filters.maxPrice!)
  }
  
  if (filters.condition) {
    results = results.filter(p => p.condition.toLowerCase() === filters.condition!.toLowerCase())
  }
  
  if (filters.location) {
    results = results.filter(p => 
      p.location.toLowerCase().includes(filters.location!.toLowerCase())
    )
  }
  
  if (filters.brand) {
    results = results.filter(p => 
      p.brand?.toLowerCase() === filters.brand!.toLowerCase()
    )
  }
  
  return results
}

export { MOCK_PRODUCTS }

