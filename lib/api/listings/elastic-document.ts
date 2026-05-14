export interface ElasticListingSeller {
  _id: string
  name?: string
  avatar?: string
  sellerVerified?: boolean
  averageRating?: number
  totalSales?: number
}

export interface ElasticListingDocument {
  id: string
  title: string
  description: string
  category: string
  categoryText: string
  subcategory?: string
  subcategoryText?: string
  condition: string
  price: number
  location: string
  locationKeyword: string
  status: string
  createdAt: Date
  isBoosted: boolean
  images: string[]
  averageRating: number
  ratingCount: number
  seller: ElasticListingSeller | null
}

export function buildElasticListingDocument(doc: any): ElasticListingDocument {
  const seller = doc?.seller

  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    categoryText: doc.category,
    subcategory: doc.subcategory,
    subcategoryText: doc.subcategory,
    condition: doc.condition,
    price: doc.price,
    location: doc.location,
    locationKeyword: typeof doc.location === 'string' ? doc.location.toLowerCase() : '',
    status: doc.status,
    createdAt: doc.createdAt,
    isBoosted: doc.isBoosted || false,
    images: Array.isArray(doc.images) ? doc.images : [],
    averageRating: typeof doc.averageRating === 'number' ? doc.averageRating : 0,
    ratingCount: typeof doc.ratingCount === 'number' ? doc.ratingCount : 0,
    seller: seller
      ? {
          _id: String(seller._id),
          name: seller.name,
          avatar: seller.avatar,
          sellerVerified: seller.sellerVerified,
          averageRating: seller.averageRating,
          totalSales: seller.totalSales,
        }
      : null,
  }
}
