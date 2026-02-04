import mongoose from 'mongoose'
import connectDB from '@/lib/db'
import User from '@/models/User'
import Product from '@/models/Product'

const SEED_EMAIL = process.env.SEED_SELLER_EMAIL || 'seed-seller@weggo.local'
const SEED_PASSWORD = process.env.SEED_SELLER_PASSWORD || 'SeedSeller123!'
const SEED_NAME = process.env.SEED_SELLER_NAME || 'Weggo Featured Seller'

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

async function ensureSeedSeller() {
  const existing = await User.findOne({ email: SEED_EMAIL })
  if (existing) {
    if (!existing.sellerVerified) {
      existing.sellerVerified = true
      await existing.save()
    }
    return existing
  }

  const user = new User({
    name: SEED_NAME,
    email: SEED_EMAIL,
    password: SEED_PASSWORD,
    isVerified: true,
    sellerVerified: true,
    role: 'user',
  })

  await user.save()
  return user
}

async function seedFeaturedListings() {
  await connectDB()

  const seller = await ensureSeedSeller()

  const results = []
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
    results.push(doc)
  }

  return results
}

seedFeaturedListings()
  .then((docs) => {
    console.log(`Seeded ${docs.length} featured listings for ${SEED_EMAIL}`)
  })
  .catch((error) => {
    console.error('Failed to seed featured listings:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
