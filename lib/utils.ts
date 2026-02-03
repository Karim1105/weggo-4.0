import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatPrice(price: number, currency: string = 'EGP'): string {
  return `${price.toLocaleString()} ${currency}`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function truncate(text: string, length: number = 100): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}

export const egyptianCities = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Sharm El Sheikh',
  'Hurghada',
  'Luxor',
  'Aswan',
  'Port Said',
  'Suez',
  'Mansoura',
  'Tanta',
  'Asyut',
  'Ismailia',
  'Faiyum',
  'Zagazig',
  'Damietta',
  'Minya',
  'Damanhur',
  'Beni Suef',
  'Qena',
  'Sohag',
  'Shibin El Kom'
]

export const categories = [
  { id: 'electronics', name: 'Electronics', nameAr: 'إلكترونيات' },
  { id: 'furniture', name: 'Furniture', nameAr: 'أثاث' },
  { id: 'vehicles', name: 'Vehicles', nameAr: 'مركبات' },
  { id: 'fashion', name: 'Fashion', nameAr: 'أزياء' },
  { id: 'home', name: 'Home & Garden', nameAr: 'منزل وحديقة' },
  { id: 'sports', name: 'Sports & Outdoors', nameAr: 'رياضة' },
  { id: 'books', name: 'Books & Media', nameAr: 'كتب' },
  { id: 'toys', name: 'Toys & Games', nameAr: 'ألعاب' },
  { id: 'music', name: 'Music', nameAr: 'موسيقى' },
  { id: 'gaming', name: 'Gaming', nameAr: 'ألعاب فيديو' }
]

export const subcategoriesByCategory: Record<string, { id: string; name: string }[]> = {
  electronics: [
    { id: 'smartphones', name: 'Smartphones' },
    { id: 'laptops', name: 'Laptops' },
    { id: 'cameras', name: 'Cameras' },
    { id: 'tablets', name: 'Tablets' },
    { id: 'audio', name: 'Audio' },
    { id: 'tv-monitors', name: 'TV & Monitors' },
    { id: 'other-electronics', name: 'Other' },
  ],
  furniture: [
    { id: 'sofas', name: 'Sofas' },
    { id: 'tables', name: 'Tables' },
    { id: 'chairs', name: 'Chairs' },
    { id: 'beds', name: 'Beds' },
    { id: 'storage', name: 'Storage' },
    { id: 'other-furniture', name: 'Other' },
  ],
  vehicles: [
    { id: 'cars', name: 'Cars' },
    { id: 'motorcycles', name: 'Motorcycles' },
    { id: 'bicycles', name: 'Bicycles' },
    { id: 'parts', name: 'Parts & Accessories' },
    { id: 'other-vehicles', name: 'Other' },
  ],
  fashion: [
    { id: 'clothing', name: 'Clothing' },
    { id: 'shoes', name: 'Shoes' },
    { id: 'bags', name: 'Bags' },
    { id: 'watches', name: 'Watches' },
    { id: 'accessories', name: 'Accessories' },
    { id: 'other-fashion', name: 'Other' },
  ],
  home: [
    { id: 'kitchen', name: 'Kitchen' },
    { id: 'garden', name: 'Garden' },
    { id: 'decor', name: 'Decor' },
    { id: 'tools', name: 'Tools' },
    { id: 'other-home', name: 'Other' },
  ],
  sports: [
    { id: 'fitness', name: 'Fitness' },
    { id: 'outdoor', name: 'Outdoor' },
    { id: 'cycling', name: 'Cycling' },
    { id: 'other-sports', name: 'Other' },
  ],
  books: [
    { id: 'books', name: 'Books' },
    { id: 'magazines', name: 'Magazines' },
    { id: 'media', name: 'Media' },
    { id: 'other-books', name: 'Other' },
  ],
  gaming: [
    { id: 'consoles', name: 'Consoles' },
    { id: 'games', name: 'Games' },
    { id: 'accessories', name: 'Accessories' },
    { id: 'other-gaming', name: 'Other' },
  ],
  toys: [{ id: 'toys', name: 'Toys' }, { id: 'games', name: 'Games' }, { id: 'other-toys', name: 'Other' }],
  music: [{ id: 'instruments', name: 'Instruments' }, { id: 'equipment', name: 'Equipment' }, { id: 'other-music', name: 'Other' }],
}

export const conditions = [
  { id: 'new', name: 'New', nameAr: 'جديد' },
  { id: 'like-new', name: 'Like New', nameAr: 'مثل الجديد' },
  { id: 'good', name: 'Good', nameAr: 'جيد' },
  { id: 'fair', name: 'Fair', nameAr: 'مقبول' },
  { id: 'poor', name: 'Poor', nameAr: 'سيء' }
]

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePhone(phone: string): boolean {
  // Egyptian phone number validation
  const re = /^(\+20|0)?1[0125]\d{8}$/
  return re.test(phone)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1')}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function withCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCookie('csrfToken')
  if (!token) return headers

  if (headers instanceof Headers) {
    headers.set('X-CSRF-Token', token)
    return headers
  }
  if (Array.isArray(headers)) {
    return [...headers, ['X-CSRF-Token', token]]
  }
  return { ...headers, 'X-CSRF-Token': token }
}

/** Build full image URL for listing (API may return path like /uploads/xxx) */
export function listingImageUrl(path: string | undefined): string {
  if (!path) return 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500'
  if (path.startsWith('http')) return path
  const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_APP_URL || '')
  return `${base}${path}`
}

/** Map API listing to ProductCard shape */
export function mapApiListingToProduct(
  listing: {
    _id: string
    title: string
    price: number
    location: string
    condition: string
    category: string
    subcategory?: string
    images?: string[]
    createdAt: string
    seller?: { name?: string; isVerified?: boolean; rating?: number; totalSales?: number }
  },
  favoriteIds: Set<string>
) {
  return {
    id: listing._id,
    title: listing.title,
    price: listing.price,
    location: listing.location,
    condition: listing.condition,
    image: listingImageUrl(listing.images?.[0]),
    category: listing.category,
    // Keep subcategory available for client-side filtering, even if not always used in UI
    subcategory: listing.subcategory,
    postedAt: formatDate(listing.createdAt),
    isFavorite: favoriteIds.has(listing._id),
    seller: listing.seller
      ? {
          name: listing.seller.name || 'Seller',
          rating: listing.seller.rating,
          totalSales: listing.seller.totalSales,
          verified: listing.seller.isVerified,
        }
      : undefined,
  }
}



