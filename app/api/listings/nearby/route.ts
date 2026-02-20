import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import Wishlist from '@/models/Wishlist'
import { getAuthUser } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Calculate distance between two coordinates in kilometers
 * Using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Egyptian cities with approximate coordinates
const EGYPTIAN_CITIES: Record<string, { lat: number; lon: number }> = {
  'Cairo': { lat: 30.0444, lon: 31.2357 },
  'Alexandria': { lat: 31.2001, lon: 29.9187 },
  'Giza': { lat: 30.0131, lon: 31.2089 },
  'Shubra El-Kheima': { lat: 30.1286, lon: 31.2422 },
  'Port Said': { lat: 31.2653, lon: 32.3019 },
  'Suez': { lat: 29.9668, lon: 32.5498 },
  'Luxor': { lat: 25.6872, lon: 32.6396 },
  'Mansoura': { lat: 31.0364, lon: 31.3807 },
  'El-Mahalla El-Kubra': { lat: 30.9746, lon: 31.1669 },
  'Tanta': { lat: 30.7865, lon: 31.0004 },
  'Asyut': { lat: 27.1809, lon: 31.1837 },
  'Ismailia': { lat: 30.5903, lon: 32.2654 },
  'Faiyum': { lat: 29.3084, lon: 30.8405 },
  'Zagazig': { lat: 30.5877, lon: 31.5022 },
  'Aswan': { lat: 24.0889, lon: 32.8998 },
  'Damietta': { lat: 31.4165, lon: 31.8133 },
  'Damanhur': { lat: 31.0341, lon: 30.4682 },
  'Minya': { lat: 28.0871, lon: 30.7618 },
  'Beni Suef': { lat: 29.0661, lon: 31.0994 },
  'Qena': { lat: 26.1551, lon: 32.7160 },
  'Sohag': { lat: 26.5569, lon: 31.6948 },
  'Hurghada': { lat: 27.2579, lon: 33.8116 },
  'Sharm El-Sheikh': { lat: 27.9159, lon: 34.3300 },
  '6th of October City': { lat: 29.9372, lon: 30.9186 },
  'Obour City': { lat: 30.2150, lon: 31.4820 },
  'New Cairo': { lat: 30.0300, lon: 31.4700 }
}

/**
 * GET /api/listings/nearby
 * Get listings near user's location
 * Query params:
 * - lat: user's latitude
 * - lon: user's longitude  
 * - radius: search radius in km (default: 50)
 * - limit: number of results (default: 12)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const userLat = parseFloat(searchParams.get('lat') || '')
    const userLon = parseFloat(searchParams.get('lon') || '')
    const rawRadius = parseFloat(searchParams.get('radius') || '100')
    const rawLimit = parseInt(searchParams.get('limit') || '12', 10)
    const radius = Math.min(Math.max(Number.isNaN(rawRadius) ? 100 : rawRadius, 1), 500)
    const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 12 : rawLimit, 1), 50)

    if (
      !Number.isFinite(userLat) ||
      !Number.isFinite(userLon) ||
      userLat < -90 ||
      userLat > 90 ||
      userLon < -180 ||
      userLon > 180
    ) {
      return NextResponse.json(
        { success: false, error: 'Valid location coordinates are required (lat, lon)' },
        { status: 400 }
      )
    }

    // Get user if authenticated (for wishlist)
    const user = await getAuthUser(request).catch(() => null)

    // Get all active products
    const allProducts = await Product.find({ status: 'active' })
      .populate('seller', 'name avatar isVerified averageRating totalSales')
      .lean()

    // Filter products by distance and calculate distance for each
    const productsWithDistance = allProducts
      .map((product: any) => {
        // Try to match location to known Egyptian cities
        const location = product.location
        let productCoords = null

        // Check if location contains any known city
        for (const [city, coords] of Object.entries(EGYPTIAN_CITIES)) {
          if (location.toLowerCase().includes(city.toLowerCase())) {
            productCoords = coords
            break
          }
        }

        // If no match, default to Cairo coordinates
        if (!productCoords) {
          productCoords = EGYPTIAN_CITIES['Cairo']
        }

        const distance = calculateDistance(
          userLat,
          userLon,
          productCoords.lat,
          productCoords.lon
        )

        return {
          ...product,
          distance: Math.round(distance * 10) / 10 // Round to 1 decimal
        }
      })
      .filter(product => product.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)

    // Get user's wishlist if authenticated
    let wishlistIds = new Set<string>()
    if (user) {
      const wishlist = await Wishlist.find({ user: user._id }).select('product').lean()
      wishlistIds = new Set(wishlist.map(w => w.product.toString()))
    }

    // Format response
    const listings = productsWithDistance.map((product: any) => ({
      ...product,
      _id: product._id.toString(),
      seller: product.seller ? {
        _id: product.seller._id.toString(),
        name: product.seller.name,
        avatar: product.seller.avatar,
        isVerified: product.seller.isVerified,
        rating: product.seller.averageRating,
        totalSales: product.seller.totalSales,
      } : null,
      isFavorite: wishlistIds.has(product._id.toString())
    }))

    return successResponse({
      listings,
      total: listings.length,
      userLocation: { lat: userLat, lon: userLon },
      searchRadius: radius,
      algorithm: 'nearby'
    })
  } catch (error: any) {
    logger.error('Get nearby listings error:', error)
    return ApiErrors.serverError()
  }
}
