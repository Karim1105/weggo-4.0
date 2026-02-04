import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import Product from '@/models/Product'

const FEATURED_LISTINGS = [
  {
    title: 'iPhone 13 Pro Max 256GB',
    price: 15000,
    location: 'Cairo',
    condition: 'Like New',
    category: 'Electronics',
    subcategory: 'Phones',
    images: [
      'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400&h=400&fit=crop&crop=center',
    ],
    description:
      'Excellent condition iPhone 13 Pro Max with 256GB storage. Always used with case and screen protector. Battery health is strong and everything works perfectly.',
  },
  {
    title: 'MacBook Pro M2 16"',
    price: 42000,
    location: 'Giza',
    condition: 'Excellent',
    category: 'Electronics',
    subcategory: 'Laptops',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop&crop=center',
    ],
    description:
      'Powerful MacBook Pro M2 16-inch in excellent condition. Great for design, development, and video editing. Clean keyboard and screen.',
  },
  {
    title: 'Sony PlayStation 5',
    price: 9500,
    location: 'Cairo',
    condition: 'Like New',
    category: 'Gaming',
    subcategory: 'Consoles',
    images: [
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop&crop=center',
    ],
    description:
      'PS5 console in like-new condition with original accessories. Smooth performance, no issues. Perfect for next-gen gaming.',
  },
]

function getSeedSecret(request: NextRequest): string | null {
  const header = request.headers.get('x-seed-secret')
  if (header) return header
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export async function POST(request: NextRequest) {
  const secret = getSeedSecret(request)
  if (!secret || secret !== process.env.SEED_FEATURED_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const seedEmail = process.env.SEED_SELLER_EMAIL || 'seed-seller@weggo.local'
  const seedPassword = process.env.SEED_SELLER_PASSWORD || 'SeedSeller123!'
  const seedName = process.env.SEED_SELLER_NAME || 'Weggo Featured Seller'

  try {
    await connectDB()

    let seller = await User.findOne({ email: seedEmail })
    if (!seller) {
      seller = new User({
        name: seedName,
        email: seedEmail,
        password: seedPassword,
        isVerified: true,
        sellerVerified: true,
        role: 'user',
      })
      await seller.save()
    } else if (!seller.sellerVerified) {
      seller.sellerVerified = true
      await seller.save()
    }

    const seeded: any[] = []
    for (const listing of FEATURED_LISTINGS) {
      const doc = await Product.findOneAndUpdate(
        { title: listing.title, seller: seller._id },
        {
          ...listing,
          seller: seller._id,
          status: 'active',
        },
        { upsert: true, new: true }
      )
      seeded.push(doc)
    }

    return NextResponse.json({
      success: true,
      data: { count: seeded.length, listings: seeded },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Seed failed' },
      { status: 500 }
    )
  }
}
